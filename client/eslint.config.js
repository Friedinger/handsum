import jsEslintConfig from "@eslint/js";
import { vueTsConfigs, withVueTs } from "@vue/eslint-config-typescript";
import { globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import pluginVue from "eslint-plugin-vue";

const folderPatterns = (name) => [`@/${name}`, `@/${name}/**`];

const MODULES = {
  vue: ["vue", "vue/*", "@vue/*", "*.vue"],
  engine: folderPatterns("engine"),
  data: folderPatterns("data"),
  strings: folderPatterns("data/strings"),
  net: folderPatterns("net"),
  utils: folderPatterns("utils"),
  composables: folderPatterns("composables"),
  components: folderPatterns("components"),
  views: folderPatterns("views"),
  app: ["@/App.vue"],
};

const LOGIC = ["engine", "data", "strings"];
const UI_BASE = ["vue", ...LOGIC, "net", "utils"];

const LAYERS = [
  {
    folder: "engine",
    allows: ["data"],
    reason:
      "The engine is pure game logic and depends on nothing but its own folder and the card data.",
  },
  {
    folder: "data",
    allows: ["engine", "strings"],
    reason: "Data may only depend on the engine types.",
  },
  {
    folder: "net",
    allows: LOGIC,
    reason: "The network layer must not depend on the UI.",
  },
  {
    folder: "utils",
    allows: LOGIC,
    reason: "Utils are framework-free and may only use the engine and data.",
  },
  {
    folder: "composables",
    allows: UI_BASE,
    reason: "Composables must not depend on components or views.",
  },
  {
    folder: "components",
    allows: [...UI_BASE, "composables"],
    reason: "Components must not depend on views.",
  },
  {
    folder: "views",
    allows: [...UI_BASE, "composables", "components"],
    reason: "Views must not depend on the app shell.",
  },
];

const RELATIVE_IMPORTS = {
  group: ["./*", "./**", "../*", "../**"],
  message: "Import via the @/ alias (@test/ in tests), not relative paths.",
};
const TEST_ALIAS_IMPORTS = {
  group: ["@test", "@test/**"],
  message: "Production code must not import from test/.",
};

export default withVueTs(
  jsEslintConfig.configs.recommended,
  pluginVue.configs["flat/recommended"],
  vueTsConfigs.strictTypeChecked,
  vueTsConfigs.stylisticTypeChecked,
  {
    linterOptions: {
      reportUnusedDisableDirectives: "error",
      reportUnusedInlineConfigs: "error",
    },
    rules: {
      "no-console": ["error", { allow: ["debug"] }],
    },
  },
  {
    files: ["**/*.js"],
    extends: [vueTsConfigs.disableTypeChecked],
  },
  {
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      "no-duplicate-imports": "error",
      "simple-import-sort/imports": [
        "warn",
        {
          groups: [
            ["^\\u0000"],
            ["^node:"],
            ["^(?!@test/)@?\\w"],
            ["^@/"],
            ["^@test/"],
          ],
        },
      ],
      "simple-import-sort/exports": "warn",
    },
  },
  ...LAYERS.map(layerRule),
  restrictImports(["src/*.{ts,vue}"], [RELATIVE_IMPORTS, TEST_ALIAS_IMPORTS]),
  restrictImports(["test/**"], [RELATIVE_IMPORTS]),
  eslintConfigPrettier,
  globalIgnores(["dist", "node_modules"]),
);

function restrictImports(files, patterns) {
  return {
    files,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: patterns.map(({ group, message }) => ({ group, message })),
        },
      ],
    },
  };
}

function layerRule({ folder, allows, reason }) {
  const allowed = new Set([folder, ...allows]);
  const forbidden = Object.entries(MODULES)
    .filter(([name]) => !allowed.has(name))
    .flatMap(([, patterns]) => patterns);
  return restrictImports(
    [`src/${folder}/**`],
    [
      RELATIVE_IMPORTS,
      TEST_ALIAS_IMPORTS,
      { group: forbidden, message: reason },
    ],
  );
}
