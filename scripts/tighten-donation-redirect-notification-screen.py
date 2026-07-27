from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REFLOW_MARKER = "Donation Redirect scheduled-notification reflow"


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)


standalone_reflow_css = r'''

/* Donation Redirect scheduled-notification reflow. */
.redirect-comparison-scene {
  grid-template-columns: minmax(360px, 0.9fr) minmax(520px, 1.1fr);
  grid-template-areas:
    "redirect-head redirect-options"
    "redirect-note redirect-options"
    "redirect-action redirect-options";
  align-items: start;
  column-gap: clamp(30px, 4vw, 64px);
}

.redirect-comparison-scene .scene-head {
  grid-area: redirect-head;
  width: 100%;
  max-width: 540px;
}

.redirect-comparison-scene .scene-title {
  max-width: 10ch;
  font-size: clamp(48px, 5.2vw, 72px);
}

.redirect-comparison-scene .scene-line {
  max-width: 520px;
  margin-top: 18px;
  font-size: clamp(17px, 1.55vw, 21px);
  line-height: 1.28;
}

.redirect-comparison-scene .impact-options {
  grid-area: redirect-options;
  width: 100%;
  margin-top: 0;
  grid-template-columns: 1fr;
  align-self: center;
  gap: 10px;
}

.redirect-comparison-scene .impact-option {
  min-height: 0;
  padding: 15px 17px;
  display: grid;
  grid-template-columns: minmax(170px, 0.8fr) minmax(0, 1.2fr);
  grid-template-areas:
    "impact-label impact-label"
    "impact-amount impact-result"
    "impact-detail impact-detail";
  align-items: end;
  gap: 5px 16px;
}

.redirect-comparison-scene .impact-option.is-group-buy {
  transform: none;
}

.redirect-comparison-scene .impact-option > span {
  grid-area: impact-label;
}

.redirect-comparison-scene .impact-option > strong {
  grid-area: impact-amount;
  margin: 0;
  font-size: clamp(28px, 2.6vw, 40px);
}

.redirect-comparison-scene .impact-option > b {
  grid-area: impact-result;
  align-self: end;
  font-size: 16px;
}

.redirect-comparison-scene .impact-option > small {
  grid-area: impact-detail;
}

.redirect-comparison-scene > .example-note {
  grid-area: redirect-note;
  width: 100%;
  max-width: 500px;
  margin-top: 16px;
}

.redirect-comparison-scene > .primary-action {
  grid-area: redirect-action;
  margin-top: 18px;
}

@media (max-width: 1100px) {
  .experience[data-concept="redirect"] {
    overflow-y: auto;
  }

  .redirect-comparison-scene {
    position: relative;
    min-height: 980px;
    grid-template-columns: 1fr;
    grid-template-areas:
      "redirect-head"
      "redirect-options"
      "redirect-note"
      "redirect-action";
    align-content: start;
    row-gap: 0;
  }

  .redirect-comparison-scene .impact-options {
    margin-top: 24px;
  }
}

@media (max-width: 740px) {
  .redirect-comparison-scene {
    min-height: 1280px;
  }

  .redirect-comparison-scene .scene-title {
    max-width: 11ch;
    font-size: 40px;
  }

  .redirect-comparison-scene .scene-line {
    font-size: 17px;
  }

  .redirect-comparison-scene .impact-option {
    grid-template-columns: 1fr;
    grid-template-areas:
      "impact-label"
      "impact-amount"
      "impact-result"
      "impact-detail";
    align-items: start;
  }

  .redirect-comparison-scene > .primary-action {
    width: 100%;
  }
}
'''

react_reflow_css = standalone_reflow_css.replace(".redirect-", ".mtw-redirect-")
react_reflow_css = react_reflow_css.replace(".scene-", ".mtw-scene-")
react_reflow_css = react_reflow_css.replace(".impact-", ".mtw-impact-")
react_reflow_css = react_reflow_css.replace(".example-note", ".mtw-example-note")
react_reflow_css = react_reflow_css.replace(".primary-action", ".mtw-primary-action")
react_reflow_css = react_reflow_css.replace(".experience", ".mtw-experience")


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
        "In 7 days, the Republican environmentalist's $10 goes to an environmental protection organization. Moral Trade notifies users now; they may propose a trade she values more for the same $10. Without an accepted and completed trade, the donation proceeds automatically.",
        "standalone compact notification explanation",
    ),
    (
        "Automatically donated if no better accepted trade is completed.",
        "Donated automatically in 7 days unless an accepted trade is completed.",
        "standalone scheduled redirect note",
    ),
    (
        "In this example, the environmentalist prefers the verified 210 person-days to the $10 fallback donation.",
        "Here, she prefers 210 verified person-days to the scheduled $10 donation.",
        "standalone comparison note",
    ),
    (
        "If the coalition does not form or complete, the $10 follows its environmental fallback after the 7-day window.",
        "If the coalition does not form or complete, the scheduled environmental donation proceeds after 7 days.",
        "standalone scheduled-donation fallback",
    ),
    (
        "Money moved where it was scarcer; small actions moved where they were cheaper. Both sides prefer this outcome to the 7-day fallback.",
        "Money moved where it was scarcer; small actions moved where they were cheaper. Both sides prefer this outcome to the scheduled donation.",
        "standalone final scheduled-donation comparison",
    ),
]:
    standalone = replace_once(standalone, old, new, label)
