import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import { off } from "process";

export default [
  { files: ["**/*.{js,mjs,ts}"] },
  { languageOptions: { globals: globals.node } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": off,
    },
  },
];
