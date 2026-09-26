from pathlib import Path
import sys

root = Path(sys.argv[1]).resolve()


def replace_once(path: str, old: str, new: str) -> None:
    file_path = root / path
    text = file_path.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"expected one match in {path}, found {count}: {old[:80]!r}")
    file_path.write_text(text.replace(old, new, 1))


identity = "public/moral-trade-account-identity.js"
replace_once(
    identity,
    '  const ROOT_SELECTOR = \'.topbar,[role="banner"],header\';\n',
    '  const ROOT_SELECTOR = \'.topbar,[role="banner"],header\';\n'
    '  const GUEST_ONLY_SELECTOR = \'[data-mt-guest-only="true"]\';\n',
)
replace_once(
    identity,
    '  let scheduled = false;\n',
    '  let identityResolved = hasBootstrap;\n'
    '  let scheduled = false;\n',
)
replace_once(
    identity,
    '  function patchLegacyGreetings() {\n',
    '  function patchGuestOnlyActions() {\n'
    '    const shouldShow = identityResolved && !identity.authenticated;\n\n'
    '    document.querySelectorAll(GUEST_ONLY_SELECTOR).forEach((element) => {\n'
    '      element.hidden = !shouldShow;\n'
    '      element.toggleAttribute("aria-hidden", !shouldShow);\n'
    '    });\n'
    '  }\n\n'
    '  function patchLegacyGreetings() {\n',
)
replace_once(
    identity,
    '  function patchAll() {\n'
    '    patchAvatarCandidates();\n',
    '  function patchAll() {\n'
    '    patchGuestOnlyActions();\n'
    '    patchAvatarCandidates();\n',
)
replace_once(
    identity,
    '      .then((payload) => {\n'
    '        identity = normalizeIdentity(payload);\n'
    '        schedulePatch();\n'
    '      });\n',
    '      .then((payload) => {\n'
    '        identity = normalizeIdentity(payload);\n'
    '        identityResolved = true;\n'
    '        schedulePatch();\n'
    '      });\n',
)

navigation = "public/moral-trade-live-navigation.js"
replace_once(
    navigation,
    '        // This is an entry link, not an authentication assertion or a new signup flow.\n'
    '        const start = document.createElement("a");\n'
    '        start.className = "header-start";\n'
    '        start.href = "/start";\n',
    '        // The shared identity bridge reveals this only after signed-out status is known.\n'
    '        const start = document.createElement("a");\n'
    '        start.className = "header-start";\n'
    '        start.dataset.mtGuestOnly = "true";\n'
    '        start.hidden = true;\n'
    '        start.href = "/start";\n',
)

replace_once(
    "public/moral-trade-discover.html",
    '    <a class="header-start" href="/start">Get Started</a>\n',
    '    <a class="header-start" data-mt-guest-only="true" hidden href="/start">Get Started</a>\n',
)

css_path = root / "public/moral-trade-refined-header.css"
css = css_path.read_text()
rule = '''\n/* Static headers reveal acquisition actions only after account state resolves. */\nbody .mt-refined-header [data-mt-guest-only="true"][hidden] {\n  display: none !important;\n}\n'''
if rule.strip() in css:
    raise SystemExit("guest-only header rule already exists")
css_path.write_text(css.rstrip() + "\n" + rule)

