import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = [
  {
    ignores: ["test-results/**", "playwright-report/**", ".next/**"],
  },
  ...nextVitals,
];

export default eslintConfig;
