import { useEffect, useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { extractFirstNode, extractNodes, apolloClient } from '@/lib/graphql-client';
import { emitEvent, useAppEvent } from '@/lib/reactive';
import { GET_ACTIVE_MEAL_PLAN, GET_MEAL_PLAN_ENTRIES } from '@/graphql/queries';
import { DELETE_MEAL_PLAN_ENTRY } from '@/graphql/mutations';
import { useAuth } from '@/providers/AuthProvider';

// ---------------------------------------------------------------------------
// Types (unchanged — all consumers work the same)
// ---------------------------------------------------------------------------

export type MealPlanEntry = {
  id: string;
  meal_type: string;
  plan_date: string;
  servings: number;
  calories: number | null;
  protein_g: number | null;
  fat_g: number | null;
  carbs_g: number | null;
  fibre_g: number | null;
  notes: string | null;
  recipe: {
    id: string;
    title: string;
    image_url: string | null;
    calories_per_serving: number | null;
    protein_per_serving: number | null;
    fat_per_serving: number | null;
    carbs_per_serving: number | null;
    fibre_per_serving: number | null;
    prep_time_min: number | null;
    cook_time_min: number | null;
  } | null;
};

export type MealPlan = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

// ---------------------------------------------------------------------------
// GraphQL response types
// ---------------------------------------------------------------------------

type MealPlanResponse = {
  meal_plansCollection: {
    edges: { node: MealPlan }[];
  };
};

type EntryNode = Omit<MealPlanEntry, 'recipe'> & {
  recipes: MealPlanEntry['recipe']; // pg_graphql FK field is plural
};

type EntriesResponse = {
  meal_plan_entriesCollection: {
    edges: { node: EntryNode }[];
  };
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useActiveMealPlan() {
  const { user } = useAuth();

  // 1. Fetch the active plan
  const {
    data: planData,
    loading: planLoading,
    refetch: refetchPlan,
  } = useQuery<MealPlanResponse>(GET_ACTIVE_MEAL_PLAN, {
    variables: { userId: user?.id },
    skip: !user,
    fetchPolicy: 'cache-and-network',
  });

  const plan = planData ? extractFirstNode(planData.meal_plansCollection) : null;

  // 2. Fetch entries for the plan
  const {
    data: entriesData,
    loading: entriesLoading,
    refetch: refetchEntries,
  } = useQuery<EntriesResponse>(GET_MEAL_PLAN_ENTRIES, {
    variables: { planId: plan?.id },
    skip: !plan?.id,
    fetchPolicy: 'cache-and-network',
  });

  // 3. Delete mutation
  const [deleteMutation] = useMutation(DELETE_MEAL_PLAN_ENTRY);

  // Transform entries: pg_graphql returns `recipes` (FK name), we need `recipe`
  const entries = useMemo<MealPlanEntry[]>(() => {
    if (!entriesData) return [];
    const nodes = extractNodes(entriesData.meal_plan_entriesCollection);
    return nodes.map((n) => ({
      ...n,
      recipe: n.recipes || null,
    })) as unknown as MealPlanEntry[];
  }, [entriesData]);

  const isLoading = planLoading || entriesLoading;

  // Combined refetch
  const refetch = useCallback(async () => {
    await refetchPlan();
    if (plan?.id) await refetchEntries();
  }, [refetchPlan, refetchEntries, plan?.id]);

  // Listen for MEAL_PLAN_UPDATED events from other components (e.g. ai-suggestion)
  useAppEvent('MEAL_PLAN_UPDATED', useCallback(() => {
    refetch();
  }, [refetch]));

  // Get entries for a specific date
  const getEntriesForDate = useCallback(
    (dateStr: string) => entries.filter((e) => e.plan_date === dateStr),
    [entries],
  );

  // Get today's entries
  const todayStr = new Date().toISOString().split('T')[0];
  const todayEntries = useMemo(() => getEntriesForDate(todayStr), [getEntriesForDate, todayStr]);

  // Calculate daily macros for a set of entries
  const calcDayMacros = useCallback((dayEntries: MealPlanEntry[]) => {
    return dayEntries.reduce(
      (acc, e) => ({
        calories:
          acc.calories + (e.calories || e.recipe?.calories_per_serving || 0) * (e.servings || 1),
        protein:
          acc.protein + (e.protein_g || e.recipe?.protein_per_serving || 0) * (e.servings || 1),
        carbs: acc.carbs + (e.carbs_g || e.recipe?.carbs_per_serving || 0) * (e.servings || 1),
        fat: acc.fat + (e.fat_g || e.recipe?.fat_per_serving || 0) * (e.servings || 1),
        fibre: acc.fibre + (e.fibre_g || e.recipe?.fibre_per_serving || 0) * (e.servings || 1),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fibre: 0 },
    );
  }, []);

  // Remove a meal plan entry by ID (optimistic + Apollo cache eviction)
  const removeEntry = useCallback(
    async (entryId: string) => {
      try {
        await deleteMutation({
          variables: { entryId },
          // Evict the deleted entry from Apollo's normalised cache
          update: (cache) => {
            cache.evict({ id: cache.identify({ __typename: 'meal_plan_entries', id: entryId }) });
            cache.gc();
          },
        });

        emitEvent({ type: 'ENTRY_REMOVED', entryId });
        emitEvent({ type: 'MEAL_PLAN_UPDATED' });
        return true;
      } catch {
        // Revert on failure by refetching
        await refetch();
        return false;
      }
    },
    [deleteMutation, refetch],
  );

  return {
    plan,
    entries,
    todayEntries,
    getEntriesForDate,
    calcDayMacros,
    removeEntry,
    isLoading,
    refetch,
  };
}
