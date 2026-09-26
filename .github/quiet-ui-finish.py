"""Complete responsive owning-style corrections; never alter data or release gates."""
from pathlib import Path
import re

def rule(s, selector, props):
    header = r'\n[ \t]*'.join(re.escape(line.strip()) for line in selector.splitlines())
    pattern = re.compile(r'(?m)^([ \t]*' + header + r'\s*\{)([^{}]*)(\})')
    found = list(pattern.finditer(s))
    assert found, selector
    def patch(m):
        body = m[2]
        for key, value in props.items():
            prop = re.compile(r'(?<![\w-])' + re.escape(key) + r'\s*:[^;{}]+;?')
            assert len(list(prop.finditer(body))) <= 1, (selector, key)
            declaration = f'{key}: {value};'
            if prop.search(body):
                body = prop.sub(declaration, body)
            else:
                body = body.rstrip() + '\n  ' + declaration + '\n'
        return m[1] + body + m[3]
    return pattern.sub(patch, s)

p = Path('src/app/canonical-visual-system.css')
s = p.read_text()
s = rule(s, '.hero > .hero-grid .hero-copy h1,\n.hero > .hero-grid .hero-copy h2', {'font-size':'clamp(28px, 2.5vw, 32px)', 'line-height':'1.2'})
s, count = re.subn(r'background-image:\s*linear-gradient\(rgba\(17, 17, 17, 0\.035\)[^;]+;', 'background-image: none !important;', s)
assert count == 2, ('specialized grid surfaces', count)
for selector in [
    '.mpgf-panel-primary',
    '[class*="labsBanner"]',
    '[data-mt-surface="connectors"] > section:first-child',
    '[data-mt-surface="pledge-swaps"] > section:first-child > div:first-child',
    '[data-mt-surface="public-receipt"] > article > header',
    '[data-mt-surface="complete-profile"] [class*="introPanel"]',
    '[data-mt-surface="mpgf-labs"] [class*="headerBlock"],\n[data-mt-surface="mpgf-labs"] [class*="labsBanner"]',
]:
    s = rule(s, selector, {'background':'var(--mt-paper-strong) !important', 'color':'var(--mt-ink) !important', 'border-color':'var(--mt-line) !important'})
for selector in [
    '.mpgf-panel-primary :where(h1, h2, h3, h4, strong)',
    '[data-mt-surface="connectors"] > section:first-child h1',
    '[data-mt-surface="pledge-swaps"] > section:first-child > div:first-child h1',
    '[data-mt-surface="public-receipt"] > article > header h1',
    '[data-mt-surface="complete-profile"] [class*="introPanel"] :where(h1, h2, h3, strong)',
]:
    s = rule(s, selector, {'color':'var(--mt-ink) !important'})
for selector in [
    '.mpgf-panel-primary :where(p, small, span)',
    '[data-mt-surface="connectors"] > section:first-child :where([class*="lead"])',
    '[data-mt-surface="pledge-swaps"] > section:first-child > div:first-child :where(p, span)',
    '[data-mt-surface="public-receipt"] > article > header :where(p)',
    '[data-mt-surface="complete-profile"] [class*="introPanel"] :where(p, span)',
]:
    s = rule(s, selector, {'color':'var(--mt-muted)' + (' !important' if 'lead' in selector or 'header :where' in selector else '')})
s = rule(s, '[data-mt-surface="connectors"] > section:first-child :where([class*="kicker"])', {'color':'var(--mt-blue) !important'})
s = rule(s, '[data-mt-surface="connectors"] > section:first-child > div:first-child', {'padding':'28px'})
s = rule(s, '[data-mt-surface="connectors"] > section:first-child h1', {'font-size':'clamp(28px, 2.5vw, 32px)', 'line-height':'1.2'})
p.write_text(s)

p = Path('public/moral-trade-canonical-static.css')
s = rule(p.read_text(), '.intro .step-label,\n.summary-head .step-label,\n.fund-mode-kicker', {'color':'#2450ff !important'})
p.write_text(s)
p = Path('public/moral-trade-live-feed.css')
s = p.read_text()
s = rule(s, '.mt-feed-card,\n.mt-owned-card', {'box-shadow':'none'})
s = rule(s, '.mt-feed-card:hover,\n.mt-owned-card:hover', {'box-shadow':'none'})
s = rule(s, '.mt-feed-card h3,\n.mt-owned-card h3', {'font-family':'var(--sans)', 'font-size':'clamp(20px, 2vw, 22px)', 'font-weight':'600', 'line-height':'1.25'})
s = rule(s, '.mt-feed-mechanism-node', {'border':'0', 'padding':'8px 0', 'background':'transparent'})
s = rule(s, '.mt-feed-mechanism-node.is-outcome', {'border-color':'transparent', 'background':'transparent'})
s = rule(s, '.mt-feed-mechanism-node b', {'font-size':'13px', 'line-height':'1.4'})
s = rule(s, '.mt-feed-signal', {'border':'0', 'padding':'4px 0'})
s = rule(s, '.mt-owned-feed', {'padding':'0', 'border':'0', 'background':'transparent'})
p.write_text(s)

for filename in ['src/app/canonical-visual-system.css', 'public/moral-trade-canonical-static.css', 'public/moral-trade-live-feed.css']:
    p = Path(filename)
    p.write_text('\n'.join(line.rstrip() for line in p.read_text().splitlines()) + '\n')

# These are exact palette/size contracts, not relaxed interaction or containment checks.
p = Path('tests/create-route-ui-regression.spec.ts')
s = p.read_text().replace('rgb(255, 253, 248)', 'rgb(255, 255, 255)')
s = s.replace('expect(layout.fontSize).toBeLessThanOrEqual(56.1);', 'expect(layout.fontSize).toBeLessThanOrEqual(32.1);')
s = s.replace('expect(layout.fontSize).toBeGreaterThanOrEqual(32);', 'expect(layout.fontSize).toBeGreaterThanOrEqual(28);')
p.write_text(s)
p = Path('tests/quiet-ui.spec.ts')
s = p.read_text().replace('await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);', '''// Keep the existing screen-reader document heading without restoring a visual introduction.
    await expect(page.locator(".page h1")).toHaveCount(0);
    await expect(page.locator("#mt-live-document-heading")).toHaveCSS("position", "absolute");
    const documentHeading = await page.locator("#mt-live-document-heading").boundingBox();
    expect(documentHeading!.width).toBeLessThanOrEqual(1);
    expect(documentHeading!.height).toBeLessThanOrEqual(1);''')
p.write_text(s)
print('Responsive styles, palette contracts and screen-reader preservation updated.')
