// Vercel serverless function: the "Ask" tab's Claude advisor.
// GET  /api/advisor  -> { ok, passcode }  (lets the page know the advisor is set up)
// POST /api/advisor  -> streams Claude's answer as plain text
//
// Environment variables (Vercel > Project > Settings > Environment Variables):
//   ANTHROPIC_API_KEY  required
//   ADVISOR_PASSCODE   optional, but recommended: without it anyone with the link spends your API credit
//   ANTHROPIC_MODEL    optional, defaults to claude-opus-5-5
import Anthropic from "@anthropic-ai/sdk";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";
const MAX_TURNS = 16;
const MAX_CHARS = 4000;

const SYSTEM = `You are the built-in guide inside "Ananya's Financial Management", a planning app for an Indian PhD scholar who lives on a monthly research fellowship.

The plan has three stages: (1) a Safety Fund (emergency fund) built first; (2) long-term compounding through monthly SIPs into low-cost funds; (3) goals and credit-building (an FD-backed secured credit card, CIBIL score, eventually home-loan readiness), running alongside Stage 2.

How to answer:
- Be warm, direct and practical. Keep answers under about 180 words unless asked for more. Use short paragraphs or bullet lists.
- Use ₹ with Indian digit grouping (₹1,50,000) and lakh/crore. Show the arithmetic when you suggest numbers, based on the plan snapshot the app sends.
- For funds, explain the category and how to choose (direct plan, expense ratio, tracking error, fund size, fund house). You may name well-known funds as examples.
- You have web search. Use it when the question depends on current facts (expense ratios, interest rates, PPF rate, rule or tax changes), and name your sources briefly. Otherwise answer directly.
- Never promise returns. Be plain about risk, especially for small-caps, sector funds, crypto, F&O trading, and "guaranteed return" schemes.
- Point to a professional for tax filing edge cases, insurance claims and legal questions. You are an educational guide, not a SEBI-registered investment adviser; say so briefly only when recommending specific products.`;

const client = new Anthropic(); // reads ANTHROPIC_API_KEY

function cleanMessages(raw) {
  if (!Array.isArray(raw)) return null;
  let msgs = raw
    .filter((m) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }))
    .slice(-MAX_TURNS);
  while (msgs.length && msgs[0].role !== "user") msgs = msgs.slice(1);
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return null;
  return msgs;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    res.status(200).json({ ok: Boolean(process.env.ANTHROPIC_API_KEY), passcode: Boolean(process.env.ADVISOR_PASSCODE) });
    return;
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(503).json({ error: "The advisor is not configured: set ANTHROPIC_API_KEY." });
    return;
  }
  const pass = process.env.ADVISOR_PASSCODE;
  if (pass && req.headers["x-advisor-passcode"] !== pass) {
    res.status(401).json({ error: "Wrong passcode." });
    return;
  }

  const body = typeof req.body === "string" ? safeJson(req.body) : req.body || {};
  const messages = cleanMessages(body.messages);
  if (!messages) {
    res.status(400).json({ error: "Send messages as [{role, content}], ending with a user message." });
    return;
  }
  const context = typeof body.context === "string" ? body.context.slice(0, 6000) : "";

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Accel-Buffering", "no");

  let convo = messages;
  try {
    // Server tools can pause a long turn (stop_reason "pause_turn"); resume it a couple of times.
    for (let round = 0; round < 3; round++) {
      const stream = client.beta.messages.stream({
        model: MODEL,
        max_tokens: 16000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "medium" },
        system: context ? `${SYSTEM}\n\n${context}` : SYSTEM,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 3, user_location: { type: "approximate", country: "IN" } }],
        messages: convo,
      });
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") res.write(event.delta.text);
      }
      const message = await stream.finalMessage();
      if (message.stop_reason === "pause_turn") {
        convo = [...convo, { role: "assistant", content: message.content }];
        continue;
      }
      if (message.stop_reason === "refusal") res.write("\n\nI can't help with that one. Try asking it a different way.");
      if (message.stop_reason === "max_tokens") res.write("\n\n(Answer cut short. Ask for less at a time.)");
      break;
    }
  } catch (error) {
    let note = "Something went wrong reaching Claude. Try again.";
    if (error instanceof Anthropic.AuthenticationError) note = "The server's Anthropic API key was rejected.";
    else if (error instanceof Anthropic.RateLimitError) note = "Claude is rate-limited right now. Try again in a minute.";
    else if (error instanceof Anthropic.BadRequestError) note = "Claude rejected the request.";
    else if (error instanceof Anthropic.APIError) note = `Claude returned an error (${error.status ?? "network"}).`;
    console.error("advisor error:", error);
    if (!res.headersSent) res.status(502);
    res.write(`\n\n${note}`);
  }
  res.end();
}

function safeJson(s) {
  try { return JSON.parse(s); } catch { return {}; }
}
