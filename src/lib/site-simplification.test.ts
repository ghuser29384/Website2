import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

import { FOOTER_LINK_GROUPS, getPrimaryNavLinks, getTopbarActions } from "./site.ts";

// Execute the actual TSX with inert dependencies. These tests do not claim
// React hydration, a running Next.js route, or authenticated backend coverage.
interface ElementNode {
  type: string;
  props: Record<string, unknown>;
}
type Component = (props: Record<string, unknown>) => ElementNode;
const source = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");

function loadComponent(file: string, pathname = "/feed") {
  const calls: unknown[] = [];
  const pending: Promise<unknown>[] = [];
  let nextId = 0;
  const jsx = (type: string | Component, props: Record<string, unknown>): ElementNode =>
    typeof type === "function" ? type(props) : { type, props };
  const modules: Record<string, unknown> = {
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    react: {
      Fragment: "fragment",
      useId: () => `test-${++nextId}`,
      useState: (value: unknown) => [value, (update: unknown) => {
        value = typeof update === "function" ? update(value) : update;
        calls.push({ state: value });
      }],
      useTransition: () => [false, (fn: () => Promise<unknown>) => pending.push(fn())],
    },
    "next/link": (props: Record<string, unknown>) => jsx("a", props),
    "next/navigation": {
      usePathname: () => pathname,
      useRouter: () => ({ push: (to: string) => calls.push(to), refresh: () => calls.push("refresh") }),
    },
    "@/components/brand/moral-trade-wordmark": {
      MoralTradeWordmark: () => jsx("span", { children: "Moral Trade" }),
      MutualStepMark: () => jsx("span", { "aria-hidden": true }),
    },
    "@/lib/supabase/browser": {
      createClient: () => ({ auth: { signOut: async () => { calls.push("signOut"); } } }),
    },
    "@/lib/site": { FOOTER_LINK_GROUPS },
  };
  const compiled = ts.transpileModule(source(file), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  assert.equal(compiled.diagnostics?.length, 0);
  const exports: Record<string, Component> = {};
  vm.runInNewContext(compiled.outputText, {
    exports,
    require: (name: string) => {
      assert.ok(Object.hasOwn(modules, name), `Unexpected dependency: ${name}`);
      return modules[name];
    },
  }, { filename: file });
  return { exports, calls, pending };
}

function elements(root: unknown): ElementNode[] {
  if (Array.isArray(root)) return root.flatMap(elements);
  if (!root || typeof root !== "object" || !("props" in root)) return [];
  const node = root as ElementNode;
  return [node, ...elements(node.props.children)];
}
function text(root: unknown): string {
  if (Array.isArray(root)) return root.map(text).join(" ");
  if (typeof root === "string" || typeof root === "number") return String(root);
  if (!root || typeof root !== "object" || !("props" in root)) return "";
  return text((root as ElementNode).props.children);
}
const topbarFile = "src/components/layout/site-topbar.tsx";
const footerFile = "src/components/layout/site-footer.tsx";
function renderTopbar(authenticated: boolean, overrides = {}, pathname = "/feed") {
  const loaded = loadComponent(topbarFile, pathname);
  return {
    ...loaded,
    root: loaded.exports.SiteTopbar({
      brandHref: "/", links: getPrimaryNavLinks(authenticated),
      ...getTopbarActions(authenticated), showLogout: authenticated, ...overrides,
    }),
  };
}

for (const authenticated of [false, true]) {
  test(`navigation preserves routes without duplicate Create (signed in: ${authenticated})`, () => {
    const links = getPrimaryNavLinks(authenticated);
    assert.deepEqual(links.filter((link) => link.href).map((link) => link.href),
      ["/feed", "/discover", "/messages", "/commitments"]);
    const routes = links.flatMap((link) => link.items?.map((item) => item.href) ?? [link.href]);
    routes.push(getTopbarActions(authenticated).primaryAction.href);
    for (const href of ["/invite", "/evidence", "/safety", "/trades/new"]) assert.ok(routes.includes(href));
    assert.equal(routes.filter((href) => href === "/trades/new").length, 1);
    const rendered = elements(renderTopbar(authenticated).root);
    assert.equal(rendered.filter((node) => node.type === "a" && node.props.href === "/trades/new").length, 1);
  });
}

test("search is a native GET with a labelled field and no clarification detour", () => {
  const nodes = elements(renderTopbar(false).root);
  const form = nodes.find((node) => node.type === "form")!;
  assert.equal(form.props.action, "/offers");
  assert.equal(form.props.method, "get");
  assert.equal(form.props.onSubmit, undefined);
  const box = elements(form).find((node) => node.props.className === "topbar-search-box")!;
  assert.equal((box.props.style as Record<string, string>).gridTemplateColumns, "minmax(0, 1fr) auto");
  const input = elements(form).find((node) => node.type === "input")!;
  assert.equal(input.props.name, "search");
  assert.equal(input.props.type, "search");
  assert.ok(nodes.some((node) => node.type === "label" && node.props.htmlFor === input.props.id));
  assert.ok(elements(form).some((node) => node.type === "button" && node.props.type === "submit"));
  assert.doesNotMatch(source(topbarFile), /api\/query\/interpret|runSmartSearch|role="combobox"/);
});

test("search can still be disabled on pages with their own controls", () => {
  const { root } = renderTopbar(false, { showSearch: false });
  assert.equal(elements(root).filter((node) => node.type === "form").length, 0);
});

test("signed-out navigation retains sign-in and onboarding", () => {
  const nodes = elements(renderTopbar(false).root);
  for (const href of ["/login", "/start"]) {
    assert.ok(nodes.some((node) => node.type === "a" && node.props.href === href));
  }
  assert.ok(!nodes.some((node) => node.type === "button" && text(node) === "Log out"));
});

test("account routes and the existing logout call sequence are preserved", async () => {
  const { root, calls, pending } = renderTopbar(true, { logoutRedirectTo: "/login" });
  const nodes = elements(root);
  for (const href of ["/dashboard#my-trades", "/dashboard#data-portability", "/cart"]) {
    assert.ok(nodes.some((node) => node.type === "a" && node.props.href === href));
  }
  const logout = nodes.find((node) => node.type === "button" && text(node) === "Log out")!;
  (logout.props.onClick as () => void)();
  await Promise.all(pending);
  assert.deepEqual(calls, ["signOut", "/login", "refresh"]);
});

test("a page-supplied primary action is not repeated in the link row", () => {
  const { root } = renderTopbar(true, { links: [{ href: "/trades/new", label: "Create" }] });
  assert.equal(elements(root).filter((node) => node.props.href === "/trades/new").length, 1);
});

test("active routes remain indicated inside the More disclosure", () => {
  const nodes = elements(renderTopbar(true, {}, "/evidence").root);
  const link = nodes.find((node) => node.type === "a" && node.props.href === "/evidence")!;
  assert.equal(link.props["aria-current"], "page");
  assert.ok(nodes.some((node) => node.type === "details" && String(node.props.className).includes("is-active")));
});

test("menus keep native summaries, open/close state, and Escape focus return", () => {
  const { root, calls } = renderTopbar(true);
  const menu = elements(root).find((node) => node.type === "details")!;
  assert.equal(menu.props.open, false);
  assert.equal(elements(menu).filter((node) => node.type === "summary").length, 1);
  (menu.props.onToggle as (event: unknown) => void)({ currentTarget: { open: true } });
  let focused = false;
  (menu.props.onKeyDown as (event: unknown) => void)({
    key: "Escape", currentTarget: { querySelector: () => ({ focus: () => { focused = true; } }) },
  });
  assert.equal(focused, true);
  assert.deepEqual(calls, [{ state: "primary-More" }, { state: null }]);
});

test("footer removes promotional repetition without removing disclosures or essential links", () => {
  const { exports } = loadComponent(footerFile);
  const root = exports.SiteFooter({});
  const nodes = elements(root);
  const hrefs = nodes.filter((node) => node.type === "a").map((node) => node.props.href);
  for (const href of ["/privacy", "/terms", "/accessibility", "/contact", "/safety", "/status", "/evidence"]) {
    assert.ok(hrefs.includes(href));
  }
  for (const href of ["/bottleneck-atlas", "/reasoning-center", "/trade-controls", "/priority-correction-fund"]) {
    assert.ok(!hrefs.includes(href));
  }
  assert.match(text(root), /does not provide legal, tax, investment, or blanket impact certification/);
  assert.match(text(root), /Payment, custody, authorization, settlement, and refund/);
  assert.doesNotMatch(text(root), /Research supports the mechanism|coordination infrastructure/);
  assert.equal(FOOTER_LINK_GROUPS.flatMap((group) => group.links).length, 15);
});

test("the automatic form interceptor is retired, not tracking or diagnostic safeguards", () => {
  const layout = source("src/app/layout.tsx");
  assert.doesNotMatch(layout, /SmartQueryAutoEnhancer|smart-query-auto-enhancer/);
  assert.equal(existsSync("src/components/search/smart-query-auto-enhancer.tsx"), false);
  for (const name of ["FunnelTracker", "RecommendationLearningTracker", "moral-trade-live-feed-diagnostics.js",
    "moral-trade-live-learning-diagnostics.js", "moral-trade-input-assist.js"]) assert.ok(layout.includes(name));
});
