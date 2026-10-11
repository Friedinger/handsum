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
  build: {
    outDir: "dist",
    assetsDir: "assets",
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
