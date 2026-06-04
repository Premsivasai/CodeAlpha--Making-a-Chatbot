import { pgTable, serial, text, real, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { savedProductsTable } from "./savedProducts";

export const priceAlertsTable = pgTable("price_alerts", {
  id: serial("id").primaryKey(),
  savedProductId: serial("saved_product_id").references(() => savedProductsTable.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull(),
  productId: text("product_id").notNull(),
  title: text("title").notNull(),
  imageUrl: text("image_url").notNull().default(""),
  productUrl: text("product_url").notNull().default(""),
  source: text("source").notNull().default(""),
  savedPrice: real("saved_price").notNull(),
  targetPrice: real("target_price").notNull(),
  currentPrice: real("current_price"),
  isTriggered: boolean("is_triggered").notNull().default(false),
  triggeredAt: timestamp("triggered_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type PriceAlert = typeof priceAlertsTable.$inferSelect;
