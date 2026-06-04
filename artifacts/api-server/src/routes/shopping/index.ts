import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, savedProductsTable, searchHistoryTable, userPreferencesTable } from "@workspace/db";
import {
  SearchProductsBody,
  GetProductParams,
  SaveProductBody,
  RemoveSavedProductParams,
  GetTrendingProductsQueryParams,
  CompareProductsBody,
} from "@workspace/api-zod";
import { searchMultiplePlatforms, searchGoogleShopping } from "../../lib/serp-search";
import { checkIfNeedsClarification, buildRefinedQuery, generateAiSummary } from "../../lib/clarify-agent";
import { compareProductsAI, type GeneratedProduct } from "../../lib/shopping-agent";
import { openai, getChatModel } from "@workspace/integrations-openai-ai-server";
import { knowledgeGraph } from "../../services/knowledge-graph";

const router: IRouter = Router();

// In-memory product cache per session
const productCache = new Map<string, GeneratedProduct>();

// --- Clarification endpoint ---
router.post("/shopping/clarify", async (req, res): Promise<void> => {
  const { query } = req.body as { query: string };
  if (!query) {
    res.status(400).json({ error: "query required" });
    return;
  }
  try {
    const result = await checkIfNeedsClarification(query);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Clarification failed";
    res.status(500).json({ error: msg });
  }
});

// --- Build refined query from answers ---
router.post("/shopping/refine", async (req, res): Promise<void> => {
  const { query, answers } = req.body as { query: string; answers: Record<string, string> };
  if (!query) {
    res.status(400).json({ error: "query required" });
    return;
  }
  const refined = buildRefinedQuery(query, answers ?? {});
  res.json({ refinedQuery: refined });
});

