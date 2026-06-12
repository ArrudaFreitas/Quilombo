import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import jsxA11y from "eslint-plugin-jsx-a11y";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Requisito de inclusão (WCAG 2.1 AA): o preset do Next ativa poucas regras
  // de a11y e em "warn"; aqui o conjunto recomendado inteiro vira erro.
  // Só regras (sem `plugins:`): o plugin jsx-a11y já é registrado pelo preset.
  {
    files: ["**/*.tsx", "**/*.jsx"],
    rules: {
      ...jsxA11y.flatConfigs.recommended.rules,
      // Região rolável focável (padrão WAI para conteúdo com overflow):
      // role="region" + tabIndex permite rolar por teclado (WCAG 2.1.1).
      "jsx-a11y/no-noninteractive-tabindex": [
        "error",
        { tags: [], roles: ["tabpanel", "region"], allowExpressionValues: true },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
