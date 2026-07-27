from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once_or_already(text: str, old: str, new: str, label: str) -> str:
    old_count = text.count(old)
    new_count = text.count(new)
    if old_count == 1:
        return text.replace(old, new, 1)
    if old_count == 0 and new_count >= 1:
        return text
    raise RuntimeError(
        f"{label}: expected one old match or an already-applied replacement; "
        f"old={old_count}, new={new_count}"
    )


standalone_path = "public/moral-trade-interactive-walkthroughs.html"
standalone = read(standalone_path)
for old, new, label in [
    (
        "Different causes · different bottlenecks",
        "Redirect scheduled · users notified",
        "standalone step-two prompt",
    ),
    (
        "Before the fallback settles, invite a better proposal.",
        "The $10 is scheduled to be donated in 7 days.",
        "standalone step-two heading",
    ),
    (
        "The Republican's $10 will go to environmental protection in 7 days unless a trade she values more is accepted and completed.",
        "Moral Trade notifies users that the Republican environmentalist's $10 is scheduled to go to an environmental protection organization. They can propose a moral trade she judges an even better use of the same $10; otherwise, the donation proceeds automatically.",
        "standalone notification explanation",
    ),
    ("Fallback donation", "Scheduled redirect", "standalone scheduled redirect label"),
    (
        "Useful, but no exchange.",
        "Automatically donated if no better accepted trade is completed.",
        "standalone scheduled redirect note",
    ),
    ("One-to-one trade", "One-to-one proposal", "standalone one-to-one label"),
    ("Group-buy moral trade", "Group-buy proposal", "standalone group-buy label"),
    (
        "Notify potential coalition members",
        "See a notified user start a coalition",
        "standalone step-two action",
    ),
    (
        "7-day better-match window",
        "Platform notification · 7 days remaining",
        "standalone notification prompt",
    ),
    (
        "One member finds 99 close matches.",
        "A notified user finds 99 close matches.",
        "standalone notified-user heading",
    ),
    (
        "Moral Trade searches for people whose priorities are as similar as possible and whose small actions can add up.",
        "She uses Moral Trade to find 99 users whose priorities are as similar as possible and whose small actions can add up.",
        "standalone notified-user explanation",
    ),
]:
    standalone = replace_once_or_already(standalone, old, new, label)
write(standalone_path, standalone)


fallback_path = "src/components/walkthrough/immersive-walkthrough.tsx"
fallback = read(fallback_path)
for old, new, label in [
    (
        "Different causes · different bottlenecks",
        "Redirect scheduled · users notified",
        "React step-two prompt",
    ),
    (
        "Before the fallback settles, invite a better proposal.",
        "The $10 is scheduled to be donated in 7 days.",
        "React step-two heading",
    ),
    (
        "The Republican&apos;s $10 will go to environmental protection in 7 days unless a trade\n              she values more is accepted and completed.",
        "Moral Trade notifies users that the Republican environmentalist&apos;s $10 is scheduled\n              to go to an environmental protection organization. They can propose a moral trade she\n              judges an even better use of the same $10; otherwise, the donation proceeds automatically.",
        "React notification explanation",
    ),
    ("Fallback donation", "Scheduled redirect", "React scheduled redirect label"),
    (
        "Useful, but no exchange.",
        "Automatically donated if no better accepted trade is completed.",
        "React scheduled redirect note",
    ),
    ("One-to-one trade", "One-to-one proposal", "React one-to-one label"),
    ("Group-buy moral trade", "Group-buy proposal", "React group-buy label"),
    (
        "Notify potential coalition members",
        "See a notified user start a coalition",
        "React step-two action",
    ),
    (
        "7-day better-match window",
        "Platform notification · 7 days remaining",
        "React notification prompt",
    ),
    (
        "One member finds 99 close matches.",
        "A notified user finds 99 close matches.",
        "React notified-user heading",
    ),
    (
        "Moral Trade searches for people whose priorities are as similar as possible and\n                whose small actions can add up.",
        "She uses Moral Trade to find 99 users whose priorities are as similar as possible and\n                whose small actions can add up.",
        "React notified-user explanation",
    ),
]:
    fallback = replace_once_or_already(fallback, old, new, label)
write(fallback_path, fallback)


browser_path = "tests/walkthrough.spec.ts"
browser = read(browser_path)
browser = replace_once_or_already(
    browser,
    '  await page.getByRole("button", { name: "Notify potential coalition members" }).click();',
    '  await page.getByRole("button", { name: "See a notified user start a coalition" }).click();',
    "browser step-two action",
)
browser = replace_once_or_already(
    browser,
    '  await expect(page.getByRole("heading", { name: "One member finds 99 close matches." })).toBeVisible();',
    '''  await expect(
    page.getByRole("heading", { name: "A notified user finds 99 close matches." }),
  ).toBeVisible();''',
    "browser notified-user heading",
)
assertion_marker = '  await expect(page.getByText("1 × 10 weeks")).toBeVisible();\n'
assertion_block = '''  await expect(page.getByText("1 × 10 weeks")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "The $10 is scheduled to be donated in 7 days." }),
  ).toBeVisible();
  await expect(page.getByText(/Moral Trade notifies users/)).toBeVisible();
'''
if assertion_block not in browser:
    if browser.count(assertion_marker) != 1:
        raise RuntimeError(
            "browser notification assertions: expected one insertion marker, "
            f"found {browser.count(assertion_marker)}"
        )
    browser = browser.replace(assertion_marker, assertion_block, 1)
write(browser_path, browser)


contract_path = "src/walkthrough-donation-redirect-group-buying.test.ts"
contract = read(contract_path)
old_contract_line = "    assert.match(source, /One member finds 99 close matches/);"
new_contract_block = '''    assert.match(source, /Redirect scheduled · users notified/);
    assert.match(source, /The \\$10 is scheduled to be donated in 7 days/);
    assert.match(source, /Moral Trade notifies users/);
    assert.match(source, /See a notified user start a coalition/);
    assert.match(source, /A notified user finds 99 close matches/);
    assert.doesNotMatch(source, /invite a better proposal|Notify potential coalition members/);'''
contract = replace_once_or_already(
    contract,
    old_contract_line,
    new_contract_block,
    "source contract notification semantics",
)
write(contract_path, contract)

for path in [standalone_path, fallback_path]:
    source = read(path)
    required = [
        "Redirect scheduled · users notified",
        "The $10 is scheduled to be donated in 7 days.",
        "Moral Trade notifies users",
        "See a notified user start a coalition",
        "A notified user finds 99 close matches.",
    ]
    forbidden = [
        "Before the fallback settles, invite a better proposal.",
        "Notify potential coalition members",
    ]
    for marker in required:
        if marker not in source:
            raise RuntimeError(f"{path}: missing required marker {marker!r}")
    for marker in forbidden:
        if marker in source:
            raise RuntimeError(f"{path}: retained forbidden marker {marker!r}")

print("Donation Redirect now presents an automatic scheduled redirect, platform notification, and user-originated proposals.")
