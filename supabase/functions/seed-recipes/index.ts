/**
 * seed-recipes — Supabase Edge Function
 *
 * Seeds the user's recipe library using OpenAI to generate personalised recipes
 * based on the user's taste profile and dietary preferences.
 * No external food API dependency — pure AI generation.
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

// Seed prompts per meal type — gives variety across batches
const SEED_THEMES: Record<string, string[]> = {
  breakfast: [
    "high-protein egg dishes and morning bowls",
    "quick healthy breakfasts under 20 minutes",
    "hearty overnight oats, granola, and smoothie bowls",
    "savoury breakfast options",
    "light and fresh morning meals",
  ],
  morning_snack: [
    "energy-boosting mid-morning snacks",
    "protein-rich bites and mini meals",
  ],
  lunch: [
    "high-protein grain bowls and salads",
    "hearty soups and warm lunch dishes",
    "quick wraps, sandwiches, and light lunches",
    "meal-prep friendly lunch boxes",
  ],
  afternoon_snack: [
    "healthy afternoon snacks with good macros",
    "protein-rich snack plates and energy bites",
  ],
  dinner: [
    "lean protein-forward dinners with vegetables",
    "comforting family dinner classics made healthier",
    "quick 30-minute weeknight dinners",
    "international cuisine dinner inspiration",
    "meal-prep friendly batch-cook dinners",
  ],
  evening_snack: [
    "light evening snacks and dessert alternatives",
  ],
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return jsonResponse({ error: "OpenAI API key not configured" }, 500);

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

    // ── Check if already seeded ──
    const { count: existingCount } = await supabaseAdmin
      .from("recipes")
      .select("id", { count: "exact", head: true })
      .eq("created_by", user.id)
      .eq("is_ai_generated", true);

    if ((existingCount ?? 0) >= 30) {
      return jsonResponse({ message: "Already seeded", recipe_count: existingCount });
    }

    // ── Parse request ──
    const { mealType, count: batchCount = 5 } = await req.json();
    if (!mealType) return jsonResponse({ error: "mealType required" }, 400);

    // ── Get user profile ──
    const [profileRes, tasteRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("dietary_preference, allergies, disliked_ingredients, daily_calorie_target, household_size").eq("id", user.id).maybeSingle(),
      supabaseAdmin.from("user_taste_profile").select("preferred_cuisines, avoided_ingredients, spice_tolerance, cooking_skill").eq("user_id", user.id).maybeSingle(),
    ]);
    const profile = profileRes.data;
    const taste = tasteRes.data;

    const dietPref = profile?.dietary_preference || "omnivore";
    const allergies = (profile?.allergies || []).join(", ") || "none";
    const disliked = [...(profile?.disliked_ingredients || []), ...(taste?.avoided_ingredients || [])].join(", ") || "none";
    const calTarget = profile?.daily_calorie_target || 2000;
    const spiceTol = taste?.spice_tolerance || "medium";
    const cookSkill = taste?.cooking_skill || "easy";
    const prefCuisines = (taste?.preferred_cuisines || []).join(", ") || "any";
    const servings = profile?.household_size || 2;

    // Pick a random theme for variety
    const themes = SEED_THEMES[mealType] || SEED_THEMES.dinner;
    const theme = themes[Math.floor(Math.random() * themes.length)];

    const targetCount = Math.min(Math.max(batchCount, 1), 8);

    // ── Build AI prompt ──
    const systemPrompt = `You are a professional chef and nutritionist creating personalised recipes for a meal planning app.

User profile:
- Diet: ${dietPref}
- Allergies (NEVER include): ${allergies}
- Disliked ingredients (avoid): ${disliked}
- Daily calorie target: ${calTarget} kcal
- Spice tolerance: ${spiceTol}
- Cooking skill: ${cookSkill}
- Preferred cuisines: ${prefCuisines}
- Typical servings: ${servings}

Return ONLY a valid JSON array of exactly ${targetCount} diverse recipes for ${mealType.replace(/_/g, " ")}.
Theme for this batch: ${theme}

Each recipe must have this exact structure:
{
  "title": "Recipe Name",
  "description": "2-3 sentences describing the dish",
  "cuisine": "Italian",
  "difficulty": "easy",
  "prep_time_min": 10,
  "cook_time_min": 20,
  "servings": ${servings},
  "calories_per_serving": 450,
  "protein_per_serving": 35,
  "fat_per_serving": 18,
  "carbs_per_serving": 40,
  "fibre_per_serving": 8,
  "sugar_per_serving": 5,
  "sodium_per_serving": 380,
  "meal_types": ["${mealType}"],
  "diet_types": ["${dietPref}"],
  "instructions": [
    { "step": 1, "text": "Detailed step" }
  ],
  "ingredients": [
    { "name": "chicken breast", "quantity": 200, "unit": "g", "preparation_note": "diced" }
  ]
}

Rules:
- difficulty: easy | medium | hard | expert
- meal_types values: breakfast, morning_snack, lunch, afternoon_snack, dinner, evening_snack
- diet_types values: omnivore, vegetarian, vegan, pescatarian, keto, paleo, mediterranean, carnivore, whole30, gluten_free, dairy_free, low_fodmap
- unit values: g, mg, mcg, ml, l, tsp, tbsp, cup, oz, lb, piece, slice, clove, bunch, pinch, to_taste
- Make recipes diverse — vary cuisines, techniques, ingredients
- Nutrition must be realistic per serving
- Match cooking skill level: ${cookSkill}
- Return ONLY the JSON array, no markdown, no extra text`;

    // ── Call OpenAI ──
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
          { role: "user", content: `Generate ${targetCount} diverse ${mealType.replace(/_/g, " ")} recipes. Theme: ${theme}` },
        ],
        temperature: 0.9,
        max_tokens: 5000,
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
      if (!Array.isArray(recipesJson)) recipesJson = [recipesJson];
    } catch {
      return jsonResponse({ error: "Failed to parse AI response", raw: rawContent.slice(0, 300) }, 500);
    }

    // ── Save each recipe to DB ──
    const insertedIds: string[] = [];

    for (const r of recipesJson.slice(0, targetCount)) {
      try {
        const mealTypes = (r.meal_types || [mealType]).filter((m: string) => VALID_MEAL_TYPES.has(m));
        if (!mealTypes.includes(mealType)) mealTypes.unshift(mealType);
        const dietTypes = (r.diet_types || [dietPref]).filter((d: string) => VALID_DIET_TYPES.has(d));

        const { data: newRecipe, error: recipeErr } = await supabaseAdmin
          .from("recipes")
          .insert({
            created_by: user.id,
            title: r.title,
            description: r.description || null,
            instructions: r.instructions || [],
            meal_types: `{${mealTypes.join(",")}}`,
            diet_types: `{${dietTypes.length > 0 ? dietTypes.join(",") : dietPref}}`,
            difficulty: ["easy","medium","hard","expert"].includes(r.difficulty) ? r.difficulty : "medium",
            prep_time_min: r.prep_time_min || null,
            cook_time_min: r.cook_time_min || null,
            servings: r.servings || servings,
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
            notes: `Seeded — ${theme}`,
          })
          .select("id")
          .single();

        if (recipeErr || !newRecipe) {
          console.error("Recipe insert error:", recipeErr?.message, r.title);
          continue;
        }

        // ── Insert ingredients ──
        for (let i = 0; i < (r.ingredients || []).length; i++) {
          const ing = r.ingredients[i];
          const ingName = (ing.name || "").toLowerCase().trim();
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
            await supabaseAdmin.from("recipe_ingredients").insert({
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

        insertedIds.push(newRecipe.id);
      } catch (err) {
        console.error("Failed to save recipe:", r?.title, err);
      }
    }

    return jsonResponse({
      mealType,
      theme,
      requested: targetCount,
      inserted: insertedIds.length,
      recipe_ids: insertedIds,
    });
  } catch (err) {
    console.error("seed-recipes error:", err);
    return jsonResponse({ error: "Internal error", details: String(err) }, 500);
  }
});
