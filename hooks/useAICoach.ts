import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useProfile } from '@/hooks/useProfile';
import { useTasteProfile } from '@/hooks/useTasteProfile';

type CoachMode = 'daily_tip' | 'suggest_meals' | 'smart_swap';

export type DailyTipResponse = {
  tip: string;
};

export type MealSuggestion = {
  title: string;
  description: string;
  cuisine: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  prep_time_min: number;
  cook_time_min: number;
  servings: number;
  diet_types: string[];
  estimated_calories: number;
  estimated_protein_g: number;
  estimated_carbs_g: number;
  estimated_fat_g: number;
  estimated_fibre_g: number;
  ingredients: { name: string; quantity: string; unit: string }[];
  instructions: { step: number; text: string; duration_min: number }[];
  reason: string;
};

export type SuggestMealsResponse = {
  coach_message: string;
  suggestions: MealSuggestion[];
};

export type SmartSwap = {
  original: string;
  replacement: string;
  reason: string;
  macro_impact: string;
};

export type SmartSwapResponse = {
  coach_message: string;
  swaps: SmartSwap[];
};

type DietaryRestrictions = {
  allergies?: string[];
  disliked_ingredients?: string[];
  avoided_ingredients?: string[];
  dietary_preference?: string | null;
};

async function callCoach<T>(
  mode: CoachMode,
  params?: Record<string, string>,
  restrictions?: DietaryRestrictions,
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const response = await supabase.functions.invoke('ai-coach', {
    body: {
      mode,
      ...params,
      // Pass dietary restrictions so the AI can exclude allergens & dislikes
      ...(restrictions?.allergies?.length && { allergies: restrictions.allergies }),
      ...(restrictions?.disliked_ingredients?.length && { disliked_ingredients: restrictions.disliked_ingredients }),
      ...(restrictions?.avoided_ingredients?.length && { avoided_ingredients: restrictions.avoided_ingredients }),
      ...(restrictions?.dietary_preference && { dietary_preference: restrictions.dietary_preference }),
    },
  });

  if (response.error) {
    throw new Error(response.error.message || 'Coach request failed');
  }

  return response.data as T;
}

export function useDailyTip() {
  const [tip, setTip] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTip = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await callCoach<DailyTipResponse>('daily_tip');
      setTip(data.tip);
    } catch (err: any) {
      setError(err.message);
      // Fallback tip if AI fails
      setTip("Focus on getting a good variety of colours on your plate today — different colours mean different nutrients!");
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { tip, isLoading, error, fetchTip };
}

export function useMealSuggestions() {
  const [suggestions, setSuggestions] = useState<MealSuggestion[]>([]);
  const [coachMessage, setCoachMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useProfile();
  const { tasteProfile } = useTasteProfile();

  // Build restriction set from profile + taste profile
  const restrictions: DietaryRestrictions = {
    allergies: profile?.allergies || [],
    disliked_ingredients: profile?.disliked_ingredients || [],
    avoided_ingredients: tasteProfile?.avoided_ingredients || [],
    dietary_preference: profile?.dietary_preference,
  };

  const fetchSuggestions = useCallback(async (mealType: string = 'dinner', forDate?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await callCoach<SuggestMealsResponse>('suggest_meals', {
        meal_type: mealType,
        ...(forDate && { for_date: forDate }),
      }, restrictions);
      setSuggestions(data.suggestions || []);
      setCoachMessage(data.coach_message || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [restrictions.allergies?.length, restrictions.disliked_ingredients?.length, restrictions.avoided_ingredients?.length, restrictions.dietary_preference]);

  return { suggestions, coachMessage, isLoading, error, fetchSuggestions };
}

export function useSmartSwap() {
  const [swaps, setSwaps] = useState<SmartSwap[]>([]);
  const [coachMessage, setCoachMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useProfile();
  const { tasteProfile } = useTasteProfile();

  const restrictions: DietaryRestrictions = {
    allergies: profile?.allergies || [],
    disliked_ingredients: profile?.disliked_ingredients || [],
    avoided_ingredients: tasteProfile?.avoided_ingredients || [],
    dietary_preference: profile?.dietary_preference,
  };

  const fetchSwaps = useCallback(async (recipeId: string, reason: string = 'make it healthier') => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await callCoach<SmartSwapResponse>('smart_swap', {
        recipe_id: recipeId,
        swap_reason: reason,
      }, restrictions);
      setSwaps(data.swaps || []);
      setCoachMessage(data.coach_message || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [restrictions.allergies?.length, restrictions.disliked_ingredients?.length, restrictions.avoided_ingredients?.length, restrictions.dietary_preference]);

  return { swaps, coachMessage, isLoading, error, fetchSwaps };
}
