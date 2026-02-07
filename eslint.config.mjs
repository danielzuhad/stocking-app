import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    files: [
      "**/__tests__/**/*.{js,jsx,ts,tsx}",
      "**/*.{test,spec}.{js,jsx,ts,tsx}",
    ],
    languageOptions: {
      globals: {
        afterAll: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        describe: "readonly",
        expect: "readonly",
        it: "readonly",
        jest: "readonly",
        test: "readonly",
      },
    },
  },
  {
    files: ["jest.config.js"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: [
      "types/company.ts",
      "types/user.ts",
      "types/membership.ts",
      "types/activity-log.ts",
    ],
    rules: {
      "@typescript-eslint/naming-convention": [
        "error",
        {
          selector: "typeAlias",
          format: ["PascalCase"],
          custom: {
            regex: "Type$",
            match: true,
          },
        },
        {
          selector: "interface",
          format: ["PascalCase"],
          custom: {
            regex: "Type$",
            match: true,
          },
        },
      ],
    },
  },
]);

export default eslintConfig;
