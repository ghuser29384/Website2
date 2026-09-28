from pathlib import Path
import json, subprocess

BASE = '2678dc3ea33b17c0375a1bd5bccbb1c4990b4b16'
def git(*args): return subprocess.check_output(['git', *args], text=True).strip()
assert git('rev-parse', 'HEAD') == BASE
assert not git('status', '--porcelain')
changed = []
def edit(path, before, after):
    p = Path(path); s = p.read_text()
    assert s.count(before) == 1, (path, before[:100], s.count(before))
    p.write_text(s.replace(before, after, 1))
    if path not in changed: changed.append(path)
def write(path, content):
    p = Path(path)
    assert not p.exists(), path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)
    changed.append(path)
for path, sha in {
    'src/app/about/page.tsx': 'a4ce29b0b85aaf1f131f3d5452426d5a5bcb665b',
    'src/app/sitemap.ts': '0f4ffe81b0d2d451db73ea66aba0151469a9ce0e',
    'src/components/layout/site-topbar.tsx': '370d0e703c2d4c1ff0f68cfcf4441dd87f2e836a',
    'src/components/dashboard/dashboard-tools.tsx': 'f5d814c25981967613822f35d4eb93b1ec9df982',
    'src/lib/dashboard-view.ts': 'c830b3c68b4b61e959d9ebbbb7da391a4d695f13',
    'public/moral-trade-live-navigation.js': 'c1b26048d07b3c61a42ead2819d23b3b265a8d0b',
    'public/moral-trade-discover.html': 'b3bd6f5ec42831b5249fa02e6b2f35ed0941d077',
}.items():
    assert git('rev-parse', 'HEAD:'+path) == sha, path

Path('src/app/about/page.tsx').write_text('import { permanentRedirect } from "next/navigation";\n\nexport default function RetiredAboutPage() {\n  permanentRedirect("/feed");\n}\n')
changed.append('src/app/about/page.tsx')
edit('src/app/sitemap.ts', '    {\n      url: getAbsoluteUrl("/about"),\n      lastModified: now,\n      changeFrequency: "monthly",\n      priority: 0.72,\n    },\n', '')
edit('src/app/labs/moral-public-goods/[poolSlug]/page.tsx', '  { href: "/about", label: "About" },\n', '')
edit('src/lib/dashboard-view.ts', '  "#outgoing-responses", "#agreements", "#saved-offers", "#account-security",', '  "#outgoing-responses", "#agreements", "#saved-offers", "#account-security", "#data-portability",')
p = Path('src/components/dashboard/dashboard-tools.tsx'); s = p.read_text()
a = s.index('      <details className={styles.currency}'); b = s.index('      </details>', a) + len('      </details>')
edit(str(p), s[a:b], '      <Link href="/dashboard?view=controls#payment-setup" prefetch={false}>Payment setup</Link>')

