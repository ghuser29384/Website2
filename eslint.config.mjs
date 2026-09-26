import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: [
      "test-results/**",
      "playwright-report/**",
      ".next/**",
      "scripts/vercel-project-config.d.mts",
    ],
  },
  ...nextVitals,
];

export default eslintConfig;
