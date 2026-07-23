import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { gunzipSync } from "node:zlib";

const root = process.cwd();

function readRepoFile(path: string) {
  return readFileSync(join(root, path), "utf8");
}

function readExactLiveSource() {
  const names = ["0a", "0b", "0c", "0d", "1", "2", "3", "4a", "4b", "4c", "4d", "5a", "5b", "5c", "5d"];
  const encoded = names
    .map((name) => readRepoFile(`public/mt-live-0d0e0f03-${name}.txt`).trim())
    .join("");
  return gunzipSync(Buffer.from(encoded, "base64")).toString("utf8");
}

test("the exact live shell loads autocomplete for its contenteditable trade tokens", () => {
  const loader = readRepoFile("public/moral-trade-live.html");
  const adapter = readRepoFile("public/moral-trade-live-token-autocomplete.js");
  const source = readExactLiveSource();

  assert.match(loader, /moral-trade-input-assist\.js/);
  assert.match(loader, /moral-trade-live-token-autocomplete\.js/);
  assert.match(source, /class="token" contenteditable="true"/);
  assert.match(source, /\['◷','Time'\]/);
  assert.match(adapter, /TOKEN_SELECTOR/);
  assert.match(adapter, /data-mt-live-token-panel/);
  assert.match(adapter, /return index === 0 \? null : "priorities"/);
  assert.match(adapter, /"only if they"/);
  assert.match(adapter, /"time"/);
  assert.match(adapter, /return "commitments"/);
  assert.match(adapter, /\["proof", "verification"\]/);
  assert.match(adapter, /return "evidence"/);
  assert.match(adapter, /label === "if it fails"/);
  assert.match(adapter, /return "exits"/);
  assert.match(adapter, /suggestion\.label \|\| suggestion\.value/);
  assert.doesNotMatch(adapter, /"activation condition"/);
  assert.doesNotMatch(adapter, /"deadline"/);
  assert.match(adapter, /new MutationObserver/);
  assert.match(adapter, /aria-autocomplete/);
});