write('src/lib/public-outcome-availability.ts', '''// Only the existing anonymous, finalized six-field outcome projection is accepted.
// This is navigation visibility, not a claim that a payment or whole agreement completed.
const lifecycleStatuses = new Set([
  "paid", "payment_due", "payment_reported", "payment_review", "evidence_due", "graded",
]);
const fields = ["actionCategory", "lifecycleStatus", "confidenceBand", "completionFraction", "payoutPercentage", "date"];

export function hasPublicOutcome(payload: unknown): boolean {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const records = (payload as Record<string, unknown>).records;
  if (!Array.isArray(records)) return false;
  return records.some((value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    const row = value as Record<string, unknown>;
    if (Object.keys(row).length !== fields.length || !fields.every((key) => Object.hasOwn(row, key))) return false;
    if (typeof row.actionCategory !== "string" || !row.actionCategory.trim()) return false;
    if (typeof row.lifecycleStatus !== "string" || !lifecycleStatuses.has(row.lifecycleStatus)) return false;
    if (typeof row.confidenceBand !== "number" || ![0, 25, 50, 75, 100].includes(row.confidenceBand)) return false;
    if (typeof row.completionFraction !== "number" || !Number.isFinite(row.completionFraction) || row.completionFraction < 0 || row.completionFraction > 1) return false;
    if (typeof row.payoutPercentage !== "number" || !Number.isFinite(row.payoutPercentage) || row.payoutPercentage < 0 || row.payoutPercentage > 100) return false;
    if (typeof row.date !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(row.date)) return false;
    const date = new Date(`${row.date}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === row.date;
  });
}

export async function readPublicOutcomeAvailability(
  read: () => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<boolean> {
  try {
    const { data, error } = await read();
    return !error && hasPublicOutcome(data);
  } catch {
    return false;
  }
}
''')
write('src/app/api/navigation/evidence/route.ts', '''import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { readPublicOutcomeAvailability } from "@/lib/public-outcome-availability";
import { getSupabaseEnv } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const available = await readPublicOutcomeAvailability(async () => {
    const { url, publishableKey } = getSupabaseEnv();
    // No session cookies, user JWT, service role, or private-table read.
    const client = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    return await client.rpc("list_public_moral_trade_outcomes_v2", {
      p_limit: 1,
      p_offset: 0,
    }).abortSignal(AbortSignal.timeout(2500));
  });
  return NextResponse.json({ available }, {
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
''')
write('src/components/layout/evidence-nav-gate.tsx', '''"use client";

import { useSyncExternalStore, type ReactNode } from "react";

let available = false;
let pending: Promise<void> | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();
const snapshot = () => available;
const serverSnapshot = () => false;

function publish(next: boolean) {
  if (available === next) return;
  available = next;
  for (const listener of listeners) listener();
}

function refresh() {
  if (document.visibilityState === "hidden") { publish(false); return; }
  if (pending) return;
  pending = fetch("/api/navigation/evidence", {
    credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(5000),
  }).then(async (response) => {
    const data: unknown = response.ok ? await response.json() : null;
    const show = Boolean(data && typeof data === "object" && !Array.isArray(data) &&
      (data as Record<string, unknown>).available === true);
    publish(listeners.size > 0 && document.visibilityState !== "hidden" && show);
  }).catch(() => publish(false)).finally(() => { pending = null; });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    window.addEventListener("focus", refresh);
    window.addEventListener("pageshow", refresh);
    document.addEventListener("visibilitychange", refresh);
    timer = setInterval(refresh, 60000);
    refresh();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("pageshow", refresh);
      document.removeEventListener("visibilitychange", refresh);
      clearInterval(timer);
      available = false;
    }
  };
}

/** Hidden during SSR, pending reads, empty ledgers, and failures. No persistent cache. */
export function EvidenceNavGate({ children }: { children: ReactNode }) {
  const show = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return show ? <>{children}</> : null;
}
''')

p = 'src/components/layout/site-topbar.tsx'
edit(p, 'import { MoralTradeWordmark }', 'import { EvidenceNavGate } from "@/components/layout/evidence-nav-gate";\nimport { MoralTradeWordmark }')
edit(p, '  return (\n    <Link prefetch={false} aria-current=', '  const content = (\n    <Link prefetch={false} aria-current=')
edit(p, '    </Link>\n  );\n}\n\nfunction NavMenu', '    </Link>\n  );\n  return href === "/evidence" ? <EvidenceNavGate>{content}</EvidenceNavGate> : content;\n}\n\nfunction NavMenu')
edit(p, '          return item.href ? (', '          const content = item.href ? (')
edit(p, '          ) : null;\n        })}', '          ) : null;\n          return item.href === "/evidence"\n            ? <EvidenceNavGate key={`${item.href}-${item.label}`}>{content}</EvidenceNavGate>\n            : content;\n        })}')
edit(p, '{ href: "/dashboard#my-trades", label: "My trades" }', '{ href: "/dashboard?view=controls#my-trades", label: "My trades" }')
edit(p, '{ href: "/dashboard#data-portability", label: "Profile data" }', '{ href: "/dashboard?view=controls#data-portability", label: "Profile data" }')
edit(p, '                { href: "/cart", label: "Favourites" },', '                ...(!refinedHeader ? [{ href: "/cart", label: "Saved offers" }] : []),')
p = 'src/components/layout/site-footer.tsx'
edit(p, 'import { MoralTradeWordmark, MutualStepMark }', 'import { EvidenceNavGate } from "@/components/layout/evidence-nav-gate";\nimport { MoralTradeWordmark, MutualStepMark }')
edit(p, '''                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link prefetch={false} href={link.href}>{link.label}</Link>
                  </li>
                ))}''', '''                {group.links.map((link) => {
                  const entry = (
                    <li key={link.href}>
                      <Link prefetch={false} href={link.href}>{link.label}</Link>
                    </li>
                  );
                  return link.href === "/evidence"
                    ? <EvidenceNavGate key={link.href}>{entry}</EvidenceNavGate>
                    : entry;
                })}''')

