"""Apply the owner-approved UI cleanup to the exact isolated candidate only.
This transport script is not part of the application branch.
"""
from pathlib import Path
import hashlib
import re
import subprocess

BASE = 'ef3b1b595f6bddd1e660e3215ca19e57254234f3'
assert subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip() == BASE
changed = set()

def edit(path, transform):
    p = Path(path)
    old = p.read_text()
    new = transform(old)
    assert new != old, f'No change in {path}'
    p.write_text(new)
    changed.add(path)

def replace(text, old, new, count=1):
    assert text.count(old) == count, (old[:120], text.count(old), count)
    return text.replace(old, new)

def css_rule(text, selector, properties, count=1):
    pattern = re.compile(re.escape(selector) + r'\s*\{([^{}]*)\}')
    matches = list(pattern.finditer(text))
    assert len(matches) == count, (selector, len(matches), count)
    def update(match):
        body = match.group(1)
        for prop, value in properties.items():
            pat = re.compile(r'(?<![\w-])' + re.escape(prop) + r'\s*:[^;{}]+;?')
            found = list(pat.finditer(body))
            assert len(found) <= 1, (selector, prop)
            declaration = f'{prop}: {value};'
            if found:
                body = pat.sub(declaration, body)
            else:
                body += '\n  ' + declaration + '\n'
        return selector + ' {' + body + '}'
    return pattern.sub(update, text)

# Update the established shared system instead of introducing another override layer.
def canonical(s):
    palette = {'#f5f2e9':'#f7f8fa', '#fffdf8':'#ffffff', '#efebe3':'#f1f3f5', '#e4dfd5':'#e9ecf0', '#d4cec3':'#dce0e6', '#c7c5bd':'#e0e3e8', '#8d8b84':'#b8bec8', '#55534e':'#515762', '#77746e':'#656c78', '#96928c':'#767e8a', '#66645f':'#606773'}
    for old, new in palette.items():
        s = s.replace(old, new)
    s = css_rule(s, ':root', {'--font-heading':'var(--font-body)'})
    s = css_rule(s, 'body', {'background-image':'none', 'font-size':'16px', 'line-height':'1.5'})
    s = css_rule(s, '.hero > .hero-grid', {'border':'0', 'gap':'24px', 'overflow':'visible'})
    s = css_rule(s, '.hero > .hero-grid .hero-copy', {'align-content':'start', 'min-height':'0', 'padding':'24px 0', 'background':'transparent', 'color':'var(--mt-ink)'})
    s = css_rule(s, '.hero > .hero-grid .hero-copy .eyebrow', {'color':'var(--mt-muted)'})
    s = css_rule(s, '.hero > .hero-grid .hero-copy h1,\n.hero > .hero-grid .hero-copy h2', {'max-width':'28ch', 'color':'var(--mt-ink)', 'font-size':'clamp(28px, 2.5vw, 32px)', 'font-weight':'600', 'letter-spacing':'-0.025em', 'line-height':'1.2'})
    s = css_rule(s, '.hero > .hero-grid .hero-copy .hero-text,\n.hero > .hero-grid .hero-copy > p,\n.hero > .hero-grid .hero-copy .hero-followup', {'color':'var(--mt-muted)', 'font-size':'16px'})
    s = css_rule(s, '.hero > .hero-grid .hero-panel', {'padding':'24px', 'border-left':'1px solid var(--mt-line)'})
    s = css_rule(s, '.compact-hero > .hero-grid .hero-copy', {'min-height':'0'})
    s = css_rule(s, '.page-shell h1,\n.legal-page h1,\n.v72-owner-strip h1,\n.v72-safe-state h1', {'font-size':'clamp(28px, 2.5vw, 32px)', 'font-weight':'600', 'letter-spacing':'-0.025em', 'line-height':'1.2'})
    s = css_rule(s, '.button', {'font-size':'14px', 'border':'1px solid var(--mt-line-dark)'})
    # Secondary controls remain quiet, while focus outlines and primary actions remain explicit.
    s = s.replace('border-color: var(--mt-ink) !important;\n  background: var(--mt-paper-strong) !important;', 'border-color: var(--mt-line-dark) !important;\n  background: var(--mt-paper-strong) !important;')
    s = css_rule(s, '.button-secondary:hover,\n.button-secondary:focus-visible', {'background':'var(--surface-muted) !important', 'color':'var(--mt-ink) !important'})
    s = css_rule(s, '.field > span,\n.field > label,\n.compact-field > span,\n.compact-field > label,\nfieldset > legend', {'font-family':'var(--font-body)', 'font-size':'13px', 'font-weight':'600', 'letter-spacing':'0', 'text-transform':'none'})
    s = s.replace('rgba(255, 253, 248, 0.94)', '#ffffff').replace('rgba(239, 235, 227, 0.84)', '#f1f3f5')
    return s
