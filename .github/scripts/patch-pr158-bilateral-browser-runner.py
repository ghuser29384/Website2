#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

PATH = Path(".github/scripts/pr158-two-account-browser-qa.mjs")


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one {label}; found {count}.")
    return source.replace(old, new, 1)


def main() -> None:
    source = PATH.read_text(encoding="utf-8")

    # Preserve the required dealroom counterfactual and make diff assertions
    # reflect the actual number of changed fields.
    page_marker = '''  await recordCheck("dealroom term diff and persisted revision", async () => {
    const page = owner.page;
'''
    page_replacement = '''  await recordCheck("dealroom term diff and persisted revision", async () => {
    const page = owner.page;
    const counterfactual = page.getByLabel("Counterfactual declaration");
    let expectedChangeCount = 1;
    if (!(await counterfactual.inputValue()).trim()) {
      await counterfactual.fill(
        "Without this synthetic QA agreement, neither participant has a recorded commitment to perform the reciprocal action.",
      );
      expectedChangeCount += 1;
    }
'''
    source = replace_once(source, page_marker, page_replacement, "dealroom revision page marker")

    source = replace_once(
        source,
        '''    await expect(page.getByText("1 unpublished change")).toBeVisible();
    await expect(page.getByText("Proposed revision")).toBeVisible();
''',
        '''    const pendingLabel =
      expectedChangeCount === 1
        ? "1 unpublished change"
        : `${expectedChangeCount} unpublished changes`;
    await expect(page.getByText(pendingLabel)).toBeVisible();
    const proposedRevisionLabels = page.getByText("Proposed revision", {
      exact: true,
    });
    await expect(proposedRevisionLabels).toHaveCount(expectedChangeCount);
    await expect(proposedRevisionLabels.first()).toBeVisible();
''',
        "dealroom diff count assertions",
    )

    source = replace_once(
        source,
        '''  await recordCheck("dealroom status control", async () => {
    const page = owner.page;
    const activate = page.getByRole("button", { name: "Record confirmation and activate" });
    if (await activate.count()) {
      await activate.click();
      await expect(page.getByText("Agreement is active.")).toBeVisible({ timeout: 30_000 });
      return "Proposed agreement was activated through the recorded status control.";
    }
    await expect(page.getByText("Agreement is active.")).toBeVisible();
    return "Agreement was already active and the active status control state rendered.";
  });
''',
        '''  await recordCheck("owner confirms the current frozen version without unilateral activation", async () => {
    const page = owner.page;
    const confirm = page.getByRole("button", { name: "Confirm current frozen version" });
    await expect(confirm).toBeVisible();
    await confirm.click();
    await expect(page.getByText(/Confirmation 1 of 2 recorded/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Terms await bilateral confirmation.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirm current frozen version" })).toBeVisible();
    return "The first participant confirmation persisted while the agreement remained proposed.";
  });
''',
        "legacy unilateral activation check",
    )

    source = replace_once(
        source,
        '''  await recordCheck("responder can access the same agreement and history", async () => {
    const page = responder.page;
    await page.goto("/commitments", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Global health for Animal welfare" })).toBeVisible();
    await page.getByRole("link", { name: "Open dealroom" }).first().click();
    await expect(page.getByText(revisionMarker, { exact: false })).toBeVisible();
    await expect(page.getByText(counterofferSummary, { exact: true })).toBeVisible();
    await expect(page.getByText("Agreement is active.")).toBeVisible();
    return "Both synthetic accounts can access the same persisted dealroom record.";
  });
''',
        '''  await recordCheck("responder confirms the same frozen version and activates the agreement", async () => {
    const page = responder.page;
    await page.goto("/commitments", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Global health for Animal welfare" })).toBeVisible();
    await page.getByRole("link", { name: "Open dealroom" }).first().click();
    await expect(page.getByText(revisionMarker, { exact: false })).toBeVisible();
    await expect(page.getByText(counterofferSummary, { exact: true })).toBeVisible();
    const confirm = page.getByRole("button", { name: "Confirm current frozen version" });
    await expect(confirm).toBeVisible();
    await confirm.click();
    await expect(
      page.getByText("Both participants confirmed the same frozen version. The agreement is active."),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Agreement is active.")).toBeVisible();
    return "The second distinct confirmation activated the same frozen agreement version.";
  });
''',
        "responder shared-dealroom check",
    )

    stale_markers = [
        'getByText("1 unpublished change")',
        'getByText("Proposed revision")',
        'Record confirmation and activate',
        'recordCheck("dealroom status control"',
    ]
    for marker in stale_markers:
        if marker in source:
            raise RuntimeError(f"Stale browser-harness marker remains: {marker}")

    required_markers = [
        "toHaveCount(expectedChangeCount)",
        "owner confirms the current frozen version without unilateral activation",
        "responder confirms the same frozen version and activates the agreement",
        'getByRole("button", { name: "Confirm current frozen version" })',
    ]
    for marker in required_markers:
        if marker not in source:
            raise RuntimeError(f"Required browser-harness marker is missing: {marker}")

    PATH.write_text(source, encoding="utf-8")
    print("Patched the reviewed PR #158 browser runner for bilateral frozen-version confirmation.")


if __name__ == "__main__":
    main()
