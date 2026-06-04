import { pgTable, serial, text, integer, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const searchHistoryTable = pgTable("search_history", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id").notNull(),
  query: text("query").notNull(),
  resultsCount: integer("results_count").notNull().default(0),
  searchedAt: timestamp("searched_at").notNull().defaultNow(),
});

export const insertSearchHistorySchema = createInsertSchema(searchHistoryTable).omit({ id: true, userId: true, searchedAt: true });
export type InsertSearchHistory = z.infer<typeof insertSearchHistorySchema>;
export type SearchHistory = typeof searchHistoryTable.$inferSelect;
