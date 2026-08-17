import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const appDataSource = readFileSync("src/lib/app-data.ts", "utf8");
const serverClientSource = readFileSync("src/lib/supabase/server.ts", "utf8");
const tradeDraftWorkbenchSource = readFileSync(
  "src/components/core-trade/trade-draft-workbench.tsx",
  "utf8",
);
const marketplaceComponentsSource = readFileSync(
  "src/components/marketplace/marketplace-components.tsx",
  "utf8",
);
const profilePageSource = readFileSync("src/app/profile/page.tsx", "utf8");

test("getViewer request-scopes one lazy bounded verifier", () => {
  assert.match(
    appDataSource,
    /resolveAuthenticatedUser\(\s*\{ getUser: \(\) => supabase\.auth\.getUser\(\) \}/u,
  );
  assert.match(appDataSource, /export const getViewer = cache\(resolveViewer\);/u);
  assert.doesNotMatch(appDataSource, /resolveAuthUserWithDeadline/u);
});

test("getViewer preserves active-session and authentic full-user authorization semantics", () => {
  assert.match(
    appDataSource,
    /claimsPolicy: \{ mode: "disabled", reason: "active_session_required" \}/u,
  );
  assert.match(appDataSource, /if \(!authResult\.ok\) \{\s*return null;\s*\}/u);
  assert.match(appDataSource, /const user = authResult\.user;/u);
});

test("getViewer no longer sends raw authentication failures to generic logging", () => {
  const getViewerStart = appDataSource.indexOf("async function resolveViewer()");
  const nextFunction = appDataSource.indexOf("\nfunction ", getViewerStart);
  const getViewerSource = appDataSource.slice(getViewerStart, nextFunction);

  assert.ok(getViewerStart >= 0 && nextFunction > getViewerStart);
  assert.doesNotMatch(getViewerSource, /logSupabaseError/u);
  assert.doesNotMatch(getViewerSource, /authError/u);
});

test("viewer bootstrap diagnostics do not attach stable user identifiers or email", () => {
  const ensureProfileStart = appDataSource.indexOf("async function ensureUserProfile(");
  const ensureProfileEnd = appDataSource.indexOf("\nexport async function ensureProfileForUser", ensureProfileStart);
  const bootstrapSource = appDataSource.slice(ensureProfileStart, ensureProfileEnd);

  assert.ok(ensureProfileStart >= 0 && ensureProfileEnd > ensureProfileStart);
  assert.doesNotMatch(bootstrapSource, /logSupabaseError\([^;]+userId/u);
  assert.doesNotMatch(bootstrapSource, /console\.error\([^;]+userId/u);
  assert.doesNotMatch(bootstrapSource, /logSupabaseError\([^;]+email/u);
});

test("server auth retries bypass Next.js GET memoization", () => {
  assert.match(serverClientSource, /endsWith\("\/auth\/v1\/user"\)/u);
  assert.match(serverClientSource, /authUserRequestCount === 1/u);
  assert.match(serverClientSource, /cache: "no-store"/u);
  assert.match(serverClientSource, /input instanceof Request \? input\.signal : undefined/u);
  assert.match(serverClientSource, /global: \{\s*fetch: createAuthAwareServerFetch\(\),/u);
});

test("signed-out trade exit cannot prefetch the document-backed Discover route", () => {
  assert.ok(
    tradeDraftWorkbenchSource.includes(
      [
        "        <Link",
        '          className={`${styles.button} ${styles.buttonBack}`}',
        '          href="/discover"',
        "          prefetch={false}",
        "        >",
        "          Exit",
        "        </Link>",
      ].join("\n"),
    ),
  );
});

test("authenticated profile navigation cannot prefetch the queryless Offers compatibility redirect", () => {
  const sideNavStart = marketplaceComponentsSource.indexOf("function MarketplaceSideNav({");
  const sideNavEnd = marketplaceComponentsSource.indexOf(
    "\nexport function MarketplaceRouteShell({",
    sideNavStart,
  );
  assert.ok(sideNavStart >= 0 && sideNavEnd > sideNavStart);
  const sideNavSource = marketplaceComponentsSource.slice(sideNavStart, sideNavEnd);

  assert.match(
    sideNavSource,
    /<Link className="mt-v75-side-brand" href="\/offers" prefetch=\{false\}>/u,
  );
  assert.match(
    sideNavSource,
    /href=\{item\.href\}\s+prefetch=\{item\.href === "\/offers" \? false : undefined\}\s+key=\{item\.key\}/u,
  );
  assert.match(
    profilePageSource,
    /<Link className="button button-secondary button-mini" href="\/offers" prefetch=\{false\}>/u,
  );
});

test("Dashboard bottom navigation cannot prefetch the Offers compatibility redirect", () => {
  const bottomNavStart = marketplaceComponentsSource.indexOf(
    "export function MarketplaceBottomNav({",
  );
  assert.ok(bottomNavStart >= 0);
  const bottomNavSource = marketplaceComponentsSource.slice(bottomNavStart);
  assert.ok(
    bottomNavSource.includes(
      [
        "          href={item.href}",
        '          prefetch={item.href === "/offers" ? false : undefined}',
        "          key={item.key}",
      ].join("\n"),
    ),
  );
});
