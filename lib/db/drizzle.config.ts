import { defineConfig } from "drizzle-kit";
import path from "path";
import fs from "fs";

// Load root .env file if database URL variables are not already present
if (!process.env.DATABASE_URL && !process.env.SUPABASE_DATABASE_URL) {
  const envPath = path.resolve(__dirname, "../../.env");
  if (fs.existsSync(envPath)) {
    if (typeof process.loadEnvFile === "function") {
      process.loadEnvFile(envPath);
    } else {
      const envContent = fs.readFileSync(envPath, "utf-8");
      for (const line of envContent.split("\n")) {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
          const key = match[1];
          let val = (match[2] || "").trim();
          if (val.startsWith('"') && val.endsWith('"')) {
            val = val.substring(1, val.length - 1);
          } else if (val.startsWith("'") && val.endsWith("'")) {
            val = val.substring(1, val.length - 1);
          }
          process.env[key] = val;
        }
      }
    }
  }
}

// Use Supabase for migrations if available, otherwise fall back to local DB
const url =
  process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!url) {
  throw new Error(
    "No database URL found. Set SUPABASE_DATABASE_URL or DATABASE_URL.",
  );
}

export default defineConfig({
  schema: "./src/schema/*",
  dialect: "postgresql",
  dbCredentials: { url },
});

