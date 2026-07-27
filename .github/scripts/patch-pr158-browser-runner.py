#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

PATH = Path(".github/scripts/pr158-two-account-browser-qa.mjs")
START_MARKER = 'await recordCheck("dealroom term diff and persisted revision"'
PAGE_MARKER = "const page = owner.page;"
CHANGE_MARKER = 'await expect(page.getByText("1 unpublished change")).toBeVisible();'
PROPOSED_MARKER = 'await expect(page.getByText("Proposed revision")).toBeVisible();'


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"Expected one {label}; found {count}.")
    return source.replace(old, new, 1)


def main() -> None:
    source = PATH.read_text(encoding="utf-8")
    lines = source.splitlines(keepends=True)

    start_indexes = [i for i, line in enumerate(lines) if START_MARKER in line]
    if len(start_indexes) != 1:
        raise RuntimeError(
            f"Expected one dealroom revision block; found {len(start_indexes)}."
        )
    start_index = start_indexes[0]

    page_indexes = [
        i
        for i in range(start_index + 1, min(len(lines), start_index + 80))
        if PAGE_MARKER in lines[i]
    ]
    if not page_indexes:
        raise RuntimeError("No owner-page marker was found after the revision-block marker.")
    page_index = page_indexes[0]
    page_indent = lines[page_index][: len(lines[page_index]) - len(lines[page_index].lstrip())]

    insert_lines = [
        f'{page_indent}const counterfactual = page.getByLabel("Counterfactual declaration");\n',
        f"{page_indent}let expectedChangeCount = 1;\n",
        f"{page_indent}if (!(await counterfactual.inputValue()).trim()) {{\n",
        f"{page_indent}  await counterfactual.fill(\n",
        f'{page_indent}    "Without this synthetic QA agreement, neither participant has a recorded commitment to perform the reciprocal action.",\n',
        f"{page_indent}  );\n",
        f"{page_indent}  expectedChangeCount += 1;\n",
        f"{page_indent}}}\n",
    ]
    lines[page_index + 1 : page_index + 1] = insert_lines

    change_indexes = [
        i
        for i in range(page_index + 1, min(len(lines), page_index + 120))
        if CHANGE_MARKER in lines[i]
    ]
    if len(change_indexes) != 1:
        raise RuntimeError(
            f"Expected one unpublished-change assertion after the revision-block page marker; found {len(change_indexes)}."
        )
    change_index = change_indexes[0]
    change_indent = lines[change_index][
        : len(lines[change_index]) - len(lines[change_index].lstrip())
    ]
    lines[change_index : change_index + 1] = [
        f"{change_indent}const pendingLabel =\n",
        f"{change_indent}  expectedChangeCount === 1\n",
        f'{change_indent}    ? "1 unpublished change"\n',
        f"{change_indent}    : `${{expectedChangeCount}} unpublished changes`;\n",
        f"{change_indent}await expect(page.getByText(pendingLabel)).toBeVisible();\n",
    ]

    proposed_indexes = [
        i
        for i in range(page_index + 1, min(len(lines), page_index + 140))
        if PROPOSED_MARKER in lines[i]
    ]
    if len(proposed_indexes) != 1:
        raise RuntimeError(
            f"Expected one Proposed revision assertion after the revision-block page marker; found {len(proposed_indexes)}."
        )
    proposed_index = proposed_indexes[0]
    proposed_indent = lines[proposed_index][
        : len(lines[proposed_index]) - len(lines[proposed_index].lstrip())
    ]
    lines[proposed_index : proposed_index + 1] = [
        f'{proposed_indent}const proposedRevisionLabels = page.getByText("Proposed revision", {{\n',
        f"{proposed_indent}  exact: true,\n",
        f"{proposed_indent}}});\n",
        f"{proposed_indent}await expect(proposedRevisionLabels).toHaveCount(expectedChangeCount);\n",
        f"{proposed_indent}await expect(proposedRevisionLabels.first()).toBeVisible();\n",
    ]

    patched = "".join(lines)

    old_confirmation_flow = '''  await recordCheck("dealroom status control", async () => {
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

  await owner.screenshot("dealroom-final");

  await recordCheck("responder can access the same agreement and history", async () => {
    const page = responder.page;
    await page.goto("/commitments", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Global health for Animal welfare" })).toBeVisible();
    await page.getByRole("link", { name: "Open dealroom" }).first().click();
    await expect(page.getByText(revisionMarker, { exact: false })).toBeVisible();
    await expect(page.getByText(counterofferSummary, { exact: true })).toBeVisible();
    await expect(page.getByText("Agreement is active.")).toBeVisible();
    return "Both synthetic accounts can access the same persisted dealroom record.";
  });
'''
    new_confirmation_flow = '''  await recordCheck("owner confirmation waits for the responder", async () => {
    const page = owner.page;
    const confirm = page.getByRole("button", { name: "Record confirmation and activate" });
    await expect(confirm).toBeVisible();
    await confirm.click();
    await expect(
      page.getByText(/Both participants must confirm the same frozen agreement version before activation/),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Terms are still proposed.")).toBeVisible();
    return "The owner's confirmation was recorded without prematurely activating the agreement.";
  });

  await owner.screenshot("dealroom-owner-confirmed");

  await recordCheck("responder confirms the same agreement and activates it", async () => {
    const page = responder.page;
    await page.goto("/commitments", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Global health for Animal welfare" })).toBeVisible();
    await page.getByRole("link", { name: "Open dealroom" }).first().click();
    await expect(page.getByText(revisionMarker, { exact: false })).toBeVisible();
    await expect(page.getByText(counterofferSummary, { exact: true })).toBeVisible();
    const confirm = page.getByRole("button", { name: "Record confirmation and activate" });
    await expect(confirm).toBeVisible();
    await confirm.click();
    await expect(page.getByText("Agreement is active.")).toBeVisible({ timeout: 30_000 });
    await responder.screenshot("dealroom-responder-activated");
    return "The responder confirmed the same frozen version and the agreement became active.";
  });

  await recordCheck("owner sees the bilaterally activated agreement", async () => {
    const page = owner.page;
    await page.goto(dealroomPath, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Agreement is active.")).toBeVisible();
    await owner.screenshot("dealroom-final");
    return "Both synthetic accounts see the same active agreement after bilateral confirmation.";
  });
'''
    patched = replace_once(
        patched,
        old_confirmation_flow,
        new_confirmation_flow,
        "legacy one-participant activation flow",
    )

    if patched.count("const counterfactual = page.getByLabel") != 1:
        raise RuntimeError("Counterfactual-field patch was not applied exactly once.")
    if patched.count("const pendingLabel =") != 1:
        raise RuntimeError("Dynamic unpublished-change assertion was not applied exactly once.")
    if patched.count("const proposedRevisionLabels =") != 1:
        raise RuntimeError("Proposed-revision locator patch was not applied exactly once.")
    if patched.count("toHaveCount(expectedChangeCount)") != 1:
        raise RuntimeError("Expected-count assertion was not applied exactly once.")
    if patched.count('recordCheck("owner confirmation waits for the responder"') != 1:
        raise RuntimeError("Owner-confirmation check was not applied exactly once.")
    if patched.count('recordCheck("responder confirms the same agreement and activates it"') != 1:
        raise RuntimeError("Responder-confirmation check was not applied exactly once.")
    if CHANGE_MARKER in patched:
        raise RuntimeError("The stale one-change assertion remains after patching.")
    if PROPOSED_MARKER in patched:
        raise RuntimeError("The stale strict Proposed revision assertion remains after patching.")
    if 'recordCheck("dealroom status control"' in patched:
        raise RuntimeError("The stale one-participant activation check remains after patching.")

    PATH.write_text(patched, encoding="utf-8")
    print(
        "Patched the reviewed PR #158 browser runner for required dealroom terms, non-unique Proposed revision labels, and bilateral confirmation."
    )


if __name__ == "__main__":
    main()
