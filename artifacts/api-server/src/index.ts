import path from "node:path";
import fs from "node:fs";

const envPath = path.resolve(import.meta.dirname, "../../../.env");
if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envPath);
  }
}

import app from "./app";
import { logger } from "./lib/logger";

const rawPort = process.env["PORT"] ?? "8080";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

import { startAlertsScheduler } from "./services/alerts-scheduler";

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  startAlertsScheduler();
});
