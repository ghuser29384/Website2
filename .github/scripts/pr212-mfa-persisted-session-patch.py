from pathlib import Path
import re

script_path = Path(".github/scripts/institutional-trade-qa-e2e.mjs")
script = script_path.read_text()
start = '  if (/Session level\\s*aal2/i.test(await panel.innerText())) return;\n'
end = '  await panel.getByText("AAL: aal2", { exact: true }).waitFor({ state: "visible", timeout: 30_000 });\n'
start_index = script.find(start)
if start_index < 0:
    raise SystemExit("Could not find the current ensureMfa start.")
end_index = script.find(end, start_index)
if end_index < 0:
    raise SystemExit("Could not find the current ensureMfa end.")
end_index += len(end)
new_block = r'''  const initialPanelText = await panel.innerText();
  if (/Session level\s*aal2/i.test(initialPanelText) || /AAL:\s*aal2/i.test(initialPanelText)) return;
  const verifyForm = panel.locator("form").filter({ has: page.getByRole("button", { name: "Verify session" }) });
  await verifyForm.waitFor({ state: "visible", timeout: 30_000 });
  await verifyForm.locator('select[name="factor_id"]').selectOption(user.mfa.factorId);
  await verifyForm.locator('input[name="code"]').fill(await freshTotp(user.mfa.secret));
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
  const responseFailure = await actionResponse.finished();
  assert.equal(
    responseFailure,
    null,
    `MFA server action transport failed for ${user.role}: ${responseFailure?.message ?? "unknown error"}.`,
  );
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
    r'test\("authenticated QA waits for the stable AAL2 session state after MFA verification", \(\) => \{\n'
    r'.*?\n\}\);',
    re.DOTALL,
)
new_wiring = r'''test("authenticated QA verifies the persisted AAL2 session after the MFA action response", () => {
  assert.match(qaScript, /page\.waitForResponse/);
  assert.match(qaScript, /actionResponse\.finished\(\)/);
  assert.match(qaScript, /page\.reload\(\{ waitUntil: "domcontentloaded" \}\)/);
  assert.match(qaScript, /mfa-\$\{user\.role\}-verification\.json/);
  assert.doesNotMatch(qaScript, /getByText\("MFA verified for this session\."\)\.waitFor/);
});'''
wiring, count = wiring_pattern.subn(lambda _: new_wiring, wiring)
if count != 1:
    raise SystemExit(f"Expected one wiring MFA test, replaced {count}.")
wiring_path.write_text(wiring)

stable_path = Path("src/institutional-mfa-stable-state.test.ts")
stable = stable_path.read_text()
stable_pattern = re.compile(
    r'test\("institutional MFA QA waits for the stable rendered AAL2 session state", \(\) => \{\n'
    r'.*?\n\}\);',
    re.DOTALL,
)
new_stable = r'''test("institutional MFA QA verifies the persisted AAL2 session after a completed action", () => {
  assert.match(qaScript, /page\.waitForResponse/);
  assert.match(qaScript, /actionResponse\.finished\(\)/);
  assert.match(qaScript, /page\.reload\(\{ waitUntil: "domcontentloaded" \}\)/);
  assert.match(qaScript, /mfa-\$\{user\.role\}-verification\.json/);
  assert.doesNotMatch(
    qaScript,
    /getByText\("MFA verified for this session\."\)\.waitFor/,
  );
  assert.match(
    accountSecurityPanel,
    /useActionState\(verifyBackgroundNetworkingMfaAction/,
  );
  assert.match(accountSecurityPanel, /initialSummary\?\.session\.currentAal/);
  assert.match(accountSecurityPanel, /router\.refresh\(\)/);
});'''
stable, count = stable_pattern.subn(lambda _: new_stable, stable)
if count != 1:
    raise SystemExit(f"Expected one stable-state MFA test, replaced {count}.")
stable_path.write_text(stable)
