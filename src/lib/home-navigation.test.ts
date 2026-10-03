import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import NextLink from "next/link";
import ts from "typescript";

import { SiteLink } from "../components/layout/site-link";

for (const href of ["/", "/?filter=one&filter=two", "/#main-content", "/?from=contact#main-content"]) {
  test(`homepage ${href} is a document link, even when prefetch was requested`, () => {
    const onClick = () => undefined;
    const ref = { current: null };
    const link = SiteLink({ href, children: "Home", prefetch: true,
      className: "brand", "aria-label": "Moral Trade, home", onClick, ref,
      target: "_blank", rel: "noopener" });
    assert.equal(link.type, "a");
    assert.deepEqual(link.props, { href, children: "Home", className: "brand",
      "aria-label": "Moral Trade, home", onClick, ref, target: "_blank", rel: "noopener" });
  });
}

for (const href of ["/dashboard", "/profile", "/dashboard?view=controls#privacy-controls", "/discover", "/feed", "/login", "#details", "https://example.invalid/"]) {
  test(`${href} retains Next.js transport and explicit prefetch settings`, () => {
    for (const prefetch of [undefined, false, true] as const) {
      const link = SiteLink({ href, children: "Continue", prefetch });
      assert.equal(link.type, NextLink);
      assert.equal(link.props.href, href);
      assert.equal(link.props.prefetch, prefetch);
    }
  });
}

test("literal homepage links cannot reintroduce a next/link RSC request", () => {
  const violations: string[] = [];
  function inspect(directory: string) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) { inspect(path); continue; }
      if (!path.endsWith(".tsx")) continue;
      const file = ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
      const routerLinks = new Set<string>();
      for (const statement of file.statements) {
        if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)
          && statement.moduleSpecifier.text === "next/link" && statement.importClause?.name) {
          routerLinks.add(statement.importClause.name.text);
        }
      }
      function visit(node: ts.Node) {
        if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && routerLinks.has(node.tagName.getText(file))) {
          for (const attribute of node.attributes.properties) {
            if (!ts.isJsxAttribute(attribute) || attribute.name.getText(file) !== "href") continue;
            const value = attribute.initializer;
            const literal = value && ts.isJsxExpression(value) ? value.expression : value;
            if (literal && (ts.isStringLiteral(literal) || ts.isNoSubstitutionTemplateLiteral(literal)) && /^\/(?:[?#]|$)/.test(literal.text)) {
              violations.push(`${path}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}`);
            }
          }
        }
        ts.forEachChild(node, visit);
      }
      visit(file);
    }
  }
  inspect(join(process.cwd(), "src"));
  assert.deepEqual(violations, []);
});
