import path from "node:path";
import fs from "node:fs";

const envPath = path.resolve(import.meta.dirname, "../../../.env");
if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envPath);
  }
}

import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

// Dev uses Replit's local DATABASE_URL (Supabase IPv6 is unreachable from dev).
// Production uses SUPABASE_DATABASE_URL (set via deployment env vars).
const isProduction = process.env.NODE_ENV === "production";
const connectionString = isProduction
  ? (process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL)
  : (process.env.DATABASE_URL || process.env.SUPABASE_DATABASE_URL);

if (!connectionString) {
  throw new Error(
    "No database URL found. Set DATABASE_URL (dev) or SUPABASE_DATABASE_URL (production).",
  );
}

const isSupabase =
  !!process.env.SUPABASE_DATABASE_URL &&
  connectionString === process.env.SUPABASE_DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
});

export const db = drizzle(pool, { schema });

export * from "./schema";
