import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { getLegacyDashboardTarget, readDashboardView } from "./dashboard-view";

test("Dashboard defaults to priorities and controls require an explicit selection", () => {
  for (const value of [undefined, "", "priorities", "unknown", "currency", ["priorities", "controls"]]) {
    assert.equal(readDashboardView(value), "priorities");
  }
  assert.equal(readDashboardView("controls"), "controls");
  assert.equal(readDashboardView(["controls"]), "controls");
});

test("legacy control links preserve messages without redirecting ordinary priority fragments", () => {
  assert.equal(getLegacyDashboardTarget("?message=Saved", "#privacy-controls"), "/dashboard?message=Saved&view=controls#privacy-controls");
  assert.equal(getLegacyDashboardTarget("", "#payment-setup"), "/dashboard?view=controls#payment-setup");
  for (const hash of ["", "#main-content", "#profile-priorities-heading", "#https://example.org"]) {
    assert.equal(getLegacyDashboardTarget("", hash), null);
  }
  assert.equal(getLegacyDashboardTarget("?view=controls", "#privacy-controls"), null);
});

test("actual default page returns the shared editor before any controls loader or feature checks", async () => {
  const source = readFileSync("src/app/dashboard/page.tsx", "utf8");
  const parsed = ts.createSourceFile("page.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declaration = parsed.statements.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === "DashboardPage");
  assert.ok(declaration);
  const executable = ts.transpileModule(declaration.getText(parsed), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React },
  }).outputText;
  const exported: { default?: (props: unknown) => Promise<{ type: unknown; props: { dashboard: boolean } }> } = {};
  const sharedEditor = Symbol("shared-priorities-editor");
  vm.runInNewContext(executable, {
    exports: exported, readDashboardView, ProfilePrioritiesView: sharedEditor,
    React: { createElement: (type: unknown, props: unknown) => ({ type, props }) },
    // Any attempted controls initialization is a regression, even before data fetching.
    getFormMessage: () => { throw new Error("Controls initialized on the default view"); },
  });
  assert.ok(exported.default);
  for (const params of [{}, { view: "unknown" }, { message: "Priorities saved" }]) {
    const result = await exported.default({ searchParams: Promise.resolve(params) });
    assert.equal(result.type, sharedEditor);
    assert.equal(result.props.dashboard, true);
  }
});

test("both priority routes share account-bound reads and the existing save action", () => {
  const route = readFileSync("src/app/profile/priorities/page.tsx", "utf8");
  const view = readFileSync("src/components/profile/profile-priorities-view.tsx", "utf8");
  const editor = readFileSync("src/components/profile/profile-priority-editor.tsx", "utf8");
  assert.match(route, /ProfilePrioritiesView/);
  assert.match(view, /\.eq\("profile_id", viewer\.authUser\.id\)/);
  assert.match(view, /!loadError \? \(/);
  assert.match(view, /dashboard \? "\/dashboard"/);
  assert.match(editor, /action=\{saveProfilePrioritySearchAction\}/);
  assert.match(editor, /name="return_to"[^
]*returnPath/);
  assert.match(editor, /name="success_to"[^
]*returnTo/);
});

test("currency is a disclosure, controls do not prefetch, and control forms keep their return view", () => {
  const tools = readFileSync("src/components/dashboard/dashboard-tools.tsx", "utf8");
  assert.match(tools, /<summary>Currency<\/summary>/);
  assert.match(tools, /account-wide currency selector is not available/);
  for (const link of tools.matchAll(/<Link[^>]+>/g)) assert.match(link[0], /prefetch=\{false\}/);
  assert.doesNotMatch(tools, /createClient|fetch\(|localStorage|sessionStorage/);
  const page = readFileSync("src/app/dashboard/page.tsx", "utf8");
  assert.doesNotMatch(page, /name="return_to"[^
]*value="\/dashboard(?:"|#)/);
  assert.match(page, /value="\/dashboard\?view=controls"/);
});
