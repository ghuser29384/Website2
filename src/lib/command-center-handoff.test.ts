import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";

import {
  COMMAND_CENTER_HANDOFF_KEY,
  consumeCommandCenterHandoff,
  parseCommandCenterHandoff,
} from "@/lib/command-center-handoff";

const root = process.cwd();

function readRepoFile(path: string) {
  return readFileSync(join(root, path), "utf8");
}

interface CommandHandoffApi {
  HANDOFF_KEY: string;
  createHandoffRecord(command: string, now?: number): Record<string, unknown>;
  commandTextFor(button: {
    closest(selector: string):
      | {
          querySelector(selector: string): { textContent?: string; value?: string } | null;
        }
      | null;
  }): string;
  parseCommand(command: string): {
    reviewFields: string[];
    values: Record<string, string>;
  };
}

function loadCommandHandoffApi() {
  const browserWindow: Record<string, unknown> = {};
  const document = {
    addEventListener() {},
    readyState: "loading",
  };

  vm.runInNewContext(
    readRepoFile("public/moral-trade-live-command-center.js"),
    {
      console,
      Date,
      document,
      window: browserWindow,
    },
  );

  return browserWindow.MoralTradeCommandHandoff as CommandHandoffApi;
}

function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

test("the reported animal-welfare command becomes concrete editable terms", () => {
  const handoff = loadCommandHandoffApi();
  const parsed = plain(
    handoff.parseCommand(
      "$5 donation to animal welfare if you eat 1 vegetarian meal",
    ),
  );

  assert.deepEqual(parsed.values, {
    offeredCause: "Animal welfare",
    requestedCause: "Animal welfare",
    proposedAction: "Donate $5 to an agreed animal welfare organization.",
    requestedAction: "Eat 1 vegetarian meal.",
    noTradeBaseline:
      "Without this trade, neither the $5 donation nor the vegetarian meal is assumed to occur.",
    duration: "One meal",
    startDate: "",
    evidenceDueDate: "",
    evidenceRule: "",
    exitConditions:
      "Either participant may withdraw before both participants confirm the final terms; no commitment begins before that confirmation.",
    notes: "",
  });
  assert.deepEqual(parsed.reviewFields, [
    "no-trade baseline",
    "deadline",
    "evidence",
  ]);
});

test("the handoff is bounded, ephemeral, and excludes the raw command", () => {
  const handoff = loadCommandHandoffApi();
  const record = plain(
    handoff.createHandoffRecord(
      "$5 donation to animal welfare if you eat 1 vegetarian meal",
      1_785_000_000_000,
    ),
  );

  assert.equal(handoff.HANDOFF_KEY, COMMAND_CENTER_HANDOFF_KEY);
  assert.equal(record.version, 1);
  assert.equal(record.source, "command-center");
  assert.equal(record.createdAt, 1_785_000_000_000);
  assert.equal("command" in record, false);
  assert.equal("rawCommand" in record, false);
});

test("Build and recent Run actions resolve the command from their own UI", () => {
  const handoff = loadCommandHandoffApi();
  const input = { value: "  $5 donation to animal welfare   if you eat 1 vegetarian meal  " };
  const drawer = { querySelector: () => input };
  const buildButton = {
    closest(selector: string) {
      if (selector === ".setting") return null;
      if (selector === "#drawer") return drawer;
      return null;
    },
  };

  const label = { textContent: "Counter Mina with 8 trips for $20" };
  const setting = { querySelector: () => label };
  const runButton = {
    closest(selector: string) {
      return selector === ".setting" ? setting : null;
    },
  };

  assert.equal(
    handoff.commandTextFor(buildButton),
    "$5 donation to animal welfare if you eat 1 vegetarian meal",
  );
  assert.equal(
    handoff.commandTextFor(runButton),
    "Counter Mina with 8 trips for $20",
  );
});

test("the receiving parser rejects stale or untrusted handoffs", () => {
  const now = 1_785_000_000_000;
  const valid = {
    version: 1,
    source: "command-center",
    createdAt: now,
    values: {
      offeredCause: "Animal welfare",
      requestedCause: "Animal welfare",
      proposedAction: "Donate $5.",
      requestedAction: "Eat 1 vegetarian meal.",
      voluntaryCertification: true,
      publicEvidenceCertification: true,
    },
    reviewFields: ["deadline", "deadline", "evidence"],
  };

  const parsed = parseCommandCenterHandoff(JSON.stringify(valid), now);
  assert.ok(parsed);
  assert.equal("voluntaryCertification" in parsed.values, false);
  assert.equal("publicEvidenceCertification" in parsed.values, false);
  assert.deepEqual(parsed.reviewFields, ["deadline", "evidence"]);

  const stale = { ...valid, createdAt: now - 7 * 60 * 60 * 1000 };
  assert.equal(parseCommandCenterHandoff(JSON.stringify(stale), now), null);
  assert.equal(parseCommandCenterHandoff("not json", now), null);
});

test("the handoff is consumed once before the editor uses it", () => {
  const now = 1_785_000_000_000;
  const stored = JSON.stringify({
    version: 1,
    source: "command-center",
    createdAt: now,
    values: { proposedAction: "Donate $5." },
    reviewFields: [],
  });
  const removed: string[] = [];
  const storage = {
    getItem(key: string) {
      return key === COMMAND_CENTER_HANDOFF_KEY ? stored : null;
    },
    removeItem(key: string) {
      removed.push(key);
    },
  };

  assert.equal(
    consumeCommandCenterHandoff(storage, now)?.values.proposedAction,
    "Donate $5.",
  );
  assert.deepEqual(removed, [COMMAND_CENTER_HANDOFF_KEY]);
});

test("the live shell intercepts the false-success path and opens the real editor", () => {
  const script = readRepoFile("public/moral-trade-live-command-center.js");
  const shell = readRepoFile("public/moral-trade-live.html");
  const page = readRepoFile("src/app/trades/new/page.tsx");
  const createRouter = readRepoFile("public/moral-trade-live-create-router.js");
  const workbench = readRepoFile(
    "src/components/core-trade/trade-draft-workbench.tsx",
  );

  assert.match(shell, /moral-trade-live-command-center\.js/);
  assert.match(script, /\[data-action="from-command"\]/);
  assert.doesNotMatch(createRouter, /\[data-action="from-command"\]/);
  assert.match(script, /stopImmediatePropagation/);
  assert.match(script, /window\.sessionStorage\.setItem/);
  assert.match(
    script,
    /window\.location\.assign\("\/trades\/new\?handoff=command-center"\)/,
  );
  assert.doesNotMatch(script, /innerHTML\s*=/);
  assert.doesNotMatch(script, /Draft created with editable exact terms/);

  assert.match(page, /resolvedSearchParams\.handoff/);
  assert.match(page, /returnParams\.set\("handoff", "command-center"\)/);
  assert.match(page, /acceptCommandHandoff=\{acceptsCommandHandoff\}/);

  assert.match(workbench, /consumeCommandCenterHandoff\(window\.sessionStorage\)/);
  assert.match(workbench, /No draft has been saved yet/);
  assert.match(workbench, /No draft was created/);
  assert.doesNotMatch(workbench, /Draft created with editable exact terms/);
});
