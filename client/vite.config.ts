import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  // Relative base keeps the build working under the GitHub Pages sub-path and locally.
  base: "./",
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    // `npm run dev:server` runs the PHP API; in production it lives next to the build as api/.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8080",
        rewrite: (path) => path.replace(/^\/api\/?/, "/"),
      },
    },
  },
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