edit('src/app/canonical-visual-system.css', canonical)

def remediation(s):
    old = 'background-image:\n    linear-gradient(rgba(17, 17, 17, 0.035) 1px, transparent 1px),\n    linear-gradient(90deg, rgba(17, 17, 17, 0.035) 1px, transparent 1px) !important;'
    s = replace(s, old, 'background-image: none !important;')
    s = s.replace('border: 1px solid var(--mt-black) !important;', 'border: 1px solid var(--mt-line) !important;')
    s = s.replace('border-right: 1px solid var(--mt-black) !important;', 'border-right: 1px solid var(--mt-line) !important;')
    s = s.replace('border-bottom: 1px solid var(--mt-black) !important;', 'border-bottom: 1px solid var(--mt-line) !important;')
    s = s.replace('rgba(255, 253, 248, 0.92)', '#ffffff').replace('rgba(255, 253, 248, 0.9)', '#ffffff')
    return s
edit('src/app/canonical-visual-system-remediation.css', remediation)

# Standalone creation shell uses its existing canonical stylesheet and existing repair rules.
def static_css(s):
    s = s.replace('#f5f2e9', '#f7f8fa').replace('#fffdf8', '#ffffff').replace('#c7c5bd', '#e0e3e8').replace('#8d8b84', '#b8bec8')
    s = replace(s, 'background-image:\n    linear-gradient(rgba(17, 17, 17, 0.035) 1px, transparent 1px),\n    linear-gradient(90deg, rgba(17, 17, 17, 0.035) 1px, transparent 1px) !important;', 'background-image: none !important;')
    s = css_rule(s, '.screen.active .stage,\n.summary-stage', {'border':'1px solid var(--line) !important', 'background':'#ffffff !important'})
    s = css_rule(s, '.intro', {'border-right-color':'var(--line) !important', 'background':'#ffffff !important', 'color':'#111111 !important', 'min-height':'0 !important'}, count=2)
    s = css_rule(s, '.intro h1,\n.summary-head h1', {'color':'#111111 !important', 'font-family':'var(--sans, system-ui, sans-serif) !important', 'font-weight':'600 !important', 'font-size':'clamp(28px, 2.5vw, 32px) !important', 'max-width':'26ch', 'letter-spacing':'-0.025em !important', 'line-height':'1.2 !important'})
    s = css_rule(s, '.intro-copy,\n.intro p', {'color':'#606773 !important', 'font-size':'16px', 'line-height':'1.5'})
    s = s.replace('border-bottom: 1px solid #111111 !important;', 'border-bottom: 1px solid var(--line) !important;')
    # Keep summary text readable if its owning stylesheet uses a dark panel.
    s += '\n/* Operational summary copy uses the same neutral surface as the form. */\n.summary-head { background: #ffffff !important; color: #111111 !important; }\n.ambient-circle { display: none; }\n'
    return s
edit('public/moral-trade-canonical-static.css', static_css)

def create_repairs(s):
    s = s.replace('#fffdf8', '#ffffff')
    s = replace(s, 'justify-content: center;\n  align-self: stretch;', 'justify-content: flex-start;\n  align-self: stretch;')
    s = replace(s, 'font-size: clamp(2.25rem, 3.4vw, 3.5rem);', 'font-size: clamp(28px, 2.5vw, 32px);')
    s = replace(s, 'max-width: 12ch;', 'max-width: 22ch;')
    s = replace(s, 'font-size: clamp(2rem, 5.5vw, 3rem);', 'font-size: 28px;')
    s = s.replace('1px solid var(--ink)', '1px solid var(--line)')
    return s
edit('public/moral-trade-create/ui-repairs.css', create_repairs)

