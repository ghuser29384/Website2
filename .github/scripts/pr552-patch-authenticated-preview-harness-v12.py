from __future__ import annotations

import os
import re
import sys
from pathlib import Path


OLD_CANDIDATE_SHA = "0f2164e893b3eee94d2f4033d013f2ebf6430cea"
OLD_DEPLOYMENT_ID = "dpl_E4kcbFVK7QpYvdygM8m9sc841DpC"


def fail(message: str) -> None:
    raise SystemExit(message)


def required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        fail(f"Missing required environment variable: {name}")
    return value


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
    if source.count(start_marker) != 1:
        fail(f"{label}: start marker cardinality mismatch.")
    start = source.index(start_marker)
    try:
        end = source.index(end_marker, start)
    except ValueError:
        fail(f"{label}: end marker not found after start marker.")
    return source[:start] + replacement + source[end:]


def main() -> None:
    if len(sys.argv) != 2:
        fail("Usage: patcher.py <harness-path>")

    new_candidate_sha = required_env("CANDIDATE_SHA")
    new_deployment_id = required_env("DEPLOYMENT_ID")
    if not re.fullmatch(r"[0-9a-f]{40}", new_candidate_sha):
        fail("CANDIDATE_SHA must be a lowercase 40-character Git SHA.")
    if not re.fullmatch(r"dpl_[A-Za-z0-9]+", new_deployment_id):
        fail("DEPLOYMENT_ID must be a Vercel deployment ID.")

    path = Path(sys.argv[1])
    source = path.read_text(encoding="utf-8")

    source = replace_literal(
        source,
        "bypass declaration",
        'const PREVIEW_SHARE_URL = process.env.PR552_PREVIEW_SHARE_URL;',
        'const VERCEL_BYPASS_SECRET = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;',
    )
    source = replace_literal(
        source,
        "bypass guard",
        'if (MODE === "test") required("PR552_PREVIEW_SHARE_URL", PREVIEW_SHARE_URL);',
        'if (MODE === "test") required("VERCEL_AUTOMATION_BYPASS_SECRET", VERCEL_BYPASS_SECRET);',
    )
    source = replace_literal(
        source,
        "candidate guard",
        f'if (EXPECTED_SHA !== "{OLD_CANDIDATE_SHA}") {{',
        f'if (EXPECTED_SHA !== "{new_candidate_sha}") {{',
    )
    source = replace_literal(
        source,
        "deployment guard",
        f'if (EXPECTED_DEPLOYMENT_ID !== "{OLD_DEPLOYMENT_ID}") {{',
        f'if (EXPECTED_DEPLOYMENT_ID !== "{new_deployment_id}") {{',
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
        "browser context headers",
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
  let expanded = sql;
  for (const [name, value] of Object.entries(variables)) {
    const token = `:'${name}'`;
    expanded = expanded.split(token).join(sqlLiteral(value));
  }
  const unresolved = expanded.match(/:'[A-Za-z_][A-Za-z0-9_]*'/g) ?? [];
  if (unresolved.length > 0) {
    throw new Error(`Unresolved guarded PostgreSQL variable count: ${unresolved.length}`);
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
''',
    )
    source = replace_literal(source, "expanded SQL stdin", '    input: sql,', '    input: expandedSql,')

    source = replace_literal(
        source,
        "create form scoping",
        '''    const createForm = desktopPanel.locator("form").filter({
      has: desktopPanel.getByRole("button", { name: "Create MFA setup" }),
    });''',
        '''    const createForm = desktopPanel
      .getByRole("button", { name: "Create MFA setup" })
      .locator("xpath=ancestor::form");''',
    )
    source = replace_literal(
        source,
        "pending form scoping",
        '''    const pendingForm = desktopPanel.locator("form").filter({
      has: desktopPanel.getByRole("button", { name: "Verify MFA setup" }),
    });''',
        '''    const pendingForm = desktopPanel
      .getByRole("button", { name: "Verify MFA setup" })
      .locator("xpath=ancestor::form");''',
    )
    source = replace_literal(
        source,
        "session form scoping",
        '''    const verifySessionForm = mobilePanel.locator("form").filter({
      has: mobilePanel.getByRole("button", { name: "Verify session" }),
    });''',
        '''    const verifySessionForm = mobilePanel
      .getByRole("button", { name: "Verify session" })
      .locator("xpath=ancestor::form");''',
    )

    source = replace_literal(
        source,
        "narrow server-action navigation abort allowance",
        '''    const isExpectedPrefetchAbort =
      errorText.includes("ERR_ABORTED") &&
      (url.searchParams.has("_rsc") || request.headers()["next-router-prefetch"] === "1");
    if (!isExpectedPrefetchAbort) {''',
        '''    const isExpectedPrefetchAbort =
      errorText.includes("ERR_ABORTED") &&
      (url.searchParams.has("_rsc") || request.headers()["next-router-prefetch"] === "1");
    const isExpectedServerActionNavigationAbort =
      errorText.includes("ERR_ABORTED") &&
      request.method() === "POST" &&
      request.resourceType() === "fetch" &&
      url.pathname === "/dashboard";
    if (!isExpectedPrefetchAbort && !isExpectedServerActionNavigationAbort) {''',
    )

    source = replace_literal(
        source,
        "post-verification probe",
        '''    await pendingForm.locator('input[name="code"]').fill(desktopCode.code);
    await pendingForm.getByRole("button", { name: "Verify MFA setup" }).click();
    await expect(summaryValue(desktopPanel, "Verified factors")).toHaveText("1", {
      timeout: 30_000,
    });''',
        '''    await pendingForm.locator('input[name="code"]').fill(desktopCode.code);
    await pendingForm.getByRole("button", { name: "Verify MFA setup" }).click();
    await sleep(2_000);
    const postVerifySignIn = await signInWithPassword(state.email, state.password);
    const postVerifyFactors = await listUserFactors(postVerifySignIn.client);
    const postVerifyAal = await postVerifySignIn.client.auth.mfa.getAuthenticatorAssuranceLevel();
    const postVerifyMessages = await desktopPanel.locator("p.route-text").allTextContents();
    writeJson(path.join(OUTPUT_DIR, "desktop-post-verify-probe.json"), {
      currentUrl: desktopPage.url(),
      messages: postVerifyMessages,
      factors: postVerifyFactors,
      assurance: postVerifyAal.data ?? null,
      assuranceError: postVerifyAal.error?.message ?? null,
      summaryVerifiedFactors: await summaryValue(desktopPanel, "Verified factors").textContent(),
      summarySessionLevel: await summaryValue(desktopPanel, "Session level").textContent(),
    });
    await expect(summaryValue(desktopPanel, "Verified factors")).toHaveText("1", {
      timeout: 30_000,
    });''',
    )

    forbidden = [
        "PR552_PREVIEW_SHARE_URL",
        "PREVIEW_SHARE_URL",
        'args.push("--set"',
        "    input: sql,",
        'desktopPanel.locator("form").filter({',
        'mobilePanel.locator("form").filter({',
        OLD_CANDIDATE_SHA,
        OLD_DEPLOYMENT_ID,
    ]
    for token in forbidden:
        if token in source:
            fail(f"Forbidden stale token remains: {token}")

    required_counts = {
        "VERCEL_AUTOMATION_BYPASS_SECRET": 2,
        "x-vercel-protection-bypass": 1,
        "x-vercel-set-bypass-cookie": 1,
        "function expandPsqlVariables": 1,
        "input: expandedSql": 1,
        'locator("xpath=ancestor::form")': 3,
        "isExpectedServerActionNavigationAbort": 2,
        "desktop-post-verify-probe.json": 1,
        new_candidate_sha: 1,
        new_deployment_id: 1,
    }
    for token, expected in required_counts.items():
        actual = source.count(token)
        if actual != expected:
            fail(f"Required token {token!r}: expected {expected}, found {actual}.")

    path.write_text(source, encoding="utf-8")


if __name__ == "__main__":
    main()
