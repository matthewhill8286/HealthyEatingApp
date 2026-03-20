/**
 * useFatSecretSearch — searches the FatSecret Recipe API via our Edge Function proxy.
 *
 * The Edge Function handles OAuth 1.0a signing server-side.
 * Returns typed results with images, macros, ingredients.
 *
 * NOTE: File kept as useEdamamSearch.ts to avoid renaming across all imports.
 *       Internally it now calls the search-fatsecret Edge Function.
 */
import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FatSecretIngredient = {
  name: string;
  quantity: number;
  unit: string;
  weight_g: number;
  category: string | null;
  image_url: string | null;
};

export type FatSecretRecipe = {
  fatsecret_id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  source: string | null;
  source_url: string | null;
  servings: number;
  total_time_min: number | null;
  cuisine: string | null;
  meal_types: string[];
  diet_types: string[];
  calories_per_serving: number | null;
  protein_per_serving: number | null;
  fat_per_serving: number | null;
  carbs_per_serving: number | null;
  fibre_per_serving: number | null;
  sugar_per_serving: number | null;
  sodium_per_serving: number | null;
  ingredient_lines: string[];
  ingredients: FatSecretIngredient[];
};

// Re-export with old names for backward compatibility
export type EdamamRecipe = FatSecretRecipe;
export type EdamamIngredient = FatSecretIngredient;

export type SearchParams = {
  query: string;
  recipeType?: string;
  maxResults?: number;
  pageNumber?: number;
};

// ---------------------------------------------------------------------------
// Module-level search cache (survives re-renders, cleared on app restart)
// ---------------------------------------------------------------------------

type CacheEntry = {
  results: FatSecretRecipe[];
  totalCount: number;
  timestamp: number;
};

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const searchCache = new Map<string, CacheEntry>();

function getCacheKey(params: SearchParams): string {
  return `${params.query.trim().toLowerCase()}::${params.recipeType ?? ''}::${params.maxResults ?? 20}`;
}

function getCached(key: string): CacheEntry | null {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }
  return entry;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useEdamamSearch() {
  const [results, setResults] = useState<FatSecretRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (params: SearchParams) => {
    if (!params.query || params.query.trim().length < 2) {
      setResults([]);
      setTotalCount(0);
      return;
    }

    const cacheKey = getCacheKey(params);

    // Serve from cache immediately — no loading state, instant results
    const cached = getCached(cacheKey);
    if (cached) {
      setResults(cached.results);
      setTotalCount(cached.totalCount);
      setError(null);
      return;
    }

    // Abort any in-flight request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    abortRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-fatsecret', {
        body: {
          query: params.query.trim(),
          recipeType: params.recipeType,
          maxResults: params.maxResults ?? 20,
          pageNumber: params.pageNumber ?? 0,
        },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Search failed');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      const recipes = data?.recipes ?? [];
      const count = data?.count ?? 0;

      // Store in cache
      searchCache.set(cacheKey, { results: recipes, totalCount: count, timestamp: Date.now() });

      setResults(recipes);
      setTotalCount(count);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Search failed');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
    setTotalCount(0);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    totalCount,
    search,
    clearResults,
  };
}
