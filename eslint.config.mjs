import globals from "globals";

export default [
  {
    files: ["frontend/js/**/*.js", "frontend/js/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.browser,
    },
    rules: {
      "no-undef": "error",
      "no-redeclare": "error",
      "no-unreachable": "error",
    },
  },
];
