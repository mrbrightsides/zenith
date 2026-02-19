module.exports = {
  root: true,
  env: {
    es6: true,
    node: true, // FIX: Hilangkan kutipan di 'true'
  },
  extends: [
    "eslint:recommended",
    "plugin:import/errors",
    "plugin:import/warnings",
    "plugin:import/typescript",
    "google",
    "plugin:@typescript-eslint/recommended",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: ["tsconfig.json", "tsconfig.dev.json"],
    sourceType: "module",
    tsconfigRootDir: __dirname,
  },
  ignorePatterns: [
    "/lib/**/*",
    "/generated/**/*",
  ],
  plugins: [
    "@typescript-eslint",
    "import",
  ],
  rules: {
    "import/no-unresolved": "off",
    "object-curly-spacing": ["error", "always"],
    "operator-linebreak": "off",
    "padded-blocks": "off",
    "indent": ["error", 2],
    "max-len": "off",
    "quotes": ["error", "double"],
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/no-explicit-any": "off",
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
  },
};
