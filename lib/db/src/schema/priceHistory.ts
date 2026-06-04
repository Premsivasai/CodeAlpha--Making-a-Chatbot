import { pgTable, serial, text, real, timestamp } from "drizzle-orm/pg-core";

export const priceHistoryTable = pgTable("price_history", {
  id: serial("id").primaryKey(),
  productId: text("product_id").notNull(),
  price: real("price").notNull(),
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
});

export type PriceHistory = typeof priceHistoryTable.$inferSelect;
export type InsertPriceHistory = typeof priceHistoryTable.$inferInsert;
