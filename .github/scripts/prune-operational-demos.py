from pathlib import Path
import base64, gzip, hashlib

root = Path('.')
def read(p): return (root / p).read_text()
def write(p, s): (root / p).write_text(s)
def replace(p, old, new):
    s = read(p)
    assert s.count(old) == 1, f'{p}: expected one replacement: {old[:100]!r}, found {s.count(old)}'
    write(p, s.replace(old, new))

names = ['0a','0b','0c','0d','1','2','3','4a','4b','4c','4d','5a','5b','5c','5d']
old = gzip.decompress(base64.b64decode(''.join(read(f'public/mt-live-0d0e0f03-{n}.txt') for n in names))).decode()
assert hashlib.sha256(old.encode()).hexdigest() == '0d0e0f030dfca8329e3f72ba42b5811c72d338166f96a5231445b9fc4956124e'
# Retain the shared layout and style contracts. Delete the simulated executable,
# rather than hiding its controls with an overlay or continuing to ship it.
head = old[:old.index('<script>')]
head = head.replace('data-action="profile">AJ</button>', 'data-action="profile" aria-label="Account">•</button>')
core = head + r'''<script>
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const state = { page: (location.hash || '#now').slice(1), now: 'focus' };
const date = () => '<div class="date"><b>Today</b>Loading local date…<br><span class="muted">Good day.</span></div>';
const actions = (label = 'Create offer') => `<div class="h">${date()}<button class="btn primary" data-action="create">＋ ${label}</button></div>`;
const tab = (items, key, attr) => `<div class="tabs">${items.map(item => `<button class="${state[key] === item[0] ? 'active' : ''}" data-${attr}="${item[0]}">${item[1]}</button>`).join('')}</div>`;
const pageHead = (title, subtitle, cta) => `<div class="head"><div><h1>${title}</h1><div class="subtitle">${subtitle}</div></div>${actions(cta)}</div>`;

function render() {
  if (state.page === 'trade') { window.location.replace('/trades/new'); return; }
  if (state.page === 'activity') { window.location.replace('/commitments'); return; }
  state.page = 'now';
  if (!['focus', 'plan'].includes(state.now)) state.now = 'focus';
  $$('.topbar nav button').forEach(button => button.classList.toggle('active', button.dataset.page === state.page));
  $('#app').innerHTML = nowPage();
}
function nowPage() {
  return `<section class="page">${pageHead('What needs you now.', 'Review live opportunities and plan your next action.', 'Create offer')}
    ${tab([['focus', 'Focus'], ['plan', 'Plan resources']], 'now', 'now')}
    ${state.now === 'plan' ? nowPlan() : nowFocus()}</section>`;
}
// The authenticated live feed replaces this fail-closed loading state.
function nowFocus() {
  return '<div class="focus-layout" data-mt-live-now="adaptive" data-mt-live-now-state="loading"><main><section class="panel black urgent"><div><div class="eyebrow orange">Loading your profile</div><h2>Finding live moral opportunities that match your priorities and action preferences.</h2><p class="muted">No generic or demo suggestions are shown.</p></div></section></main></div>';
}
// Preserve all three mount points required by the authoritative route planner.
function nowPlan() {
  return '<div class="plan-grid" data-mt-live-route-planner="loading"><aside class="panel plan-control"><div class="eyebrow orange">Private route profile</div><p class="muted">Loading your limits…</p></aside><main><section class="panel route"><div class="eyebrow orange">Checking live routes</div><h2>Loading private limits and current opportunities.</h2><p class="muted">No fixed or fallback route is shown.</p></section></main><aside class="stack"><section class="panel"><div class="eyebrow">Route tools</div><p class="muted">Loading only when useful…</p></section></aside></div>';
}
function profileDrawer() {
  const rows = [
    ['currency', 'Currency'], ['safe-cap', 'Monthly safe cap'],
    ['payment-account', 'Payment account'], ['notifications', 'Notifications'],
    ['public-trust', 'Public trust profile'], ['privacy', 'Default privacy'],
    ['dispute', 'Dispute resolution'], ['terms', 'Standard terms'],
  ];
  return `<div data-mt-live-account-panel="true"><button class="btn ghost" style="float:right" data-action="close" aria-label="Close account">×</button>
    <div class="eyebrow blue" data-mt-live-account-marker="true">Account &amp; controls</div>
    <h2 data-mt-live-account-name="true">Account</h2><p class="muted" data-mt-live-account-summary="true">Loading account details…</p>
    ${rows.map(([key, label]) => `<div class="setting" data-mt-live-account-row="${key}"><div><b data-mt-live-account-label="true">${label}</b><br><small class="muted" data-mt-live-account-detail="true">Loading…</small></div>${key === 'terms' ? '<a class="btn small" href="/terms">View</a>' : '<button class="btn small" disabled aria-disabled="true">Status</button>'}</div>`).join('')}
    <a class="btn dark" style="display:block;margin-top:18px" href="/dashboard">Manage account</a></div>`;
}
function commandDrawer() {
  return '<button class="btn ghost" style="float:right" data-action="close" aria-label="Close command center">×</button><div class="eyebrow blue">Command center</div><h2>Create the next commitment.</h2><p class="muted">Describe the value you will offer, the reciprocal outcome, the deadline, and the proof.</p><div class="search control" style="width:100%;margin:18px 0">⌕ <input aria-label="Describe the proposed exchange" autocomplete="off" placeholder="Describe both sides of the proposed exchange"></div><button class="btn primary" style="width:100%" data-action="from-command">Build this offer</button><p class="muted">Opens an editable draft for review. Nothing is published, agreed, or paid here.</p>';
}
function openDrawer(html) { $('#drawer').innerHTML = html; $('#overlay').classList.add('open'); }
function closeDrawer() { $('#overlay').classList.remove('open'); }
function toast(message) {
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('show');
  clearTimeout(window.__t);
  window.__t = setTimeout(() => element.classList.remove('show'), 2400);
}
function setPage(page) {
  if (page === 'trade') { window.location.assign('/trades/new'); return; }
  if (page === 'activity') { window.location.assign('/commitments'); return; }
  state.page = 'now';
  location.hash = 'now';
  render();
  scrollTo({ top: 0, behavior: 'smooth' });
}
document.addEventListener('click', event => {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const page = target.closest('[data-page]');
  if (page) { setPage(page.dataset.page); return; }
  const section = target.closest('[data-now]');
  if (section && ['focus', 'plan'].includes(section.dataset.now)) { state.now = section.dataset.now; render(); return; }
  const action = target.closest('[data-action]')?.dataset.action;
  if (action === 'profile') openDrawer(profileDrawer());
  else if (action === 'command') openDrawer(commandDrawer());
  else if (action === 'close') closeDrawer();
  else if (action === 'create') window.location.assign('/trades/new');
});
$('#overlay').addEventListener('click', event => { if (event.target.id === 'overlay') closeDrawer(); });
addEventListener('keydown', event => { if (event.key === 'Escape') closeDrawer(); });
addEventListener('hashchange', () => { state.page = (location.hash || '#now').slice(1); render(); });
render();
</script>
</body>
</html>
'''
core = core.replace('Good day.', 'Good morning.')
write('public/moral-trade-live-core.txt', core)
digest = hashlib.sha256(core.encode()).hexdigest()
loader = read('public/moral-trade-live.html')
start = loader.index('        const stripLegacyNowFocus =')
end = loader.index('        const unavailableLiveNow =', start)
loader = loader[:start] + loader[end:]
loader = loader.replace("      try {", "      if (window.location.hash === '#activity') {\n        window.location.replace('/commitments');\n        return;\n      }\n\n      try {", 1)
loader = loader.replace('const [chunks, liveAccount, liveNow]', 'const [raw, liveAccount, liveNow]')
start = loader.index('          Promise.all(\n            names.map')
end = loader.index('          accountPromise,', start)
loader = loader[:start] + "          fetch('/moral-trade-live-core.txt').then((response) => {\n            if (!response.ok) throw new Error('live core');\n            return response.arrayBuffer();\n          }),\n" + loader[end:]
start = loader.index('        const compressed =')
end = loader.index('        const digest =', start)
loader = loader[:start] + loader[end:]
loader = loader.replace('0d0e0f030dfca8329e3f72ba42b5811c72d338166f96a5231445b9fc4956124e', digest)
loader = loader.replace('        const source = retireLegacyTradeBuilder(\n          stripLegacyNowFocus(new TextDecoder().decode(raw)),\n        );', '        const source = new TextDecoder().decode(raw);')
retired_assets = [
 'moral-trade-live-route-resources.js', 'moral-trade-live-plan-reset.js',
 'moral-trade-live-plan-resources.css', 'moral-trade-live-custom-route.js',
 'moral-trade-live-custom-route.css', 'moral-trade-live-itinerary-editor.js',
 'moral-trade-live-itinerary-editor.css', 'moral-trade-live-verification.js',
 'moral-trade-live-offer-structure.js', 'moral-trade-live-offer-structure.css',
 'moral-trade-live-token-autocomplete.js',
]
loader = '\n'.join(line for line in loader.split('\n') if not any(asset in line for asset in retired_assets))
write('public/moral-trade-live.html', loader)
for p in [*(f'public/mt-live-0d0e0f03-{n}.txt' for n in names), *(f'public/mt-verify-f01a8b07-{n}.txt' for n in 'abcde'), *(f'public/{n}' for n in retired_assets)]:
    (root / p).unlink()
