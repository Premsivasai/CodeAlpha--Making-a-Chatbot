import { pgTable, serial, text, real, jsonb, timestamp, uuid } from "drizzle-orm/pg-core";

export const userPreferencesTable = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  favoriteBrands: jsonb("favorite_brands").$type<string[]>().notNull().default([]),
  preferredSources: jsonb("preferred_sources").$type<string[]>().notNull().default(["Amazon", "Flipkart"]),
  defaultCurrency: text("default_currency").notNull().default("INR"),
  preferredCategories: jsonb("preferred_categories").$type<string[]>().notNull().default([]),
  budgetMin: real("budget_min"),
  budgetMax: real("budget_max"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type UserPreferences = typeof userPreferencesTable.$inferSelect;
