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

test("the exact live shell loads structured offer types and cause or organization autocomplete", () => {
  const loader = readRepoFile("public/moral-trade-live.html");
  const adapter = readRepoFile("public/moral-trade-live-token-autocomplete.js");
  const structure = readRepoFile("public/moral-trade-live-offer-structure.js");
  const styles = readRepoFile("public/moral-trade-live-offer-structure.css");
  const nonprofitRoute = readRepoFile("src/app/api/nonprofits/search/route.ts");
  const source = readExactLiveSource();

  assert.match(loader, /moral-trade-input-assist\.js/);
  assert.match(loader, /moral-trade-live-token-autocomplete\.js/);
  assert.match(loader, /moral-trade-live-offer-structure\.js/);
  assert.match(loader, /moral-trade-live-offer-structure\.css/);
  assert.match(source, /class="token" contenteditable="true"/);

  assert.match(structure, /label: "Money"/);
  assert.match(structure, /label: "Behavior or commitment"/);
  assert.match(structure, /label: "Help or service"/);
  assert.match(structure, /"a person, project, or cause", "recipients"/);
  assert.match(structure, /Estimated time/);
  assert.match(structure, /Relevant skills/);
  assert.match(structure, /Deliverable or completion condition/);
  assert.match(structure, /Verification method/);
  assert.match(structure, /Conditions and safeguards/);
  assert.match(structure, /legacyIngredients\.forEach/);
  assert.match(styles, /mt-offer-attributes/);
  assert.match(styles, /grid-template-columns: repeat\(2/);

  assert.match(adapter, /TOKEN_SELECTOR/);
  assert.match(adapter, /data-mt-live-token-panel/);
  assert.match(adapter, /data-mt-autocomplete-disabled/);
  assert.match(adapter, /const explicitContext/);
  assert.match(adapter, /RECIPIENT_CONTEXT/);
  assert.match(adapter, /"behavior or commitment"/);
  assert.match(adapter, /"help or service"/);
  assert.match(adapter, /return index === 0 \? null : RECIPIENT_CONTEXT/);
  assert.match(adapter, /rankSuggestions\("organizations", query\)/);
  assert.match(adapter, /rankSuggestions\("priorities", query\)/);
  assert.match(adapter, /\/api\/nonprofits\/search/);
  assert.match(adapter, /Cause areas and organizations/);
  assert.match(adapter, /data-mt-suggestion-kind/);
  assert.match(adapter, /return "commitments"/);
  assert.match(adapter, /contextOptionsForElement/);
  assert.match(adapter, /scheduleTokenCorrection/);
  assert.match(adapter, /correctElement/);
  assert.match(adapter, /createTokenResolver/);
  assert.match(adapter, /resolveElement: createTokenResolver\(token\)/);
  assert.match(adapter, /compositionstart/);
  assert.match(adapter, /compositionend/);
  assert.match(adapter, /\["proof", "verification"\]/);
  assert.match(adapter, /return "evidence"/);
  assert.match(adapter, /label === "if it fails"/);
  assert.match(adapter, /return "exits"/);
  assert.match(adapter, /suggestion\.label \|\| suggestion\.value/);
  assert.doesNotMatch(adapter, /"activation condition"/);
  assert.match(adapter, /new MutationObserver/);
  assert.match(adapter, /aria-autocomplete/);
  assert.match(nonprofitRoute, /buildProPublicaSearchUrl/);
  assert.match(nonprofitRoute, /mapProPublicaOrganizations/);
});
