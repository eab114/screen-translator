// Screen Translator backend (Cloudflare Worker)
// Holds the Anthropic API key, checks invite codes, and caps daily use per code.
//
// Settings (Cloudflare dashboard > Worker > Settings > Variables and Secrets):
//   ANTHROPIC_API_KEY  secret  your key from console.anthropic.com
//   INVITE_CODES       secret  JSON, code -> friend's name, e.g. {"k7m2-q9xa":"Maria","p3vt-8hzd":"JR"}
//   ADMIN_TOKEN        secret  any long password, used to view usage
//   ALLOWED_ORIGINS    text    comma list, e.g. https://eab114.github.io
//   DAILY_LIMIT        text    translations per code per day (default 150)
// Binding:
//   USAGE              KV namespace, stores daily counts

const MODELS = new Set(["claude-haiku-5-5", "claude-sonnet-5-5"]);
const MAX_IMAGE_B64 = 2_000_000;   // about 1.5 MB image
const MAX_TEXT = 12_000;

export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
    const okOrigin = allowed.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": okOrigin ? origin : (allowed[0] || ""),
      "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, X-Invite-Code",
      "Vary": "Origin",
    };
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const url = new URL(req.url);
    const today = new Date().toISOString().slice(0, 10);

    // Usage report: GET /usage with header Authorization: Bearer <ADMIN_TOKEN>, or ?token=
    if (req.method === "GET" && url.pathname === "/usage") {
      const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "") || url.searchParams.get("token");
      if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) return json({ error: "Not allowed" }, 401);
      const day = url.searchParams.get("day") || today;
      const codes = parseCodes(env);
      const list = await env.USAGE.list({ prefix: `day:${day}:` });
      const rows = await Promise.all(list.keys.map(async k => {
        const code = k.name.split(":")[2];
        return { name: codes[code] || "(removed code)", code, count: Number(await env.USAGE.get(k.name)) || 0 };
      }));
      rows.sort((a, b) => b.count - a.count);
      return json({ day, total: rows.reduce((t, r) => t + r.count, 0), people: rows });
    }

    if (req.method === "GET" && url.pathname === "/") return json({ ok: true, service: "screen-translator" });
    if (req.method !== "POST" || url.pathname !== "/translate") return json({ error: "Not found" }, 404);
    if (!okOrigin) return json({ error: "This site is not allowed to use the translator." }, 403);

    // Invite code
    const codes = parseCodes(env);
    const code = (req.headers.get("X-Invite-Code") || "").trim().toLowerCase();
    const who = codes[code];
    if (!who) return json({ error: "That invite code isn't valid.", code: "bad_code" }, 401);

    // Daily limit
    const limit = Number(env.DAILY_LIMIT) || 150;
    const key = `day:${today}:${code}`;
    const used = Number(await env.USAGE.get(key)) || 0;
    if (used >= limit) return json({ error: `Daily limit of ${limit} reached. It resets at midnight UTC.`, code: "limit" }, 429);

    // Validate the request shape so the key can only be used for translation
    let body;
    try { body = await req.json(); } catch { return json({ error: "Bad request" }, 400); }
    const model = MODELS.has(body.model) ? body.model : "claude-haiku-5-5";
    const prompt = typeof body.prompt === "string" ? body.prompt.slice(0, MAX_TEXT) : "";
    const image = typeof body.image === "string" ? body.image : "";
    if (!prompt) return json({ error: "Nothing to translate" }, 400);
    if (image.length > MAX_IMAGE_B64) return json({ error: "Screenshot is too large. Snip a smaller area." }, 413);

    const content = [];
    if (image) content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: image } });
    content.push({ type: "text", text: prompt });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({ model, max_tokens: 4000, messages: [{ role: "user", content }] }),
    });

    if (!r.ok) {
      const status = r.status === 429 ? 429 : 502;
      return json({ error: r.status === 429 ? "The translator is busy. Try again in a moment." : "Translation service error.", code: r.status === 429 ? "rate_limited" : "upstream" }, status);
    }
    const data = await r.json();
    const text = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("");

    await env.USAGE.put(key, String(used + 1), { expirationTtl: 60 * 60 * 24 * 40 });
    return json({ text, remaining: Math.max(0, limit - used - 1), name: who });
  },
};

function parseCodes(env) {
  try {
    const raw = JSON.parse(env.INVITE_CODES || "{}");
    const out = {};
    for (const [k, v] of Object.entries(raw)) out[String(k).trim().toLowerCase()] = String(v);
    return out;
  } catch { return {}; }
}
