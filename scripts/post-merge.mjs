import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");

function run(command, args) {
  execFileSync(command, args, {
    cwd: workspaceRoot,
    stdio: "inherit",
  });
}

run("pnpm", ["install", "--frozen-lockfile"]);
run("pnpm", ["--filter", "@workspace/db", "push"]);