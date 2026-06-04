import { Router, type IRouter } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db, priceAlertsTable, savedProductsTable } from "@workspace/db";
import { searchGoogleShopping } from "../../lib/serp-search";

const router: IRouter = Router();

// GET /api/alerts — list user's price alerts
router.get("/alerts", async (req, res): Promise<void> => {
  try {
    const alerts = await db
      .select()
      .from(priceAlertsTable)
      .where(eq(priceAlertsTable.userId, req.user!.id))
      .orderBy(desc(priceAlertsTable.createdAt));
    res.json(alerts);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to get alerts";
    res.status(500).json({ error: msg });
  }
});

// POST /api/alerts — create or update a price alert for a saved product
router.post("/alerts", async (req, res): Promise<void> => {
  const body = req.body as {
    savedProductId: number;
    productId: string;
    title: string;
    imageUrl: string;
    productUrl: string;
    source: string;
    savedPrice: number;
    targetPrice: number;
  };

  if (!body.savedProductId || !body.productId || !body.targetPrice) {
    res.status(400).json({ error: "savedProductId, productId and targetPrice are required" });
    return;
  }

  try {
    // Access validation: Check if savedProduct is owned by the current user
    const [savedProduct] = await db
      .select()
      .from(savedProductsTable)
      .where(
        and(
          eq(savedProductsTable.id, body.savedProductId),
          eq(savedProductsTable.userId, req.user!.id)
        )
      )
      .limit(1);

    if (!savedProduct) {
      res.status(403).json({ error: "Access denied: Saved product not owned by user" });
      return;
    }

    // Upsert — one alert per saved product
    const existing = await db
      .select()
      .from(priceAlertsTable)
      .where(
        and(
          eq(priceAlertsTable.savedProductId, body.savedProductId),
          eq(priceAlertsTable.userId, req.user!.id)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(priceAlertsTable)
        .set({
          targetPrice: body.targetPrice,
          isTriggered: false,
          triggeredAt: null,
          updatedAt: new Date(),
        })
        .where(eq(priceAlertsTable.id, existing[0]!.id))
        .returning();
      res.status(200).json(updated);
    } else {
      const [created] = await db
        .insert(priceAlertsTable)
        .values({
          savedProductId: body.savedProductId,
          userId: req.user!.id,
          productId: body.productId,
          title: body.title,
          imageUrl: body.imageUrl,
          productUrl: body.productUrl,
          source: body.source,
          savedPrice: body.savedPrice,
          targetPrice: body.targetPrice,
        })
        .returning();
      res.status(201).json(created);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to save alert";
    res.status(500).json({ error: msg });
  }
});

// DELETE /api/alerts/:id — remove an alert
router.delete("/alerts/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "", 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid alert id" });
    return;
  }
  try {
    const [removed] = await db
      .delete(priceAlertsTable)
      .where(
        and(
          eq(priceAlertsTable.id, id),
          eq(priceAlertsTable.userId, req.user!.id)
        )
      )
      .returning();
    if (!removed) {
      res.status(404).json({ error: "Alert not found or access denied" });
      return;
    }
    res.sendStatus(204);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to delete alert";
    res.status(500).json({ error: msg });
  }
});

// POST /api/alerts/check — check current prices for all untriggered alerts (user scoped)
router.post("/alerts/check", async (req, res): Promise<void> => {
  try {
    const pending = await db
      .select()
      .from(priceAlertsTable)
      .where(
        and(
          eq(priceAlertsTable.isTriggered, false),
          eq(priceAlertsTable.userId, req.user!.id)
        )
      );

    if (pending.length === 0) {
      res.json({ checked: 0, triggered: [] });
      return;
    }

    const triggered: typeof pending = [];

    await Promise.allSettled(
      pending.map(async (alert) => {
        try {
          const products = await searchGoogleShopping(alert.title, 3);
          if (products.length === 0) return;

          // Pick the lowest price found
          const prices = products.map(p => p.price).filter(p => p > 0);
          if (prices.length === 0) return;
          const currentPrice = Math.min(...prices);

          // Update current price in DB
          await db
            .update(priceAlertsTable)
            .set({
              currentPrice,
              updatedAt: new Date(),
              ...(currentPrice <= alert.targetPrice
                ? { isTriggered: true, triggeredAt: new Date() }
                : {}),
            })
            .where(eq(priceAlertsTable.id, alert.id));

          if (currentPrice <= alert.targetPrice) {
            triggered.push({ ...alert, currentPrice, isTriggered: true });
          }
        } catch {
          // skip individual failures
        }
      })
    );

    res.json({ checked: pending.length, triggered });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to check prices";
    res.status(500).json({ error: msg });
  }
});

export default router;
