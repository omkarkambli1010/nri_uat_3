// Flat config. Next 16 removed `next lint`, so linting now runs through the
// ESLint CLI directly (see the "lint" script in package.json). The shared
// Next rules are the same ones `next lint` used to apply implicitly.
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "public/**",
      "next-env.d.ts",
      "scripts/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    // Baseline for pre-existing findings. No ESLint config existed in this repo
    // before the Next 16 upgrade, so `next lint` never actually ran and none of
    // these rules were ever enforced — they surface ~245 errors across code
    // that predates this change. Demoted to warnings so `npm run lint` is
    // usable as a gate for NEW problems rather than permanently red.
    //
    // These are real issues worth burning down (react-hooks/* in particular,
    // which the React Compiler rules in eslint-plugin-react-hooks v7 now catch).
    // Promote each back to "error" as its backlog is cleared.
    rules: {
      "prefer-const": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/static-components": "warn",
    },
  },
];

export default config;