write('public/complete-verification.html', '''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>Verification demo retired — Moral Trade</title>
  <link rel="stylesheet" href="/moral-trade-canonical-static.css?v=20260810">
</head>
<body>
  <main style="max-width:48rem;margin:4rem auto;padding:1.5rem">
    <h1>The verification demo has been retired.</h1>
    <p>That demo did not connect a source, authenticate a signature, or verify a real commitment. Its local results are not evidence.</p>
    <p><a href="/evidence">Review real evidence</a> or <a href="/commitments">open your commitments</a> to find the relevant record.</p>
  </main>
  <script>window.location.replace('/evidence');</script>
</body>
</html>
''')
replace('public/moral-trade-live-create-router.js', '  let allowDealroomHashOnce = false;\n\n', '')
replace('public/moral-trade-live-create-router.js', '''    if (allowDealroomHashOnce) {
      allowDealroomHashOnce = false;
      return;
    }

''', '')
replace('public/moral-trade-live-create-router.js', '''        allowDealroomHashOnce = true;
        return;''', '''        event.preventDefault();
        event.stopImmediatePropagation();
        window.location.assign("/commitments");
        return;''')
replace('public/moral-trade-live-command-center.js', '''    const setting = button.closest(".setting");
    if (setting) {
      const label = setting.querySelector("span");
      return clean(label?.textContent);
    }

''', '')
p='src/live-now-data.test.ts'
s=read(p).replace('import { gunzipSync } from "node:zlib";\n','')
s=s.replace('const loader = readFileSync("public/moral-trade-live.html", "utf8");', 'const loader = readFileSync("public/moral-trade-live.html", "utf8");\nconst core = readFileSync("public/moral-trade-live-core.txt", "utf8");')
s=s.replace('  assert.match(loader, /stripLegacyNowFocus/);', '  assert.match(loader, /moral-trade-live-core\\.txt/);')
s=s.replace('  assert.match(loader, /No generic or demo suggestions are shown/);', '  assert.match(core, /No generic or demo suggestions are shown/);')
s=s.replace('    loader,\n    /loadingPlan[', '    core,\n    /function nowPlan[')
start=s.index('test("the loader removes legacy feed and route suggestions before first render"')
end=s.index('\ntest(',start+6)
s=s[:start]+'''test("the delivered core contains only loading states, never legacy feed or route suggestions", () => {
  assert.match(core, /function nowFocus\\(/);
  assert.match(core, /function nowPlan\\(/);
  assert.match(core, /data-mt-live-now-state="loading"/);
  assert.match(core, /data-mt-live-route-planner="loading"/);
  assert.doesNotMatch(core, /Counteroffer from Mina|AI-safety research under \\$100/);
  assert.doesNotMatch(core, /Recommended mixed route|Redirect \\$20 of political donations/);
  assert.doesNotMatch(core, /function nowRules|function activityPage|function exportCSV/);
});
''' + s[end:]
write(p,s)
p='src/lib/create-interface/unified-entry-routes.test.ts'
s=read(p).replace('import { gunzipSync } from "node:zlib";\n','')
start=s.index('const liveBundleNames =')
end=s.index('test("the root route',start)
s=s[:start]+'const liveCore = readFileSync("public/moral-trade-live-core.txt", "utf8");\n\n'+s[end:]
s=s.replace('  assert.match(liveLoader, /retireLegacyTradeBuilder/);\n  assert.match(liveLoader, /Trade creation has moved\\./);', '  assert.match(liveLoader, /moral-trade-live-core\\.txt/);\n  assert.doesNotMatch(liveCore, /function clauseBuilder|function exchangeBuilder/);')
start=s.index('test("the delivered executable strips every legacy demo record')
end=s.index('\ntest(',start+6)
s=s[:start]+'''test("the delivered executable has no retired Trade builder or fabricated transactions", () => {
  assert.doesNotMatch(liveCore, /Alex R\\.|Sam G\\.|Riley P\\.|Mina Park/);
  assert.doesNotMatch(liveCore, /Replaced 10 car trips|1 pending counteroffer|Today, 9:18 AM/);
  assert.doesNotMatch(liveCore, /function clauseBuilder|function dealroomView|function matchView/);
  assert.match(liveCore, /window\\.location\\.assign\\('\\/trades\\/new'\\)/);
});
''' + s[end:]
write(p,s)
replace('src/live-account-data.test.ts', '  assert.match(shell, /moral-trade-live-verification\\.js/);', '  assert.doesNotMatch(shell, /moral-trade-live-verification\\.js/);')
replace('tests/returning-homepage.spec.ts', '    await expect(page.locator(\'button[data-now="rules"]\')).toHaveText("Standing rules");', '    await expect(page.locator(\'button[data-now="rules"]\')).toHaveCount(0);')
for p in ['src/live-plan-resources.test.ts','src/live-custom-route-accounting.test.ts','src/lib/exact-live-autocomplete.test.ts']:
    (root/p).unlink()
