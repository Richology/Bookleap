import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  { files: ["local-mcp/**/*.cjs"], rules: {"@typescript-eslint/no-require-imports": "off"} },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "local-mcp/node_modules/**",
    "local-mcp/dist/**",
    "local-mcp/dist-smoke/**",
    "local-mcp/dist-renamed/**",
    "local-mcp/dist-desktop-ui/**",
    "local-mcp/dist-agent-ui/**",
    "local-mcp/safari/build/**",
  ]),
]);

export default eslintConfig;
