/**
 * search-fatsecret — Supabase Edge Function
 *
 * Proxies recipe search requests to the FatSecret Platform REST API
 * using OAuth 2.0 Client Credentials flow.
 * Keeps API credentials server-side.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

const CLIENT_ID = Deno.env.get('FATSECRET_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('FATSECRET_CLIENT_SECRET') ?? '';
const TOKEN_URL = 'https://oauth.fatsecret.com/connect/token';
const API_URL = 'https://platform.fatsecret.com/rest/server.api';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// OAuth 2.0 Token Management
// ---------------------------------------------------------------------------

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiry - 60_000) {
    return cachedToken;
  }

  const encoder = new TextEncoder();
  const credentials = base64Encode(encoder.encode(`${CLIENT_ID}:${CLIENT_SECRET}`));

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials&scope=basic',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);

  return cachedToken!;
}

// ---------------------------------------------------------------------------
// Meal type mapping
// ---------------------------------------------------------------------------

function mapMealTypes(types: string | string[] | undefined): string[] {
  if (!types) return [];
  const arr = Array.isArray(types) ? types : [types];
  const map: Record<string, string> = {
    'Breakfast': 'breakfast',
    'Lunch': 'lunch',
    'Main Dish': 'dinner',
    'Dinner': 'dinner',
    'Snack': 'afternoon_snack',
    'Side Dish': 'lunch',
    'Dessert': 'afternoon_snack',
    'Appetizer': 'afternoon_snack',
    'Soup': 'lunch',
    'Salad': 'lunch',
    'Beverage': 'afternoon_snack',
  };
  return [...new Set(arr.map((t) => map[t] || t.toLowerCase()).filter(Boolean))];
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!CLIENT_ID || !CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: 'FatSecret API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const body = await req.json();
    const { query, recipeType, maxResults = 20, pageNumber = 0 } = body;

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing required "query" field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Get OAuth 2.0 Bearer token
    const token = await getAccessToken();

    // Build API request
    const params = new URLSearchParams({
      method: 'recipes.search',
      search_expression: query,
      format: 'json',
      max_results: String(maxResults),
      page_number: String(pageNumber),
    });

    if (recipeType) {
      params.set('recipe_type', recipeType);
    }

    const fsRes = await fetch(`${API_URL}?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!fsRes.ok) {
      const text = await fsRes.text();
      console.error('FatSecret API error:', fsRes.status, text);
      return new Response(
        JSON.stringify({ error: `FatSecret API returned ${fsRes.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const fsData = await fsRes.json();
    const recipesData = fsData?.recipes?.recipe;

    if (!recipesData || !Array.isArray(recipesData)) {
      return new Response(
        JSON.stringify({ count: 0, recipes: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const totalResults = parseInt(fsData?.recipes?.total_results ?? '0', 10);

    // Transform to our app's format
    const recipes = recipesData.map((r: any) => {
      const nutrition = r.recipe_nutrition ?? {};

      // Parse recipe_types
      const rawTypes = r.recipe_types?.recipe_type;
      const typeList = Array.isArray(rawTypes) ? rawTypes : rawTypes ? [rawTypes] : [];

      // Parse ingredients summary
      const rawIngredients = r.recipe_ingredients?.ingredient;
      const ingredientList = Array.isArray(rawIngredients) ? rawIngredients : rawIngredients ? [rawIngredients] : [];

      return {
        fatsecret_id: String(r.recipe_id),
        title: r.recipe_name ?? 'Untitled',
        description: r.recipe_description ?? null,
        image_url: r.recipe_image ?? null,
        source: 'FatSecret',
        source_url: r.recipe_url ?? null,
        servings: 1,
        total_time_min: null,
        cuisine: null,
        meal_types: mapMealTypes(typeList),
        diet_types: [] as string[],
        calories_per_serving: nutrition.calories
          ? Math.round(parseFloat(nutrition.calories))
          : null,
        protein_per_serving: nutrition.protein
          ? Math.round(parseFloat(nutrition.protein) * 10) / 10
          : null,
        fat_per_serving: nutrition.fat
          ? Math.round(parseFloat(nutrition.fat) * 10) / 10
          : null,
        carbs_per_serving: nutrition.carbohydrate
          ? Math.round(parseFloat(nutrition.carbohydrate) * 10) / 10
          : null,
        fibre_per_serving: null,
        sugar_per_serving: null,
        sodium_per_serving: null,
        ingredient_lines: ingredientList.map((i: any) =>
          typeof i === 'string' ? i : i.ingredient_description ?? i.food_name ?? ''
        ),
        ingredients: ingredientList.map((i: any) => ({
          name: typeof i === 'string' ? i : i.food_name ?? i.ingredient_description ?? '',
          quantity: typeof i === 'object' ? parseFloat(i.number_of_units ?? '0') : 0,
          unit: typeof i === 'object' ? (i.measurement_description ?? '') : '',
          weight_g: 0,
          category: null,
          image_url: null,
        })),
      };
    });

    return new Response(
      JSON.stringify({
        count: totalResults,
        page: pageNumber,
        recipes,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('search-fatsecret error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
