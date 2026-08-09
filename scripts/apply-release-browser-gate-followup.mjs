import fs from "node:fs";

const filePath = "scripts/vercel-release-workflow.test.mjs";
const source = fs.readFileSync(filePath, "utf8");
const oldCommand = "npm run test:e2e -- --reporter=line";
const newCommand = "npm run test:e2e:release -- --reporter=line";
const occurrences = source.split(oldCommand).length - 1;

if (occurrences !== 2) {
  throw new Error(
    `Expected exactly two legacy release-browser command assertions; found ${occurrences}.`,
  );
}

fs.writeFileSync(filePath, source.replaceAll(oldCommand, newCommand));
