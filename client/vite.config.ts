import vue from "@vitejs/plugin-vue";
import { cpSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { defineConfig } from "vitest/config";

const SERVER_DIR = fileURLToPath(new URL("../server", import.meta.url));
const SERVER_DEPLOY_ENTRIES = [".htaccess", "index.php", "src"];

function bundleServer(): Plugin {
  let apiDir = "";
  return {
    name: "bundle-server",
    apply: "build",
    configResolved(config) {
      apiDir = join(resolve(config.root, config.build.outDir), "api");
    },
    closeBundle() {
      for (const entry of SERVER_DEPLOY_ENTRIES) {
        cpSync(join(SERVER_DIR, entry), join(apiDir, entry), {
          recursive: true,
        });
      }
    },
  };
}

export default defineConfig({
  plugins: [vue(), bundleServer()],
  base: "./",
  resolve: {
    alias: {
      "@": "/src",
      "@test": "/test",
    },
  },
  server: {
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
    projects: [
      {
        extends: true,
        test: {
          name: "logic",
          include: ["test/**/*.test.ts"],
          exclude: ["test/**/*.dom.test.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          environment: "happy-dom",
          include: ["test/**/*.dom.test.ts"],
        },
      },
    ],
  },
});
