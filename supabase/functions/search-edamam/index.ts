/**
 * search-edamam — Supabase Edge Function
 *
 * Proxies recipe search requests to the Edamam Recipe Search API v2,
 * keeping API credentials server-side. Returns a simplified, typed
 * response so the client doesn't need to know Edamam's schema.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const EDAMAM_APP_ID = Deno.env.get('EDAMAM_APP_ID') ?? '';
const EDAMAM_APP_KEY = Deno.env.get('EDAMAM_APP_KEY') ?? '';
const EDAMAM_BASE = 'https://api.edamam.com/api/recipes/v2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/** Map Edamam mealType values to our internal meal types */
function mapMealType(edamamTypes: string[]): string[] {
  const map: Record<string, string> = {
    'Breakfast': 'breakfast',
    'Lunch': 'lunch',
    'Dinner': 'dinner',
    'Snack': 'afternoon_snack',
    'Teatime': 'afternoon_snack',
  };
  return edamamTypes.map((t) => map[t] || t.toLowerCase()).filter(Boolean);
}

/** Map Edamam diet/health labels to our diet_types */
function mapDietLabels(dietLabels: string[], healthLabels: string[]): string[] {
  const labels: string[] = [];
  for (const d of dietLabels) {
    if (d === 'High-Protein') labels.push('high_protein');
    if (d === 'Low-Fat') labels.push('low_fat');
    if (d === 'Low-Carb') labels.push('low_carb');
    if (d === 'Balanced') labels.push('balanced');
  }
  for (const h of healthLabels) {
    if (h === 'Vegan') labels.push('vegan');
    if (h === 'Vegetarian') labels.push('vegetarian');
    if (h === 'Gluten-Free') labels.push('gluten_free');
    if (h === 'Dairy-Free') labels.push('dairy_free');
    if (h === 'Keto-Friendly') labels.push('keto');
    if (h === 'Paleo') labels.push('paleo');
    if (h === 'Peanut-Free') labels.push('peanut_free');
  }
  return [...new Set(labels)];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!EDAMAM_APP_ID || !EDAMAM_APP_KEY) {
      return new Response(
        JSON.stringify({ error: 'Edamam API credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { query, mealType, cuisineType, diet, health, from = 0, to = 20 } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing required "query" field' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Build Edamam URL with params
    const url = new URL(EDAMAM_BASE);
    url.searchParams.set('type', 'public');
    url.searchParams.set('q', query);
    url.searchParams.set('app_id', EDAMAM_APP_ID);
    url.searchParams.set('app_key', EDAMAM_APP_KEY);
    url.searchParams.set('from', String(from));
    url.searchParams.set('to', String(to));
    url.searchParams.set('imageSize', 'REGULAR');

    // Optional filters
    if (mealType) url.searchParams.append('mealType', mealType);
    if (cuisineType) url.searchParams.append('cuisineType', cuisineType);
    if (diet) url.searchParams.append('diet', diet);
    if (health) {
      const healthArr = Array.isArray(health) ? health : [health];
      for (const h of healthArr) url.searchParams.append('health', h);
    }

    // Request specific fields to reduce payload
    const fields = [
      'uri', 'label', 'image', 'images', 'source', 'url', 'yield',
      'dietLabels', 'healthLabels', 'ingredientLines', 'ingredients',
      'calories', 'totalTime', 'cuisineType', 'mealType', 'dishType',
      'totalNutrients', 'totalWeight',
    ];
    for (const f of fields) url.searchParams.append('field', f);

    const edamamRes = await fetch(url.toString());

    if (!edamamRes.ok) {
      const text = await edamamRes.text();
      console.error('Edamam API error:', edamamRes.status, text);
      return new Response(
        JSON.stringify({ error: `Edamam API returned ${edamamRes.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const edamamData = await edamamRes.json();
    const hits = edamamData.hits ?? [];

    // Transform to our app's format
    const recipes = hits.map((hit: any) => {
      const r = hit.recipe;
      const servings = r.yield || 1;
      const nutrients = r.totalNutrients ?? {};

      // Extract Edamam URI as a stable ID (e.g. "recipe_abc123...")
      const edamamUri = r.uri ?? '';
      const edamamId = edamamUri.split('#recipe_')[1] || edamamUri;

      return {
        edamam_id: edamamId,
        edamam_uri: edamamUri,
        title: r.label ?? 'Untitled',
        image_url: r.image ?? r.images?.REGULAR?.url ?? null,
        source: r.source ?? null,
        source_url: r.url ?? null,
        servings,
        total_time_min: r.totalTime > 0 ? Math.round(r.totalTime) : null,
        cuisine: r.cuisineType?.[0] ?? null,
        meal_types: mapMealType(r.mealType ?? []),
        diet_types: mapDietLabels(r.dietLabels ?? [], r.healthLabels ?? []),
        calories_per_serving: nutrients.ENERC_KCAL
          ? Math.round(nutrients.ENERC_KCAL.quantity / servings)
          : null,
        protein_per_serving: nutrients.PROCNT
          ? Math.round((nutrients.PROCNT.quantity / servings) * 10) / 10
          : null,
        fat_per_serving: nutrients.FAT
          ? Math.round((nutrients.FAT.quantity / servings) * 10) / 10
          : null,
        carbs_per_serving: nutrients.CHOCDF
          ? Math.round((nutrients.CHOCDF.quantity / servings) * 10) / 10
          : null,
        fibre_per_serving: nutrients.FIBTG
          ? Math.round((nutrients.FIBTG.quantity / servings) * 10) / 10
          : null,
        sugar_per_serving: nutrients.SUGAR
          ? Math.round((nutrients.SUGAR.quantity / servings) * 10) / 10
          : null,
        sodium_per_serving: nutrients.NA
          ? Math.round(nutrients.NA.quantity / servings)
          : null,
        ingredient_lines: r.ingredientLines ?? [],
        ingredients: (r.ingredients ?? []).map((ing: any) => ({
          name: ing.food ?? '',
          quantity: ing.quantity ?? 0,
          unit: ing.measure ?? '',
          weight_g: ing.weight ?? 0,
          category: ing.foodCategory ?? null,
          image_url: ing.image ?? null,
        })),
      };
    });

    return new Response(
      JSON.stringify({
        count: edamamData.count ?? recipes.length,
        from,
        to,
        recipes,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('search-edamam error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
