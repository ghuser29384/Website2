import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const source = readFileSync("public/moral-trade-live-account.js", "utf8");

// Exercise the production functions without installing a second DOM library.
// Real browser interaction coverage lives in tests/live-account-controls.spec.ts.
class ElementStub {
  tagName: string;
  className = "btn small";
  id = "";
  type = "";
  hidden = false;
  style = { cssText: "" };
  attributes = new Map<string, string>();
  listeners = new Map<string, (() => void)[]>();
  textWrites = 0;
  private text = "";
  replaceWith: (replacement: ElementStub) => void = () => {};

  constructor(tag: string) { this.tagName = tag.toUpperCase(); }
  get textContent() { return this.text; }
  set textContent(value: string) { this.text = value; this.textWrites += 1; }
  getAttribute(name: string) { return this.attributes.get(name) ?? null; }
  setAttribute(name: string, value: string) { this.attributes.set(name, String(value)); }
  addEventListener(name: string, listener: () => void) {
    this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
  }
  click() { for (const listener of this.listeners.get("click") ?? []) listener(); }
}

function makeRow(label = "Monthly safe cap") {
  let action = new ElementStub("button");
  action.textContent = "Status";
  action.setAttribute("disabled", "");
  action.setAttribute("aria-disabled", "true");
  action.setAttribute("aria-pressed", "false");
  action.setAttribute("onclick", "oldPrototypeHandler()");
  action.setAttribute("data-action", "prototype-toggle");
  action.replaceWith = (replacement) => { action = replacement; };
  const helps = new Map<string, ElementStub>();
  return {
    get action() { return action; },
    helps,
    querySelector(selector: string) {
      return selector === "button,a" ? action : { textContent: label };
    },
    parentElement: {
      querySelector(selector: string) {
        return helps.get(selector.match(/="([^"]+)"/)?.[1] ?? "") ?? null;
      },
    },
    insertAdjacentElement(position: string, element: ElementStub) {
      assert.equal(position, "afterend");
      helps.set(element.getAttribute("data-mt-live-account-help")!, element);
    },
  };
}

type Row = ReturnType<typeof makeRow>;
type Panel = { querySelector: (selector: string) => ElementStub | null };
interface AccountHarness {
  configureAction: (row: Row, key: string) => void;
  patchManageAccount: (panel: Panel) => void;
  termsHref: () => string;
  setAccount: (payload: unknown) => void;
}

function loadBridge(payload: unknown = { authenticated: true }) {
  const window = {
    __MT_LIVE_ACCOUNT_BOOTSTRAP__: payload,
    requestAnimationFrame() {},
    addEventListener() {},
    __accountTest: undefined as AccountHarness | undefined,
  };
  const instrumented = source.replace(/\}\)\(\);\s*$/, `
    window.__accountTest = {
      configureAction, patchManageAccount, termsHref,
      setAccount(payload) { account = normalizePayload(payload); }
    };
  })();`);
  assert.notEqual(instrumented, source, "Expose helpers inside the test VM only");
  vm.runInNewContext(instrumented, {
    window,
    document: {
      documentElement: {},
      addEventListener() {},
      createElement: (tag: string) => new ElementStub(tag),
    },
    MutationObserver: class { observe() {} },
  });
  assert.ok(window.__accountTest);
  return window.__accountTest;
}

const destinations = {
  "payment-account": "/dashboard#payment-setup",
  notifications: "/dashboard#privacy-controls",
  "public-trust": "/dashboard#wish-profile",
  privacy: "/dashboard#privacy-controls",
};

for (const [key, href] of Object.entries(destinations)) {
  test(`${key}: authenticated action replaces the disabled prototype with a link`, () => {
    const bridge = loadBridge();
    const row = makeRow();
    const original = row.action;
    bridge.configureAction(row, key);
    assert.notEqual(row.action, original);
    assert.equal(row.action.tagName, "A");
    assert.equal(row.action.getAttribute("href"), href);
    for (const attribute of ["disabled", "aria-disabled", "aria-pressed", "onclick", "data-action"]) {
      assert.equal(row.action.getAttribute(attribute), null, attribute);
    }
    assert.match(row.action.textContent, /^(Manage|Review)$/);
    assert.equal(row.helps.size, 0);
  });
}

