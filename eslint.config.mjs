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
