import { Router, type IRouter } from "express";
import { eq, desc, asc, and } from "drizzle-orm";
import { db, conversations, messages } from "@workspace/db";
import {
  CreateOpenaiConversationBody,
  GetOpenaiConversationParams,
  DeleteOpenaiConversationParams,
  ListOpenaiMessagesParams,
  SendOpenaiMessageParams,
  SendOpenaiMessageBody,
} from "@workspace/api-zod";
import { openai, isModelFarm } from "@workspace/integrations-openai-ai-server";

const MODEL_NAME = isModelFarm ? "gpt-5.4" : "gpt-4o-mini";

const router: IRouter = Router();

// GET /api/openai/conversations — list user's conversations
router.get("/openai/conversations", async (req, res): Promise<void> => {
  try {
    const convos = await db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, req.user!.id))
      .orderBy(desc(conversations.createdAt));
    res.json(convos);
  } catch (err) {
    res.status(500).json({ error: "Failed to list conversations" });
  }
});

// POST /api/openai/conversations — create a conversation
router.post("/openai/conversations", async (req, res): Promise<void> => {
  const parsed = CreateOpenaiConversationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [conv] = await db
      .insert(conversations)
      .values({
        userId: req.user!.id,
        title: parsed.data.title
      })
      .returning();
    res.status(201).json(conv);
  } catch (err) {
    res.status(500).json({ error: "Failed to create conversation" });
  }
});

// GET /api/openai/conversations/:id — get conversation detail (with messages)
router.get("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = GetOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [conv] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, params.data.id),
          eq(conversations.userId, req.user!.id)
        )
      );
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    const msgs = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, params.data.id),
          eq(messages.userId, req.user!.id)
        )
      )
      .orderBy(asc(messages.createdAt));
    res.json({ ...conv, messages: msgs });
  } catch (err) {
    res.status(500).json({ error: "Failed to get conversation details" });
  }
});

// DELETE /api/openai/conversations/:id — delete a conversation
router.delete("/openai/conversations/:id", async (req, res): Promise<void> => {
  const params = DeleteOpenaiConversationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [conv] = await db
      .delete(conversations)
      .where(
        and(
          eq(conversations.id, params.data.id),
          eq(conversations.userId, req.user!.id)
        )
      )
      .returning();
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: "Failed to delete conversation" });
  }
});

// GET /api/openai/conversations/:id/messages — list messages in a conversation
router.get("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = ListOpenaiMessagesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const msgs = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, params.data.id),
          eq(messages.userId, req.user!.id)
        )
      )
      .orderBy(asc(messages.createdAt));
    res.json(msgs);
  } catch (err) {
    res.status(500).json({ error: "Failed to list messages" });
  }
});

// POST /api/openai/conversations/:id/messages — stream new message and save
router.post("/openai/conversations/:id/messages", async (req, res): Promise<void> => {
  const params = SendOpenaiMessageParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = SendOpenaiMessageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const convId = params.data.id;

  try {
    // Check conversation ownership
    const [conv] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, convId),
          eq(conversations.userId, req.user!.id)
        )
      );
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    // Save user message
    await db.insert(messages).values({
      conversationId: convId,
      userId: req.user!.id,
      role: "user",
      content: body.data.content,
    });

    // Build chat history for context
    const history = await db
      .select()
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, convId),
          eq(messages.userId, req.user!.id)
        )
      )
      .orderBy(asc(messages.createdAt));

    const chatMessages = [
      {
        role: "system" as const,
        content: `You are an expert AI shopping assistant for Indian e-commerce. When a user describes a product they want, provide helpful analysis, comparison insights, and buying recommendations in a conversational tone. Be specific about product attributes, value for money, and what to look for. Keep responses concise and actionable. Reference the products that were found when relevant. Use INR (₹) for prices.`,
      },
      ...history.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";
    try {
      const stream = await openai.chat.completions.create({
        model: MODEL_NAME,
        max_completion_tokens: 8192,
        messages: chatMessages,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
    } catch (err) {
      console.warn("[WARNING] Chat stream OpenAI call failed, using offline fallback response:", err);
      const content = "\n[Offline Mode] I'm currently running in offline fallback mode because I couldn't connect to OpenAI. I can help browse the cached products and search results above!";
      fullResponse += content;
      res.write(`data: ${JSON.stringify({ content })}\n\n`);
    }

    // Save assistant message
    await db.insert(messages).values({
      conversationId: convId,
      userId: req.user!.id,
      role: "assistant",
      content: fullResponse,
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    res.status(500).json({ error: "Failed to process message" });
  }
});

// POST /api/openai/conversations/:id/messages/manual — manually save any message (for search results logs)
router.post("/openai/conversations/:id/messages/manual", async (req, res): Promise<void> => {
  const { id } = req.params;
  const { role, content } = req.body as { role: string; content: string };
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    // Check conversation ownership
    const [conv] = await db
      .select()
      .from(conversations)
      .where(
        and(
          eq(conversations.id, parsedId),
          eq(conversations.userId, req.user!.id)
        )
      );
    if (!conv) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    const [msg] = await db
      .insert(messages)
      .values({
        conversationId: parsedId,
        userId: req.user!.id,
        role,
        content,
      })
      .returning();
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ error: "Failed to save manual message" });
  }
});

export default router;