write('public/moral-trade-evidence-navigation.js', '''(function () {
  "use strict";
  if (window.__MT_PUBLIC_EVIDENCE_NAV__) return;
  window.__MT_PUBLIC_EVIDENCE_NAV__ = true;
  let available = false;
  let pending = false;
  const rendered = new Map();
  function render() {
    for (const [template, nodes] of rendered) {
      if (available && template.isConnected) continue;
      for (const node of nodes) node.remove();
      rendered.delete(template);
    }
    if (!available) return;
    for (const template of document.querySelectorAll("template[data-mt-evidence-navigation]")) {
      if (rendered.has(template)) continue;
      const content = template.content.cloneNode(true);
      const nodes = [...content.childNodes];
      rendered.set(template, nodes);
      template.after(content);
    }
  }
  async function refresh() {
    if (document.visibilityState === "hidden") { available = false; render(); return; }
    if (pending) return;
    pending = true;
    try {
      const response = await fetch("/api/navigation/evidence", {
        credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(5000),
      });
      const data = response.ok ? await response.json() : null;
      available = document.visibilityState !== "hidden" && data?.available === true;
    } catch { available = false; }
    finally { pending = false; render(); }
  }
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; render(); });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("focus", refresh);
  window.addEventListener("pageshow", refresh);
  document.addEventListener("visibilitychange", refresh);
  setInterval(refresh, 60000);
  refresh();
})();
''')
p = 'public/moral-trade-live-navigation.js'
edit(p, '  window.__MT_DISCOVER_NAVIGATION_BRIDGE__ = true;\n', '''  window.__MT_DISCOVER_NAVIGATION_BRIDGE__ = true;
  // Optional navigation stays absent if this public availability check cannot run.
  const evidenceNavigation = document.createElement("script");
  evidenceNavigation.src = "/moral-trade-evidence-navigation.js";
  evidenceNavigation.async = true;
  document.head.appendChild(evidenceNavigation);
''')
edit(p, '''          link.textContent = label;
          panel.appendChild(link);''', '''          link.textContent = label;
          if (href === "/evidence") {
            const gate = document.createElement("template");
            gate.dataset.mtEvidenceNavigation = "true";
            gate.content.appendChild(link);
            panel.appendChild(gate);
          } else {
            panel.appendChild(link);
          }''')
p = 'public/moral-trade-discover.html'
edit(p, '  <script defer src="/moral-trade-discover-search.js?v=20260923"></script>', '  <script defer src="/moral-trade-discover-search.js?v=20260923"></script>\n  <script defer src="/moral-trade-evidence-navigation.js"></script>')
edit(p, ' · <a href="/evidence">Public evidence</a>', '<template data-mt-evidence-navigation><span> · <a href="/evidence">Evidence</a></span></template>')

# Existing source-contract tests retain a positive public-outcome fixture.
p = 'src/lib/selected-ui-cleanup.test.ts'
edit(p, '    "@/lib/refined-header": { HEADER_UTILITY_LINKS, REFINED_HEADER_LINKS, usesDefaultHeader },', '    "@/lib/refined-header": { HEADER_UTILITY_LINKS, REFINED_HEADER_LINKS, usesDefaultHeader },\n    "@/components/layout/evidence-nav-gate": { EvidenceNavGate: (props: Record<string, unknown>) => jsx("fragment", props) },')
edit(p, '["/dashboard#my-trades", "/dashboard#data-portability", "/cart"]', '["/dashboard?view=controls#my-trades", "/dashboard?view=controls#data-portability", "/cart"]')
edit(p, '    const all = nodes(render(authenticated).root);', '    const all = nodes(render(authenticated).root);\n    assert.equal(all.filter((node) => node.type === "a" && node.props.href === "/cart").length, 1);\n    assert.doesNotMatch(text(render(authenticated).root), /Favourites/);')
for p in ['tests/refined-header.spec.ts', 'tests/selected-ui-cleanup.spec.ts', 'tests/exact-live-now-recommendations.spec.ts']:
    s = Path(p).read_text()
    # Explicit fixture, not a claim of public production outcomes.
    marker = '\ntest.beforeEach(async ({ page }) => {\n  await page.route("**/api/navigation/evidence", (route) => route.fulfill({ json: { available: true } }));\n});\n'
    Path(p).write_text(s + marker)
    changed.append(p)
