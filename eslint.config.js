import js from "@eslint/js";
import { vueTsConfigs, withVueTs } from "@vue/eslint-config-typescript";
import prettier from "eslint-config-prettier";
import pluginVue from "eslint-plugin-vue";
import globals from "globals";

export default withVueTs(
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  pluginVue.configs["flat/recommended"],
  vueTsConfigs.strictTypeChecked,
  vueTsConfigs.stylisticTypeChecked,
  {
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["**/*.js"],
    extends: [vueTsConfigs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  prettier,
);
