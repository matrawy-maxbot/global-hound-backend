import globals from "globals";
import pluginJs from "@eslint/js";
import prettierPlugin from "eslint-plugin-prettier";
import prettierConfig from "eslint-config-prettier";


/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    languageOptions: { globals: globals.node },
    plugins: { prettier: prettierPlugin },
    rules: {
      ...prettierConfig.rules, // تطبيق قواعد Prettier
      "semi": ["error", "always"], // ضع ; بعد كل تعبير
      "no-console": "off", // السماح باستخدام console.log
      "global-require": "error", // خطأ إذا استخدمت require خارج top-level
      "no-process-exit": "error", // خطأ إذا استخدمت process.exit
    },
  },
  pluginJs.configs.recommended,
];