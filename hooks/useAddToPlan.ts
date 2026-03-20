/**
 * useAddToPlan — shared hook that handles:
 * 1. Getting (or creating) the active meal plan  via Apollo mutations
 * 2. Inserting a meal_plan_entry              via Apollo mutations
 * 3. Emitting RxJS events so Plan tab auto-refreshes
 */
import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { apolloClient } from '@/lib/graphql-client';
import { extractFirstNode } from '@/lib/graphql-client';
import { GET_ACTIVE_MEAL_PLAN } from '@/graphql/queries';
import { INSERT_MEAL_PLAN, INSERT_MEAL_PLAN_ENTRY } from '@/graphql/mutations';
import { emitEvent } from '@/lib/reactive';
import { useAuth } from '@/providers/AuthProvider';

type MealPlanResponse = {
  meal_plansCollection: {
    edges: { node: { id: string } }[];
  };
};

type InsertPlanResponse = {
  insertIntomeal_plansCollection: {
    records: { id: string; name: string; start_date: string; end_date: string; is_active: boolean }[];
  };
};

type InsertEntryResponse = {
  insertIntomeal_plan_entriesCollection: {
    records: { id: string }[];
  };
};

export type AddToPlanParams = {
  recipeId?: string | null;
  mealType: string;
  servings: number;
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  fibreG?: number;
  notes?: string;
};

export function useAddToPlan() {
  const { user } = useAuth();
  const [insertPlan] = useMutation<InsertPlanResponse>(INSERT_MEAL_PLAN);
  const [insertEntry] = useMutation<InsertEntryResponse>(INSERT_MEAL_PLAN_ENTRY);

  const addToPlan = useCallback(
    async (params: AddToPlanParams): Promise<{ success: boolean; error?: string }> => {
      if (!user) return { success: false, error: 'Not authenticated' };

      try {
        // 1. Get active meal plan from Apollo cache / network
        const { data: planData } = await apolloClient.query<MealPlanResponse>({
          query: GET_ACTIVE_MEAL_PLAN,
          variables: { userId: user.id },
          fetchPolicy: 'cache-first',
        });

        let planId = planData ? extractFirstNode(planData.meal_plansCollection)?.id ?? null : null;

        // 2. Create a new plan if none exists
        if (!planId) {
          const today = new Date();
          const monday = new Date(today);
          monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);

          const { data: newPlanData } = await insertPlan({
            variables: {
              userId: user.id,
              name: 'My Meal Plan',
              startDate: monday.toISOString().split('T')[0],
              endDate: sunday.toISOString().split('T')[0],
              isActive: true,
            },
          });

          planId =
            (newPlanData as InsertPlanResponse)?.insertIntomeal_plansCollection?.records?.[0]?.id ??
            null;

          if (!planId) {
            return { success: false, error: 'Could not create a meal plan.' };
          }
        }

        // 3. Insert the entry
        // pg_graphql BigFloat columns require string values, not numbers
        const todayStr = new Date().toISOString().split('T')[0];
        const { data: entryData } = await insertEntry({
          variables: {
            mealPlanId: planId,
            recipeId: params.recipeId || null,
            mealType: params.mealType,
            planDate: todayStr,
            servings: String(params.servings),
            calories: String(params.calories),
            proteinG: String(params.proteinG),
            fatG: String(params.fatG),
            carbsG: String(params.carbsG),
            fibreG: String(params.fibreG ?? 0),
            notes: params.notes || null,
          },
        });

        const entryId =
          (entryData as InsertEntryResponse)?.insertIntomeal_plan_entriesCollection?.records?.[0]
            ?.id;

        if (!entryId) {
          return { success: false, error: 'Failed to add entry.' };
        }

        // 4. Notify other components
        emitEvent({ type: 'MEAL_PLAN_UPDATED' });
        emitEvent({
          type: 'RECIPE_ADDED_TO_PLAN',
          recipeId: params.recipeId || null,
          mealType: params.mealType,
        });

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'Failed to add to plan' };
      }
    },
    [user, insertPlan, insertEntry],
  );

  return { addToPlan };
}
