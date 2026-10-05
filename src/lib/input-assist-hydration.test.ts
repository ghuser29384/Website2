import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const layoutPath = new URL("../app/layout.tsx", import.meta.url);
const topbarPath = new URL("../components/layout/site-topbar.tsx", import.meta.url);
const inputAssistPath = new URL("../../public/moral-trade-input-assist.js", import.meta.url);

test("global input assist waits for browser idle before enhancing React-owned controls", async () => {
  const [layoutSource, topbarSource, inputAssistSource] = await Promise.all([
    readFile(layoutPath, "utf8"),
    readFile(topbarPath, "utf8"),
    readFile(inputAssistPath, "utf8"),
  ]);

  assert.match(
    layoutSource,
    /<Script src="\/moral-trade-input-assist\.js" strategy="lazyOnload" \/>/,
  );
  assert.doesNotMatch(
    layoutSource,
    /<Script src="\/moral-trade-input-assist\.js" strategy="afterInteractive" \/>/,
  );

  assert.doesNotMatch(topbarSource, /data-mt-autocomplete-context=/);
  assert.doesNotMatch(topbarSource, /data-mt-autocomplete-ready=/);

  assert.match(
    inputAssistSource,
    /control\.setAttribute\("data-mt-autocomplete-context", context\)/,
  );
  assert.match(
    inputAssistSource,
    /control\.setAttribute\("data-mt-autocomplete-ready", "true"\)/,
  );
  assert.match(inputAssistSource, /prepareFutureDateControl/);
});
