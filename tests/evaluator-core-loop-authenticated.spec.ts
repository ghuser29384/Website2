import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import ts from "typescript";

const sourcePath = join(
  process.cwd(),
  "tests/evaluator-core-loop-authenticated.source.ts",
);
const generatedDirectory = join(process.cwd(), "test-results");
const correctedSourcePath = join(
  generatedDirectory,
  "evaluator-core-loop-authenticated.corrected.ts",
);
const generatedModulePath = join(
  generatedDirectory,
  "evaluator-core-loop-authenticated.generated.mjs",
);

let source = readFileSync(sourcePath, "utf8");

const oldHeading = `      await expect(
        evaluatorOfferCard.getByRole("heading", { level: 4 }),
      ).toHaveText(
        /Evaluator core-loop verification\\s*↔\\s*Private QA response verification/,
      );`;
const currentHeading = `      const evaluatorHeading = evaluatorOfferCard.getByRole("heading", {
        level: 4,
        name: /Evaluator core-loop verification\\s+Private QA response verification/i,
      });
      await expect(evaluatorHeading).toHaveText(
        /Evaluator core-loop verification\\s*\\/\\s*Private QA response verification/,
      );`;
if (source.split(oldHeading).length !== 2) {
  throw new Error("Expected exactly one stale evaluator heading assertion.");
}
source = source.replace(oldHeading, currentHeading);

const oldFullTerms = `      await evaluatorOfferCard
        .getByRole("link", { exact: true, name: "Open full terms ↗" })
        .click();`;
const currentFullTerms = `      await evaluatorOfferCard
        .getByText("Exact terms & more actions", { exact: true })
        .click();
      await evaluatorOfferCard
        .getByRole("link", { exact: true, name: "Open full terms" })
        .click();`;
if (source.split(oldFullTerms).length !== 2) {
  throw new Error("Expected exactly one stale evaluator full-terms assertion.");
}
source = source.replace(oldFullTerms, currentFullTerms);

mkdirSync(generatedDirectory, { recursive: true });
writeFileSync(correctedSourcePath, source, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    esModuleInterop: true,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: correctedSourcePath,
  reportDiagnostics: true,
});
const diagnostics = transpiled.diagnostics ?? [];
if (diagnostics.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error)) {
  throw new Error(
    `Failed to transpile corrected evaluator source: ${diagnostics
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"))
      .join(" | ")}`,
  );
}
writeFileSync(generatedModulePath, transpiled.outputText, "utf8");
await import(`${pathToFileURL(generatedModulePath).href}?source=current-offers`);