# Remove the homepage introduction, not merely its visibility. Keep creation as a compact control.
def home_core(s):
    s = replace(s, "<section class=\"page\">${pageHead('What needs you now.', 'Review live opportunities and plan your next action.', 'Create offer')}\n    ${tab([['focus', 'Focus'], ['plan', 'Plan resources']], 'now', 'now')}", "<section class=\"page\" aria-label=\"Home\"><div class=\"mt-home-controls\">\n    ${tab([['focus', 'Focus'], ['plan', 'Plan resources']], 'now', 'now')}\n    <a class=\"btn primary\" data-home-create=\"true\" href=\"/trades/new\">Create offer</a></div>")
    s = replace(s, 'body{background-image:linear-gradient(rgba(0,0,0,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.025) 1px,transparent 1px);background-size:14px 14px}', 'body{background-image:none;font-size:16px;line-height:1.5}')
    s = s.replace('--paper:#f5f2e9;--paper2:#fbfaf6;', '--paper:#f7f8fa;--paper2:#ffffff;')
    s = s.replace('--muted:#6d6962;--line:#b9b4aa;', '--muted:#606773;--line:#e0e3e8;')
    s = s.replace('--lime:#b8d92c;', '--lime:#477d60;')
    s = s.replace('background:rgba(251,250,246,.88)', 'background:#ffffff')
    s = s.replace('.btn:hover{transform:translateY(-1px);box-shadow:0 5px 15px rgba(0,0,0,.08)}', '.btn:hover{border-color:var(--blue)}')
    s = s.replace('class="panel black urgent"><div><div class="eyebrow orange">Loading your profile</div><h2>Finding live moral opportunities that match your priorities and action preferences.</h2>', 'class="mt-feed-empty" role="status"><div><h2>Loading opportunities…</h2>')
    return s
edit('public/moral-trade-live-core.txt', home_core)
digest = hashlib.sha256(Path('public/moral-trade-live-core.txt').read_bytes()).hexdigest()
edit('public/moral-trade-live.html', lambda s: replace(s, 'ebb1b80435aef391bbef6fd423544ee34bdf5cf1fe7bff6a4370f680c738d396', digest).replace('background:#f5f2e9', 'background:#f7f8fa'))

def empty_renderer(s):
    start = s.index('  function renderEmptyState() {')
    end = s.index('  function weightedPriorityChips()', start)
    return s[:start] + '''  function renderEmptyState() {
    const content = emptyStateContent();

    return `<div class="focus-layout mt-feed-layout" data-mt-live-now="adaptive" data-mt-live-now-state="${escapeHtml(model.status)}"><main class="mt-feed-main">
      <section class="mt-feed-empty" aria-label="Feed status">
        <div><h2>${escapeHtml(content.title)}</h2><p>${escapeHtml(content.copy)}</p></div>
        <div class="mt-feed-empty-actions"><a class="btn primary" href="${escapeHtml(content.primaryHref)}">${escapeHtml(content.primaryLabel)}</a><a class="mt-feed-secondary-link" href="${escapeHtml(content.secondaryHref)}">${escapeHtml(content.secondaryLabel)}</a></div>
      </section>
      ${renderOwnedOpportunities()}
      <details class="mt-feed-explanation">
        <summary>How matching works</summary>
        <div class="mt-feed-explanation-body">
          <p>Your priorities select the benefit. Your action model estimates the burden.</p>
          <p><strong>Explicit choices remain authoritative.</strong> Optional viewing activity can suggest relevance, but it does not become a stated priority or willingness signal. Easy/hard feedback is explicit action feedback.</p>
          <p>${content.facts.map((fact) => escapeHtml(fact)).join(" · ")}</p>
          ${sidePanel("Profile basis", model.profile.causes, "")}
          ${sidePanel("Feed rule", ["No guessed priorities", "No demo records", "No invented counterparties"], "")}
          <a class="mt-feed-secondary-link" href="/profile/priorities">Review profile →</a>
        </div>
      </details>
    </main></div>`;
  }

''' + s[end:]
edit('public/moral-trade-live-now.js', empty_renderer)

