import jsEslintConfig from "@eslint/js";
import { vueTsConfigs, withVueTs } from "@vue/eslint-config-typescript";
import { ESLint } from "eslint";
import { globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import simpleImportSort from "eslint-plugin-simple-import-sort";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";

const VUE_IMPORTS = ["vue", "vue/*", "@vue/*", "*.vue"];
const folder = (name) => [`@/${name}`, `@/${name}/**`];
const NET = folder("net");
const COMPONENTS = folder("components");
const COMPOSABLES = folder("composables");
const VIEWS = folder("views");
const UTILS = folder("utils");
const APP = ["@/App.vue"];

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

const RELATIVE_IMPORTS = {
  group: ["./*", "./**", "../*", "../**"],
  message: "Import via the @/ alias (@test/ in tests), not relative paths.",
};
const TEST_ALIAS_IMPORTS = {
  group: ["@test", "@test/**"],
  message: "Production code must not import from test/.",
};

// Later config blocks replace this rule entirely, so each layer lists everything it forbids.
function layer(folderName, layerDescription, ...forbidden) {
  return restrictImports(
    [`src/${folderName}/**`],
    [
      RELATIVE_IMPORTS,
      TEST_ALIAS_IMPORTS,
      { group: forbidden.flat(), message: layerDescription },
    ],
  );
}

export default withVueTs(
  ESLint.defaultConfig,
  jsEslintConfig.configs.recommended,
  pluginVue.configs["flat/recommended"],
  vueTsConfigs.strictTypeChecked,
  vueTsConfigs.stylisticTypeChecked,
  {
    languageOptions: { globals: globals.browser },
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
    languageOptions: { globals: globals.node },
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
  layer(
    "engine",
    "The engine is pure game logic and depends on nothing but its own folder and the card data.",
    VUE_IMPORTS,
    NET,
    COMPONENTS,
    COMPOSABLES,
    VIEWS,
    UTILS,
    APP,
    ["@/data/strings"],
  ),
  layer(
    "data",
    "Data may only depend on the engine types.",
    VUE_IMPORTS,
    NET,
    COMPONENTS,
    COMPOSABLES,
    VIEWS,
    UTILS,
    APP,
  ),
  layer(
    "net",
    "The network layer must not depend on the UI.",
    VUE_IMPORTS,
    COMPONENTS,
    COMPOSABLES,
    VIEWS,
    UTILS,
    APP,
  ),
  layer(
    "utils",
    "Utils are framework-free and may only use the engine and data.",
    VUE_IMPORTS,
    NET,
    COMPONENTS,
    COMPOSABLES,
    VIEWS,
    APP,
  ),
  layer(
    "composables",
    "Composables must not depend on components or views.",
    COMPONENTS,
    VIEWS,
    APP,
  ),
  layer("components", "Components must not depend on views.", VIEWS, APP),
  layer("views", "Views must not depend on the app shell.", APP),
  restrictImports(["src/*.{ts,vue}"], [RELATIVE_IMPORTS, TEST_ALIAS_IMPORTS]),
  restrictImports(["test/**"], [RELATIVE_IMPORTS]),
  eslintConfigPrettier,
  globalIgnores(["dist", "node_modules"]),
);
