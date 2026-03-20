/**
 * useAllergenFilter – cross-references recipe ingredients against the user's
 * allergies, disliked ingredients, and avoided ingredients to flag or hide
 * recipes that contain problem items.
 *
 * Also provides a helper to check AI suggestions (which carry inline ingredient lists).
 */
import { useMemo } from 'react';
import { useQuery } from '@apollo/client/react';
import { extractNodes } from '@/lib/graphql-client';
import { GET_RECIPE_INGREDIENT_NAMES } from '@/graphql/queries';
import { useProfile } from '@/hooks/useProfile';
import { useTasteProfile } from '@/hooks/useTasteProfile';
import { useAuth } from '@/providers/AuthProvider';
import type { RecipeSummary } from '@/hooks/useRecipes';
import type { MealSuggestion } from '@/hooks/useAICoach';

// ---------------------------------------------------------------------------
// GraphQL response type
// ---------------------------------------------------------------------------

type IngNameNode = {
  recipe_id: string;
  ingredients: { name: string } | null;
};

type IngNamesResponse = {
  recipe_ingredientsCollection: {
    edges: { node: IngNameNode }[];
  };
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AllergenMatch = {
  ingredient: string; // the ingredient name that matched
  reason: 'allergy' | 'disliked' | 'avoided';
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAllergenFilter() {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { tasteProfile } = useTasteProfile();

  // Fetch all recipe→ingredient name mappings (lightweight, cached aggressively)
  const { data } = useQuery<IngNamesResponse>(GET_RECIPE_INGREDIENT_NAMES, {
    skip: !user,
    fetchPolicy: 'cache-and-network',
    nextFetchPolicy: 'cache-first',
  });

  // Build recipe_id → ingredient names map
  const recipeIngredientMap = useMemo<Record<string, string[]>>(() => {
    if (!data) return {};
    const nodes = extractNodes(data.recipe_ingredientsCollection) as IngNameNode[];
    const map: Record<string, string[]> = {};
    for (const n of nodes) {
      if (!n.ingredients?.name) continue;
      if (!map[n.recipe_id]) map[n.recipe_id] = [];
      map[n.recipe_id].push(n.ingredients.name.toLowerCase());
    }
    return map;
  }, [data]);

  // Normalised restriction lists (all lowercased for matching)
  const allergies = useMemo(
    () => (profile?.allergies || []).map((a: string) => a.toLowerCase()),
    [profile?.allergies],
  );

  const disliked = useMemo(
    () => (profile?.disliked_ingredients || []).map((d: string) => d.toLowerCase()),
    [profile?.disliked_ingredients],
  );

  const avoided = useMemo(
    () => (tasteProfile?.avoided_ingredients || []).map((a) => a.toLowerCase()),
    [tasteProfile?.avoided_ingredients],
  );

  const hasRestrictions = allergies.length > 0 || disliked.length > 0 || avoided.length > 0;

  // -------------------------------------------------------------------------
  // Check a single ingredient name against all restriction lists
  // -------------------------------------------------------------------------
  function checkIngredient(ingredientName: string): AllergenMatch | null {
    const lower = ingredientName.toLowerCase();
    for (const a of allergies) {
      if (lower.includes(a) || a.includes(lower)) {
        return { ingredient: ingredientName, reason: 'allergy' };
      }
    }
    for (const d of disliked) {
      if (lower.includes(d) || d.includes(lower)) {
        return { ingredient: ingredientName, reason: 'disliked' };
      }
    }
    for (const av of avoided) {
      if (lower.includes(av) || av.includes(lower)) {
        return { ingredient: ingredientName, reason: 'avoided' };
      }
    }
    return null;
  }

  // -------------------------------------------------------------------------
  // Check a recipe by ID — returns all matches
  // -------------------------------------------------------------------------
  function checkRecipe(recipeId: string): AllergenMatch[] {
    const ingredientNames = recipeIngredientMap[recipeId] || [];
    const matches: AllergenMatch[] = [];
    for (const name of ingredientNames) {
      const match = checkIngredient(name);
      if (match) matches.push(match);
    }
    return matches;
  }

  // -------------------------------------------------------------------------
  // Check an AI suggestion (uses inline ingredients list)
  // -------------------------------------------------------------------------
  function checkAISuggestion(suggestion: MealSuggestion): AllergenMatch[] {
    const matches: AllergenMatch[] = [];
    for (const ing of suggestion.ingredients) {
      const match = checkIngredient(ing.name);
      if (match) matches.push(match);
    }
    return matches;
  }

  // -------------------------------------------------------------------------
  // Filter helpers — return safe items only
  // -------------------------------------------------------------------------
  function filterRecipes(recipes: RecipeSummary[]): RecipeSummary[] {
    if (!hasRestrictions) return recipes;
    return recipes.filter((r) => {
      const matches = checkRecipe(r.id);
      // Hide recipes with allergens; keep recipes with dislikes/avoided (show warning instead)
      return !matches.some((m) => m.reason === 'allergy');
    });
  }

  function filterAISuggestions(suggestions: MealSuggestion[]): MealSuggestion[] {
    if (!hasRestrictions) return suggestions;
    return suggestions.filter((s) => {
      const matches = checkAISuggestion(s);
      return !matches.some((m) => m.reason === 'allergy');
    });
  }

  return {
    checkRecipe,
    checkAISuggestion,
    filterRecipes,
    filterAISuggestions,
    hasRestrictions,
    allergies,
    disliked,
    avoided,
  };
}
