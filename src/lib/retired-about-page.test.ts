import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";

import ts from "typescript";

const source = (file: string) => readFileSync(path.join(process.cwd(), file), "utf8");
const aboutPath = "src/app/about/page.tsx";
const labsPath = "src/app/labs/moral-public-goods/[poolSlug]/page.tsx";

// Execute the actual route/sitemap code with inert imports, never live services.
// HTTP redirect behavior is covered separately by the Playwright route test.
function loadModule(file: string, imports: Record<string, unknown>) {
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
  const exports: Record<string, unknown> = {};
  vm.runInNewContext(compiled.outputText, {
    exports,
    require: (name: string) => {
      assert.ok(Object.hasOwn(imports, name), `Unexpected dependency: ${name}`);
      return imports[name];
    },
  }, { filename: file });
  return exports;
}

test("retired About immediately redirects to Feed without rendering or reading an account", () => {
  const redirect = new Error("redirect sentinel");
  const destinations: string[] = [];
  const loaded = loadModule(aboutPath, {
    "next/navigation": {
      permanentRedirect: (destination: string) => {
        destinations.push(destination);
        throw redirect;
      },
    },
  });
  assert.throws(() => (loaded.default as () => never)(), (error) => error === redirect);
  assert.deepEqual(destinations, ["/feed"]);
  assert.deepEqual(Object.keys(loaded), ["default"]);
});

test("the About hero, explanatory cards, and replacement page UI are absent", () => {
  const file = ts.createSourceFile(aboutPath, source(aboutPath), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let jsxCount = 0;
  const visit = (node: ts.Node) => {
    if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node) || ts.isJsxFragment(node)) jsxCount++;
    ts.forEachChild(node, visit);
  };
  visit(file);
  assert.equal(jsxCount, 0);
  assert.doesNotMatch(source(aboutPath), /aboutCards|hero-text|About Moral Trade|getViewer/);
});

for (const unavailable of [false, true]) {
  test(`sitemap omits About and preserves other routes (data unavailable: ${unavailable})`, async () => {
    const loaded = loadModule("src/app/sitemap.ts", {
      "@/lib/seo": {
        getAbsoluteUrl: (route: string) => `https://example.test${route}`,
        getPublicSitemapEntries: async () => {
          if (unavailable) throw new Error("unavailable fixture");
          return {
            offers: [{ id: "fixture-offer", created_at: "2026-01-01", updated_at: null }],
            profiles: [{ id: "fixture-profile", created_at: "2026-01-01" }],
          };
        },
      },
      "@/lib/growth": { PARTNER_COHORTS: [{ slug: "fixture-partner" }] },
      "@/lib/seed-data": { CANONICAL_WORKED_CASE_OFFERS: [{ id: "fixture-example" }] },
    });
    const entries = await (loaded.default as () => Promise<Array<{ url: string }>>)();
    const urls = new Set(entries.map((entry) => new URL(entry.url).pathname));
    assert.equal(urls.has("/about"), false);
    for (const route of ["/", "/safety", "/contact", "/team-and-governance", "/transparency",
      "/mpgf/about", "/cohort/fixture-partner", "/offers/examples/fixture-example"]) {
      assert.ok(urls.has(route), `Missing preserved route: ${route}`);
    }
    assert.equal(urls.has("/offers/fixture-offer"), !unavailable);
    assert.equal(urls.has("/people/fixture-profile"), !unavailable);
  });
}

test("Labs navigation drops the About detour without deleting the mechanism or safety text", () => {
  const labs = source(labsPath);
  const nav = labs.match(/const labsTopbarLinks = \[([\s\S]*?)\] as const;/)?.[1];
  assert.ok(nav);
  assert.doesNotMatch(nav, /["']\/about["']/);
  for (const target of ["/offers", "MORAL_PUBLIC_GOODS_LABS_ROUTE", "/dashboard", "/how-it-works"]) {
    assert.ok(nav.includes(target));
  }
  for (const disclosure of ["Real-money use is disabled", "does not create commitments", "/terms", "/privacy"]) {
    assert.ok(labs.includes(disclosure));
  }
});
