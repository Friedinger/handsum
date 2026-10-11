import jsEslintConfig from "@eslint/js";
import { vueTsConfigs, withVueTs } from "@vue/eslint-config-typescript";
import { ESLint } from "eslint";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import { globalIgnores } from "eslint/config";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";

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
  eslintConfigPrettier,
  globalIgnores(["dist", "node_modules"]),
);
