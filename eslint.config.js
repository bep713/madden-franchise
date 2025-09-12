import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier";

export default defineConfig([
  { files: ['**/*.spec.js'], plugins: { js }, extends: ['js/recommended'], languageOptions: { globals: globals.mocha } },
  { files: ["**/*.{js,mjs,cjs}"], ignores: ['dist/**.*'], plugins: { js }, extends: ["js/recommended"], languageOptions: { globals: globals.node } },
  eslintConfigPrettier
]);
