import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [vue()],
  // Relative base keeps the build working under the GitHub Pages sub-path (/handsum/) and locally.
  base: "./",
  test: {
    include: ["src/**/*.test.ts"],
  },
});
