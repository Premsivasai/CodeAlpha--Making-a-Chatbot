import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { createRequire } from "module";

const _require = createRequire(import.meta.url);
let tanstackReactQueryAlias: string | undefined;
try {
  // Try to resolve the package.json to get the package directory
  const packageJsonPath = _require.resolve('@tanstack/react-query/package.json');
  const packageDir = path.dirname(packageJsonPath);
  // Point to the source index.ts file
  tanstackReactQueryAlias = path.join(packageDir, 'src/index.ts');
} catch (e) {
  // Fallback: leave undefined and let Vite attempt normal resolution.
  tanstackReactQueryAlias = undefined;
}

const rawPort = process.env.PORT ?? "25206";

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";
const apiServerUrl = process.env.API_SERVER_URL ?? "http://127.0.0.1:8080";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.NODE_ENV !== "production"
      ? [
          await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
            m.default(),
          ),
        ]
      : []),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
      ...(tanstackReactQueryAlias
        ? { "@tanstack/react-query": tanstackReactQueryAlias }
        : {}),
      // No local shim here — prefer the package source/modern build when resolvable.
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: apiServerUrl,
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: apiServerUrl,
        changeOrigin: true,
      },
    },
  },
});
