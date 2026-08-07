from pathlib import Path
import re

script_path = Path(".github/scripts/institutional-trade-qa-e2e.mjs")
script = script_path.read_text()
start = '  const initialPanelText = await panel.innerText();\n'
end = '\n}\n\nasync function screenshot'
start_index = script.find(start)
if start_index < 0:
    raise SystemExit("Could not find the current ensureMfa body start.")
end_index = script.find(end, start_index)
if end_index < 0:
    raise SystemExit("Could not find the current ensureMfa body end.")
new_block = r'''  const initialPanelText = await panel.innerText();
  if (/Session level\s*aal2/i.test(initialPanelText) || /AAL:\s*aal2/i.test(initialPanelText)) return;
  const verifyForm = panel.locator("form").filter({ has: page.getByRole("button", { name: "Verify session" }) });
  await verifyForm.waitFor({ state: "visible", timeout: 30_000 });
  await verifyForm.locator('select[name="factor_id"]').selectOption(user.mfa.factorId);
  await verifyForm.locator('input[name="code"]').fill(await freshTotp(user.mfa.secret));

  const authCookieSignature = async () =>
    (await page.context().cookies())
      .filter(({ name }) => name.startsWith("sb-") || name.includes("auth-token"))
      .sort(({ name: left }, { name: right }) => left.localeCompare(right))
      .map(({ name, value }) => `${name}:${value}`)
      .join("|");
  const beforeAuthCookieSignature = await authCookieSignature();

  const actionResponsePromise = page.waitForResponse(
    (response) => {
      const request = response.request();
      if (request.method() !== "POST") return false;
      try {
        return new URL(response.url()).pathname === "/dashboard";
      } catch {
        return false;
      }
    },
    { timeout: 30_000 },
  );
  const [actionResponse] = await Promise.all([
    actionResponsePromise,
    verifyForm.getByRole("button", { name: "Verify session" }).click(),
  ]);
  assert.equal(
    actionResponse.status(),
    200,
    `MFA server action returned HTTP ${actionResponse.status()} for ${user.role}.`,
  );

  let authCookieChanged = false;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await page.waitForTimeout(250);
    if ((await authCookieSignature()) !== beforeAuthCookieSignature) {
      authCookieChanged = true;
      break;
    }
  }

  const postActionPanelText = await panel.innerText().catch(() => "");
  await page.reload({ waitUntil: "domcontentloaded" });
  const refreshedPanel = page.locator("article#account-security");
  await refreshedPanel.waitFor({ state: "attached", timeout: 30_000 });
  await refreshedPanel.scrollIntoViewIfNeeded();
  await refreshedPanel.waitFor({ state: "visible", timeout: 30_000 });
  const refreshedPanelText = await refreshedPanel.innerText();
  if (
    !/Session level\s*aal2/i.test(refreshedPanelText) &&
    !/AAL:\s*aal2/i.test(refreshedPanelText)
  ) {
    const cookieMetadata = (await page.context().cookies())
      .filter(({ name }) => name.startsWith("sb-") || name.includes("auth-token"))
      .map(({ domain, expires, httpOnly, name, path: cookiePath, sameSite, secure, value }) => ({
        domain,
        expires,
        httpOnly,
        name,
        path: cookiePath,
        sameSite,
        secure,
        valueLength: value.length,
      }));
    await writeFile(
      path.join(outputDir, `mfa-${user.role}-verification.json`),
      `${JSON.stringify(
        {
          actionResponseStatus: actionResponse.status(),
          authCookieChanged,
          cookieMetadata,
          initialPanelText,
          postActionPanelText,
          refreshedPanelText,
          role: user.role,
          url: page.url(),
        },
        null,
        2,
      )}\n`,
    );
    await screenshot(page, `mfa-${user.role}-verification-failed`);
    throw new Error(
      `MFA verification did not persist AAL2 for ${user.role}. ` +
        `Post-action panel: ${postActionPanelText.slice(0, 500)} ` +
        `Reloaded panel: ${refreshedPanelText.slice(0, 500)}`,
    );
  }
'''
script_path.write_text(script[:start_index] + new_block + script[end_index:])

wiring_path = Path("src/institutional-trade-wiring.test.ts")
wiring = wiring_path.read_text()
wiring_pattern = re.compile(
    r'test\("authenticated QA verifies the persisted AAL2 session after the MFA action response", \(\) => \{\n'
    r'.*?\n\}\);',
    re.DOTALL,
)
new_wiring = r'''test("authenticated QA bounds response settling and verifies persisted AAL2 after reload", () => {
  assert.match(qaScript, /page\.waitForResponse/);
  assert.match(qaScript, /authCookieSignature/);
  assert.match(qaScript, /authCookieChanged/);
  assert.match(qaScript, /page\.reload\(\{ waitUntil: "domcontentloaded" \}\)/);
  assert.match(qaScript, /mfa-\$\{user\.role\}-verification\.json/);
  assert.doesNotMatch(qaScript, /actionResponse\.finished\(\)/);
  assert.doesNotMatch(qaScript, /getByText\("MFA verified for this session\."\)\.waitFor/);
});'''
wiring, count = wiring_pattern.subn(lambda _: new_wiring, wiring)
if count != 1:
    raise SystemExit(f"Expected one wiring MFA test, replaced {count}.")
wiring_path.write_text(wiring)

stable_path = Path("src/institutional-mfa-stable-state.test.ts")
stable = stable_path.read_text()
stable_pattern = re.compile(
    r'test\("institutional MFA QA verifies the persisted AAL2 session after a completed action", \(\) => \{\n'
    r'.*?\n\}\);',
    re.DOTALL,
)
new_stable = r'''test("institutional MFA QA bounds response settling before verifying persisted AAL2", () => {
  assert.match(qaScript, /page\.waitForResponse/);
  assert.match(qaScript, /authCookieSignature/);
  assert.match(qaScript, /authCookieChanged/);
  assert.match(qaScript, /page\.reload\(\{ waitUntil: "domcontentloaded" \}\)/);
  assert.match(qaScript, /mfa-\$\{user\.role\}-verification\.json/);
  assert.doesNotMatch(qaScript, /actionResponse\.finished\(\)/);
  assert.doesNotMatch(
    qaScript,
    /getByText\("MFA verified for this session\."\)\.waitFor/,
  );
  assert.match(
    accountSecurityPanel,
    /useActionState\(\s*verifyBackgroundNetworkingMfaAction/,
  );
  assert.match(accountSecurityPanel, /initialSummary\?\.session\.currentAal/);
  assert.match(accountSecurityPanel, /router\.refresh\(\)/);
});'''
stable, count = stable_pattern.subn(lambda _: new_stable, stable)
if count != 1:
    raise SystemExit(f"Expected one stable-state MFA test, replaced {count}.")
stable_path.write_text(stable)
