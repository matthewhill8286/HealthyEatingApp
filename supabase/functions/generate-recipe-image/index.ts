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

/**
 * Generate a food photo using DALL-E 3 and upload it to Supabase Storage.
 *
 * Can be called two ways:
 * 1. With `recipe_id` — fetches recipe from DB, generates image, updates image_url
 * 2. With `title` + optional `description` — generates image, returns the URL (no DB update)
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) return jsonResponse({ error: "OpenAI API key not configured" }, 500);

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { recipe_id, title, description } = body;

    let recipeTitle = title;
    let recipeDescription = description || "";

    // If recipe_id provided, fetch from DB
    if (recipe_id && !title) {
      const { data: recipe, error: recipeErr } = await supabaseAdmin
        .from("recipes")
        .select("title, description, cuisine, image_url")
        .eq("id", recipe_id)
        .single();

      if (recipeErr || !recipe) {
        return jsonResponse({ error: "Recipe not found" }, 404);
      }

      // Skip if already has an image
      if (recipe.image_url) {
        return jsonResponse({ image_url: recipe.image_url, skipped: true });
      }

      recipeTitle = recipe.title;
      recipeDescription = recipe.description || "";
      if (recipe.cuisine) recipeDescription += ` (${recipe.cuisine} cuisine)`;
    }

    if (!recipeTitle) {
      return jsonResponse({ error: "Either recipe_id or title is required" }, 400);
    }

    // ── Generate image with DALL-E 3 ──
    const prompt = buildFoodPhotoPrompt(recipeTitle, recipeDescription);

    const dalleRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        quality: "standard",
        response_format: "b64_json",
      }),
    });

    if (!dalleRes.ok) {
      const errText = await dalleRes.text();
      return jsonResponse({ error: `DALL-E error: ${dalleRes.status}`, details: errText }, 502);
    }

    const dalleData = await dalleRes.json();
    const b64Image = dalleData.data[0].b64_json;

    // ── Decode and upload to Supabase Storage ──
    const imageBytes = Uint8Array.from(atob(b64Image), (c) => c.charCodeAt(0));
    const fileName = `${recipe_id || crypto.randomUUID()}.png`;
    const filePath = `generated/${fileName}`;

    const { error: uploadErr } = await supabaseAdmin.storage
      .from("recipe-images")
      .upload(filePath, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadErr) {
      return jsonResponse({ error: "Failed to upload image", details: uploadErr.message }, 500);
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("recipe-images")
      .getPublicUrl(filePath);

    const imageUrl = urlData.publicUrl;

    // ── Update recipe in DB if recipe_id was provided ──
    if (recipe_id) {
      const { error: updateErr } = await supabaseAdmin
        .from("recipes")
        .update({ image_url: imageUrl })
        .eq("id", recipe_id);

      if (updateErr) {
        console.error("Failed to update recipe image_url:", updateErr);
      }
    }

    return jsonResponse({ image_url: imageUrl, recipe_id: recipe_id || null });
  } catch (err) {
    return jsonResponse({ error: "Internal error", details: String(err) }, 500);
  }
});

/**
 * Build a DALL-E prompt optimized for appetizing food photography.
 */
function buildFoodPhotoPrompt(title: string, description: string): string {
  return `Professional food photography of "${title}". ${description ? description + "." : ""} Shot from a 45-degree angle on a clean, modern plate. Soft natural lighting, shallow depth of field, garnished beautifully. The food looks fresh, appetizing, and ready to eat. Restaurant-quality plating on a neutral background. No text, no watermarks, no logos, no hands.`;
}
