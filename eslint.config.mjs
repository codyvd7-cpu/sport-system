import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone Node test scripts — run directly with node, not part of the
    // Next build, and linting them with the Next config produces false errors.
    "**/*.test.cjs",
  ]),
  {
    rules: {
      // Downgrade to warnings - these are code quality issues, not bugs
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/use-memo": "warn",
      // The useTilt pattern passes the hook's ref/handlers straight to the
      // element (ref={tilt.ref} etc). The rule reads that as "ref accessed
      // during render"; it's intentional here, so it joins the rest of the
      // react-hooks family as a warning rather than a build-breaking error.
      "react-hooks/refs": "warn",

      // These patterns are acceptable in this codebase
      "@typescript-eslint/no-require-imports": "warn",
      "@next/next/no-img-element": "warn",

      // Allow console in API routes and debug contexts
      "no-console": "off",

      // Relax for fast iteration
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_"
      }],
    }
  }
]);

export default eslintConfig;
