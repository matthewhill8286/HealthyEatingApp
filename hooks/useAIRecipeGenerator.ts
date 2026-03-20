import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';

export type GenerateParams = {
  prompt?: string;
  cuisine?: string;
  mealType?: string;
  maxPrepTime?: number;
  dietaryOverride?: string;
  servings?: number;
};

export type GeneratedRecipe = {
  id: string;
  title: string;
  description: string;
  cuisine: string;
  difficulty: string;
  prep_time_min: number;
  cook_time_min: number;
  servings: number;
  calories_per_serving: number;
  protein_per_serving: number;
  fat_per_serving: number;
  carbs_per_serving: number;
  fibre_per_serving: number;
  meal_types: string[];
  diet_types: string[];
  instructions: { step: number; text: string }[];
  ingredients: { name: string; quantity: number; unit: string; preparation_note?: string }[];
  is_ai_generated: boolean;
};

export function useAIRecipeGenerator() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedRecipe, setGeneratedRecipe] = useState<GeneratedRecipe | null>(null);

  const generate = useCallback(
    async (params: GenerateParams): Promise<{ recipe_id: string; recipe: GeneratedRecipe } | null> => {
      if (!user) {
        setError('Not authenticated');
        return null;
      }

      setLoading(true);
      setError(null);
      setGeneratedRecipe(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          'generate-recipe',
          { body: params }
        );

        if (fnError) {
          setError(fnError.message || 'Generation failed');
          return null;
        }

        if (data?.error) {
          setError(data.error);
          return null;
        }

        setGeneratedRecipe(data.recipe);
        return data;
      } catch (err: any) {
        setError(err.message || 'Generation failed');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  const clearGenerated = useCallback(() => {
    setGeneratedRecipe(null);
    setError(null);
  }, []);

  return { generate, generatedRecipe, loading, error, clearGenerated };
}