def feed_css(s):
    s = s.replace('--mt-feed-paper: #fffef9;', '--mt-feed-paper: #ffffff;').replace('--mt-feed-muted: #625f58;', '--mt-feed-muted: #606773;').replace('--mt-feed-lime: #b8d92c;', '--mt-feed-lime: #477d60;')
    s = css_rule(s, '.mt-feed-toolbar', {'padding':'12px 0 18px', 'border':'0', 'border-bottom':'1px solid var(--mt-feed-border)', 'background':'transparent', 'box-shadow':'none'})
    s = css_rule(s, '.mt-feed-toolbar-title h2', {'font-family':'var(--sans)', 'font-size':'22px', 'line-height':'1.3', 'font-weight':'600'})
    s = css_rule(s, '.mt-feed-toolbar-title p', {'font-size':'12px'})
    s += '''
/* Owned feed components: compact states and controls, without hiding the state or its recovery paths. */
.mt-home-controls { display: flex; align-items: center; justify-content: space-between; gap: 16px; max-width: 980px; margin: 0 auto 24px; border-bottom: 1px solid var(--line); padding-bottom: 12px; }
.mt-home-controls > .tabs { flex: 1; min-width: 0; margin: 0; border: 0; }
.mt-home-controls > .btn { font-size: 14px; min-height: 44px; }
.mt-feed-empty { display: grid; gap: 20px; padding: 24px; border: 1px solid var(--mt-feed-border, #e0e3e8); background: #ffffff; color: #111111; }
.mt-feed-empty h2 { margin: 0; max-width: 40ch; font: 600 24px/1.3 var(--sans, system-ui, sans-serif); letter-spacing: -0.02em; }
.mt-feed-empty p { margin: 10px 0 0; max-width: 68ch; color: #606773; font: 400 15px/1.6 var(--sans, system-ui, sans-serif); }
.mt-feed-empty-actions { display: flex; align-items: center; flex-wrap: wrap; gap: 12px 20px; }
.mt-feed-empty-actions .btn { min-height: 44px; font-size: 14px; }
.mt-feed-secondary-link { color: var(--blue, #2450ff); font-size: 14px; text-underline-offset: 3px; }
.mt-feed-secondary-link:hover { text-decoration: underline; }
.mt-feed-explanation { margin-top: 20px; border-top: 1px solid var(--mt-feed-border); color: #606773; font-size: 14px; }
.mt-feed-explanation > summary { width: fit-content; cursor: pointer; padding: 14px 0; color: #515762; }
.mt-feed-explanation-body { display: grid; gap: 12px; padding: 0 0 20px; max-width: 70ch; }
.mt-feed-explanation-body p { margin: 0; line-height: 1.6; }
.mt-feed-explanation-body .side-card { border: 0; padding: 0; background: transparent; }
.mt-feed-explanation-body .side-row { font-size: 13px; border: 0; }
.mt-feed-explanation-body .side-card h4 { font-size: 12px; }
@media (max-width: 600px) {
  .mt-home-controls { gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
  .mt-home-controls > .tabs { gap: 16px; }
  .mt-home-controls > .tabs button { font-size: 14px; }
  .mt-feed-empty { padding: 20px; }
  .mt-feed-empty h2 { font-size: 22px; }
  .mt-feed-empty-actions { align-items: flex-start; flex-direction: column; }
}
'''
    return s
edit('public/moral-trade-live-feed.css', feed_css)

# Resolve the legacy Dashboard entry on the client so existing hash bookmarks keep working.
def new_file(path, content):
    p = Path(path)
    assert not p.exists(), path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content)
    changed.add(path)

