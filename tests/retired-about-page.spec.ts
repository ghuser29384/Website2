import { expect, test } from "@playwright/test";

// Use the configured application server, not a synthetic redirect handler.
for (const route of ["/about", "/about?from=old-link"]) {
  test(`retired ${route} redirects directly to Feed`, async ({ request, baseURL }) => {
    expect(baseURL).toBeTruthy();
    const response = await request.get(route, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    const destination = new URL(response.headers().location, baseURL);
    expect(destination.pathname).toBe("/feed");
    expect(destination.origin).toBe(new URL(baseURL!).origin);
    expect(destination.search).toBe("");
    expect(await response.text()).not.toContain("A service for cooperation across moral disagreement.");
  });
}

test("retired About is no longer advertised in the sitemap", async ({ request }) => {
  const response = await request.get("/sitemap.xml");
  expect(response.ok()).toBeTruthy();
  const xml = await response.text();
  expect(xml).not.toMatch(/<loc>https?:\/\/[^/<]+\/about\/?<\/loc>/);
  expect(xml).toContain("/mpgf/about</loc>");
  expect(xml).toContain("/safety</loc>");
});
