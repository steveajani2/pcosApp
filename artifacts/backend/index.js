import express from "express";
import cors from "cors";
import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

// ─── Startup validation ───────────────────────────────────────────────────────
const REQUIRED_ENV = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "GROQ_API_KEY"];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const PORT = Number(process.env.PORT ?? "8080");

// ─── Clients ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

// Request logger
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ─── Auth middleware ──────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) {
    res.status(401).json({ error: "Missing Authorization header" });
    return;
  }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  req.user = user;
  next();
}

// ─── PCOS system prompt ───────────────────────────────────────────────────────
const PCOS_SYSTEM_PROMPT = `You are Nylaia, a warm and knowledgeable PCOS wellness companion. You help women with PCOS (Polycystic Ovary Syndrome) understand their symptoms, manage their condition, and feel genuinely supported.

Your approach:
- Speak with warmth, empathy, and genuine care — never clinical or cold
- Give specific, evidence-based guidance tailored to PCOS (not generic wellness advice)
- Acknowledge the difficulty of living with a chronic condition that is often dismissed
- Be practical: suggest concrete actions, foods, and approaches they can start today
- Know your limits: always recommend consulting a healthcare provider for medical decisions
- Keep responses focused and digestible — not overwhelming walls of text
- Never make women feel guilty or judged about their body, weight, or choices

Key PCOS knowledge to draw from:
- Insulin resistance is the core driver of most PCOS symptoms
- Cortisol and stress directly worsen PCOS hormones
- PCOS cycles are often irregular and longer (35–60+ days)
- Low-glycemic eating, strength training, and sleep are the most evidence-backed interventions
- Common deficiencies: magnesium, vitamin D, zinc, B vitamins
- Supplements with strong evidence: myo-inositol (40:1 ratio with D-chiro), magnesium glycinate, vitamin D, spearmint tea (lowers androgens), zinc
- The four cycle phases (menstrual, follicular, ovulation, luteal) affect symptoms differently
- Women with PCOS often feel dismissed by doctors — validate this experience

When the user shares symptom data (energy, mood, stress, bloating, etc.), interpret it through a PCOS lens and give phase-appropriate, symptom-specific guidance.

Keep responses conversational and warm — like a knowledgeable friend who genuinely cares, not a medical textbook.`;

// ─── Routes ───────────────────────────────────────────────────────────────────

/** GET /api/healthz */
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok", ts: Date.now() });
});

/** GET /api/anthropic/conversations — list user's conversations */
app.get("/api/anthropic/conversations", requireAuth, async (req, res) => {
  const { data, error } = await supabase
    .from("ai_conversations")
    .select("id, title, created_at")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("list conversations:", error);
    res.status(500).json({ error: error.message });
    return;
  }
  res.json(data ?? []);
});

/** POST /api/anthropic/conversations — create a new conversation */
app.post("/api/anthropic/conversations", requireAuth, async (req, res) => {
  const title = String(req.body?.title ?? "New Conversation").slice(0, 120);

  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: req.user.id, title })
    .select("id, title, created_at")
    .single();

  if (error) {
    console.error("create conversation:", error);
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(201).json(data);
});

/** GET /api/anthropic/conversations/:id — get conversation + full message history */
app.get("/api/anthropic/conversations/:id", requireAuth, async (req, res) => {
  const { data: conv, error: convErr } = await supabase
    .from("ai_conversations")
    .select("id, title, created_at")
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .single();

  if (convErr || !conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const { data: messages } = await supabase
    .from("ai_messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", req.params.id)
    .order("created_at", { ascending: true });

  res.json({ ...conv, messages: messages ?? [] });
});

/** DELETE /api/anthropic/conversations/:id */
app.delete("/api/anthropic/conversations/:id", requireAuth, async (req, res) => {
  const { error } = await supabase
    .from("ai_conversations")
    .delete()
    .eq("id", req.params.id)
    .eq("user_id", req.user.id);

  if (error) {
    console.error("delete conversation:", error);
    res.status(500).json({ error: error.message });
    return;
  }
  res.status(204).send();
});

/** POST /api/anthropic/conversations/:id/messages — send a message, stream the AI reply via SSE */
app.post("/api/anthropic/conversations/:id/messages", requireAuth, async (req, res) => {
  const content = String(req.body?.content ?? "").trim();
  if (!content) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  // Verify the conversation belongs to this user
  const { data: conv } = await supabase
    .from("ai_conversations")
    .select("id")
    .eq("id", req.params.id)
    .eq("user_id", req.user.id)
    .single();

  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  // Persist the user's message
  await supabase
    .from("ai_messages")
    .insert({ conversation_id: req.params.id, role: "user", content });

  // Load full conversation history to send as context
  const { data: history } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", req.params.id)
    .order("created_at", { ascending: true });

  // Open SSE stream
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  let fullResponse = "";

  try {
    const stream = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      stream: true,
      messages: [
        { role: "system", content: PCOS_SYSTEM_PROMPT },
        ...(history ?? []).map((m) => ({ role: m.role, content: m.content })),
      ],
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content ?? "";
      if (text) {
        fullResponse += text;
        res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
      }
    }

    // Persist the assistant's full response
    if (fullResponse) {
      await supabase
        .from("ai_messages")
        .insert({ conversation_id: req.params.id, role: "assistant", content: fullResponse });
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    console.error("Groq stream error:", err);
    res.write(`data: ${JSON.stringify({ error: "Something went wrong. Please try again." })}\n\n`);
  }

  res.end();
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Nylaia API server listening on port ${PORT}`);
});
