import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing auth" }, 401);

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    // ── Get user context ──
    const [profileRes, tasteRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", user.id).single(),
      supabaseAdmin.from("user_taste_profile").select("*").eq("user_id", user.id).maybeSingle(),
    ]);
    const profile = profileRes.data;
    const taste = tasteRes.data;

    // ── Parse request body ──
    const {
      prompt = "",
      cuisine = "",
      mealType = "dinner",
      maxPrepTime,
      dietaryOverride,
      servings = profile?.household_size || 4,
    } = await req.json();

    // ── Build system prompt ──
    const dietPref = dietaryOverride || profile?.dietary_preference || "omnivore";
    const allergies = (profile?.allergies || []).join(", ") || "none";
    const disliked = (profile?.disliked_ingredients || []).join(", ") || "none";
    const avoidedIng = (taste?.avoided_ingredients || []).join(", ") || "none";
    const calTarget = profile?.daily_calorie_target || 2100;
    const spiceTol = taste?.spice_tolerance || "medium";
    const cookSkill = taste?.cooking_skill || "easy";
    const prefCuisines = (taste?.preferred_cuisines || []).join(", ") || "any";

    const systemPrompt = `You are a professional chef and nutritionist creating a recipe for a meal prep app.

User profile:
- Diet: ${dietPref}
- Allergies: ${allergies}
- Disliked ingredients: ${disliked}
- Avoided ingredients: ${avoidedIng}
- Daily calorie target: ${calTarget} kcal
- Spice tolerance: ${spiceTol}
- Cooking skill: ${cookSkill}
- Preferred cuisines: ${prefCuisines}

Return a SINGLE recipe as valid JSON with this exact structure:
{
  "title": "Recipe Title",
  "description": "2-3 sentence description",
  "cuisine": "Italian",
  "difficulty": "easy|medium|hard|expert",
  "prep_time_min": 15,
  "cook_time_min": 30,
  "servings": ${servings},
  "calories_per_serving": 450,
  "protein_per_serving": 35,
  "fat_per_serving": 18,
  "carbs_per_serving": 40,
  "fibre_per_serving": 8,
  "sugar_per_serving": 6,
  "sodium_per_serving": 400,
  "meal_types": ["dinner"],
  "diet_types": ["${dietPref}"],
  "instructions": [
    { "step": 1, "text": "Step description" }
  ],
  "ingredients": [
    { "name": "chicken breast", "quantity": 200, "unit": "g", "preparation_note": "diced" }
  ]
}

Rules:
- STRICTLY respect allergies and dietary preferences
- Never include disliked or avoided ingredients
- unit must be one of: g, mg, ml, l, tsp, tbsp, cup, oz, lb, piece, slice, clove, bunch, pinch
- meal_types must be from: breakfast, morning_snack, lunch, afternoon_snack, dinner, evening_snack
- diet_types must be from: omnivore, vegetarian, vegan, pescatarian, keto, paleo, mediterranean, carnivore, whole30, gluten_free, dairy_free, low_fodmap
- difficulty must be from: easy, medium, hard, expert
- Nutrition values must be realistic and accurate per serving
- Return ONLY valid JSON, no markdown, no extra text`;

    let userMessage = prompt || "Create a healthy, delicious recipe";
    if (cuisine) userMessage += ` with ${cuisine} cuisine`;
    if (mealType) userMessage += ` for ${mealType}`;
    if (maxPrepTime) userMessage += ` that takes under ${maxPrepTime} minutes to prepare`;

    // ── Call OpenAI ──
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return jsonResponse({ error: "OpenAI API key not configured" }, 500);

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return jsonResponse({ error: `OpenAI error: ${openaiRes.status}`, details: errText }, 502);
    }

    const aiData = await openaiRes.json();
    const recipeJson = JSON.parse(aiData.choices[0].message.content);

    // ── Validate & insert recipe ──
    const mealTypes = (recipeJson.meal_types || [mealType]).filter((m: string) =>
      ["breakfast", "morning_snack", "lunch", "afternoon_snack", "dinner", "evening_snack"].includes(m)
    );
    const dietTypes = (recipeJson.diet_types || [dietPref]).filter((d: string) =>
      ["omnivore", "vegetarian", "vegan", "pescatarian", "keto", "paleo", "mediterranean", "carnivore", "whole30", "gluten_free", "dairy_free", "low_fodmap"].includes(d)
    );

    const recipeRow = {
      created_by: user.id,
      title: recipeJson.title,
      description: recipeJson.description || null,
      instructions: JSON.stringify(recipeJson.instructions || []),
      meal_types: `{${mealTypes.join(",")}}`,
      difficulty: recipeJson.difficulty || "medium",
      prep_time_min: recipeJson.prep_time_min || 15,
      cook_time_min: recipeJson.cook_time_min || 30,
      servings: recipeJson.servings || servings,
      calories_per_serving: recipeJson.calories_per_serving,
      protein_per_serving: recipeJson.protein_per_serving,
      fat_per_serving: recipeJson.fat_per_serving,
      carbs_per_serving: recipeJson.carbs_per_serving,
      fibre_per_serving: recipeJson.fibre_per_serving || 0,
      sugar_per_serving: recipeJson.sugar_per_serving || 0,
      sodium_per_serving: recipeJson.sodium_per_serving || 0,
      cuisine: recipeJson.cuisine || cuisine || null,
      diet_types: `{${dietTypes.join(",")}}`,
      is_public: false,
      is_ai_generated: true,
      image_url: null,
      source_url: null,
      notes: "AI-generated recipe",
    };

    const { data: newRecipe, error: recipeErr } = await supabaseAdmin
      .from("recipes")
      .insert(recipeRow)
      .select("id")
      .single();

    if (recipeErr) {
      return jsonResponse({ error: "Failed to insert recipe", details: recipeErr.message }, 500);
    }

    // ── Create ingredients ──
    const aiIngredients = recipeJson.ingredients || [];
    const ingredientRows: any[] = [];

    const VALID_UNITS = new Set(["g", "mg", "mcg", "ml", "l", "tsp", "tbsp", "cup", "oz", "lb", "piece", "slice", "clove", "bunch", "pinch", "to_taste"]);

    for (let i = 0; i < aiIngredients.length; i++) {
      const ing = aiIngredients[i];
      const ingName = (ing.name || "unknown").toLowerCase().trim();

      let { data: existingIng } = await supabaseAdmin
        .from("ingredients")
        .select("id")
        .eq("name_normalized", ingName)
        .maybeSingle();

      let ingredientId: string;

      if (existingIng) {
        ingredientId = existingIng.id;
      } else {
        const unit = VALID_UNITS.has(ing.unit) ? ing.unit : "g";
        const { data: newIng, error: ingErr } = await supabaseAdmin
          .from("ingredients")
          .insert({
            name: ing.name,
            default_unit: unit,
            is_common: true,
            created_by: user.id,
          })
          .select("id")
          .single();

        if (ingErr) continue;
        ingredientId = newIng.id;
      }

      const unit = VALID_UNITS.has(ing.unit) ? ing.unit : "g";
      ingredientRows.push({
        recipe_id: newRecipe.id,
        ingredient_id: ingredientId,
        quantity: ing.quantity || 1,
        unit,
        is_optional: false,
        preparation_note: ing.preparation_note || null,
        display_order: i + 1,
      });
    }

    if (ingredientRows.length > 0) {
      await supabaseAdmin.from("recipe_ingredients").insert(ingredientRows);
    }

    return jsonResponse({
      recipe_id: newRecipe.id,
      recipe: {
        ...recipeJson,
        id: newRecipe.id,
        is_ai_generated: true,
        image_url: null,
      },
    });
  } catch (err) {
    return jsonResponse({ error: "Internal error", details: String(err) }, 500);
  }
});
