import { defineConfig } from "vitest/config";

export default defineConfig({
  // Relative base keeps the build working under the GitHub Pages sub-path (/handsum/) and locally.
  base: "./",
  test: {
    include: ["src/**/*.test.ts"],
    passWithNoTests: true,
  },
});
