/**
 * ai-search-recipes — Supabase Edge Function
 *
 * Generates a batch of recipes matching a user's search query using OpenAI.
 * All recipes are saved to the DB immediately so they can be viewed/added
 * to plan without a separate import step.
 */
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

const VALID_UNITS = new Set(["g","mg","mcg","ml","l","tsp","tbsp","cup","oz","lb","piece","slice","clove","bunch","pinch","to_taste"]);
const VALID_MEAL_TYPES = new Set(["breakfast","morning_snack","lunch","afternoon_snack","dinner","evening_snack"]);
const VALID_DIET_TYPES = new Set(["omnivore","vegetarian","vegan","pescatarian","keto","paleo","mediterranean","carnivore","whole30","gluten_free","dairy_free","low_fodmap"]);

const CUISINE_EMOJIS: Record<string, string> = {
  Italian: "🍝", Mexican: "🌮", Japanese: "🍣", Indian: "🍛", Thai: "🥘",
  Chinese: "🥡", Korean: "🥢", French: "🥐", Mediterranean: "🫒",
  American: "🍔", British: "🍽️", Vietnamese: "🍜", Greek: "🫒",
  Moroccan: "🫕", Turkish: "🥙", Spanish: "🥘", Brazilian: "🍖",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing auth" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) return jsonResponse({ error: "Unauthorized" }, 401);

    const supabaseAdmin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false },
    });

    // ── Parse request ──
    const { query, count = 8, mealType } = await req.json();
    if (!query || query.trim().length < 2) {
      return jsonResponse({ error: "query must be at least 2 characters" }, 400);
    }

    // ── Get user profile for personalisation ──
    const [profileRes, tasteRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("dietary_preference, allergies, disliked_ingredients").eq("id", user.id).maybeSingle(),
      supabaseAdmin.from("user_taste_profile").select("preferred_cuisines, avoided_ingredients, spice_tolerance").eq("user_id", user.id).maybeSingle(),
    ]);
    const profile = profileRes.data;
    const taste = tasteRes.data;

    const dietPref = profile?.dietary_preference || "omnivore";
    const allergies = (profile?.allergies || []).join(", ") || "none";
    const disliked = [...(profile?.disliked_ingredients || []), ...(taste?.avoided_ingredients || [])].join(", ") || "none";
    const prefCuisines = (taste?.preferred_cuisines || []).join(", ") || "any";

    const targetCount = Math.min(Math.max(count, 1), 12);

    // ── Build AI prompt ──
    const mealTypeInstruction = mealType
      ? `All recipes should be suitable for ${mealType.replace(/_/g, " ")}.`
      : "";

    const systemPrompt = `You are a professional chef and nutritionist for a meal planning app.
User preferences:
- Diet: ${dietPref}
- Allergies (NEVER include): ${allergies}
- Disliked/avoided ingredients (avoid): ${disliked}
- Preferred cuisines: ${prefCuisines}

Return ONLY a valid JSON array of exactly ${targetCount} diverse recipes. ${mealTypeInstruction}
Each recipe must use this exact structure:
{
  "title": "Recipe Name",
  "description": "2-3 sentences describing the dish",
  "cuisine": "Italian",
  "difficulty": "easy",
  "prep_time_min": 10,
  "cook_time_min": 20,
  "servings": 2,
  "calories_per_serving": 450,
  "protein_per_serving": 35,
  "fat_per_serving": 18,
  "carbs_per_serving": 40,
  "fibre_per_serving": 8,
  "sugar_per_serving": 5,
  "sodium_per_serving": 380,
  "meal_types": ["dinner"],
  "diet_types": ["omnivore"],
  "instructions": [
    { "step": 1, "text": "Detailed instruction step" }
  ],
  "ingredients": [
    { "name": "chicken breast", "quantity": 200, "unit": "g", "preparation_note": "diced" }
  ]
}

Rules:
- difficulty: easy | medium | hard | expert
- meal_types array values: breakfast, morning_snack, lunch, afternoon_snack, dinner, evening_snack
- diet_types array values: omnivore, vegetarian, vegan, pescatarian, keto, paleo, mediterranean, carnivore, whole30, gluten_free, dairy_free, low_fodmap
- unit values: g, mg, mcg, ml, l, tsp, tbsp, cup, oz, lb, piece, slice, clove, bunch, pinch, to_taste
- Make recipes diverse — different cuisines, cooking styles, and flavour profiles
- Nutrition must be realistic and accurate per serving
- Return ONLY the JSON array, no markdown, no extra text`;

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
          { role: "user", content: `Search query: "${query.trim()}"` },
        ],
        temperature: 0.85,
        max_tokens: 6000,
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      return jsonResponse({ error: `OpenAI error: ${openaiRes.status}`, details: errText }, 502);
    }

    const aiData = await openaiRes.json();
    let rawContent = aiData.choices[0].message.content.trim();

    // Strip markdown code fences if present
    rawContent = rawContent.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");

    let recipesJson: any[];
    try {
      recipesJson = JSON.parse(rawContent);
      if (!Array.isArray(recipesJson)) {
        recipesJson = [recipesJson];
      }
    } catch (parseErr) {
      return jsonResponse({ error: "Failed to parse AI response", raw: rawContent.slice(0, 500) }, 500);
    }

    // ── Save each recipe to DB ──
    const resultCards: any[] = [];

    for (const r of recipesJson.slice(0, targetCount)) {
      try {
        const mealTypes = (r.meal_types || (mealType ? [mealType] : ["dinner"])).filter((m: string) => VALID_MEAL_TYPES.has(m));
        const dietTypes = (r.diet_types || [dietPref]).filter((d: string) => VALID_DIET_TYPES.has(d));

        const { data: newRecipe, error: recipeErr } = await supabaseAdmin
          .from("recipes")
          .insert({
            created_by: user.id,
            title: r.title,
            description: r.description || null,
            instructions: r.instructions || [],
            meal_types: `{${mealTypes.length > 0 ? mealTypes.join(",") : (mealType || "dinner")}}`,
            diet_types: `{${dietTypes.length > 0 ? dietTypes.join(",") : dietPref}}`,
            difficulty: ["easy","medium","hard","expert"].includes(r.difficulty) ? r.difficulty : "medium",
            prep_time_min: r.prep_time_min || null,
            cook_time_min: r.cook_time_min || null,
            servings: r.servings || 2,
            calories_per_serving: r.calories_per_serving || null,
            protein_per_serving: r.protein_per_serving || null,
            fat_per_serving: r.fat_per_serving || null,
            carbs_per_serving: r.carbs_per_serving || null,
            fibre_per_serving: r.fibre_per_serving || 0,
            sugar_per_serving: r.sugar_per_serving || 0,
            sodium_per_serving: r.sodium_per_serving || 0,
            cuisine: r.cuisine || null,
            is_ai_generated: true,
            is_public: false,
            image_url: null,
            source_url: null,
            notes: `AI search: "${query}"`,
          })
          .select("id")
          .single();

        if (recipeErr || !newRecipe) {
          console.error("Recipe insert error:", recipeErr?.message, r.title);
          continue;
        }

        // ── Insert ingredients ──
        const ingredients = r.ingredients || [];
        const ingredientRows: any[] = [];

        for (let i = 0; i < ingredients.length; i++) {
          const ing = ingredients[i];
          const ingName = (ing.name || "unknown").toLowerCase().trim();
          if (!ingName) continue;

          let { data: existingIng } = await supabaseAdmin
            .from("ingredients")
            .select("id")
            .eq("name_normalized", ingName)
            .maybeSingle();

          let ingredientId: string | null = existingIng?.id || null;

          if (!ingredientId) {
            const unit = VALID_UNITS.has(ing.unit) ? ing.unit : "g";
            const { data: newIng } = await supabaseAdmin
              .from("ingredients")
              .insert({ name: ing.name, default_unit: unit, is_common: true, created_by: user.id })
              .select("id")
              .single();
            ingredientId = newIng?.id || null;
          }

          if (ingredientId) {
            ingredientRows.push({
              recipe_id: newRecipe.id,
              ingredient_id: ingredientId,
              quantity: ing.quantity || 1,
              unit: VALID_UNITS.has(ing.unit) ? ing.unit : "g",
              is_optional: false,
              preparation_note: ing.preparation_note || null,
              display_order: i + 1,
            });
          }
        }

        if (ingredientRows.length > 0) {
          await supabaseAdmin.from("recipe_ingredients").insert(ingredientRows);
        }

        // ── Build result card ──
        const totalTime = (r.prep_time_min || 0) + (r.cook_time_min || 0);
        const emoji = CUISINE_EMOJIS[r.cuisine] || (mealTypes.includes("breakfast") ? "🥣" : mealTypes.includes("lunch") ? "🥗" : "🍽️");

        resultCards.push({
          recipe_id: newRecipe.id,
          title: r.title,
          description: r.description || null,
          emoji,
          cuisine: r.cuisine || null,
          difficulty: r.difficulty || "medium",
          total_time_min: totalTime > 0 ? totalTime : null,
          calories_per_serving: r.calories_per_serving || null,
          protein_per_serving: r.protein_per_serving || null,
          fat_per_serving: r.fat_per_serving || null,
          carbs_per_serving: r.carbs_per_serving || null,
          fibre_per_serving: r.fibre_per_serving || null,
          meal_types: mealTypes,
          diet_types: dietTypes,
        });
      } catch (err) {
        console.error("Error saving recipe:", err);
        continue;
      }
    }

    return jsonResponse({ recipes: resultCards, count: resultCards.length, query });
  } catch (err) {
    console.error("ai-search-recipes error:", err);
    return jsonResponse({ error: "Internal error", details: String(err) }, 500);
  }
});
