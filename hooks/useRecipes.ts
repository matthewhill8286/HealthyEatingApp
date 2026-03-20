import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { extractNodes, extractFirstNode } from '@/lib/graphql-client';
import { GET_RECIPES, GET_RECIPE_DETAIL } from '@/graphql/queries';
import { useAuth } from '@/providers/AuthProvider';

// ---------------------------------------------------------------------------
// Types (unchanged — all screen consumers work the same)
// ---------------------------------------------------------------------------

export type RecipeSummary = {
  id: string;
  title: string;
  description: string | null;
  cuisine: string | null;
  difficulty: string | null;
  prep_time_min: number | null;
  cook_time_min: number | null;
  total_time_min: number | null;
  servings: number;
  calories_per_serving: number | null;
  protein_per_serving: number | null;
  fat_per_serving: number | null;
  carbs_per_serving: number | null;
  fibre_per_serving: number | null;
  meal_types: string[];
  diet_types: string[];
  image_url: string | null;
  is_ai_generated: boolean;
  is_public: boolean;
  rating: number | null;
};

export type RecipeDetail = RecipeSummary & {
  instructions: any;
  notes: string | null;
  source_url: string | null;
  sugar_per_serving: number | null;
  sodium_per_serving: number | null;
  ingredients: {
    id: string;
    quantity: number;
    unit: string;
    is_optional: boolean;
    preparation_note: string | null;
    display_order: number;
    ingredient: {
      id: string;
      name: string;
      category: string | null;
      calories: number | null;
      protein_g: number | null;
      total_fat_g: number | null;
      total_carbs_g: number | null;
      dietary_fibre_g: number | null;
    };
  }[];
  tags: { tag: { id: string; name: string; category: string | null } }[];
};

// ---------------------------------------------------------------------------
// GraphQL response types
// ---------------------------------------------------------------------------

type RecipesResponse = {
  recipesCollection: {
    edges: { node: RecipeSummary }[];
  };
};

type RecipeDetailNode = Omit<RecipeDetail, 'ingredients' | 'tags'> & {
  recipe_ingredientsCollection: {
    edges: {
      node: {
        id: string;
        quantity: number;
        unit: string;
        is_optional: boolean;
        preparation_note: string | null;
        display_order: number;
        ingredients: {
          id: string;
          name: string;
          category: string | null;
          calories: number | null;
          protein_g: number | null;
          total_fat_g: number | null;
          total_carbs_g: number | null;
          dietary_fibre_g: number | null;
        };
      };
    }[];
  };
  recipe_tagsCollection: {
    edges: {
      node: {
        tags: { id: string; name: string; category: string | null };
      };
    }[];
  };
};

type RecipeDetailResponse = {
  recipesCollection: {
    edges: { node: RecipeDetailNode }[];
  };
};

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useRecipes(options?: {
  limit?: number;
  cuisine?: string;
  dietType?: string;
  search?: string;
}) {
  const { user } = useAuth();

  const { data, loading, refetch } = useQuery<RecipesResponse>(GET_RECIPES, {
    variables: { first: options?.limit || 100 },
    skip: !user,
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  });

  // Client-side search filtering (faster than network round-trip for typed search)
  const recipes = useMemo(() => {
    const raw = data ? extractNodes(data.recipesCollection) : [];

    // pg_graphql returns jsonb columns as JSON strings — parse them
    const all = raw.map((r) => ({
      ...r,
      meal_types: typeof r.meal_types === 'string'
        ? (() => { try { return JSON.parse(r.meal_types as unknown as string); } catch { return []; } })()
        : r.meal_types || [],
      diet_types: typeof r.diet_types === 'string'
        ? (() => { try { return JSON.parse(r.diet_types as unknown as string); } catch { return []; } })()
        : r.diet_types || [],
    }));

    if (options?.search && options.search.trim().length > 0) {
      const q = options.search.toLowerCase();
      return all.filter((r) => r.title.toLowerCase().includes(q));
    }

    return all;
  }, [data, options?.search]);

  return { recipes, isLoading: loading, refetch };
}

export function useRecipeDetail(recipeId: string | undefined) {
  const { data, loading } = useQuery<RecipeDetailResponse>(
    GET_RECIPE_DETAIL,
    {
      variables: { recipeId },
      skip: !recipeId,
      fetchPolicy: 'cache-first',
    },
  );

  const recipe: RecipeDetail | null = useMemo(() => {
    if (!data) return null;
    const node = extractFirstNode(data.recipesCollection) as RecipeDetailNode | null;
    if (!node) return null;

    // Transform pg_graphql Relay edges into the flat shape the UI expects
    const ingredients = extractNodes(node.recipe_ingredientsCollection).map((ri) => ({
      id: ri.id,
      quantity: ri.quantity,
      unit: ri.unit,
      is_optional: ri.is_optional,
      preparation_note: ri.preparation_note,
      display_order: ri.display_order,
      ingredient: ri.ingredients, // pg_graphql uses plural FK name
    }));

    const tags = extractNodes(node.recipe_tagsCollection).map((rt) => ({
      tag: rt.tags,
    }));

    const { recipe_ingredientsCollection, recipe_tagsCollection, ...rest } = node;

    // pg_graphql returns jsonb columns as JSON strings — parse them
    const parsedInstructions = typeof rest.instructions === 'string'
      ? (() => { try { return JSON.parse(rest.instructions); } catch { return rest.instructions; } })()
      : rest.instructions;

    const parsedMealTypes = typeof rest.meal_types === 'string'
      ? (() => { try { return JSON.parse(rest.meal_types); } catch { return []; } })()
      : rest.meal_types;

    const parsedDietTypes = typeof rest.diet_types === 'string'
      ? (() => { try { return JSON.parse(rest.diet_types); } catch { return []; } })()
      : rest.diet_types;

    return {
      ...rest,
      instructions: parsedInstructions,
      meal_types: parsedMealTypes,
      diet_types: parsedDietTypes,
      ingredients,
      tags,
    } as RecipeDetail;
  }, [data]);

  return { recipe, isLoading: loading };
}