helper = "tests/helpers/discover.ts"
replace_once(
    helper,
    'export async function mockAccount(page: Page) {\n'
    '  await page.route("**/api/live-account", (route) => fulfill(route, { authenticated: false }));\n'
    '}\n',
    'export async function mockAccount(page: Page, authenticated = false) {\n'
    '  await page.route("**/api/live-account", (route) => fulfill(route, {\n'
    '    authenticated,\n'
    '    ...(authenticated ? {\n'
    '      account: {\n'
    '        displayName: "Authenticated Tester",\n'
    '        firstName: "Authenticated",\n'
    '        initials: "AT",\n'
    '      },\n'
    '    } : {}),\n'
    '  }));\n'
    '}\n',
)
replace_once(
    helper,
    'export async function mockInventory(page: Page, resolve: (body: BrowseRequest) => Record<string, unknown> = (body) => responseFor(body)) {\n'
    '  const requests: BrowseRequest[] = [];\n'
    '  await mockAccount(page);\n',
    'export async function mockInventory(\n'
    '  page: Page,\n'
    '  resolve: (body: BrowseRequest) => Record<string, unknown> = (body) => responseFor(body),\n'
    '  authenticated = false,\n'
    ') {\n'
    '  const requests: BrowseRequest[] = [];\n'
    '  await mockAccount(page, authenticated);\n',
)

account_test = "src/sitewide-account-identity.test.ts"
replace_once(
    account_test,
    'const liveAccountBridge = readFileSync("public/moral-trade-live-account.js", "utf8");\n',
    'const liveAccountBridge = readFileSync("public/moral-trade-live-account.js", "utf8");\n'
    'const liveNavigation = readFileSync("public/moral-trade-live-navigation.js", "utf8");\n'
    'const refinedHeaderCss = readFileSync("public/moral-trade-refined-header.css", "utf8");\n',
)
append_after = '''test("the shared bridge replaces every rendered legacy avatar, including later page renders", () => {
  assert.match(identityBridge, /const visibleValue = identity\\.authenticated && identity\\.initials/u);
  assert.match(identityBridge, /for \\(const avatar of findAvatarCandidates\\(\\)\\)/u);
  assert.match(identityBridge, /querySelectorAll\\(ROOT_SELECTOR\\)/u);
  assert.match(identityBridge, /data-mt-account-avatar/u);
  assert.match(identityBridge, /data-mt-live-account-avatar/u);
  assert.match(identityBridge, /new MutationObserver\\(schedulePatch\\)/u);
  assert.match(identityBridge, /closest\\("button,a"\\)/u);
});
'''
new_test = append_after + '''

test("static Get Started actions fail closed until signed-out identity is resolved", () => {
  const discover = shells.get("discover") || "";
  assert.match(discover, /data-mt-guest-only="true" hidden href="\\/start"/u);
  assert.match(liveNavigation, /start\\.dataset\\.mtGuestOnly = "true"/u);
  assert.match(liveNavigation, /start\\.hidden = true/u);
  assert.match(identityBridge, /let identityResolved = hasBootstrap/u);
  assert.match(identityBridge, /identityResolved && !identity\\.authenticated/u);
  assert.match(identityBridge, /element\\.hidden = !shouldShow/u);
  assert.match(identityBridge, /identityResolved = true/u);
  assert.match(refinedHeaderCss, /\\[data-mt-guest-only="true"\\]\\[hidden\\][\\s\\S]*display: none !important/u);
});
'''
replace_once(account_test, append_after, new_test)

browser_test = "tests/refined-header.spec.ts"
replace_once(
    browser_test,
    'import { mockAccount, mockInventory } from "./helpers/discover";\n',
    'import { mockAccount, mockInventory, responseFor } from "./helpers/discover";\n',
)
anchor = '''test("Profile owns priorities and a legacy Sparks URL preserves the authenticated editor", async ({ page }) => {
'''
auth_test = '''for (const route of ["/feed", "/discover"] as const) {
  test(`Get Started is hidden after authenticated identity resolves at ${route}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    if (route === "/discover") {
      await mockInventory(page, (body) => responseFor(body), true);
    } else {
      await mockAccount(page, true);
    }
    await page.goto(route, { waitUntil: "domcontentloaded" });
    const header = page.locator(".mt-refined-header").first();
    await expect(header.locator('[data-mt-account-avatar="true"]').first()).toHaveText("AT");
    await expect(header.locator('[data-mt-guest-only="true"]')).toHaveCount(1);
    await expect(header.locator(".header-start")).toBeHidden();
  });
}

''' + anchor
replace_once(browser_test, anchor, auth_test)
