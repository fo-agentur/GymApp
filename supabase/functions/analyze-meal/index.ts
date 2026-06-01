import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// analyze-meal: estimate macros from a meal photo via OpenRouter vision.
// Requires the OPENROUTER_API_KEY secret (set in Supabase Dashboard > Edge Functions > Secrets).
// Optional OPENROUTER_MODEL secret overrides the default free vision model.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function clampNum(v: unknown, min: number, max: number): number {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!isFinite(n)) return 0;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function extractJson(s: string): Record<string, unknown> | null {
  if (!s) return null;
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]);
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);

  try {
    const key = Deno.env.get("OPENROUTER_API_KEY");
    if (!key) return json({ error: "OPENROUTER_API_KEY secret is not set" }, 503);

    const body = (await req.json().catch(() => null)) as { image?: string; hint?: string } | null;
    const image = body?.image;
    if (!image || typeof image !== "string") return json({ error: "missing image (base64 data URL)" }, 400);
    const hint = typeof body?.hint === "string" ? body.hint : "";

    const model = Deno.env.get("OPENROUTER_MODEL") || "google/gemini-2.0-flash-exp:free";

    const prompt =
      "You are a nutrition estimator. Look at the food photo and estimate the macros for the WHOLE portion shown. " +
      (hint ? "User hint: " + hint + ". " : "") +
      "Respond with ONLY a compact JSON object, no markdown, no prose, with exactly these keys: " +
      "name (short food name string, max 6 words), serving_g (estimated total grams as a number), " +
      "kcal (number), protein_g (number), carbs_g (number), fat_g (number). " +
      "Give single best-estimate numbers, never ranges.";

    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + key,
        "Content-Type": "application/json",
        "X-Title": "GymApp Meal Scan",
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        max_tokens: 300,
        temperature: 0.2,
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      return json({ error: "vision request failed", status: r.status, detail: t.slice(0, 400) }, 502);
    }

    const data = await r.json();
    const content: string = data?.choices?.[0]?.message?.content ?? "";
    const parsed = extractJson(content);
    if (!parsed) return json({ error: "could not parse macros", raw: String(content).slice(0, 400) }, 422);

    return json(
      {
        name: String(parsed.name ?? "Meal").slice(0, 80),
        serving_g: clampNum(parsed.serving_g, 0, 5000),
        kcal: clampNum(parsed.kcal, 0, 5000),
        protein_g: clampNum(parsed.protein_g, 0, 500),
        carbs_g: clampNum(parsed.carbs_g, 0, 1000),
        fat_g: clampNum(parsed.fat_g, 0, 500),
        model,
      },
      200,
    );
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
