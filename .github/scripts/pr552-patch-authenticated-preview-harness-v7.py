from __future__ import annotations

import sys
from pathlib import Path


def fail(message: str) -> None:
    raise SystemExit(message)


def replace_literal(source: str, label: str, old: str, new: str) -> str:
    count = source.count(old)
    if count != 1:
        fail(f"{label}: expected exactly one literal match, found {count}.")
    return source.replace(old, new, 1)


def replace_span(
    source: str,
    label: str,
    start_marker: str,
    end_marker: str,
    replacement: str,
) -> str:
    start_count = source.count(start_marker)
    if start_count != 1:
        fail(f"{label}: expected exactly one start marker, found {start_count}.")
    start = source.index(start_marker)
    try:
        end = source.index(end_marker, start)
    except ValueError:
        fail(f"{label}: end marker was not found after the start marker.")
    if end <= start:
        fail(f"{label}: invalid marker order.")
    return source[:start] + replacement + source[end:]


def main() -> None:
    if len(sys.argv) != 2:
        fail("Usage: patcher.py <harness-path>")

    path = Path(sys.argv[1])
    source = path.read_text(encoding="utf-8")

    source = replace_literal(
        source,
        "bypass environment declaration",
        'const PREVIEW_SHARE_URL = process.env.PR552_PREVIEW_SHARE_URL;',
        'const VERCEL_BYPASS_SECRET = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;',
    )
    source = replace_literal(
        source,
        "bypass environment guard",
        'if (MODE === "test") required("PR552_PREVIEW_SHARE_URL", PREVIEW_SHARE_URL);',
        'if (MODE === "test") required("VERCEL_AUTOMATION_BYPASS_SECRET", VERCEL_BYPASS_SECRET);',
    )

    source = replace_span(
        source,
        "protected Preview acquisition",
        "async function acquirePreviewAccess(context) {",
        "\n\nasync function authenticatedContext",
        '''async function acquirePreviewAccess(context) {
  const page = await context.newPage();
  const response = await page.goto(PREVIEW_ORIGIN, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  if (!response) throw new Error("Protected Preview navigation returned no response.");
  if (response.status() !== 200) {
    throw new Error(`Protected Preview returned HTTP ${response.status()}.`);
  }
  const currentUrl = new URL(page.url());
  if (currentUrl.origin !== previewUrl.origin || currentUrl.hostname === "vercel.com") {
    throw new Error("Automation bypass did not establish exact Preview access.");
  }
  await page.close();
}''',
    )

    source = replace_span(
        source,
        "browser-context protection headers",
        "  const context = await browser.newContext({",
        "  context.setDefaultTimeout(20_000);",
        '''  const context = await browser.newContext({
    baseURL: PREVIEW_ORIGIN,
    viewport,
    ignoreHTTPSErrors: false,
    extraHTTPHeaders: {
      "x-vercel-protection-bypass": VERCEL_BYPASS_SECRET,
      "x-vercel-set-bypass-cookie": "true",
    },
  });
''',
    )

    source = replace_span(
        source,
        "SQL-safe variable expansion",
        "function runPsql(sql, variables = {}) {",
        '    input: sql,',
        '''function sqlLiteral(value) {
  return `'${String(value ?? "").replaceAll("'", "''")}'`;
}

function expandPsqlVariables(sql, variables) {
  const expanded = sql.replace(
    /:'([A-Za-z_][A-Za-z0-9_]*)'/g,
    (token, name) => {
      if (!Object.prototype.hasOwnProperty.call(variables, name)) {
        throw new Error(`Missing guarded PostgreSQL variable: ${name}`);
      }
      return sqlLiteral(variables[name]);
    },
  );
  if (/:'[A-Za-z_][A-Za-z0-9_]*'/.test(expanded)) {
    throw new Error("An unresolved guarded PostgreSQL variable remained.");
  }
  return expanded;
}

function runPsql(sql, variables = {}) {
  const expandedSql = expandPsqlVariables(sql, variables);
  const args = [
    PROD_DB_URL,
    "--no-psqlrc",
    "--quiet",
    "--tuples-only",
    "--no-align",
    "--set",
    "ON_ERROR_STOP=1",
  ];
  const result = spawnSync("psql", args, {
    input: expandedSql,''',
    )

    forbidden = [
        "PR552_PREVIEW_SHARE_URL",
        "PREVIEW_SHARE_URL",
        'args.push("--set"',
    ]
    for token in forbidden:
        if token in source:
            fail(f"Forbidden stale harness token remains: {token}")

    required_counts = {
        "VERCEL_AUTOMATION_BYPASS_SECRET": 2,
        "x-vercel-protection-bypass": 1,
        "x-vercel-set-bypass-cookie": 1,
        "function expandPsqlVariables": 1,
        "input: expandedSql": 1,
    }
    for token, expected_count in required_counts.items():
        actual_count = source.count(token)
        if actual_count != expected_count:
            fail(
                f"Required patched token {token!r} must occur {expected_count} time(s); "
                f"found {actual_count}."
            )

    path.write_text(source, encoding="utf-8")


if __name__ == "__main__":
    main()
