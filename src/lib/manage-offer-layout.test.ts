import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import ts from "typescript";

// Execute the real route against inert JSX/data adapters. No application auth,
// database, server action, invitation, or payment code is imported or executed.
const source = readFileSync("src/app/trades/[offerId]/manage/page.tsx", "utf8");
const css = readFileSync("src/app/trades/[offerId]/manage/manage-offer.module.css", "utf8");
const compiled = ts.transpileModule(source, {
  fileName: "page.tsx",
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.React,
    jsxFactory: "h",
    jsxFragmentFactory: "Fragment",
    esModuleInterop: true,
  },
  reportDiagnostics: true,
});

type Child = Element | string | number | boolean | null | undefined | Child[];
type Props = Record<string, unknown> & { children?: Child };
type Element = { tag: string; props: Props; children: Child[] };
type Component = (props: Props) => Child;

function h(tag: string | Component, props: Props | null, ...children: Child[]): Child {
  if (typeof tag === "function") return tag({ ...props, children });
  return { tag, props: props ?? {}, children };
}

function all(root: Child): Element[] {
  if (Array.isArray(root)) return root.flatMap(all);
  if (!root || typeof root !== "object") return [];
  return [root, ...root.children.flatMap(all)];
}

function text(root: Child): string {
  if (Array.isArray(root)) return root.map(text).join("");
  if (root === null || root === undefined || typeof root === "boolean") return "";
  if (typeof root !== "object") return String(root);
  return text(root.children);
}

async function renderFixture(
  state: string,
  options: { sourceCurrent?: boolean; noMatches?: boolean; missing?: boolean; error?: boolean } = {},
) {
  const calls: string[] = [];
  const offer = {
    id: "fixture-offer",
    workflow_status: state,
    offered_cause: "Animal welfare",
    requested_cause: "Climate action",
    terms_version: 2,
    updated_at: "2026-09-24T12:00:00Z",
    submitted_at: null,
    published_at: null,
    moderation_reason: state === "changes_requested" ? "Clarify the evidence due date." : null,
    offer_action: "Choose plant-based lunches for two weeks.",
    request_action: "Use public transit for the same period.",
    no_trade_baseline: "Neither commitment is required without an agreement.",
    duration: "Two weeks",
    start_date: "2026-10-01",
    evidence_due_date: "2026-10-15",
    verification: "Share a brief written summary at the agreed deadline.",
    maximum_burden: "No spending or travel beyond the agreed commitment.",
    exit_conditions: "Either participant can exit under the agreed terms.",
    privacy_scope: "Completion details remain private between participants.",
    notes: "A small, voluntary first trade.",
  };
  const link = options.sourceCurrent === undefined ? null : {
    sourceOwnerAlias: "Fixture participant",
    source_terms_version: 3,
    sourceCurrent: options.sourceCurrent,
    sourceUrl: "/offers/fixture-source",
  };
  const modules: Record<string, unknown> = {
    "next/link": (props: Props) => h("a", props, props.children),
    "next/navigation": { notFound: () => { throw new Error("NOT_FOUND"); } },
    "@/app/core-trade-actions": {
      updateCoreOfferAction: "/fixture/update",
      changeCoreOfferStateAction: "/fixture/lifecycle",
      startSuggestedMatchAction: "/fixture/match",
    },
    "@/components/core-trade/pending-submit-button": {
      PendingSubmitButton: (props: Props) => h("button", {
        type: "submit", className: props.className ?? "button button-primary",
        name: props.name, value: props.value, disabled: props.disabled ?? false,
      }, props.children),
    },
    "@/components/layout/site-topbar": {
      SiteTopbar: () => h("nav", { "aria-label": "Fixture navigation" }, "Moral Trade"),
    },
    "@/components/layout/site-footer": { SiteFooter: () => null },
    "@/components/ui/local-date-time": {
      LocalDateTime: (props: Props) => h("time", { dateTime: props.value }, "Sep 24, 2026, 12:00 PM"),
    },
    "@/lib/app-data": {
      requireViewer: async (returnTo: string) => {
        calls.push(`viewer:${returnTo}`);
        return { authUser: { id: "fixture-owner" } };
      },
    },
    "@/lib/core-trade": {
      getCoreOfferForOwner: async (id: string, owner: string) => {
        calls.push(`offer:${id}:${owner}`);
        return options.missing ? null : offer;
      },
      listReciprocalMatches: async () => {
        calls.push("matches");
        return options.noMatches ? [] : [{ ...offer, id: "fixture-match" }];
      },
    },
    "@/lib/feed-create/phase1": {
      getFeedCreateLinkForDerivedOffer: async (id: string, owner: string) => {
        calls.push(`source:${id}:${owner}`);
        return link;
      },
    },
    "@/lib/form-state": {
      getFormMessage: () => options.error ? { tone: "error", text: "Please check the required fields." } : null,
    },
    "@/lib/site": { getPrimaryNavLinks: () => [], getTopbarActions: () => ({}) },
    "./manage-offer.module.css": {
      __esModule: true,
      default: new Proxy({}, { get: (_target, name) => String(name) }),
    },
  };
  const exports: { default?: (props: unknown) => Promise<Child> } = {};
  runInNewContext(compiled.outputText, {
    exports, h, Fragment: (props: Props) => props.children,
    require: (name: string) => {
      assert.ok(Object.hasOwn(modules, name), `Unexpected route dependency: ${name}`);
      return modules[name];
    },
  });
  assert.ok(exports.default);
  const tree = await exports.default({
    params: Promise.resolve({ offerId: offer.id }),
    searchParams: Promise.resolve({}),
  });
  return { tree, calls, nodes: all(tree) };
}

