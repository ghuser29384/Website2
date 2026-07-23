import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const routeBridge = readFileSync("public/moral-trade-live-priority-route.js", "utf8");
const priorityPage = readFileSync("src/app/profile/priorities/page.tsx", "utf8");
const priorityAction = readFileSync("src/app/profile/priorities/actions.ts", "utf8");
const priorityEditor = readFileSync(
  "src/components/profile/profile-priority-editor.tsx",
  "utf8",
);

test("the no-match priority actions open the profile spark editor and preserve the Feed return", () => {
  const window = {
    location: { pathname: "/feed" },
    nowFocus: () =>
      '<a href="/complete-profile">Set priorities →</a>' +
      '<a href="/complete-profile">Adjust priorities →</a>' +
      '<a href="/complete-profile">Edit priorities →</a>',
    render: () => undefined,
  };

  runInNewContext(routeBridge, { window });
  const html = window.nowFocus();

  assert.match(
    html,
    /href="\/profile\/priorities\?returnTo=%2Ffeed">Adjust priorities →/,
  );
  assert.match(
    html,
    /href="\/profile\/priorities\?returnTo=%2Ffeed">Edit priorities →/,
  );
  assert.match(html, /href="\/complete-profile">Set priorities →/);
});

test("the profile priorities route edits and persists the canonical 100-spark allocation", () => {
  assert.match(priorityPage, /ProfilePriorityEditor/);
  assert.match(priorityPage, /priority_allocations,cause_areas/);
  assert.match(priorityEditor, /Adjust your 100 sparks/);
  assert.match(priorityEditor, /name="priority_allocation"/);
  assert.match(priorityEditor, /COMPLETE_PROFILE_SPARK_VALUE/);
  assert.match(priorityAction, /normalizeProfilePriorityAllocation/);
  assert.match(priorityAction, /priority_allocations: priorityAllocations/);
  assert.match(priorityAction, /cause_priorities: causePriorities/);
  assert.match(priorityAction, /Your feed now uses the new 100-spark allocation/);
  assert.doesNotMatch(priorityPage, /redirect\("\/walkthrough"\)/);
});
