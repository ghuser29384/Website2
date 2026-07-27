#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

PATH = Path(".github/scripts/pr158-two-account-browser-qa.mjs")
START_MARKER = 'await recordCheck("dealroom term diff and persisted revision"'
PAGE_MARKER = "const page = owner.page;"
CHANGE_MARKER = 'await expect(page.getByText("1 unpublished change")).toBeVisible();'
PROPOSED_MARKER = 'await expect(page.getByText("Proposed revision")).toBeVisible();'
STATUS_START_MARKER = '  await recordCheck("dealroom status control", async () => {'
OWNER_SCREENSHOT_MARKER = '  await owner.screenshot("dealroom-final");'
RESPONDER_START_MARKER = (
    '  await recordCheck("responder can access the same agreement and history", async () => {'
)
MOBILE_PUBLIC_MARKER = "  const mobilePublic = await makeSession(browser, {"


def replace_exact_block(
    source: str,
    *,
    start_marker: str,
    end_marker: str,
    replacement: str,
    label: str,
) -> str:
    starts = [index for index in range(len(source)) if source.startswith(start_marker, index)]
    if len(starts) != 1:
        raise RuntimeError(f"Expected one {label} start marker; found {len(starts)}.")
    start = starts[0]
    end = source.find(end_marker, start + len(start_marker))
    if end < 0:
        raise RuntimeError(f"Missing {label} end marker.")
    return source[:start] + replacement + source[end:]


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

    owner_confirmation = '''  await recordCheck("owner confirmation persists without unilateral activation", async () => {
    const page = owner.page;
    const reviewed = page.getByRole("checkbox", {
      name: /I reviewed this frozen version/i,
    });
    await reviewed.check();
    await page.getByRole("button", { name: "Confirm current frozen version" }).click();
    await expect(
      page.getByText(
        "Your confirmation was recorded. The agreement remains proposed until the other participant confirms.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("Agreement is active.", { exact: true })).toHaveCount(0);
    return "The first distinct confirmation persisted and did not activate the agreement unilaterally.";
  });

'''
    patched = replace_exact_block(
        patched,
        start_marker=STATUS_START_MARKER,
        end_marker=OWNER_SCREENSHOT_MARKER,
        replacement=owner_confirmation,
        label="owner status-control block",
    )

    responder_confirmation = '''  await recordCheck("responder confirms the same frozen version and activates", async () => {
    const page = responder.page;
    await page.goto("/commitments", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Global health for Animal welfare" })).toBeVisible();
    await page.getByRole("link", { name: "Open dealroom" }).first().click();
    await expect(page.getByText(revisionMarker, { exact: false })).toBeVisible();
    await expect(page.getByText(counterofferSummary, { exact: true })).toBeVisible();
    const reviewed = page.getByRole("checkbox", {
      name: /I reviewed this frozen version/i,
    });
    await reviewed.check();
    await page.getByRole("button", { name: "Confirm current frozen version" }).click();
    await expect(page.getByText("Agreement is active.", { exact: true })).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: "Confirm current frozen version" })).toHaveCount(0);
    return "The second distinct participant confirmed the same frozen version and activated the shared agreement.";
  });

'''
    patched = replace_exact_block(
        patched,
        start_marker=RESPONDER_START_MARKER,
        end_marker=MOBILE_PUBLIC_MARKER,
        replacement=responder_confirmation,
        label="responder agreement-access block",
    )

    if patched.count("const counterfactual = page.getByLabel") != 1:
        raise RuntimeError("Counterfactual-field patch was not applied exactly once.")
    if patched.count("const pendingLabel =") != 1:
        raise RuntimeError("Dynamic unpublished-change assertion was not applied exactly once.")
    if patched.count("const proposedRevisionLabels =") != 1:
        raise RuntimeError("Proposed-revision locator patch was not applied exactly once.")
    if patched.count("toHaveCount(expectedChangeCount)") != 1:
        raise RuntimeError("Expected-count assertion was not applied exactly once.")
    if patched.count('name: "Confirm current frozen version"') < 3:
        raise RuntimeError("Canonical confirmation controls were not patched into both participant checks.")
    if "Record confirmation and activate" in patched:
        raise RuntimeError("The obsolete unilateral-activation control remains in the QA runner.")
    if CHANGE_MARKER in patched:
        raise RuntimeError("The stale one-change assertion remains after patching.")
    if PROPOSED_MARKER in patched:
        raise RuntimeError("The stale strict Proposed revision assertion remains after patching.")

    PATH.write_text(patched, encoding="utf-8")
    print(
        "Patched the reviewed PR #158 browser runner for required dealroom terms, exact diff counts, and two-party frozen-version confirmation."
    )


if __name__ == "__main__":
    main()
