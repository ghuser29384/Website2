import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { JsxEmit, ModuleKind, ScriptTarget, transpileModule } from "typescript";

type Node = { type: unknown; props: Record<string, unknown> };
function loadBoundary() {
  const source = readFileSync("src/app/commitments/loading.tsx", "utf8");
  const { outputText } = transpileModule(source, {
    compilerOptions: { esModuleInterop: true, jsx: JsxEmit.ReactJSX, module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
    fileName: "loading.tsx",
  });
  const jsx = (type: unknown, props: Record<string, unknown>): Node => ({ type, props });
  const compiledModule = { exports: {} };
  const dependencies: Record<string, unknown> = {
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/link": { __esModule: true, default: "a" },
    "./loading.module.css": { __esModule: true, default: new Proxy({}, { get: (_, key) => String(key) }) },
  };
  new Function("require", "module", "exports", outputText)((name: string) => {
    assert.ok(Object.hasOwn(dependencies, name), `loading boundary must not import data: ${name}`);
    return dependencies[name];
  }, compiledModule, compiledModule.exports);
  return (compiledModule.exports as { default: () => Node }).default();
}

function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  if (!value || typeof value !== "object" || !("props" in value)) return [];
  const node = value as Node;
  return [node, ...nodes(node.props.children)];
}

function text(value: unknown): string {
  if (Array.isArray(value)) return value.map(text).join(" ");
  if (value && typeof value === "object" && "props" in value) return text((value as Node).props.children);
  return typeof value === "string" ? value : "";
}

test("loading boundary renders synchronously without any auth or portfolio dependency", () => {
  const tree = loadBoundary();
  assert.equal("then" in tree, false);
  assert.equal(nodes(tree).filter((node) => node.type === "main").length, 1);
  assert.ok(nodes(tree).some((node) => node.props.id === "main-content"));
});

test("loading boundary announces loading rather than inventing financial data", () => {
  const tree = loadBoundary();
  const status = nodes(tree).filter((node) => node.props.role === "status");
  assert.equal(status.length, 1);
  assert.match(text(status[0]), /Loading your commitments/);
  assert.equal(nodes(tree).filter((node) => node.props["aria-hidden"] === "true").length, 1);
  assert.doesNotMatch(text(tree), /\$|\b0\b|No commitments|Sign in|Sign out/);
});

test("loading navigation remains usable without triggering automatic prefetch requests", () => {
  const links = nodes(loadBoundary()).filter((node) => node.type === "a");
  assert.deepEqual(links.map((node) => node.props.href), ["/", "/discover"]);
  assert.ok(links.every((node) => node.props.prefetch === false));
  const css = readFileSync("src/app/commitments/loading.module.css", "utf8");
  assert.match(css, /@media \(max-width: 640px\)/);
  assert.doesNotMatch(css, /animation\s*:/);
});

test("private portfolio views use native document links without speculative reads", () => {
  const page = readFileSync("src/app/commitments/page.tsx", "utf8");
  const controls = page.match(/<CommitmentsDocumentLink\b[^>]*aria-current=[^>]*>/g) ?? [];
  assert.equal(controls.length, 4, "tabs, grouping, and both calendar scopes are covered");
  assert.ok(page.includes('<CommitmentsDocumentLink href="/commitments?tab=ledger">View all'));
  assert.doesNotMatch(page, /<Link\b[^>]*aria-current=/);

  const source = readFileSync("src/components/commitments/commitments-document-link.tsx", "utf8");
  const { outputText } = transpileModule(source, {
    compilerOptions: { jsx: JsxEmit.ReactJSX, module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
    fileName: "commitments-document-link.tsx",
  });
  const jsx = (type: unknown, props: Record<string, unknown>): Node => ({ type, props });
  const compiledModule = { exports: {} };
  new Function("require", "module", "exports", outputText)((name: string) => {
    assert.equal(name, "react/jsx-runtime", "document links need no router or data dependency");
    return { jsx, jsxs: jsx };
  }, compiledModule, compiledModule.exports);
  const { CommitmentsDocumentLink } = compiledModule.exports as {
    CommitmentsDocumentLink: (props: { href: string; children: string; "aria-current"?: "page" }) => Node;
  };
  const selected = CommitmentsDocumentLink({ href: "/commitments?tab=ledger", children: "Ledger", "aria-current": "page" });
  assert.equal(selected.type, "a");
  assert.deepEqual(selected.props, { href: "/commitments?tab=ledger", children: "Ledger", "aria-current": "page" });
  const unselected = CommitmentsDocumentLink({ href: "/commitments", children: "Portfolio" });
  assert.equal(unselected.type, "a");
  assert.equal(unselected.props["aria-current"], undefined);
  assert.equal(unselected.props.onClick, undefined);
  assert.equal(unselected.props.prefetch, undefined);
});
