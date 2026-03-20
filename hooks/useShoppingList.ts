/**
 * useShoppingList — manages shopping list reading, generation, and item toggling.
 *
 * Architecture:
 *   READ   → Apollo/GraphQL (nested query with joined ingredient names)
 *   WRITE  → Supabase client (avoids pg_graphql BigFloat, atMost, and cache issues)
 *   GENERATE → Supabase RPC `generate_shopping_list` (single atomic DB call)
 *
 * The server-side function handles:
 *   1. Finding the active meal plan
 *   2. Deleting old shopping lists for that plan
 *   3. Creating a new list
 *   4. Aggregating recipe ingredients (scaled by servings)
 *   5. Adding AI meal custom items
 *
 * This eliminates all the previous client-side issues:
 *   - "delete impacts too many records" (pg_graphql atMost default of 1)
 *   - BigFloat string conversion errors on inserts
 *   - Apollo cache normalization errors from missing id fields
 */
import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { extractFirstNode, extractNodes } from '@/lib/graphql-client';
import { emitEvent, useAppEvent } from '@/lib/reactive';
import { GET_SHOPPING_LIST } from '@/graphql/queries';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ShoppingListItem = {
  id: string;
  ingredient_id: string | null;
  custom_item_name: string | null;
  quantity: number | null;
  unit: string | null;
  status: 'needed' | 'purchased' | 'skipped';
  aisle: string | null;
  notes: string | null;
  ingredient: {
    name: string;
    category: string | null;
  } | null;
};

export type ShoppingList = {
  id: string;
  name: string;
  created_at: string;
  items: ShoppingListItem[];
};

// ---------------------------------------------------------------------------
// GraphQL response types (for the READ query only)
// ---------------------------------------------------------------------------

type ShoppingListNode = {
  id: string;
  name: string;
  created_at: string;
  shopping_list_itemsCollection: {
    edges: {
      node: Omit<ShoppingListItem, 'ingredient'> & {
        ingredients: { name: string; category: string | null } | null;
      };
    }[];
  };
};

type ShoppingListResponse = {
  shopping_listsCollection: {
    edges: { node: ShoppingListNode }[];
  };
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useShoppingList() {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);

  // READ: Use Apollo for the nested query (list → items → ingredients)
  const { data, loading, refetch: rawRefetch } = useQuery<ShoppingListResponse>(
    GET_SHOPPING_LIST,
    {
      variables: { userId: user?.id },
      skip: !user,
      fetchPolicy: 'cache-and-network',
    },
  );

  // Transform response into flat shape the UI expects
  const list: ShoppingList | null = useMemo(() => {
    if (!data) return null;
    const node = extractFirstNode(data.shopping_listsCollection) as ShoppingListNode | null;
    if (!node) return null;

    const items = extractNodes(node.shopping_list_itemsCollection).map((item) => ({
      ...item,
      // pg_graphql returns BigFloat (numeric) as strings — coerce to number
      quantity: typeof item.quantity === 'string' ? parseFloat(item.quantity) : item.quantity,
      // Rename the GraphQL relationship field to the UI-expected name
      ingredient: item.ingredients || null,
    }));

    return {
      id: node.id,
      name: node.name,
      created_at: node.created_at,
      items: items as ShoppingListItem[],
    };
  }, [data]);

  const refetch = useCallback(async () => {
    await rawRefetch();
  }, [rawRefetch]);

  // Listen for shopping list updates from other components
  useAppEvent(
    'SHOPPING_LIST_UPDATED',
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  // ---------------------------------------------------------------------------
  // TOGGLE ITEM STATUS — uses Supabase directly (no BigFloat / atMost issues)
  // ---------------------------------------------------------------------------
  const toggleItem = useCallback(
    async (itemId: string, currentStatus: string) => {
      const newStatus = currentStatus === 'purchased' ? 'needed' : 'purchased';

      const { error } = await supabase
        .from('shopping_list_items')
        .update({ status: newStatus })
        .eq('id', itemId);

      if (error) {
        console.warn('Failed to toggle item:', error.message);
        return;
      }

      // Refetch to update the UI
      await rawRefetch();
    },
    [rawRefetch],
  );

  // ---------------------------------------------------------------------------
  // GENERATE SHOPPING LIST — calls the server-side RPC function
  // ---------------------------------------------------------------------------
  const generateFromPlan = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user) return { success: false, error: 'Not authenticated' };
    setIsGenerating(true);

    try {
      const { data: newListId, error } = await supabase.rpc('generate_shopping_list', {
        p_user_id: user.id,
      });

      if (error) {
        // Map known error messages to user-friendly text
        if (error.message.includes('No active meal plan')) {
          return {
            success: false,
            error: 'No active meal plan found. Add some meals first!',
          };
        }
        return { success: false, error: error.message };
      }

      if (!newListId) {
        return { success: false, error: 'Failed to create shopping list' };
      }

      // Refetch the Apollo query to update the UI
      await rawRefetch();
      emitEvent({ type: 'SHOPPING_LIST_UPDATED' });
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to generate shopping list',
      };
    } finally {
      setIsGenerating(false);
    }
  }, [user?.id, rawRefetch]);

  return { list, isLoading: loading, isGenerating, toggleItem, generateFromPlan, refetch };
}
