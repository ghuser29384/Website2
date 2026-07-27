from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


standalone_path = "public/moral-trade-interactive-walkthroughs.html"
standalone = read(standalone_path)
for old, new, label in [
    (
        "The $10 is scheduled to be donated in 7 days.",
        "The $10 redirect is already scheduled.",
        "standalone compact heading",
    ),
    (
        "Moral Trade notifies users that the Republican environmentalist's $10 is scheduled to go to an environmental protection organization. They can propose a moral trade she judges an even better use of the same $10; otherwise, the donation proceeds automatically.",
        "In 7 days, the Republican environmentalist's $10 will go to an environmental protection organization. Moral Trade notifies users now so they can propose an even better use. Without an accepted and completed trade, the donation proceeds automatically.",
        "standalone compact notification explanation",
    ),
    (
        "Automatically donated if no better accepted trade is completed.",
        "Donated automatically in 7 days unless a better trade is completed.",
        "standalone scheduled redirect note",
    ),
    (
        "In this example, the environmentalist prefers the verified 210 person-days to the $10 fallback donation.",
        "In this example, the environmentalist prefers 210 verified person-days to the scheduled $10 donation.",
        "standalone comparison note",
    ),
    (
        "If the coalition does not form or complete, the $10 follows its environmental fallback after the 7-day window.",
        "If the coalition does not form or complete, the scheduled environmental donation proceeds at the end of the 7-day window.",
        "standalone scheduled-donation fallback",
    ),
    (
        "Money moved where it was scarcer; small actions moved where they were cheaper. Both sides prefer this outcome to the 7-day fallback.",
        "Money moved where it was scarcer; small actions moved where they were cheaper. Both sides prefer this outcome to letting the scheduled donation proceed.",
        "standalone final scheduled-donation comparison",
    ),
]:
    standalone = replace_once(standalone, old, new, label)
write(standalone_path, standalone)


fallback_path = "src/components/walkthrough/immersive-walkthrough.tsx"
fallback = read(fallback_path)
for old, new, label in [
    (
        "The $10 is scheduled to be donated in 7 days.",
        "The $10 redirect is already scheduled.",
        "React compact heading",
    ),
    (
        "Moral Trade notifies users that the Republican environmentalist&apos;s $10 is scheduled\n              to go to an environmental protection organization. They can propose a moral trade she\n              judges an even better use of the same $10; otherwise, the donation proceeds automatically.",
        "In 7 days, the Republican environmentalist&apos;s $10 will go to an environmental\n              protection organization. Moral Trade notifies users now so they can propose an even\n              better use. Without an accepted and completed trade, the donation proceeds automatically.",
        "React compact notification explanation",
    ),
    (
        "Automatically donated if no better accepted trade is completed.",
        "Donated automatically in 7 days unless a better trade is completed.",
        "React scheduled redirect note",
    ),
    (
        "In this example, the environmentalist prefers the verified 210 person-days to the $10\n            fallback donation.",
        "In this example, the environmentalist prefers 210 verified person-days to the scheduled\n            $10 donation.",
        "React comparison note",
    ),
    (
        "If the coalition does not form or complete, the $10 follows its environmental fallback\n            after the 7-day window.",
        "If the coalition does not form or complete, the scheduled environmental donation proceeds\n            at the end of the 7-day window.",
        "React scheduled-donation fallback",
    ),
    (
        "Money moved where it was scarcer; small actions moved where they were cheaper. Both\n            sides prefer this outcome to the 7-day fallback.",
        "Money moved where it was scarcer; small actions moved where they were cheaper. Both\n            sides prefer this outcome to letting the scheduled donation proceed.",
        "React final scheduled-donation comparison",
    ),
]:
    fallback = replace_once(fallback, old, new, label)
write(fallback_path, fallback)


browser_path = "tests/walkthrough.spec.ts"
browser = read(browser_path)
browser = replace_once(
    browser,
    '    page.getByRole("heading", { name: "The $10 is scheduled to be donated in 7 days." }),',
    '    page.getByRole("heading", { name: "The $10 redirect is already scheduled." }),',
    "browser compact heading assertion",
)
browser = replace_once(
    browser,
    '  await page.getByRole("button", { name: "See a notified user start a coalition" }).click();',
    '''  const coalitionStart = page.getByRole("button", {
    name: "See a notified user start a coalition",
  });
  await expect(coalitionStart).toBeVisible();
  await expectFullyInViewport(page, coalitionStart);
  await coalitionStart.click();''',
    "browser in-viewport coalition action",
)
write(browser_path, browser)


contract_path = "src/walkthrough-donation-redirect-group-buying.test.ts"
contract = read(contract_path)
contract = replace_once(
    contract,
    "    assert.match(source, /The \\$10 is scheduled to be donated in 7 days/);",
    "    assert.match(source, /The \\$10 redirect is already scheduled/);",
    "source contract compact heading",
)
contract = replace_once(
    contract,
    "    assert.match(source, /Moral Trade notifies users/);",
    '''    assert.match(source, /Moral Trade notifies users now/);
    assert.match(source, /scheduled environmental donation proceeds/);''',
    "source contract explicit automatic redirect",
)
write(contract_path, contract)

print("Tightened the scheduled-redirect copy and added an in-viewport regression for the coalition action.")