test("manage route compiles and retains owner-scoped reads", async () => {
  assert.equal(compiled.diagnostics?.length, 0);
  const { calls } = await renderFixture("draft");
  assert.deepEqual(calls, [
    "viewer:/trades/fixture-offer/manage",
    "offer:fixture-offer:fixture-owner",
    "source:fixture-offer:fixture-owner",
  ]);
  await assert.rejects(renderFixture("draft", { missing: true }), /NOT_FOUND/);
});

test("editor retains every field, value binding, required field, and submit intent", async () => {
  const { nodes } = await renderFixture("draft");
  const form = nodes.find((node) => node.tag === "form" && node.props.action === "/fixture/update");
  assert.ok(form);
  const fields = all(form).filter((node) => ["input", "textarea"].includes(node.tag));
  assert.deepEqual(fields.map((node) => node.props.name).sort(), [
    "offer_id", "return_to", "offered_cause", "requested_cause", "proposed_action",
    "requested_action", "no_trade_baseline", "duration", "start_date", "evidence_due_date",
    "evidence_rule", "maximum_burden", "exit_conditions", "privacy_scope", "notes",
    "voluntary_certification",
  ].sort());
  assert.equal(fields.filter((node) => node.props.required === true).length, 10);
  assert.ok(fields.filter((node) => node.props.required).every((node) => node.props.defaultValue));
  assert.deepEqual(all(form).filter((node) => node.tag === "legend").map(text), [
    "Commitments", "Timing and evidence", "Limits and privacy",
  ]);
  assert.deepEqual(all(form).filter((node) => node.tag === "button").map((node) => [node.props.name, node.props.value]), [
    ["intent", "draft"], ["intent", "submit"],
  ]);
  assert.equal(all(form).filter((node) => node.tag === "details").length, 0, "No required or safety fields are collapsed");
});

test("history and lifecycle are native, initially closed disclosures after primary editing", async () => {
  const { nodes } = await renderFixture("draft");
  const history = nodes.find((node) => node.tag === "details" && node.props.className === "history");
  const lifecycle = nodes.find((node) => node.tag === "details" && node.props.className === "lifecycle");
  assert.ok(history);
  assert.ok(lifecycle);
  assert.ok(!history.props.open && !lifecycle.props.open);
  assert.match(text(history), /SubmittedNot setPublishedNot set/);
  assert.ok(nodes.indexOf(lifecycle) > nodes.findIndex((node) => node.props.className === "formFooter"));
  assert.match(text(lifecycle), /Closing is permanent/);
  assert.equal(all(lifecycle).filter((node) => node.props.name === "lifecycle_action").length, 2);
});

for (const state of ["draft", "changes_requested", "rejected", "paused", "pending_review", "published", "closed", "deleted"]) {
  test(`layout preserves ${state} action eligibility`, async () => {
    const { nodes, calls } = await renderFixture(state);
    const editable = ["draft", "changes_requested", "rejected", "paused"].includes(state);
    assert.equal(nodes.some((node) => node.props.action === "/fixture/update"), editable);
    assert.equal(nodes.some((node) => node.props.href === "/trades/fixture-offer/invite"), state === "published");
    assert.equal(calls.includes("matches"), state === "published");
    assert.equal(nodes.some((node) => node.props.value === "pause"), state === "published");
    assert.equal(nodes.some((node) => node.props.value === "delete"), editable);
    assert.equal(nodes.some((node) => node.props.value === "close"), !["closed", "deleted"].includes(state));
    assert.equal(nodes.filter((node) => node.tag === "h1").length, 1);
  });
}

test("stale-source warning and moderation remain visible, and stale resubmission stays disabled", async () => {
  const { nodes } = await renderFixture("changes_requested", { sourceCurrent: false });
  const sourceSection = nodes.find((node) => node.props["aria-labelledby"] === "source-bound-heading");
  assert.ok(sourceSection);
  assert.match(text(sourceSection), /No invitation, thread,/);
  assert.match(text(sourceSection), /cannot be resubmitted from the stale source revision/);
  assert.equal(all(sourceSection).filter((node) => node.tag === "details").length, 0);
  const submit = nodes.find((node) => node.tag === "button" && node.props.value === "submit");
  const save = nodes.find((node) => node.tag === "button" && node.props.value === "draft");
  assert.equal(submit?.props.disabled, true);
  assert.equal(save?.props.disabled, false);
  assert.ok(nodes.some((node) => node.tag === "p" && text(node).includes("Clarify the evidence due date.")));
});

test("published empty-state and form-error feedback remain explicit", async () => {
  const empty = await renderFixture("published", { noMatches: true });
  assert.match(text(empty.tree), /No exact reciprocal match yet/);
  assert.equal(empty.nodes.filter((node) => node.props.action === "/fixture/match").length, 0);
  const error = await renderFixture("draft", { error: true });
  assert.ok(error.nodes.some((node) => node.props.role === "alert"));
});

test("layout styles are route-scoped and reflow without hiding controls", () => {
  assert.match(source, /import styles from "\.\/manage-offer\.module\.css"/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /@media \(max-width: 480px\)/);
  assert.match(css, /repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.doesNotMatch(css, /display:\s*none|overflow(?:-x)?:\s*hidden/);
});

// Also usable by an isolated, read-only browser harness; these are synthetic
// records and inert action URLs, never production account data.
export { renderFixture, all, text };
