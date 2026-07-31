import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import vm from "node:vm";
import { gunzipSync } from "node:zlib";

const projectRoot = process.cwd();
const runtimeSource = readFileSync(
  join(projectRoot, "public", "moral-trade-discover-local-time.js"),
  "utf8",
);

type RuntimeApi = {
  daysUntil(value: string, now?: string): number;
  formatToday(now?: string): string;
  parseDatePhrase(text: string, now?: string): string;
  todayISO(now?: string): string;
  transformSource(source: string): string;
};

function readDiscoverPayload() {
  const encoded = Array.from({ length: 7 }, (_, index) =>
    readFileSync(join(projectRoot, "public", "discover", "payload", `${index}.txt`), "utf8"),
  ).join("");
  return gunzipSync(Buffer.from(encoded, "base64")).toString("utf8");
}

function extractInlineLoader(html: string) {
  const openingTag = "<script>";
  const closingTag = "</script>";
  const openingIndex = html.indexOf(openingTag);
  assert.notEqual(openingIndex, -1, "Discover should contain an inline loader.");
  const contentStart = openingIndex + openingTag.length;
  const closingIndex = html.indexOf(closingTag, contentStart);
  assert.notEqual(closingIndex, -1, "Discover should close its inline loader.");
  return html.slice(contentStart, closingIndex);
}

function extractNamedFunction(source: string, name: string) {
  const functionStart = source.indexOf(`function ${name}(`);
  assert.notEqual(functionStart, -1, `${name} should be defined in the Discover loader.`);

  const asyncStart = source.lastIndexOf("async ", functionStart);
  const declarationStart =
    asyncStart >= 0 && asyncStart + "async ".length === functionStart ? asyncStart : functionStart;
  const bodyStart = source.indexOf("{", functionStart);
  assert.notEqual(bodyStart, -1, `${name} should have a function body.`);

  let depth = 0;
  let quote: "'" | '"' | "`" | null = null;
  let escaped = false;

  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (character === "\\") {
        escaped = true;
        continue;
      }
      if (character === quote) quote = null;
      continue;
    }

    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }
    if (character === "{") {
      depth += 1;
      continue;
    }
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(declarationStart, index + 1);
    }
  }

  assert.fail(`${name} should have a complete function body.`);
}