p='tests/sitewide-canonical-visual-system.spec.ts'
s=read(p)
s=s.replace('    await expect(page.locator(".mt-verify-appbar")).toBeVisible({ timeout: 45_000 });', '    await expect(page).toHaveURL(/\\/evidence$/, { timeout: 45_000 });\n    await expect(page.locator(".mt-site-topbar").first()).toBeVisible();')
s=s.replace('  if (route.startsWith("/complete-verification")) {\n    await expect(page.locator(".mt-verify-appbar")).toHaveCSS("background-color", BLACK);\n  } else if (isCreateFrameRoute(routePath(route))) {', '  if (isCreateFrameRoute(routePath(route))) {')
write(p,s)
write('tests/exact-live-verification.spec.ts', '''import { expect, test } from "@playwright/test";

test.describe("retired verification demo", () => {
  test("routes old record URLs to evidence without carrying a fabricated identity", async ({ page }) => {
    await page.goto("/complete-verification.html?record=wild-animal-research&from=calendar");
    await expect(page).toHaveURL(/\\/evidence$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect read-only" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Record signed response" })).toHaveCount(0);
  });

  test("does not turn a local simulated signature into a server request", async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem("moraltrade.verification.wild-animal-research.v1", JSON.stringify({ signatures: { verifier: true, counterparty: true, platform: true }, provisionalRecorded: true })));
    const writes: string[] = [];
    await page.route("**/*", route => {
      const request = route.request();
      if (!["GET", "HEAD"].includes(request.method())) {
        writes.push(new URL(request.url()).pathname);
        return route.abort();
      }
      return route.continue();
    });
    await page.goto("/complete-verification.html?reset=1");
    await expect(page).toHaveURL(/\\/evidence$/);
    expect(writes.filter(path => /verif|signature|settle|payment/.test(path))).toEqual([]);
    await expect(page.locator("[data-completion]" )).toHaveCount(0);
  });

  test("keeps explanatory links available without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    try {
      const page = await context.newPage();
      await page.goto("http://127.0.0.1:3210/complete-verification.html");
      await expect(page.getByRole("heading", { name: "The verification demo has been retired." })).toBeVisible();
      await expect(page.getByRole("link", { name: "Review real evidence" })).toHaveAttribute("href", "/evidence");
      await expect(page.getByRole("link", { name: "open your commitments" })).toHaveAttribute("href", "/commitments");
    } finally { await context.close(); }
  });
});
''')
print('Live core SHA256:', digest)