p = 'tests/sitewide-canonical-visual-system.spec.ts'
s = Path(p).read_text()
if '  "/about",\n' in s:
    edit(p, '  "/about",\n', '')

write('src/lib/recommended-cleanup.test.ts', '''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { hasPublicOutcome, readPublicOutcomeAvailability } from "./public-outcome-availability";
import { getLegacyDashboardTarget, getProfileDashboardTarget } from "./dashboard-view";

const outcome = { actionCategory: "volunteering", lifecycleStatus: "graded", confidenceBand: 100,
  completionFraction: 1, payoutPercentage: 0, date: "2026-09-28" };

test("Evidence navigation requires an actual validated public projection, never a count", async () => {
  for (const value of [null, [], {}, { totalRecords: 10 }, { records: [] }, { records: [{}] },
    { records: [{ ...outcome, lifecycleStatus: "draft" }] },
    { records: [{ ...outcome, participantId: "private" }] },
    { records: [{ ...outcome, date: "2026-02-30" }] },
    { records: [{ ...outcome, confidenceBand: 101 }] },
    { records: [{ ...outcome, completionFraction: -1 }] },
    { records: [{ ...outcome, completionFraction: NaN }] },
    { records: [{ ...outcome, payoutPercentage: 101 }] },
    { records: [{ ...outcome, actionCategory: " " }] }]) assert.equal(hasPublicOutcome(value), false);
  assert.equal(hasPublicOutcome({ records: [outcome] }), true);
  assert.equal(await readPublicOutcomeAvailability(async () => ({ data: { records: [outcome] }, error: null })), true);
  assert.equal(await readPublicOutcomeAvailability(async () => ({ data: { records: [outcome] }, error: "unavailable" })), false);
  assert.equal(await readPublicOutcomeAvailability(async () => { throw new Error("timeout"); }), false);
});

test("legacy data bookmarks open controls without losing existing query feedback", () => {
  assert.equal(getLegacyDashboardTarget("?notice=saved", "#data-portability"), "/dashboard?notice=saved&view=controls#data-portability");
  assert.equal(getLegacyDashboardTarget("?view=controls", "#data-portability"), null);
  assert.equal(getProfileDashboardTarget({ notice: "saved", view: "controls" }), "/dashboard?notice=saved&view=controls");
});

test("About is a redirect only; its generic navigation and sitemap entries are retired", () => {
  const page = readFileSync("src/app/about/page.tsx", "utf8");
  assert.match(page, /permanentRedirect\\("\\/feed"\\)/);
  assert.doesNotMatch(page, /getViewer|<h1|hero|SiteTopbar/);
  assert.doesNotMatch(readFileSync("src/app/sitemap.ts", "utf8"), /getAbsoluteUrl\\("\\/about"\\)/);
  assert.match(readFileSync("src/app/sitemap.ts", "utf8"), /getAbsoluteUrl\\("\\/mpgf\\/about"\\)/);
  assert.doesNotMatch(readFileSync("src/app/labs/moral-public-goods/[poolSlug]/page.tsx", "utf8"), /href: "\\/about"/);
});

test("the new navigation endpoint can only perform a bounded anonymous public read", () => {
  const route = readFileSync("src/app/api/navigation/evidence/route.ts", "utf8");
  assert.match(route, /list_public_moral_trade_outcomes_v2/);
  assert.match(route, /p_limit: 1/);
  assert.match(route, /AbortSignal.timeout\\(2500\\)/);
  assert.match(route, /NextResponse.json\\(\\{ available \\}/);
  assert.doesNotMatch(route, /createServiceClient|getSupabaseServiceEnv|cookies\\(|request\\.|\\.from\\(|export.*POST/);
  const tools = readFileSync("src/components/dashboard/dashboard-tools.tsx", "utf8");
  assert.match(tools, /href="\\/dashboard\\?view=controls#payment-setup"[^>]*>Payment setup/);
  assert.doesNotMatch(tools, /<summary>Currency|account-wide currency selector/);
  const header = readFileSync("src/components/layout/site-topbar.tsx", "utf8");
  assert.match(header, /\\/dashboard\\?view=controls#data-portability/);
  assert.doesNotMatch(header, /Favourites/);
});
''')
write('tests/recommended-cleanup.spec.ts', '''import { expect, test } from "@playwright/test";

for (const width of [1440, 390, 320]) {
  for (const available of [false, true]) {
    test(`conditional Evidence navigation at ${width}px: ${available}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.route("**/api/navigation/evidence", (route) => route.fulfill({ json: { available } }));
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/contact");
      await expect(page).toHaveTitle(/Contact/);
      const header = page.locator(".mt-site-topbar");
      const trigger = header.locator("summary").filter({ hasText: "More" });
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(header.getByRole("link", { name: "Evidence", exact: true })).toHaveCount(available ? 1 : 0);
      await expect(header.getByRole("link", { name: "Tour", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      const footer = page.locator(".mt-site-footer");
      await expect(footer.locator(".mt-footer-links li a")).toHaveCount(available ? 15 : 14);
      await expect(footer.getByRole("link", { name: "Safety", exact: true })).toBeAttached();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await header.screenshot({ path: info.outputPath(`header-${width}-${available}.png`) });
      await footer.screenshot({ path: info.outputPath(`footer-${width}-${available}.png`) });
      await page.goto("/feed");
      await page.locator(".header-more > summary").click();
      await expect(page.locator(".header-more").getByRole("link", { name: "Evidence", exact: true })).toHaveCount(available ? 1 : 0);
      await page.goto("/discover");
      await expect(page.locator(".discover-footer a[href='/evidence']")).toHaveCount(available ? 1 : 0);
      expect(errors).toEqual([]);
    });
  }
}

test("About redirects straight to the feed and Profile retains the existing Dashboard alias", async ({ request, page }) => {
  const response = await request.get("/about", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("/feed");
  const profile = await request.get("/profile?notice=saved", { maxRedirects: 0 });
  expect(profile.status()).toBe(308);
  expect(profile.headers().location).toContain("/dashboard?notice=saved");
  await page.goto("/about");
  await expect(page).toHaveURL(/\\/feed$/);
  await expect(page.getByRole("heading", { name: "A service for cooperation across moral disagreement." })).toHaveCount(0);
});

test("failed availability requests hide only Evidence, not native search or account navigation", async ({ page }) => {
  await page.route("**/api/navigation/evidence", (route) => route.abort("failed"));
  await page.goto("/contact");
  const header = page.locator(".mt-site-topbar");
  await header.locator("summary").filter({ hasText: "More" }).click();
  await expect(header.locator("a[href='/evidence']")).toHaveCount(0);
  await expect(header.locator("a[href='/dashboard']")).toBeVisible();
  await expect(header.locator("a[href='/cart']")).toHaveCount(1);
  await expect(header.locator("form[role='search']")).toHaveAttribute("action", "/offers");
});

test("without JavaScript the retired About route and remaining navigation still work", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  try {
    await page.goto("/contact");
    await expect(page.locator(".mt-site-topbar a[href='/evidence']")).toHaveCount(0);
    await expect(page.locator(".mt-site-footer a[href='/evidence']")).toHaveCount(0);
    await expect(page.locator(".mt-site-topbar a[href='/feed']")).toBeVisible();
  } finally { await context.close(); }
});
''')

# Never modify the already-live Profile alias, database, private workflows, or release policy.
for path in ['src/app/profile/page.tsx', 'src/app/dashboard/page.tsx', 'src/app/start/page.tsx',
             'src/components/profile/profile-priorities-view.tsx', 'src/components/profile/profile-priority-editor.tsx',
             'src/app/actions.ts', 'src/lib/refined-header.ts', '.github/workflows/vercel-release.yml',
             'package.json', 'package-lock.json']:
    assert not git('diff', '--', path), path
subprocess.run(['git', 'add', '--', *changed], check=True)
assert sorted(git('diff', '--cached', '--name-only').splitlines()) == sorted(changed)
subprocess.run(['git', 'diff', '--cached', '--check'], check=True)
Path('/tmp/recommended-cleanup-scope.json').write_text(json.dumps(changed))
print('RECOMMENDED CLEANUP SCOPE:', json.dumps(changed))
print(git('diff', '--cached', '--stat'))
