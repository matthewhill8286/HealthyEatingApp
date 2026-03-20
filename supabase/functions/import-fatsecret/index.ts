/**
 * import-fatsecret — Supabase Edge Function
 *
 * Fetches full recipe details from FatSecret (recipe.get) using OAuth 2.0
 * and saves into the local DB (recipes + recipe_ingredients tables).
 * Idempotent: if already imported, returns existing recipe_id.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { encode as base64Encode } from 'https://deno.land/std@0.168.0/encoding/base64.ts';

const CLIENT_ID = Deno.env.get('FATSECRET_CLIENT_ID') ?? '';
const CLIENT_SECRET = Deno.env.get('FATSECRET_CLIENT_SECRET') ?? '';
const TOKEN_URL = 'https://oauth.fatsecret.com/connect/token';
const API_URL = 'https://platform.fatsecret.com/rest/server.api';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ---------------------------------------------------------------------------
// OAuth 2.0 Token Management
// ---------------------------------------------------------------------------

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAccessToken(): Promise<string> {
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

const VALID_MEAL_TYPES = new Set(['breakfast','morning_snack','lunch','afternoon_snack','dinner','evening_snack']);

function mapMealTypes(types: string[]): string[] {
  const map: Record<string, string> = {
    'Breakfast': 'breakfast', 'Lunch': 'lunch', 'Main Dish': 'dinner',
    'Dinner': 'dinner', 'Snack': 'afternoon_snack', 'Side Dish': 'lunch',
    'Dessert': 'afternoon_snack', 'Appetizer': 'afternoon_snack',
    'Soup': 'lunch', 'Salad': 'lunch',
  };
  const mapped = [...new Set(types.map((t) => map[t] || t.toLowerCase()).filter(Boolean))];
  const valid = mapped.filter(m => VALID_MEAL_TYPES.has(m));
  return valid.length > 0 ? valid : [];
}

// ---------------------------------------------------------------------------
// Unit mapping (FatSecret free text → unit_type enum)
// ---------------------------------------------------------------------------

const VALID_UNITS = new Set(['g','mg','mcg','ml','l','tsp','tbsp','cup','oz','lb','piece','slice','clove','bunch','pinch','to_taste']);

function mapUnit(raw: string): string {
  const s = (raw || '').toLowerCase().trim();
  if (VALID_UNITS.has(s)) return s;
  const map: Record<string, string> = {
    'tablespoon': 'tbsp', 'tablespoons': 'tbsp',
    'teaspoon': 'tsp', 'teaspoons': 'tsp',
    'cups': 'cup', 'ounce': 'oz', 'ounces': 'oz',
    'pound': 'lb', 'pounds': 'lb', 'lbs': 'lb',
    'gram': 'g', 'grams': 'g',
    'milligram': 'mg', 'milligrams': 'mg',
    'milliliter': 'ml', 'milliliters': 'ml', 'millilitres': 'ml',
    'liter': 'l', 'liters': 'l', 'litres': 'l',
    'cloves': 'clove', 'slices': 'slice', 'pieces': 'piece',
    'serving': 'piece', 'whole': 'piece', 'large': 'piece',
    'medium': 'piece', 'small': 'piece', 'each': 'piece',
  };
  return map[s] || 'piece';
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth — get the calling user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonResponse({ error: 'Missing Authorization header' }, 401);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;

    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
      auth: { persistSession: false },
    });

    const body = await req.json();
    const { fatsecret_id, searchData } = body;

    if (!fatsecret_id) return jsonResponse({ error: 'Missing fatsecret_id' }, 400);

    // Idempotency — check if already imported
    const { data: existing } = await admin
      .from('recipes')
      .select('id')
      .eq('created_by', user.id)
      .like('source_url', `%recipe_id=${fatsecret_id}%`)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return jsonResponse({ recipe_id: existing.id, already_existed: true });
    }

    // Get OAuth 2.0 Bearer token
    const token = await getAccessToken();

    // Fetch full recipe details from FatSecret
    const params = new URLSearchParams({
      method: 'recipe.get',
      recipe_id: fatsecret_id,
      format: 'json',
    });

    const detailRes = await fetch(`${API_URL}?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    let fullRecipe: any = null;
    if (detailRes.ok) {
      const detailData = await detailRes.json();
      fullRecipe = detailData?.recipe;
    }

    // Use full details if available, fall back to search data
    const title = fullRecipe?.recipe_name ?? searchData?.title ?? 'Untitled';
    const description = fullRecipe?.recipe_description ?? searchData?.description ?? '';
    const imageUrl = fullRecipe?.recipe_images?.recipe_image?.[0] ?? fullRecipe?.recipe_image ?? searchData?.image_url ?? null;
    const servings = parseInt(fullRecipe?.number_of_servings ?? '1', 10) || 1;
    const cookTime = fullRecipe?.cooking_time_min ? parseInt(fullRecipe.cooking_time_min, 10) : null;
    const prepTime = fullRecipe?.preparation_time_min ? parseInt(fullRecipe.preparation_time_min, 10) : null;
    const totalTime = (cookTime || 0) + (prepTime || 0) || null;
    const sourceUrl = fullRecipe?.recipe_url ?? searchData?.source_url ?? `https://www.fatsecret.com/recipes/recipe_id=${fatsecret_id}`;

    // Nutrition
    const serving = fullRecipe?.serving_sizes?.serving;
    const firstServing = Array.isArray(serving) ? serving[0] : serving;

    const calories = firstServing?.calories
      ? Math.round(parseFloat(firstServing.calories))
      : searchData?.calories_per_serving ?? null;
    const protein = firstServing?.protein
      ? Math.round(parseFloat(firstServing.protein) * 10) / 10
      : searchData?.protein_per_serving ?? null;
    const fat = firstServing?.fat
      ? Math.round(parseFloat(firstServing.fat) * 10) / 10
      : searchData?.fat_per_serving ?? null;
    const carbs = firstServing?.carbohydrate
      ? Math.round(parseFloat(firstServing.carbohydrate) * 10) / 10
      : searchData?.carbs_per_serving ?? null;
    const fibre = firstServing?.fiber
      ? Math.round(parseFloat(firstServing.fiber) * 10) / 10
      : null;
    const sugar = firstServing?.sugar
      ? Math.round(parseFloat(firstServing.sugar) * 10) / 10
      : null;
    const sodium = firstServing?.sodium
      ? Math.round(parseFloat(firstServing.sodium))
      : null;

    // Difficulty from time
    const totalMin = (prepTime || 0) + (cookTime || 0);
    const difficulty = totalMin <= 15 ? 'easy' : totalMin <= 45 ? 'medium' : totalMin <= 90 ? 'hard' : totalMin > 90 ? 'expert' : null;

    // Directions → instructions (jsonb — pass as object, not string)
    const rawDirections = fullRecipe?.directions?.direction;
    const dirArr = Array.isArray(rawDirections) ? rawDirections : rawDirections ? [rawDirections] : [];
    const instructions = {
      steps: dirArr.map((d: any, i: number) => ({
        step: typeof d === 'object' ? parseInt(d.direction_number ?? String(i + 1), 10) : i + 1,
        text: typeof d === 'object' ? (d.direction_description ?? String(d)) : String(d),
      })),
    };
    if (instructions.steps.length === 0) {
      instructions.steps.push({ step: 1, text: `View full recipe at: ${sourceUrl}` });
    }

    // Recipe types → meal_types (Postgres enum array)
    const rawTypes = fullRecipe?.recipe_types?.recipe_type ?? searchData?.meal_types ?? [];
    const typeArr = Array.isArray(rawTypes) ? rawTypes : [rawTypes];
    let mealTypes = mapMealTypes(typeArr);
    if (mealTypes.length === 0 && searchData?.meal_type) {
      mealTypes = [searchData.meal_type];
    }
    const mealTypesArr = mealTypes.length > 0 ? `{${mealTypes.join(',')}}` : '{}';

    // Categories → extract cuisine
    const rawCats = fullRecipe?.recipe_categories?.recipe_category;
    const catArr = Array.isArray(rawCats) ? rawCats : rawCats ? [rawCats] : [];
    const cuisineCat = catArr.find((c: any) =>
      typeof c === 'object' && c.recipe_category_name &&
      ['Italian', 'Mexican', 'Chinese', 'Japanese', 'Indian', 'Thai', 'French',
       'Mediterranean', 'Korean', 'Vietnamese', 'American', 'British', 'Greek',
       'Turkish', 'Moroccan'].includes(c.recipe_category_name)
    );
    const cuisine = cuisineCat?.recipe_category_name ?? searchData?.cuisine ?? null;

    // Insert recipe
    const { data: inserted, error: insertErr } = await admin.from('recipes').insert({
      title,
      description,
      cuisine,
      difficulty,
      prep_time_min: prepTime,
      cook_time_min: cookTime,
      servings,
      calories_per_serving: calories,
      protein_per_serving: protein,
      fat_per_serving: fat,
      carbs_per_serving: carbs,
      fibre_per_serving: fibre,
      sugar_per_serving: sugar,
      sodium_per_serving: sodium,
      instructions,                  // jsonb — pass object directly
      meal_types: mealTypesArr,      // Postgres array literal
      diet_types: '{}',              // Postgres empty array
      image_url: imageUrl,
      source_url: sourceUrl,
      is_ai_generated: false,
      is_public: false,
      created_by: user.id,
      notes: `Imported from FatSecret (ID: ${fatsecret_id})`,
    }).select('id').single();

    if (insertErr) {
      console.error('Recipe insert error:', insertErr);
      return jsonResponse({ error: insertErr.message }, 500);
    }

    const recipeId = inserted!.id;

    // Insert ingredients
    const rawIngredients = fullRecipe?.ingredients?.ingredient;
    const ingArr = Array.isArray(rawIngredients) ? rawIngredients : rawIngredients ? [rawIngredients] : [];

    for (let i = 0; i < ingArr.length; i++) {
      const ing = ingArr[i];
      const name = (ing.food_name ?? ing.ingredient_description ?? '').toLowerCase().trim();
      if (!name) continue;

      const { data: ingredientRow } = await admin
        .from('ingredients')
        .upsert({ name, category: null }, { onConflict: 'name', ignoreDuplicates: true })
        .select('id')
        .single();

      let ingredientId = ingredientRow?.id;
      if (!ingredientId) {
        const { data: ex } = await admin
          .from('ingredients')
          .select('id')
          .eq('name', name)
          .limit(1)
          .single();
        ingredientId = ex?.id;
      }

      if (ingredientId) {
        await admin.from('recipe_ingredients').insert({
          recipe_id: recipeId,
          ingredient_id: ingredientId,
          quantity: parseFloat(ing.number_of_units ?? '0') || 0,
          unit: mapUnit(ing.measurement_description ?? 'piece'),
          is_optional: false,
          display_order: i + 1,
        });
      }
    }

    return jsonResponse({ recipe_id: recipeId, already_existed: false });
  } catch (err) {
    console.error('import-fatsecret error:', err);
    return jsonResponse({ error: (err as Error).message }, 500);
  }
});
