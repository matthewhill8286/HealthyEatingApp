/**
 * useFatSecretImport — imports a FatSecret recipe into the local DB.
 *
 * Calls the import-fatsecret Edge Function which handles:
 * - Fetching full recipe details via recipe.get (OAuth 1.0a signed)
 * - Idempotent upsert (won't duplicate if already imported)
 * - Ingredient creation/linking
 * - Full nutrition data + cooking directions
 *
 * Returns the local recipe_id so the caller can immediately add it to a meal plan.
 *
 * NOTE: File kept as useEdamamImport.ts to avoid renaming across all imports.
 */
import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { emitEvent } from '@/lib/reactive';
import type { FatSecretRecipe } from './useEdamamSearch';

export type ImportResult = {
  recipe_id: string;
  already_existed: boolean;
};

// ---------------------------------------------------------------------------
// Module-level import cache (fatsecret_id → recipe_id)
// Persists for the session so tapping a previously-imported card is instant.
// ---------------------------------------------------------------------------

const importCache = new Map<string, string>();

export function useEdamamImport() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const importRecipe = useCallback(
    async (recipe: FatSecretRecipe): Promise<ImportResult | null> => {
      // Return cached recipe_id immediately — no network call needed
      const cached = importCache.get(recipe.fatsecret_id);
      if (cached) {
        return { recipe_id: cached, already_existed: true };
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke('import-fatsecret', {
          body: {
            fatsecret_id: recipe.fatsecret_id,
            searchData: {
              title: recipe.title,
              description: recipe.description,
              image_url: recipe.image_url,
              source_url: recipe.source_url,
              cuisine: recipe.cuisine,
              meal_types: recipe.meal_types,
              calories_per_serving: recipe.calories_per_serving,
              protein_per_serving: recipe.protein_per_serving,
              fat_per_serving: recipe.fat_per_serving,
              carbs_per_serving: recipe.carbs_per_serving,
            },
          },
        });

        if (fnError) {
          throw new Error(fnError.message || 'Import failed');
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        // Store in cache so subsequent taps on this card are instant
        importCache.set(recipe.fatsecret_id, data.recipe_id);

        // Emit event so My Recipes list refreshes (only on new imports)
        if (!data.already_existed) {
          emitEvent({ type: 'RECIPE_IMPORTED' });
        }

        return {
          recipe_id: data.recipe_id,
          already_existed: data.already_existed ?? false,
        };
      } catch (err: any) {
        setError(err.message || 'Import failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { importRecipe, loading, error };
}
