import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { FOOTER_LINK_GROUPS, getPrimaryNavLinks } from "@/lib/site";

const read = (path: string) => readFileSync(path, "utf8");

test("the offer summary receives record-bound save and response actions", () => {
  const page = read("src/app/offers/[offerId]/page.tsx");
  assert.match(page, /actions=\{recordActions\}/);
  assert.match(page, /viewer && !isOwner \? \(\s*<form action=\{toggleCartAction\}>/);
  assert.match(page, /name="offer_id" type="hidden" value=\{offer.id\}/);
  assert.match(page, /name="return_to" type="hidden" value=\{offerReturnTo\}/);
  assert.match(page, /cartState.isInCart \? "Remove saved offer" : "Save offer"/);
  assert.match(page, /href=\{signInToOfferHref\}>Sign in to save/);
  assert.match(page, /href=\{commitmentHref\}/);
  assert.doesNotMatch(page, /ReviewPlanPanel|CommitmentSheet/);
});

test("real saved records and server authorization remain intact", () => {
  const action = read("src/app/actions.ts").split("export async function toggleCartAction(")[1].split("export async function ")[0];
  assert.match(action, /requireViewer\(returnTo\)/);
  assert.match(action, /offer.owner_id === viewer.authUser.id/);
  assert.match(action, /\.eq\("user_id", viewer.authUser.id\)/);
  assert.match(action, /\.from\("offer_carts"\)\.insert/);
  assert.match(action, /revalidatePath\("\/saved-offers"\)/);
  assert.match(read("src/app/saved-offers/page.tsx"), /await listCartItems\(viewer.authUser.id\)/);
});

test("demonstrations and review notes are learning resources, not primary controls", () => {
  const learn = FOOTER_LINK_GROUPS.find((group) => group.title === "Learn")!;
  for (const href of ["/trade-controls", "/reasoning-center", "/priority-correction-fund"]) {
    assert.ok(learn.links.some((link) => link.href === href));
    assert.ok(getPrimaryNavLinks().every((link) => link.href !== href));
    assert.ok(FOOTER_LINK_GROUPS.filter((group) => group.title !== "Learn").every((group) => group.links.every((link) => link.href !== href)));
  }
  const notes = read("src/app/reasoning-center/page.tsx");
  assert.doesNotMatch(notes, /Draft review note|navSections|reasoning-topic-strip|>Ask</);
  assert.match(notes, /not a live review queue/);
  assert.match(notes, /MORAL_TRADE_REASONING_PACKET_FILTERS/);
  assert.match(notes, /packet_generation_failed/);
});

test("experimental allocation is separated without claiming payment consent", () => {
  const fund = read("src/app/priority-correction-fund/page.tsx");
  assert.match(fund, /A separate allocation experiment/);
  assert.match(fund, /not consent to contribute/);
  assert.match(fund, /separately agreed terms/);
  assert.match(fund, /does not certify/);
  assert.match(fund, /publishPriorityCorrectionCycleAction/);
  assert.match(read("src/app/dashboard/page.tsx"), /<details className="section section-white" id="payments-and-fund">/);
});

test("unavailable fund reads cannot render inferred zero balances or operational controls", () => {
  const page = read("src/app/priority-correction-fund/page.tsx");
  assert.match(page, /getPriorityCorrectionPageData[\s\S]*?\.catch\(\(\) =>/);
  assert.match(page, /\{!pageData \? \(/);
  assert.match(page, /Experiment records unavailable/);
  assert.match(page, /No balance, contribution, allocation, or review status/);
  assert.match(page, /is inferred from this unavailable data/);
});
