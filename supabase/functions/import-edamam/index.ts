/**
 * import-edamam — Supabase Edge Function
 *
 * Saves an Edamam recipe into the local DB (recipes + recipe_ingredients tables).
 * Uses the service role client so RLS is bypassed for inserts.
 * Idempotent: if a recipe with the same source_url already exists for this user,
 * returns the existing recipe_id.
 */
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth — get the calling user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // User client to get the calling user
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Service role client for DB writes
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const recipe = body.recipe;
    if (!recipe || !recipe.title) {
      return new Response(
        JSON.stringify({ error: 'Missing recipe data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // Idempotency check — if we already imported this exact recipe for this user
    if (recipe.edamam_uri) {
      const { data: existing } = await admin
        .from('recipes')
        .select('id')
        .eq('created_by', user.id)
        .eq('source_url', recipe.source_url || recipe.edamam_uri)
        .limit(1)
        .single();

      if (existing) {
        return new Response(
          JSON.stringify({ recipe_id: existing.id, already_existed: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    // Build instructions from ingredient lines (Edamam doesn't have step-by-step)
    const instructions = {
      steps: [
        { step: 1, text: `Prepare all ingredients: ${(recipe.ingredient_lines || []).join(', ')}.` },
        { step: 2, text: `Follow the full recipe at: ${recipe.source_url || 'the source website'}.` },
      ],
    };

    // Insert the recipe
    const { data: inserted, error: insertErr } = await admin.from('recipes').insert({
      title: recipe.title,
      description: `${recipe.title} — sourced from ${recipe.source || 'Edamam'}. ${recipe.cuisine ? `Cuisine: ${recipe.cuisine}.` : ''}`,
      cuisine: recipe.cuisine || null,
      difficulty: null,
      prep_time_min: null,
      cook_time_min: recipe.total_time_min || null,
      total_time_min: recipe.total_time_min || null,
      servings: recipe.servings || 1,
      calories_per_serving: recipe.calories_per_serving || null,
      protein_per_serving: recipe.protein_per_serving || null,
      fat_per_serving: recipe.fat_per_serving || null,
      carbs_per_serving: recipe.carbs_per_serving || null,
      fibre_per_serving: recipe.fibre_per_serving || null,
      sugar_per_serving: recipe.sugar_per_serving || null,
      sodium_per_serving: recipe.sodium_per_serving || null,
      instructions: JSON.stringify(instructions),
      meal_types: JSON.stringify(recipe.meal_types || []),
      diet_types: JSON.stringify(recipe.diet_types || []),
      image_url: recipe.image_url || null,
      source_url: recipe.source_url || recipe.edamam_uri || null,
      is_ai_generated: false,
      is_public: false,
      created_by: user.id,
    }).select('id').single();

    if (insertErr) {
      console.error('Recipe insert error:', insertErr);
      return new Response(
        JSON.stringify({ error: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const recipeId = inserted!.id;

    // Insert ingredients — first ensure each ingredient exists in the ingredients table
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      for (let i = 0; i < recipe.ingredients.length; i++) {
        const ing = recipe.ingredients[i];
        if (!ing.name) continue;

        // Upsert ingredient by name
        const { data: ingredientRow } = await admin
          .from('ingredients')
          .upsert(
            {
              name: ing.name.toLowerCase().trim(),
              category: ing.category || null,
            },
            { onConflict: 'name', ignoreDuplicates: true },
          )
          .select('id')
          .single();

        // If upsert returned nothing (duplicate ignored), fetch it
        let ingredientId = ingredientRow?.id;
        if (!ingredientId) {
          const { data: existing } = await admin
            .from('ingredients')
            .select('id')
            .eq('name', ing.name.toLowerCase().trim())
            .limit(1)
            .single();
          ingredientId = existing?.id;
        }

        if (ingredientId) {
          await admin.from('recipe_ingredients').insert({
            recipe_id: recipeId,
            ingredient_id: ingredientId,
            quantity: ing.quantity || 0,
            unit: ing.unit || '',
            is_optional: false,
            display_order: i + 1,
          });
        }
      }
    }

    return new Response(
      JSON.stringify({ recipe_id: recipeId, already_existed: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    console.error('import-edamam error:', err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
