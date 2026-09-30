import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { FOOTER_LINK_GROUPS, getPrimaryNavLinks, getTopbarActions } from "./site";
import { HEADER_UTILITY_LINKS, REFINED_HEADER_LINKS, usesDefaultHeader } from "./refined-header";

interface Node { type: string; props: Record<string, unknown> }
type Component = (props: Record<string, unknown>) => Node;
function nodes(root: unknown): Node[] {
  if (Array.isArray(root)) return root.flatMap(nodes);
  if (!root || typeof root !== "object" || !("props" in root)) return [];
  const node = root as Node;
  return [node, ...nodes(node.props.children)];
}
function text(root: unknown): string {
  if (Array.isArray(root)) return root.map(text).join(" ");
  if (typeof root === "string") return root;
  if (root && typeof root === "object" && "props" in root) return text((root as Node).props.children);
  return "";
}
// Execute actual TSX with inert framework/auth dependencies. This is not an authenticated backend test.
function render(authenticated: boolean, overrides = {}) {
  let id = 0;
  const calls: string[] = [];
  const pending: Promise<unknown>[] = [];
  const jsx = (type: string | Component, props: Record<string, unknown>): Node =>
    typeof type === "function" ? type(props) : { type, props };
  const modules: Record<string, unknown> = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    react: { Fragment: "fragment", useId: () => `field-${++id}`,
      useState: (value: unknown) => [value, () => undefined],
      useTransition: () => [false, (fn: () => Promise<unknown>) => pending.push(fn())] },
    "next/link": (props: Record<string, unknown>) => jsx("a", props),
    "next/navigation": { usePathname: () => "/feed", useRouter: () => ({
      push: (href: string) => calls.push(href), refresh: () => calls.push("refresh"),
    }) },
    "@/components/brand/moral-trade-wordmark": { MoralTradeWordmark: () => jsx("span", { children: "Moral Trade" }) },
    "@/lib/supabase/browser": { createClient: () => ({ auth: { signOut: async () => { calls.push("signOut"); } } }) },
    "@/lib/refined-header": { HEADER_UTILITY_LINKS, REFINED_HEADER_LINKS, usesDefaultHeader },
    "@/components/layout/evidence-nav-gate": { EvidenceNavGate: (props: Record<string, unknown>) => jsx("fragment", props) },
  };
  const output = ts.transpileModule(readFileSync("src/components/layout/site-topbar.tsx", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, reportDiagnostics: true,
  });
  assert.equal(output.diagnostics?.length, 0);
  const exports: Record<string, Component> = {};
  vm.runInNewContext(output.outputText, { exports, require: (name: string) => {
    assert.ok(Object.hasOwn(modules, name), `Unexpected import: ${name}`); return modules[name];
  } });
  return { calls, pending, root: exports.SiteTopbar({ brandHref: "/",
    links: getPrimaryNavLinks(authenticated), ...getTopbarActions(authenticated),
    showLogout: authenticated, ...overrides,
  }) };
}

test("the selected four links are shared without losing secondary account access", () => {
  const expected = ["Feed", "Discover", "Messages", "Commitments"];
  for (const auth of [false, true]) {
    assert.deepEqual(getPrimaryNavLinks(auth).map((link) => link.label), expected);
    assert.ok(usesDefaultHeader(getPrimaryNavLinks(auth)));
  }
  assert.deepEqual(REFINED_HEADER_LINKS.map((link) => link.label), expected);
  for (const href of ["/dashboard", "/trades/new", "/cart", "/invite", "/evidence", "/walkthrough", "/safety"]) {
    assert.ok(HEADER_UTILITY_LINKS.some((link) => link.href === href));
  }
});

for (const authenticated of [false, true]) {
  test(`actual header keeps one Create entry and a More disclosure (signed in: ${authenticated})`, () => {
    const all = nodes(render(authenticated).root);
    assert.equal(all.filter((node) => node.type === "a" && node.props.href === "/cart").length, 1);
    assert.doesNotMatch(text(render(authenticated).root), /Favourites/);
    assert.equal(all.filter((node) => node.type === "a" && node.props.href === "/trades/new").length, 1);
    assert.equal(all.filter((node) => node.type === "summary" && text(node).includes("More")).length, 1);
    const more = all.find((node) => node.type === "details" && text(node).includes("More"))!;
    assert.ok(nodes(more).some((node) => node.type === "a" && node.props.href === "/evidence"));
    assert.ok(nodes(more).some((node) => node.type === "a" && node.props.href === "/walkthrough"));
    assert.equal(all.filter((node) => node.type === "a" && node.props.href === "/start").length, authenticated ? 0 : 1);
  });
}

test("the actual header submits a labelled native offer search", () => {
  const all = nodes(render(false).root);
  const form = all.find((node) => node.type === "form")!;
  assert.equal(form.props.action, "/offers");
  assert.equal(form.props.method, "get");
  assert.equal(form.props.onSubmit, undefined);
  const input = nodes(form).find((node) => node.type === "input")!;
  assert.equal(input.props.name, "search");
  assert.ok(all.some((node) => node.type === "label" && node.props.htmlFor === input.props.id));
  assert.equal(nodes(render(false, { showSearch: false }).root).filter((node) => node.type === "form").length, 0);
});

test("shortened account copy keeps the existing logout sequence and data links", async () => {
  const { root, calls, pending } = render(true);
  const all = nodes(root);
  for (const href of ["/dashboard?view=controls#my-trades", "/dashboard?view=controls#data-portability", "/cart"]) {
    assert.ok(all.some((node) => node.type === "a" && node.props.href === href));
  }
  assert.doesNotMatch(text(root), /Review owned and engaged offers|Export or import account data|Manage your saved and private workspace/);
  const logout = all.find((node) => node.type === "button" && text(node) === "Log out")!;
  (logout.props.onClick as () => void)();
  await Promise.all(pending);
  assert.deepEqual(calls, ["signOut", "/", "refresh"]);
});

test("footer has the approved fifteen links and retains all capability disclosures", () => {
  assert.equal(FOOTER_LINK_GROUPS.flatMap((group) => group.links).length, 15);
  const links = FOOTER_LINK_GROUPS.flatMap((group) => group.links.map((link) => link.href));
  for (const href of ["/bottleneck-atlas", "/reasoning-center", "/trade-controls", "/priority-correction-fund"]) assert.ok(!links.includes(href));
  const footer = readFileSync("src/components/layout/site-footer.tsx", "utf8");
  assert.match(footer, /Offer an action in exchange for an action you value/);
  assert.match(footer, /Moral Trade does not provide legal, tax, investment, or blanket impact certification/);
  assert.match(footer, /Payment, custody, authorization, settlement, and refund capabilities/);
  for (const href of ["/privacy", "/terms", "/accessibility", "/contact"]) assert.ok(footer.includes(`href="${href}"`));
});

test("only the automatic query interception is retired from the root layout", () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  assert.doesNotMatch(layout, /SmartQueryAutoEnhancer/);
  assert.equal(existsSync("src/components/search/smart-query-auto-enhancer.tsx"), false);
  for (const marker of ["FunnelTracker", "RecommendationLearningTracker", "moral-trade-refined-header.css", "moral-trade-input-assist.js", "moral-trade-live-feed-diagnostics.js"]) assert.ok(layout.includes(marker));
  assert.doesNotMatch(readFileSync("src/components/layout/site-topbar.tsx", "utf8"), /api\/query\/interpret|runSmartSearch/);
});
