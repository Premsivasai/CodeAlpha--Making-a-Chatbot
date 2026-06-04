import { pgTable, serial, text, real, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const savedProductsTable = pgTable("saved_products", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  productId: text("product_id").notNull(),
  title: text("title").notNull(),
  brand: text("brand").notNull(),
  price: real("price").notNull(),
  currency: text("currency").notNull().default("INR"),
  imageUrl: text("image_url").notNull(),
  productUrl: text("product_url").notNull(),
  source: text("source").notNull(),
  rating: real("rating"),
  savedAt: timestamp("saved_at").notNull().defaultNow(),
});

export const insertSavedProductSchema = createInsertSchema(savedProductsTable).omit({ id: true, userId: true, savedAt: true });
export type InsertSavedProduct = z.infer<typeof insertSavedProductSchema>;
export type SavedProduct = typeof savedProductsTable.$inferSelect;
