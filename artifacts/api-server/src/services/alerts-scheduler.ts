import { db, priceAlertsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export function startAlertsScheduler() {
  console.log("[INFO] Starting background Price Alerts Scheduler...");

  // Set up an interval to check price alerts (1-minute intervals for dev/demonstration)
  const interval = setInterval(async () => {
    try {
      console.log("[INFO] Checking active price alerts in database...");
      const activeAlerts = await db
        .select()
        .from(priceAlertsTable)
        .where(eq(priceAlertsTable.isTriggered, false));

      for (const alert of activeAlerts) {
        // Trigger condition: current price reaches target price
        if (alert.currentPrice && alert.currentPrice <= alert.targetPrice) {
          console.log(
            `[ALERT TRIGGERED] "${alert.title}" target met! Current: ₹${alert.currentPrice}, Target: ₹${alert.targetPrice}`
          );

          await db
            .update(priceAlertsTable)
            .set({
              isTriggered: true,
              triggeredAt: new Date(),
              updatedAt: new Date()
            })
            .where(eq(priceAlertsTable.id, alert.id));
        }
      }
    } catch (err) {
      console.error("[ERROR] Failed to run price alerts checker:", err);
    }
  }, 60000);

  return () => clearInterval(interval);
}