new_file('src/lib/dashboard-entry.ts', '''/** Keep historical account-section bookmarks without making the heavy settings page the default. */
export function getDashboardEntryTarget(hash = ""): string {
  if (hash && hash !== "#" && hash !== "#priorities") {
    return `/dashboard?view=controls${hash.startsWith("#") ? hash : ""}`;
  }
  return "/profile/priorities?returnTo=%2Fdashboard%3Fview%3Dcontrols";
}
''')
new_file('src/lib/dashboard-entry.test.ts', '''import assert from "node:assert/strict";
import test from "node:test";
import { getDashboardEntryTarget } from "./dashboard-entry";

test("Dashboard opens the Profile-owned 100-spark editor by default", () => {
  assert.equal(getDashboardEntryTarget(), "/profile/priorities?returnTo=%2Fdashboard%3Fview%3Dcontrols");
  assert.equal(getDashboardEntryTarget("#priorities"), getDashboardEntryTarget());
});

test("Dashboard preserves existing control anchors without an external redirect", () => {
  for (const anchor of ["#payment-setup", "#privacy-controls", "#wish-profile", "#my-trades"]) {
    assert.equal(getDashboardEntryTarget(anchor), `/dashboard?view=controls${anchor}`);
  }
  assert.equal(getDashboardEntryTarget("https://example.com"), "/dashboard?view=controls");
});
''')
new_file('src/components/dashboard/dashboard-entry.tsx', '''"use client";

import Link from "next/link";
import { useEffect } from "react";
import { getDashboardEntryTarget } from "@/lib/dashboard-entry";

export function DashboardEntry() {
  useEffect(() => {
    window.location.replace(getDashboardEntryTarget(window.location.hash));
  }, []);

  return (
    <main className="page-shell page-shell-focused" aria-label="Profile priorities">
      <p role="status">Opening your priorities…</p>
      <p><Link href={getDashboardEntryTarget()}>Edit your 100 sparks</Link></p>
      <p><Link href="/dashboard?view=controls">Account controls</Link></p>
    </main>
  );
}
''')
edit('src/app/dashboard/page.tsx', lambda s: replace(replace(s, 'import Link from "next/link";', 'import Link from "next/link";\nimport { DashboardEntry } from "@/components/dashboard/dashboard-entry";'), '  const resolvedSearchParams = await searchParams;\n  const formMessage', '  const resolvedSearchParams = await searchParams;\n  if (Object.keys(resolvedSearchParams).length === 0) return <DashboardEntry />;\n  const formMessage'))

# Currency is an honest explanation and link, not a nonfunctional account-wide selector.
def priority_editor(s):
    needle = '        <div className={styles.mosaicLayout}>'
    nav = '''        <nav aria-label="Priority controls" className={styles.priorityUtilities}>
          <Link href="/profile">Profile</Link>
          <Link href="/dashboard?view=controls">Account controls</Link>
          <details>
            <summary>Currency</summary>
            <div>
              <p>An account-wide currency preference cannot be set here. Review the currency shown in each payment or agreement before proceeding.</p>
              <Link href="/dashboard?view=controls#payment-setup">Payment settings</Link>
            </div>
          </details>
        </nav>

'''
    return replace(s, needle, nav + needle)
edit('src/components/profile/profile-priority-editor.tsx', priority_editor)

def priority_css(s):
    s = s.replace('--paper: #f7f3eb;', '--paper: #f7f8fa;').replace('--paper-2: #fffdf8;', '--paper-2: #ffffff;')
    s = css_rule(s, '.profilePage', {'font-family':'var(--font-body, system-ui, sans-serif)'})
    s = css_rule(s, '.profileHeader', {'background':'#ffffff', 'border-bottom':'1px solid var(--rule)'})
    s = css_rule(s, '.introPanel h1', {'font-family':'var(--font-body, system-ui, sans-serif)', 'font-size':'clamp(28px, 2.5vw, 32px)', 'font-weight':'600', 'line-height':'1.2', 'letter-spacing':'-0.025em'})
    s = css_rule(s, '.introDescription', {'font-family':'var(--font-body, system-ui, sans-serif)', 'font-size':'16px', 'line-height':'1.5'})
    s = css_rule(s, '.primaryAction', {'font-size':'14px'})
    s += '''
.priorityUtilities { position: relative; z-index: 3; display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; padding: 14px 22px; border-bottom: 1px solid var(--rule); background: #fff; font-size: 14px; }
.priorityUtilities a { color: var(--blue); text-decoration: none; }
.priorityUtilities a:hover { text-decoration: underline; }
.priorityUtilities summary { cursor: pointer; }
.priorityUtilities details > div { max-width: 56ch; padding: 12px 0; line-height: 1.6; }
.priorityUtilities p { margin: 0 0 8px; }
'''
    return s
edit('src/components/profile/complete-profile-review.module.css', priority_css)

