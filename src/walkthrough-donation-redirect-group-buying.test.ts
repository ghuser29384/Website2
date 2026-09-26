import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const standalone = readFileSync(
  new URL("../public/moral-trade-interactive-walkthroughs.html", import.meta.url),
  "utf8",
);
const fallback = readFileSync(
  new URL("./components/walkthrough/immersive-walkthrough.tsx", import.meta.url),
  "utf8",
);
const fallbackStyles = readFileSync(
  new URL("./app/walkthrough/walkthrough.css", import.meta.url),
  "utf8",
);

for (const [name, source] of [
  ["standalone production walkthrough", standalone],
  ["React fallback walkthrough", fallback],
] as const) {
  test(`${name} explains Donation Redirect amplification through a formal coalition`, () => {
    assert.match(source, /Redirect the matched \$20/);
    assert.match(source, /100 × 2\.1 days/);
    assert.match(source, /210 person-days · 30 person-weeks/);
    assert.match(source, /Redirect scheduled · users notified/);
    assert.match(source, /The \$10 redirect is already scheduled/);
    assert.match(source, /Moral Trade notifies users now/);
    assert.match(source, /Without an accepted and completed trade, the donation proceeds automatically/);
    assert.match(source, /scheduled environmental donation proceeds/);
    assert.match(source, /See a notified user start a coalition/);
    assert.match(source, /A notified user finds 99 close matches/);
    assert.doesNotMatch(source, /invite a better proposal|Notify potential coalition members/);
    assert.match(source, /Future flourishing/);
    assert.match(source, /60 \/ 100/);
    assert.match(source, /Existential risk/);
    assert.match(source, /25 \/ 100/);
    assert.match(source, /Pre-agree the destination/);
    assert.match(source, /Vote after completion/);
    assert.match(source, /7-day window|7 days/);
    assert.match(source, /One \$10 bought 30 person-weeks of environmental action/);
  });
}


test("Donation Redirect keeps the scheduled notification screen in a compact responsive layout", () => {
  assert.match(standalone, /Donation Redirect scheduled-notification reflow/);
  assert.match(fallbackStyles, /Donation Redirect scheduled-notification reflow/);
});