if REFLOW_MARKER in standalone:
    raise RuntimeError("standalone notification reflow marker already exists")
standalone = replace_once(
    standalone,
    "\n  </style>\n</head>",
    standalone_reflow_css + "\n  </style>\n</head>",
    "append standalone notification reflow",
)
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
        "In 7 days, the Republican environmentalist&apos;s $10 goes to an environmental protection\n              organization. Moral Trade notifies users now; they may propose a trade she values more\n              for the same $10. Without an accepted and completed trade, the donation proceeds automatically.",
        "React compact notification explanation",
    ),
    (
        "Automatically donated if no better accepted trade is completed.",
        "Donated automatically in 7 days unless an accepted trade is completed.",
        "React scheduled redirect note",
    ),
    (
        "In this example, the environmentalist prefers the verified 210 person-days to the $10\n            fallback donation.",
        "Here, she prefers 210 verified person-days to the scheduled $10 donation.",
        "React comparison note",
    ),
    (
        "If the coalition does not form or complete, the $10 follows its environmental fallback\n            after the 7-day window.",
        "If the coalition does not form or complete, the scheduled environmental donation proceeds\n            after 7 days.",
        "React scheduled-donation fallback",
    ),
    (
        "Money moved where it was scarcer; small actions moved where they were cheaper. Both\n            sides prefer this outcome to the 7-day fallback.",
        "Money moved where it was scarcer; small actions moved where they were cheaper. Both\n            sides prefer this outcome to the scheduled donation.",
        "React final scheduled-donation comparison",
    ),
]:
    fallback = replace_once(fallback, old, new, label)
write(fallback_path, fallback)

fallback_css_path = "src/app/walkthrough/walkthrough.css"
fallback_css = read(fallback_css_path)
if REFLOW_MARKER in fallback_css:
    raise RuntimeError("React notification reflow marker already exists")
write(fallback_css_path, fallback_css.rstrip() + react_reflow_css + "\n")


browser_path = "tests/walkthrough.spec.ts"
browser = read(browser_path)
browser = replace_once(
    browser,
    '''test("Crowd and Redirect preserve the requested copy, coalition trade, and routing", async ({ page }) => {
  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });''',
    '''test("Crowd and Redirect preserve the requested copy, coalition trade, and routing", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });''',
    "browser explicit compact desktop viewport",
)
browser = replace_once(
    browser,
    '    page.getByRole("heading", { name: "The $10 is scheduled to be donated in 7 days." }),',
    '    page.getByRole("heading", { name: "The $10 redirect is already scheduled." }),',
    "browser compact heading assertion",
)
browser = replace_once(
    browser,
    '  await expect(page.getByText(/Moral Trade notifies users/)).toBeVisible();',
    '''  await expect(page.getByText(/Moral Trade notifies users now/)).toBeVisible();
  await expect(
    page.getByText(/Without an accepted and completed trade, the donation proceeds automatically/),
  ).toBeVisible();''',
    "browser explicit notification and automatic redirect assertions",
)
browser = replace_once(
    browser,
    '  await page.getByRole("button", { name: "See a notified user start a coalition" }).click();',
    '''  const coalitionStart = page.getByRole("button", {
    name: "See a notified user start a coalition",
  });
  await expect(coalitionStart).toBeVisible();
  await page.waitForTimeout(700);
  await expectFullyInViewport(page, coalitionStart);
  await expectFullyInside(coalitionStart, page.locator(".experience"));
  await coalitionStart.click();''',
    "browser fully visible coalition action",
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
    assert.match(source, /Without an accepted and completed trade, the donation proceeds automatically/);
    assert.match(source, /scheduled environmental donation proceeds/);''',
    "source contract explicit notification semantics",
)
contract = replace_once(
    contract,
    '''const fallback = readFileSync(
  new URL("./components/walkthrough/immersive-walkthrough.tsx", import.meta.url),
  "utf8",
);''',
    '''const fallback = readFileSync(
  new URL("./components/walkthrough/immersive-walkthrough.tsx", import.meta.url),
  "utf8",
);
const fallbackStyles = readFileSync(
  new URL("./app/walkthrough/walkthrough.css", import.meta.url),
  "utf8",
);''',
    "source contract read fallback styles",
)
contract += '''

test("Donation Redirect keeps the scheduled notification screen in a compact responsive layout", () => {
  assert.match(standalone, /Donation Redirect scheduled-notification reflow/);
  assert.match(fallbackStyles, /Donation Redirect scheduled-notification reflow/);
});
'''
write(contract_path, contract)

print("Reflowed the scheduled-redirect screen and added an exact 1280x720 visibility gate.")
