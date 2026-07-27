#!/usr/bin/env python3
from pathlib import Path

SCRIPT = Path(".github/scripts/collective-commitments-adversarial-browser-qa.mjs")
SERVICE = Path("src/lib/collective-commitments/service.ts")


def replace_exact(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one {label} in {path}; found {count}.")
    path.write_text(text.replace(old, new))


replace_exact(
    SERVICE,
    '''  const encrypted = encryptSignaturePayload(input.commitmentId, dataKey, payload);

  const addResult = await service.rpc("add_collective_commitment_signature_v1", {
''',
    '''  const encrypted = encryptSignaturePayload(input.commitmentId, dataKey, payload);
  const service = createCollectiveCommitmentServiceClient();

  const addResult = await service.rpc("add_collective_commitment_signature_v1", {
''',
    "signature service-client initialization",
)

replace_exact(
    SCRIPT,
    '''async function signThroughBrowser(session, commitment, options = {}) {
  const button = await prepareSignForm(session, commitment, options);
  await button.click();
  const status = session.page.locator('[role="status"]');
  await expect(status).toBeVisible({ timeout: 30_000 });
  return (await status.innerText()).trim();
}
''',
    '''async function waitForSignOutcome(session) {
  const { page } = session;
  const status = page.locator('[role="status"]');
  const signed = page.getByRole("heading", { name: "Your private signature is counting" });
  const active = page.getByRole("heading", { name: "Threshold reached" });
  const activating = page.getByRole("heading", { name: "Activation in progress" });

  await expect.poll(async () => {
    if (await status.isVisible().catch(() => false)) return "message";
    if (await active.isVisible().catch(() => false)) return "active";
    if (await signed.isVisible().catch(() => false)) return "signed";
    if (await activating.isVisible().catch(() => false)) return "activating";
    return "";
  }, { timeout: 30_000 }).not.toBe("");

  if (await status.isVisible().catch(() => false)) {
    return { kind: "message", message: (await status.innerText()).trim() };
  }
  if (await active.isVisible().catch(() => false)) return { kind: "active", message: "" };
  if (await signed.isVisible().catch(() => false)) return { kind: "signed", message: "" };
  return { kind: "activating", message: "" };
}

async function signThroughBrowser(session, commitment, options = {}) {
  const button = await prepareSignForm(session, commitment, options);
  await button.click({ noWaitAfter: true });
  return waitForSignOutcome(session);
}
''',
    "redirect-aware sign helper",
)

replace_exact(
    SCRIPT,
    '''    const firstMessage = await signThroughBrowser(signerASession, withdrawalCommitment, {
      publishAffiliation: true,
    });
    expect(firstMessage).toMatch(/Signature recorded privately\\. 1 verified signer currently counts\\./);
    await assertPrivateCount(withdrawalCommitment.id, 1);
    await expect(signerASession.page.getByRole("heading", { name: "Your private signature is counting" })).toBeVisible();
    await signerASession.page.getByRole("button", { name: "Withdraw private signature" }).click();
    await expect(signerASession.page.locator('[role="status"]')).toContainText("Signature withdrawn. 0 verified signers remain.");
    await assertPrivateCount(withdrawalCommitment.id, 0);
    const resignMessage = await signThroughBrowser(signerASession, withdrawalCommitment, {
      publishAffiliation: true,
    });
    expect(resignMessage).toMatch(/1 verified signer currently counts/);
    await assertPrivateCount(withdrawalCommitment.id, 1);

    const duplicateMessage = await signThroughBrowser(duplicateSession, withdrawalCommitment);
    expect(duplicateMessage).toBe(
      "A verified human represented by another account has already signed this commitment.",
    );
''',
    '''    const firstOutcome = await signThroughBrowser(signerASession, withdrawalCommitment, {
      publishAffiliation: true,
    });
    expect(firstOutcome.kind).toBe("signed");
    await assertPrivateCount(withdrawalCommitment.id, 1);
    await expect(signerASession.page.getByRole("heading", { name: "Your private signature is counting" })).toBeVisible();
    await signerASession.page.getByRole("button", { name: "Withdraw private signature" }).click({ noWaitAfter: true });
    await expect(signerASession.page.getByRole("heading", { name: "Sign privately" })).toBeVisible({ timeout: 30_000 });
    await assertPrivateCount(withdrawalCommitment.id, 0);
    const resignOutcome = await signThroughBrowser(signerASession, withdrawalCommitment, {
      publishAffiliation: true,
    });
    expect(resignOutcome.kind).toBe("signed");
    await assertPrivateCount(withdrawalCommitment.id, 1);

    const duplicateOutcome = await signThroughBrowser(duplicateSession, withdrawalCommitment);
    expect(duplicateOutcome.kind).toBe("message");
    expect(duplicateOutcome.message).toBe(
      "A verified human represented by another account has already signed this commitment.",
    );
''',
    "withdrawal and duplicate-human browser assertions",
)

replace_exact(
    SCRIPT,
    '''    const finalMessage = await signThroughBrowser(signerBSession, staleCommitment, {
      publishAffiliation: false,
    });
    expect(finalMessage).toMatch(/one or more identity credentials became stale\\. No identities were published/);
''',
    '''    const finalOutcome = await signThroughBrowser(signerBSession, staleCommitment, {
      publishAffiliation: false,
    });
    expect(finalOutcome.kind).toBe("signed");
''',
    "stale-credential release outcome",
)

replace_exact(
    SCRIPT,
    '''    const recoveryMessage = await signThroughBrowser(signerASession, staleCommitment, {
      publishAffiliation: true,
    });
    expect(recoveryMessage).toMatch(/Threshold reached\\. 2 verified identities were published atomically\\./);
''',
    '''    const recoveryOutcome = await signThroughBrowser(signerASession, staleCommitment, {
      publishAffiliation: true,
    });
    expect(["active", "activating"]).toContain(recoveryOutcome.kind);
''',
    "stale-credential recovery outcome",
)

replace_exact(
    SCRIPT,
    '''    await Promise.all([
      buttonB.click({ noWaitAfter: true }),
      buttonC.click({ noWaitAfter: true }),
    ]);
    await Promise.all([
      expect(signerBSession.page.locator('[role="status"]')).toBeVisible({ timeout: 30_000 }),
      expect(signerCSession.page.locator('[role="status"]')).toBeVisible({ timeout: 30_000 }),
    ]);
''',
    '''    await Promise.all([
      buttonB.click({ noWaitAfter: true }),
      buttonC.click({ noWaitAfter: true }),
    ]);
    const [outcomeB, outcomeC] = await Promise.all([
      waitForSignOutcome(signerBSession),
      waitForSignOutcome(signerCSession),
    ]);
    expect(["signed", "active", "activating"]).toContain(outcomeB.kind);
    expect(["signed", "active", "activating"]).toContain(outcomeC.kind);
''',
    "simultaneous redirect outcomes",
)

replace_exact(
    SCRIPT,
    '''    const column = table === "collective_commitments" ? "id" : "commitment_id";
    const { count, error } = await admin
      .from(table)
      .select("id", { count: "exact", head: true })
      .in(column, createdCommitmentIds);
''',
    '''    const column = table === "collective_commitments" ? "id" : "commitment_id";
    const selectColumn = table === "collective_commitment_keys" ? "commitment_id" : "id";
    const { count, error } = await admin
      .from(table)
      .select(selectColumn, { count: "exact", head: true })
      .in(column, createdCommitmentIds);
''',
    "key-table cleanup verification column",
)

replace_exact(
    SCRIPT,
    '''    const { error: existingDeleteError } = await admin.auth.admin.deleteUser(existing.id);
    if (existingDeleteError) throw new Error(existingDeleteError.message);
''',
    '''    const { error: existingProfileDeleteError } = await admin
      .from("profiles")
      .delete()
      .eq("id", existing.id);
    if (existingProfileDeleteError) throw new Error(existingProfileDeleteError.message);
    const { error: existingDeleteError } = await admin.auth.admin.deleteUser(existing.id);
    if (existingDeleteError) throw new Error(existingDeleteError.message);
''',
    "profile-before-auth retry cleanup",
)
