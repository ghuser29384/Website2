from pathlib import Path

source = Path(__file__).with_name('apply.py').read_text()
before = '''if '  "/about",\\n' in s:
    edit(p, '  "/about",\\n', '')'''
after = '''edit(p, 'const publicEditorialRoutes = [\\n  "/about",\\n', 'const publicEditorialRoutes = [\\n')
edit(p, '  for (const route of [\\n    "/about",\\n', '  for (const route of [\\n    "/contact",\\n')'''
assert source.count(before) == 1
source = source.replace(before, after, 1)

extra = r"""
# Keep active-link matching correct for the now-explicit controls query string.
edit('src/components/layout/site-topbar.tsx', 'const [path] = href.split("#");', 'const [path] = href.split(/[?#]/);')

# Replace only superseded Currency expectations; keep no-write/prefetch/return protections.
p = 'src/lib/dashboard-view.test.ts'
edit(p, 'currency is a disclosure, controls do not prefetch, and control forms keep their return view',
        'Payment setup is a direct link, controls do not prefetch, and forms keep their return view')
edit(p, '  assert.match(tools, /<summary>Currency<\\/summary>/);\n  assert.match(tools, /account-wide currency selector is not available/);',
        '  assert.match(tools, /href="\\/dashboard\\?view=controls#payment-setup"[^>]*>Payment setup/);\n  assert.doesNotMatch(tools, /<summary>Currency|account-wide currency selector/);')

p = 'tests/dashboard-sparks.spec.ts'
s = Path(p).read_text()
a = s.index('  test("Currency opens without a write')
b = s.index('  test("saving the actual server action', a)
edit(p, s[a:b], '''  test("Payment setup is direct, keyboard accessible, and does not save priority edits", async ({ page, context }) => {
    await signIn(context);
    await page.goto(`${origin}/dashboard`);
    await page.getByRole("button", { name: `Increase ${priority.name}`, exact: true }).click();
    const tools = page.getByRole("navigation", { name: "Dashboard controls" });
    await expect(tools.locator("summary")).toHaveCount(0);
    const payment = tools.getByRole("link", { name: "Payment setup", exact: true });
    await expect(payment).toHaveAttribute("href", "/dashboard?view=controls#payment-setup");
    await payment.focus();
    await payment.press("Enter");
    await expect(page).toHaveURL(`${origin}/dashboard?view=controls#payment-setup`);
    await expect(page.locator("#payment-setup")).toBeVisible();
    expect(requests.some((request) => request.path === "/rest/v1/cohort_onboarding_profiles" && request.method !== "GET")).toBe(false);
    expect(saved.get(a)).toEqual(buildPersistedProfilePriorities(allocation(4)));
    await page.locator("#payment-setup").screenshot({ path: "/tmp/dashboard-sparks-evidence/direct-payment-setup.png" });
  });

  test("account links reach data and trades once, and legacy data bookmarks remain usable", async ({ page, context }) => {
    await signIn(context);
    await page.goto(`${origin}/contact`);
    const header = page.locator(".mt-site-topbar");
    await expect(header.locator('a[href="/cart"]')).toHaveCount(1);
    await expect(header.getByText("Favourites", { exact: true })).toHaveCount(0);
    for (const [name, id] of [["Profile data", "data-portability"], ["My trades", "my-trades"]]) {
      await header.locator("summary").filter({ hasText: /^Account/ }).click();
      await header.getByRole("link", { name, exact: true }).click();
      await expect(page).toHaveURL(`${origin}/dashboard?view=controls#${id}`);
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    await page.goto(`${origin}/dashboard#data-portability`);
    await expect(page).toHaveURL(`${origin}/dashboard?view=controls#data-portability`);
    await expect(page.locator("#data-portability")).toBeVisible();
    await page.locator("#data-portability").screenshot({ path: "/tmp/dashboard-sparks-evidence/data-portability-link.png" });
    expect(requests.some((request) => request.path === "/rest/v1/cohort_onboarding_profiles" && request.method !== "GET")).toBe(false);
    expect(requests.some((request) => request.path.includes("payment") && !["GET", "OPTIONS"].includes(request.method))).toBe(false);
  });

''')
edit(p, '    await tools.locator("summary").click();\n', '')

write('src/lib/evidence-navigation-route.test.ts', '''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { readPublicOutcomeAvailability } from "./public-outcome-availability";

const outcome = { actionCategory: "volunteering", lifecycleStatus: "graded", confidenceBand: 100,
  completionFraction: 1, payoutPercentage: 0, date: "2026-09-28" };

async function execute(data: unknown, error: unknown = null, throwing = false) {
  const calls: unknown[] = [];
  const plain = (value: unknown) => JSON.parse(JSON.stringify(value));
  const modules: Record<string, unknown> = {
    "@supabase/supabase-js": { createClient: (url: string, key: string, options: unknown) => {
      calls.push({ url, key, options: plain(options) });
      return { rpc: (name: string, args: unknown) => {
        calls.push({ name, args: plain(args) });
        return { abortSignal: (signal: AbortSignal) => {
          assert.ok(signal instanceof AbortSignal);
          if (throwing) throw new Error("fixture transport unavailable");
          return Promise.resolve({ data, error });
        } };
      } };
    } },
    "next/server": { NextResponse: { json: (body: unknown, options: unknown) => plain({ body, options }) } },
    "@/lib/public-outcome-availability": { readPublicOutcomeAvailability },
    "@/lib/supabase/config": { getSupabaseEnv: () => ({ url: "http://127.0.0.1:54331", publishableKey: "public-fixture" }) },
  };
  const compiled = ts.transpileModule(readFileSync("src/app/api/navigation/evidence/route.ts", "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics?.length, 0);
  const exports: { GET?: () => Promise<{ body: { available: boolean }; options: { headers: Record<string, string> } }> } = {};
  vm.runInNewContext(compiled.outputText, { exports, AbortSignal, require: (name: string) => {
    assert.ok(Object.hasOwn(modules, name), `Unreviewed dependency: ${name}`);
    return modules[name];
  } });
  assert.ok(exports.GET);
  return { calls, response: await exports.GET() };
}

test("actual GET executes only the anonymous bounded projection and publishes a boolean", async () => {
  const { calls, response } = await execute({ records: [outcome] });
  assert.deepEqual(calls, [
    { url: "http://127.0.0.1:54331", key: "public-fixture", options: {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    } },
    { name: "list_public_moral_trade_outcomes_v2", args: { p_limit: 1, p_offset: 0 } },
  ]);
  assert.deepEqual(response.body, { available: true });
  assert.equal(response.options.headers["Cache-Control"], "no-store");
});

test("actual GET never leaks backend records or errors and hides empty/malformed/failed reads", async () => {
  for (const [data, error, throwing] of [
    [{ records: [] }, null, false],
    [{ totalRecords: 10 }, null, false],
    [{ records: [{ ...outcome, participantId: "private-fixture" }] }, null, false],
    [{ records: [outcome] }, { message: "private backend detail" }, false],
    [null, null, true],
  ] as const) {
    const { response } = await execute(data, error, throwing);
    assert.deepEqual(response.body, { available: false });
    assert.equal(response.options.headers["Cache-Control"], "no-store");
  }
});
''')

p = 'tests/recommended-cleanup.spec.ts'
s = Path(p).read_text()
Path(p).write_text(s + '''

test("the real HTTP availability route exposes only one uncached boolean", async ({ request }) => {
  const response = await request.get("/api/navigation/evidence", { headers: { Cookie: "unrelated=1" } });
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(Object.keys(body)).toEqual(["available"]);
  expect(typeof body.available).toBe("boolean");
});

for (const path of ["/contact", "/feed", "/discover"]) {
  test(`Evidence starts hidden and disappears again when availability is withdrawn at ${path}`, async ({ page }) => {
    let available = false;
    await page.route("**/api/navigation/evidence", (route) => route.fulfill({ json: { available } }));
    await page.goto(path);
    const links = path === "/contact" ? page.locator(".mt-site-topbar a[href='/evidence'], .mt-site-footer a[href='/evidence']")
      : path === "/feed" ? page.locator(".header-more a[href='/evidence']")
      : page.locator(".discover-footer a[href='/evidence']");
    await expect(links).toHaveCount(0);
    available = true;
    const read = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/navigation/evidence");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await read;
    await expect(links).toHaveCount(path === "/contact" ? 2 : 1);
    available = false;
    const reread = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/navigation/evidence");
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
    await reread;
    await expect(links).toHaveCount(0);
  });
}
''')
"""
marker = '# Never modify the already-live Profile alias, database, private workflows, or release policy.'
assert source.count(marker) == 1
source = source.replace(marker, extra + '\n' + marker)
Path('../evidence').mkdir(exist_ok=True)
Path('../evidence/resolved-apply.py').write_text(source)
exec(compile(source, 'resolved-apply.py', 'exec'), {'__name__': '__main__'})
