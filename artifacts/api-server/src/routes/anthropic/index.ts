import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db/schema";
import { anthropic } from "@workspace/integrations-anthropic-ai";
import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";

const router: IRouter = Router();

router.get("/anthropic/conversations", async (req, res) => {
  const rows = await db.select().from(conversations).orderBy(conversations.createdAt);
  res.json(rows);
});

router.post("/anthropic/conversations", async (req, res) => {
  const { title } = req.body as { title: string };
  const [row] = await db.insert(conversations).values({ title }).returning();
  res.status(201).json(row);
});

router.get("/anthropic/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
  res.json({ ...conv, messages: msgs });
});

router.delete("/anthropic/conversations/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }
  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).send();
});

router.get("/anthropic/conversations/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);
  res.json(msgs);
});

const PCOS_SYSTEM_PROMPT = `You are Elara, a warm, knowledgeable PCOS wellness companion. You help women with PCOS (Polycystic Ovary Syndrome) understand their symptoms, manage their condition, and feel supported.

Your approach:
- Speak with warmth, empathy, and genuine care — never clinical or cold
- Give specific, evidence-based guidance tailored to PCOS (not generic wellness advice)
- Acknowledge the difficulty of living with a chronic condition that's often dismissed
- Be practical: suggest concrete actions, foods, and approaches they can start today
- Know your limits: always recommend consulting a healthcare provider for medical decisions
- Keep responses focused and digestible — not overwhelming walls of text
- Never make women feel guilty or judged about their body, weight, or choices

Key PCOS knowledge to draw from:
- Insulin resistance is the core driver of most PCOS symptoms
- Cortisol and stress directly worsen PCOS hormones
- PCOS cycles are often irregular and longer (35-60+ days)
- Low-glycemic eating, strength training, and sleep are the most evidence-backed interventions
- Common deficiencies: magnesium, vitamin D, zinc, B vitamins
- Supplements with evidence: myo-inositol, magnesium glycinate, vitamin D, spearmint tea (for androgens)
- The four cycle phases affect symptoms differently and require different support
- Women with PCOS often feel dismissed by doctors — validate this experience

When the user shares symptom data (energy, mood, stress, bloating, etc.), interpret it through a PCOS lens and give phase-appropriate, symptom-specific guidance.

Keep responses conversational and warm — like a knowledgeable friend, not a medical textbook.`;

router.post("/anthropic/conversations/:id/messages", async (req, res) => {
  const id = Number(req.params.id);
  const { content } = req.body as { content: string };

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  await db.insert(messages).values({ conversationId: id, role: "user", content });

  const history = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(messages.createdAt);

  const chatMessages = history.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");

  let fullResponse = "";

  try {
    const stream = anthropic.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 8192,
      system: PCOS_SYSTEM_PROMPT,
      messages: chatMessages,
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        fullResponse += event.delta.text;
        res.write(`data: ${JSON.stringify({ content: event.delta.text })}\n\n`);
      }
    }

    await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse });
    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    req.log.error({ err }, "Anthropic stream error");
    res.write(`data: ${JSON.stringify({ error: "Something went wrong. Please try again." })}\n\n`);
  }

  res.end();
});

export default router;