function withTimeZone<T>(timeZone: string, run: () => T) {
  const previous = process.env.TZ;
  process.env.TZ = timeZone;
  try {
    return run();
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
}

function createRuntimeHarness(initialInstant = "2026-07-20T12:00:00.000Z") {
  let now = new Date(initialInstant).getTime();
  let visibilityState = "visible";
  const windowListeners = new Map<string, Set<(event: unknown) => void>>();
  const documentListeners = new Map<string, Set<(event: unknown) => void>>();
  const intervals: Array<{ callback: () => void; delay: number }> = [];
  const emittedEvents: Array<{ type: string; detail?: unknown }> = [];

  class FakeDate extends Date {
    constructor(value?: string | number | Date) {
      super(value === undefined ? now : value);
    }

    static now() {
      return now;
    }
  }

  class FakeCustomEvent {
    type: string;
    detail: unknown;

    constructor(type: string, init?: { detail?: unknown }) {
      this.type = type;
      this.detail = init?.detail;
    }
  }

  class FakeMutationObserver {
    observe() {}
    disconnect() {}
  }

  const addListener = (
    listeners: Map<string, Set<(event: unknown) => void>>,
    type: string,
    listener: (event: unknown) => void,
  ) => {
    const existing = listeners.get(type) ?? new Set();
    existing.add(listener);
    listeners.set(type, existing);
  };
  const removeListener = (
    listeners: Map<string, Set<(event: unknown) => void>>,
    type: string,
    listener: (event: unknown) => void,
  ) => listeners.get(type)?.delete(listener);

  const document = {
    documentElement: {},
    get visibilityState() {
      return visibilityState;
    },
    querySelectorAll: () => [],
    addEventListener: (type: string, listener: (event: unknown) => void) =>
      addListener(documentListeners, type, listener),
    removeEventListener: (type: string, listener: (event: unknown) => void) =>
      removeListener(documentListeners, type, listener),
  };
  const window = {
    CustomEvent: FakeCustomEvent,
    MutationObserver: FakeMutationObserver,
    addEventListener: (type: string, listener: (event: unknown) => void) =>
      addListener(windowListeners, type, listener),
    removeEventListener: (type: string, listener: (event: unknown) => void) =>
      removeListener(windowListeners, type, listener),
    dispatchEvent: (event: { type: string; detail?: unknown }) => {
      emittedEvents.push(event);
      windowListeners.get(event.type)?.forEach((listener) => listener(event));
      return true;
    },
    setInterval: (callback: () => void, delay: number) => {
      intervals.push({ callback, delay });
      return intervals.length;
    },
    clearInterval: () => {},
  } as Record<string, unknown>;

  vm.runInNewContext(runtimeSource, {
    Date: FakeDate,
    Intl,
    console,
    document,
    window,
  });

  return {
    api: window.MoralTradeDiscoverLocalTime as RuntimeApi,
    emittedEvents,
    intervals,
    setNow(value: string) {
      now = new Date(value).getTime();
    },
    setVisibility(value: string) {
      visibilityState = value;
      documentListeners.get("visibilitychange")?.forEach((listener) => listener({ type: "visibilitychange" }));
    },
    focus() {
      windowListeners.get("focus")?.forEach((listener) => listener({ type: "focus" }));
    },
  };
}

test("the loader transforms the compressed Discover source and reinjects the local-time helper", async () => {
  const loader = readFileSync(join(projectRoot, "public", "moral-trade-discover.html"), "utf8");
  const inlineLoader = extractInlineLoader(loader);
  const loadOrder: string[] = [];
  let writtenDocument = "";

  const loadDiscover = vm.runInNewContext(
    `(${extractNamedFunction(inlineLoader, "loadDiscover")})`,
    {
      MANIFEST_PATH: "/discover/payload/manifest.json",
      composeDocument: (
        _source: string,
        _manifest: unknown,
        _liveAccount: unknown,
        _reloadToken: string,
        localTimeAvailable: boolean,
      ) => {
        loadOrder.push(`compose:${localTimeAvailable}`);
        return "<html><head></head><body>enhanced</body></html>";
      },
      decodePayload: async () => {
        loadOrder.push("decode");
        return "<html><head></head><body>payload</body></html>";
      },
      document: {
        close: () => loadOrder.push("document-close"),
        open: () => loadOrder.push("document-open"),
        write: (source: string) => {
          writtenDocument = source;
          loadOrder.push("document-write");
        },
      },
      fetchJson: async () => ({ version: "a".repeat(40) }),
      loadAccount: async () => ({ authenticated: false }),
      loadRuntime: async (path: string) => loadOrder.push(`runtime:${path}`),
      validateManifest: (manifest: unknown) => manifest,
      verifyPayload: async () => loadOrder.push("verify"),
      window: {
        MoralTradeDiscoverLocalTime: { transformSource: (source: string) => source },
      },
    },
  ) as (reloadToken?: string) => Promise<void>;

  await loadDiscover();

  assert.deepEqual(loadOrder, [
    "runtime:/moral-trade-discover-local-time.js",
    "decode",
    "verify",
    "compose:true",
    "document-open",
    "document-write",
    "document-close",
  ]);
  assert.match(writtenDocument, /<body>enhanced<\/body>/);

  const composeDocument = vm.runInNewContext(
    `(() => {
      ${extractNamedFunction(inlineLoader, "buildAssetUrl")}
      ${extractNamedFunction(inlineLoader, "localizeSource")}
      ${extractNamedFunction(inlineLoader, "escapeBootstrap")}
      ${extractNamedFunction(inlineLoader, "scriptTag")}
      ${extractNamedFunction(inlineLoader, "stylesheetTag")}
      ${extractNamedFunction(inlineLoader, "composeDocument")}
      return composeDocument;
    })()`,
    {
      URL,
      VERSIONED_BODY_ASSETS: ["/moral-trade-discover-navigation.js"],
      VERSIONED_HEAD_ASSETS: [
        "/moral-trade-discover-local-time.js",
        "/moral-trade-account-identity.js",
      ],
      window: {
        location: { origin: "https://moraltrade.org" },
        MoralTradeDiscoverLocalTime: {
          transformSource: (source: string) => source.replace("<body>", '<body data-localized="true">'),
        },
      },
    },
  ) as (
    source: string,
    manifest: { version: string },
    liveAccount: { authenticated: boolean },
    reloadToken?: string,
    localTimeAvailable?: boolean,
  ) => string;

  const version = "b".repeat(40);
  const enhancedSource = composeDocument(
    "<html><head></head><body></body></html>",
    { version },
    { authenticated: false },
    "",
    true,
  );
  const localTimeTag = `<script src="/moral-trade-discover-local-time.js?v=${version}"></script>`;

  assert.match(enhancedSource, /<body data-localized="true">/);
  assert.equal(enhancedSource.includes(localTimeTag), true);
  assert.equal(enhancedSource.split("/moral-trade-discover-local-time.js").length - 1, 1);
  assert.ok(enhancedSource.indexOf(localTimeTag) < enhancedSource.indexOf("</head>"));

  const withoutRuntimeReinjection = composeDocument(
    "<html><head></head><body></body></html>",
    { version },
    { authenticated: false },
    "",
    false,
  );
  assert.equal(withoutRuntimeReinjection.includes("/moral-trade-discover-local-time.js"), false);
});

test("the payload transform removes every fixed date dependency and fails closed on drift", () => {
  const harness = createRuntimeHarness();
  const payload = readDiscoverPayload();
  const transformed = harness.api.transformSource(payload);

  assert.doesNotMatch(transformed, /const today = new Date\('2026-07-17T12:00:00-07:00'\)/);
  assert.doesNotMatch(transformed, /TODAY<b>July 17, 2026<\/b>/);
  assert.doesNotMatch(transformed, /return `2026-\$\{month\}/);
  assert.match(transformed, /discoverLocalTime\.daysUntil\(date\)/);
  assert.match(transformed, /discoverLocalTime\.parseDatePhrase\(text\)/);
  assert.match(transformed, /<time data-mt-discover-local-today datetime=/);
  assert.match(transformed, /moral-trade:local-date-change/);
  const inlineScript = transformed.slice(
    transformed.lastIndexOf("<script>") + "<script>".length,
    transformed.lastIndexOf("</script>"),
  );
  assert.doesNotThrow(() => new vm.Script(inlineScript));
  assert.throws(
    () => harness.api.transformSource(payload.replace("const today =", "const payloadToday =")),
    /could not find fixed today declaration/,
  );
});

test("today and deadline arithmetic follow the visitor's local calendar day", () => {
  const instant = "2026-07-17T01:30:00.000Z";
  const harness = createRuntimeHarness();

  withTimeZone("America/Los_Angeles", () => {
    assert.equal(harness.api.todayISO(instant), "2026-07-16");
    assert.equal(harness.api.formatToday(instant), "July 16, 2026");
    assert.equal(harness.api.daysUntil("2026-07-17", instant), 1);
  });
  withTimeZone("Asia/Tokyo", () => {
    assert.equal(harness.api.todayISO(instant), "2026-07-17");
    assert.equal(harness.api.formatToday(instant), "July 17, 2026");
    assert.equal(harness.api.daysUntil("2026-07-17", instant), 0);
  });
});

test("named deadlines use the current or next local year while ISO dates stay exact", () => {
  const harness = createRuntimeHarness();
  const now = "2026-07-20T12:00:00.000Z";

  withTimeZone("UTC", () => {
    assert.equal(harness.api.parseDatePhrase("before August 1", now), "2026-08-01");
    assert.equal(harness.api.parseDatePhrase("by July 20", now), "2026-07-20");
    assert.equal(harness.api.parseDatePhrase("before January 5", now), "2027-01-05");
    assert.equal(harness.api.parseDatePhrase("before 2026-08-01", now), "2026-08-01");
  });
});

test("invalid and ambiguous deadline phrases fail closed", () => {
  const harness = createRuntimeHarness();

  assert.equal(harness.api.parseDatePhrase("before February 30"), "");
  assert.equal(harness.api.parseDatePhrase("before 2026-02-30"), "");
  assert.equal(harness.api.parseDatePhrase("sometime next month"), "");
  assert.equal(harness.api.daysUntil("not-a-date"), 0);
});

test("focus, visibility, and the minute timer detect a local-midnight change", () => {
  withTimeZone("UTC", () => {
    const harness = createRuntimeHarness("2026-07-20T23:59:00.000Z");
    assert.equal(harness.intervals[0]?.delay, 60_000);

    harness.setNow("2026-07-21T00:01:00.000Z");
    harness.focus();
    const focusDetail = harness.emittedEvents.at(-1)?.detail as {
      currentDate: string;
      previousDate: string;
    };
    assert.equal(focusDetail.currentDate, "2026-07-21");
    assert.equal(focusDetail.previousDate, "2026-07-20");

    harness.setVisibility("hidden");
    harness.setNow("2026-07-22T00:01:00.000Z");
    harness.setVisibility("visible");
    assert.equal(harness.emittedEvents.at(-1)?.type, "moral-trade:local-date-change");

    harness.setNow("2026-07-23T00:01:00.000Z");
    harness.intervals[0]?.callback();
    assert.equal(
      (harness.emittedEvents.at(-1)?.detail as { currentDate: string }).currentDate,
      "2026-07-23",
    );
  });
});
