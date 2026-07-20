import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

const SOURCE_ROOTS = [join(process.cwd(), "src", "app"), join(process.cwd(), "src", "components")];

function listTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      return listTsxFiles(path);
    }
    return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : [];
  });
}

function isClientComponent(source: string) {
  return /^\s*["']use client["'];/.test(source);
}

test("Server Components do not format visitor-facing dates in the server time zone", () => {
  const violations: string[] = [];

  for (const file of SOURCE_ROOTS.flatMap(listTsxFiles)) {
    const source = readFileSync(file, "utf8");
    if (isClientComponent(source)) {
      continue;
    }

    const checks: Array<[label: string, pattern: RegExp]> = [
      ["toLocaleDateString", /\.toLocaleDateString\s*\(/],
      ["Date.toLocaleString", /new\s+Date\s*\([^)]*\)\s*\.toLocaleString\s*\(/],
      ["Intl.DateTimeFormat", /\bIntl\.DateTimeFormat\s*\(/],
    ];

    for (const [label, pattern] of checks) {
      if (pattern.test(source)) {
        violations.push(`${relative(process.cwd(), file)} (${label})`);
      }
    }
  }

  assert.deepEqual(
    violations,
    [],
    `Use LocalDateTime for visitor-facing dates in Server Components:\n${violations.join("\n")}`,
  );
});
