import { Router, type IRouter } from "express";
import { webSearch, getShoppingSuggestions } from "../../lib/web-search-agent";

const router: IRouter = Router();

router.post("/search/web", async (req, res): Promise<void> => {
  const { query } = req.body as { query?: string };
  if (!query?.trim()) {
    res.status(400).json({ error: "query is required" });
    return;
  }

  try {
    const result = await webSearch(query.trim());
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Web search failed";
    res.status(500).json({ error: msg });
  }
});

router.get("/search/suggestions", async (req, res): Promise<void> => {
  const category = typeof req.query.category === "string" ? req.query.category : undefined;
  try {
    const result = await getShoppingSuggestions(category);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get suggestions";
    res.status(500).json({ error: msg });
  }
});

export default router;