# Change only expectations made obsolete by the approved heading/palette change.
for path in ['tests/returning-homepage.spec.ts', 'tests/operational-retirement.spec.ts', 'tests/walkthrough.spec.ts', 'tests/sitewide-canonical-visual-system.spec.ts']:
    def heading_expectations(s):
        pattern = r'await expect\(page\.getByRole\("heading", \{[^{}]*name: "What needs you now\."[^{}]*\}\)\)\.toBeVisible\(\);'
        s, n = re.subn(pattern, 'await expect(page.locator(\'[data-mt-live-now="adaptive"]\')).toBeVisible();', s)
        assert n > 0, path
        if path.endswith('sitewide-canonical-visual-system.spec.ts'):
            s = replace(s, 'const PAPER = "rgb(245, 242, 233)";', 'const PAPER = "rgb(247, 248, 250)";')
            s = replace(s, 'await expect(page).toHaveURL(/\\/login\\?returnTo=%2Fdashboard$/);', 'await expect(page).toHaveURL(/\\/login\\?returnTo=%2Fprofile%2Fpriorities/);')
        return s
    edit(path, heading_expectations)

# The removed introduction no longer owns a clock; retain the narrow navigation/action coverage.
def narrow_test(s):
    s = s.replace('fresh homepage keeps date and navigation usable within', 'fresh homepage keeps controls and navigation usable within')
    s = replace(s, '    const date = page.locator(".head .date");\n    const create = page.locator(\'.head button[data-action="create"]\');', '    const create = page.locator(\'[data-home-create="true"]\');\n    await expect(page.locator(".head")).toHaveCount(0);')
    s = replace(s, '    await expect(date.locator("time")).toHaveText("Wednesday, September 23, 2026");\n', '')
    return replace(s, '[date, create, ...await navigation.all()]', '[create, ...await navigation.all()]')
edit('tests/homepage-narrow-header.spec.ts', narrow_test)

new_file('tests/quiet-ui.spec.ts', '''import { expect, test } from "@playwright/test";

for (const width of [1440, 390, 320]) {
  test(`quiet homepage preserves recovery and controls at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    const feed = page.locator('[data-mt-live-now="adaptive"]');
    await expect(feed).toBeVisible();
    await expect(page.locator(".head")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);
    await expect(page.locator("body")).toHaveCSS("background-image", "none");
    await expect(page.locator("body")).toHaveCSS("background-color", "rgb(247, 248, 250)");
    const state = feed.locator(".mt-feed-empty");
    await expect(state).toBeVisible();
    await expect(state).toHaveCSS("background-color", "rgb(255, 255, 255)");
    expect((await state.boundingBox())!.height).toBeLessThan(width < 600 ? 420 : 280);
    await expect(state.locator("a")).toHaveCount(2);
    const explanation = feed.locator(".mt-feed-explanation");
    await expect(explanation).not.toHaveAttribute("open", "");
    await explanation.locator("summary").click();
    await expect(explanation).toHaveAttribute("open", "");
    await expect(explanation.getByText("No demo records", { exact: true })).toBeVisible();
    await explanation.locator("summary").click();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`quiet-home-${width}.png`), fullPage: false });
    await page.locator('[data-home-create="true"]').click();
    await expect(page).toHaveURL(/\\/trades\\/new/);
    const create = page.frameLocator('iframe[title="Moral Trade Create"]');
    await expect(create.locator("#causeHeading")).toBeVisible();
    const size = await create.locator("#causeHeading").evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size).toBeGreaterThanOrEqual(28);
    expect(size).toBeLessThanOrEqual(32);
    await expect(create.locator("body")).toHaveCSS("background-image", "none");
    await expect(create.locator("#screenCause .intro")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await page.screenshot({ path: testInfo.outputPath(`quiet-create-${width}.png`), fullPage: false });
    expect(errors).toEqual([]);
  });
}

test("Dashboard priority entry is authenticated and legacy anchors remain accessible", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\\/login\\?returnTo=%2Fprofile%2Fpriorities/);
  await expect(page.locator('[data-mt-surface="auth"]')).toBeVisible();
  await page.goto("/dashboard#payment-setup");
  // The legacy page keeps its existing server-side authentication boundary.
  await expect(page).toHaveURL(/\\/login\\?returnTo=%2Fdashboard/);
});
''')

Path('/tmp/quiet-ui-files.txt').write_text('\n'.join(sorted(changed)) + '\n')
print('\n'.join(sorted(changed)))
print('CORE_SHA256=' + digest)
