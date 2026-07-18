import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

type ClickEvent = { preventDefault: () => void };
type ClickListener = (event: ClickEvent) => void;

function createResetButton() {
  const attributes = new Map<string, string>();
  let clickListener: ClickListener | undefined;

  return {
    textContent: "↻ Reset",
    type: "submit",
    addEventListener(type: string, listener: ClickListener) {
      if (type === "click") clickListener = listener;
    },
    click() {
      let defaultPrevented = false;
      assert.ok(clickListener, "Reset should receive a click listener");
      clickListener({ preventDefault: () => (defaultPrevented = true) });
      return defaultPrevented;
    },
    getAttribute(name: string) {
      return attributes.get(name) ?? null;
    },
    setAttribute(name: string, value: string) {
      attributes.set(name, value);
    },
  };
}

test("the live Plan Resources bridge restores a fresh copy of the defaults", () => {
  const source = readFileSync("public/moral-trade-live-plan-reset.js", "utf8");
  const shell = readFileSync("public/moral-trade-live.html", "utf8");
  const defaults = {
    bio: { m: 70, h: 2, t: 3 },
    wild: { m: 80, h: 2, t: 4 },
    civic: { m: 50, h: 1, t: 2 },
    factory: { m: 30, h: 0, t: 1 },
  };
  const state = { alloc: structuredClone(defaults) };
  let currentButton = createResetButton();
  let observerCallback: (() => void) | undefined;
  let renderCount = 0;
  let toastMessage = "";

  const panel = {
    querySelectorAll(selector: string) {
      assert.equal(selector, "button");
      return [currentButton];
    },
  };
  const document = {
    documentElement: {},
    querySelector(selector: string) {
      assert.equal(selector, ".plan-control");
      return panel;
    },
  };
  class FakeMutationObserver {
    constructor(callback: () => void) {
      observerCallback = callback;
    }

    observe() {}
  }

  vm.runInNewContext(source, {
    MutationObserver: FakeMutationObserver,
    document,
    render() {
      renderCount += 1;
      currentButton = createResetButton();
      observerCallback?.();
    },
    state,
    toast(message: string) {
      toastMessage = message;
    },
    window: {},
  });

  assert.match(shell, /moral-trade-live-plan-reset\.js/);
  assert.equal(currentButton.type, "button");
  assert.equal(currentButton.getAttribute("data-mt-plan-reset"), "true");
  assert.equal(currentButton.getAttribute("aria-label"), "Reset plan resources to defaults");

  state.alloc.bio.m = 80;
  assert.equal(currentButton.click(), true);
  assert.deepEqual(JSON.parse(JSON.stringify(state.alloc)), defaults);
  assert.equal(renderCount, 1);
  assert.equal(toastMessage, "Plan resources reset to defaults.");

  state.alloc.bio.m = 90;
  assert.equal(currentButton.click(), true);
  assert.deepEqual(JSON.parse(JSON.stringify(state.alloc)), defaults);
  assert.equal(renderCount, 2);
});