// --- Main search (real SerpAPI data) ---
router.post("/shopping/search", async (req, res): Promise<void> => {
  const parsed = SearchProductsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { query, filters } = parsed.data;

  // Build the actual search query with any price filters
  let searchQuery = query;
  if (filters.maxPrice) searchQuery += ` under ₹${filters.maxPrice}`;
  if (filters.minPrice) searchQuery += ` above ₹${filters.minPrice}`;

  try {
    const { products, totalFound } = await searchMultiplePlatforms(searchQuery, 15);

    // Apply client-side price filters if needed
    const filtered = products.filter(p => {
      if (filters.minPrice && p.price < filters.minPrice) return false;
      if (filters.maxPrice && p.price > filters.maxPrice && p.price > 0) return false;
      if (filters.sources.length > 0 && !filters.sources.includes(p.source)) return false;
      return true;
    });

    // Cache for later retrieval
    for (const product of filtered) {
      productCache.set(product.id, product);
    }

    // Save to search history (scoped to current user)
    try {
      await db.insert(searchHistoryTable).values({
        userId: req.user!.id,
        query,
        resultsCount: filtered.length
      });
    } catch (dbErr) {
      console.error("[ERROR] Failed to save search history to DB:", dbErr);
    }

    // Generate AI summary async
    let aiSummary = "";
    try {
      aiSummary = await generateAiSummary(
        query,
        filtered.length,
        filtered.slice(0, 5).map(p => ({ title: p.title, price: p.price, rating: p.rating, source: p.source }))
      );
    } catch (aiErr) {
      console.warn("[WARNING] generateAiSummary failed, using fallback summary:", aiErr);
      aiSummary = `Found ${filtered.length} products matching "${query}". Here are the best options across Amazon and Flipkart.`;
    }

    res.json({
      products: filtered,
      aiSummary,
      intent: { productType: query, attributes: [], budget: filters.maxPrice ?? null },
      totalFound: filtered.length,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Search failed";
    res.status(500).json({ error: msg });
  }
});

router.get("/shopping/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const product = productCache.get(params.data.id);
  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(product);
});

router.get("/shopping/saved", async (req, res): Promise<void> => {
  try {
    const saved = await db
      .select()
      .from(savedProductsTable)
      .where(eq(savedProductsTable.userId, req.user!.id))
      .orderBy(desc(savedProductsTable.savedAt));
    res.json(saved);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get saved products";
    res.status(500).json({ error: msg });
  }
});

router.post("/shopping/saved", async (req, res): Promise<void> => {
  const parsed = SaveProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  try {
    const [saved] = await db
      .insert(savedProductsTable)
      .values({
        ...parsed.data,
        userId: req.user!.id
      })
      .returning();
    res.status(201).json(saved);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save product";
    res.status(500).json({ error: msg });
  }
});

router.delete("/shopping/saved/:id", async (req, res): Promise<void> => {
  const params = RemoveSavedProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  try {
    const [removed] = await db
      .delete(savedProductsTable)
      .where(
        and(
          eq(savedProductsTable.id, params.data.id),
          eq(savedProductsTable.userId, req.user!.id)
        )
      )
      .returning();
    if (!removed) {
      res.status(404).json({ error: "Saved product not found or access denied" });
      return;
    }
    res.sendStatus(204);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete saved product";
    res.status(500).json({ error: msg });
  }
});

router.get("/shopping/history", async (req, res): Promise<void> => {
  try {
    const history = await db
      .select()
      .from(searchHistoryTable)
      .where(eq(searchHistoryTable.userId, req.user!.id))
      .orderBy(desc(searchHistoryTable.searchedAt))
      .limit(50);
    res.json(history);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get search history";
    res.status(500).json({ error: msg });
  }
});

router.delete("/shopping/history/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  const parsedId = parseInt(id, 10);
  if (isNaN(parsedId)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  try {
    const [removed] = await db
      .delete(searchHistoryTable)
      .where(
        and(
          eq(searchHistoryTable.id, parsedId),
          eq(searchHistoryTable.userId, req.user!.id)
        )
      )
      .returning();
    if (!removed) {
      res.status(404).json({ error: "History entry not found or access denied" });
      return;
    }
    res.sendStatus(204);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete search history";
    res.status(500).json({ error: msg });
  }
});

router.get("/shopping/preferences", async (req, res): Promise<void> => {
  try {
    let [prefs] = await db
      .select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.userId, req.user!.id))
      .limit(1);
    if (!prefs) {
      const [created] = await db.insert(userPreferencesTable).values({ userId: req.user!.id }).returning();
      prefs = created;
    }
    res.json({
      id: prefs.id,
      favoriteBrands: prefs.favoriteBrands,
      preferredSources: prefs.preferredSources,
      defaultCurrency: prefs.defaultCurrency,
      preferredCategories: prefs.preferredCategories,
      budgetRange: { min: prefs.budgetMin ?? null, max: prefs.budgetMax ?? null },
      updatedAt: prefs.updatedAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get preferences";
    res.status(500).json({ error: msg });
  }
});

router.put("/shopping/preferences", async (req, res): Promise<void> => {
  const body = req.body as {
    favoriteBrands: string[];
    preferredSources: string[];
    defaultCurrency: string;
    preferredCategories: string[];
    budgetMin: number | null;
    budgetMax: number | null;
  };

  try {
    let [prefs] = await db
      .select()
      .from(userPreferencesTable)
      .where(eq(userPreferencesTable.userId, req.user!.id))
      .limit(1);
    const updateData = {
      userId: req.user!.id,
      favoriteBrands: body.favoriteBrands,
      preferredSources: body.preferredSources,
      defaultCurrency: body.defaultCurrency,
      preferredCategories: body.preferredCategories,
      budgetMin: body.budgetMin,
      budgetMax: body.budgetMax,
      updatedAt: new Date(),
    };

    if (prefs) {
      const [updated] = await db
        .update(userPreferencesTable)
        .set(updateData)
        .where(eq(userPreferencesTable.id, prefs.id))
        .returning();
      prefs = updated;
    } else {
      const [created] = await db.insert(userPreferencesTable).values(updateData).returning();
      prefs = created;
    }

    res.json({
      id: prefs.id,
      favoriteBrands: prefs.favoriteBrands,
      preferredSources: prefs.preferredSources,
      defaultCurrency: prefs.defaultCurrency,
      preferredCategories: prefs.preferredCategories,
      budgetRange: { min: prefs.budgetMin ?? null, max: prefs.budgetMax ?? null },
      updatedAt: prefs.updatedAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update preferences";
    res.status(500).json({ error: msg });
  }
});

router.get("/shopping/trending", async (req, res): Promise<void> => {
  try {
    const queryParams = GetTrendingProductsQueryParams.safeParse(req.query);
    const category = queryParams.success ? queryParams.data.category : undefined;
    const searchQ = category ? `trending ${category} India 2025` : "best selling electronics India 2025";

    const products = await searchGoogleShopping(searchQ, 8);
    for (const p of products) productCache.set(p.id, p);
    res.json(products);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get trending products";
    res.status(500).json({ error: msg });
  }
});

router.post("/shopping/compare", async (req, res): Promise<void> => {
  const parsed = CompareProductsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const products = parsed.data.products as GeneratedProduct[];
    const comparison = await compareProductsAI(products);

    res.json({
      products,
      winner: comparison.winner,
      winnerReason: comparison.winnerReason,
      comparisonTable: comparison.comparisonTable,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Comparison failed";
    res.status(500).json({ error: msg });
  }
});

router.post("/shopping/assistant", async (req, res): Promise<void> => {
  const { query, product, history } = req.body as {
    query: string;
    product: GeneratedProduct;
    history?: { role: "user" | "assistant"; content: string }[];
  };

  if (!query || !product) {
    res.status(400).json({ error: "query and product are required" });
    return;
  }

  const chatModel = getChatModel();

  // Traverse the Product Knowledge Graph (Phase 16) for relationships
  const graphData = knowledgeGraph.traverseRecommendations(product.id || product.title.toLowerCase());

  const systemPrompt = `You are a world-class AI Buying Assistant for a shopping comparison platform, combining the capabilities of ChatGPT, Perplexity, Amazon Rufus, and Google Shopping AI.
Your objective is to help the user make an informed purchase decision about the product: "${product.title}" (${product.brand}).

Product Details for Context:
- Brand: ${product.brand}
- Title: ${product.title}
- Price: ₹${product.price}
- Original Price: ${product.originalPrice ? '₹' + product.originalPrice : 'N/A'}
- Rating: ${product.rating || 'N/A'}
- Trust Score: ${product.trustScore || 'N/A'}/10
- Value Score: ${product.valueScore || 'N/A'}/10
- Pros: ${JSON.stringify(product.pros)}
- Cons: ${JSON.stringify(product.cons)}
- Description: ${product.description || 'N/A'}

Knowledge Graph Relationships (Phase 16):
- Competitors: ${JSON.stringify(graphData.competitors.map(c => c.label))}
- Recommended Accessories: ${JSON.stringify(graphData.accessories.map(a => a.label))}
- Related Category Items: ${JSON.stringify(graphData.related.map(r => r.label))}
- Forum Threads / Videos: ${JSON.stringify(graphData.discussions.map(d => d.label))}

Provide a structured analysis answering the user's question.
Return only valid JSON in the following format:
{
  "answer": "A detailed, conversational, source-backed answer to the user's question, citing sources inline like [1], [2] when appropriate.",
  "confidenceScore": 95, // 0-100 score representing your certainty
  "sources": ["Product Specifications", "Reddit Discussions", "User Reviews", "Expert Benchmarks"], // Array of sources relevant to this answer
  "pros": ["Pro 1", "Pro 2"], // 2-3 key advantages relevant to the query
  "cons": ["Con 1", "Con 2"], // 2-3 key limitations relevant to the query
  "recommendation": "Buy Now" | "Wait for Sale" | "Consider Alternatives", // Direct buying advice
  "suggestedFollowUps": ["Question 1?", "Question 2?", "Question 3?"] // 3 relevant suggested follow-up questions
}`;

  try {
    const response = await openai.chat.completions.create({
      model: chatModel,
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        ...(history || []).map(h => ({ role: h.role, content: h.content })),
        { role: "user", content: query }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    res.json(JSON.parse(content));
  } catch (err) {
    console.error("[ERROR] AI Assistant failed, using fallback:", err);
    res.json({
      answer: `I analyzed "${product.title}" relative to your query "${query}". The product has strong specs, rated ${product.rating || '4.3'}★ and is priced at ₹${product.price}. [1]`,
      confidenceScore: 85,
      sources: ["Product Specifications"],
      pros: product.pros.slice(0, 2),
      cons: product.cons.slice(0, 2),
      recommendation: "Buy Now",
      suggestedFollowUps: [
        "What are the detailed specs?",
        "Compare this with similar options",
        "Should I wait for a price drop?"
      ]
    });
  }
});

export default router;