test("signed-out navigation preserves each destination, including its fragment", () => {
  const bridge = loadBridge({ authenticated: false });
  for (const [key, href] of Object.entries(destinations)) {
    const row = makeRow();
    bridge.configureAction(row, key);
    assert.equal(row.action.textContent, "Sign in");
    assert.equal(row.action.getAttribute("href"), `/login?returnTo=${encodeURIComponent(href)}`);
  }
});

test("truthy non-boolean authentication is not accepted", () => {
  const bridge = loadBridge({ authenticated: "true" });
  const row = makeRow();
  bridge.configureAction(row, "payment-account");
  assert.equal(row.action.textContent, "Sign in");
});

for (const [key, message] of Object.entries({
  currency: /currency preference cannot be set here/,
  "safe-cap": /No monthly spending limit is enforced/,
  dispute: /does not assign a resolver/,
})) {
  test(`${key}: explanation expands and collapses without a pretend setting change`, () => {
    const bridge = loadBridge();
    const row = makeRow();
    bridge.configureAction(row, key);
    const action = row.action;
    const help = row.helps.get(key)!;
    assert.equal(action.tagName, "BUTTON");
    assert.equal(action.type, "button");
    assert.equal(action.textContent, "Details");
    assert.equal(action.getAttribute("disabled"), null);
    assert.equal(action.getAttribute("aria-expanded"), "false");
    assert.equal(action.getAttribute("aria-controls"), help.id);
    assert.match(help.textContent, message);
    assert.equal(help.hidden, true);
    action.click();
    assert.equal(help.hidden, false);
    assert.equal(action.getAttribute("aria-expanded"), "true");
    for (let i = 0; i < 20; i += 1) bridge.configureAction(row, key);
    assert.equal(row.helps.size, 1);
    assert.equal(action.listeners.get("click")?.length, 1);
    assert.equal(row.action, action);
    assert.equal(action.textWrites, 1);
    assert.equal(help.textWrites, 1);
    assert.equal(help.hidden, false);
    action.click();
    assert.equal(help.hidden, true);
    assert.equal(action.getAttribute("aria-expanded"), "false");
  });
}

test("repeated patches preserve links, focus targets, and settled text nodes", () => {
  const bridge = loadBridge();
  for (const key of [...Object.keys(destinations), "terms"]) {
    const row = makeRow();
    bridge.configureAction(row, key);
    const action = row.action;
    for (let i = 0; i < 20; i += 1) bridge.configureAction(row, key);
    assert.equal(row.action, action);
    assert.equal(action.textWrites, 1, `${key} must not feed the childList observer`);
  }
});

test("terms remain public and allow only safe same-origin paths", () => {
  for (const href of ["/terms", "/terms?version=2#payments"]) {
    const bridge = loadBridge({ authenticated: false, account: { standardTerms: { href } } });
    const row = makeRow();
    bridge.configureAction(row, "terms");
    assert.equal(row.action.getAttribute("href"), href);
    assert.equal(row.action.textContent, "View");
  }
  for (const href of ["javascript:alert(1)", "https://example.org", "//example.org", "/\\example.org", "/terms\nunsafe", "/terms\u007f"]) {
    const bridge = loadBridge({ account: { standardTerms: { href } } });
    assert.equal(bridge.termsHref(), "/terms", href);
  }
});

test("manage-account footer is idempotent and routes signed-out users to login", () => {
  const bridge = loadBridge();
  const action = new ElementStub("a");
  action.textContent = "Manage account";
  action.setAttribute("href", "/dashboard");
  const panel = { querySelector: () => action };
  bridge.patchManageAccount(panel);
  assert.equal(action.getAttribute("href"), "/dashboard");
  assert.equal(action.textWrites, 1);
  bridge.setAccount({ authenticated: false });
  bridge.patchManageAccount(panel);
  bridge.patchManageAccount(panel);
  assert.equal(action.getAttribute("href"), "/login?returnTo=%2Fdashboard");
  assert.equal(action.textContent, "Sign in");
  assert.equal(action.textWrites, 2);
});

test("drawer adapter has no write endpoint, storage mutation, or fake toggle", () => {
  assert.doesNotMatch(source, /method:\s*["'](?:POST|PATCH|PUT|DELETE)["']/i);
  assert.doesNotMatch(source, /localStorage\.setItem|sessionStorage\.setItem/);
  assert.doesNotMatch(source, /action\.disabled\s*=\s*true|actionLabel\s*=\s*["'](?:On|Off)/);
  assert.match(source, /text\.includes\("manage account"\)/);
});
