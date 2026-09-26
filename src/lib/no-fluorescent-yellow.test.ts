import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const productionStyleFiles = [
  "../app/marketplace-ui.css",
  "../components/donation-offsets/donation-redirect-impact-flow.module.css",
  "../../public/moral-trade-live-core.txt",
  "../../public/moral-trade-live-feed.css",
  "../components/trade-controls/trade-controls-workspace.module.css",
  "../app/canonical-visual-system.css",
  "../app/pledge-swaps/pledge-swaps.module.css",
  "../app/home-mode-hover-colors.css",
  "../components/create/create-route-chooser.tsx",
];

const prohibitedFluorescentYellowValues = [
  "#e1f65b",
  "#b8d92c",
  "#bddc25",
  "#a2aa16",
  "#dff0a8",
  "#f1f7cc",
  "#c8dd71",
  "#f4f8da",
  "#789000",
  "#748800",
  "#697d00",
  "#202700",
  "#303b00",
];

test("production UI sources avoid fluorescent-yellow and lime-highlight color values", () => {
  for (const relativePath of productionStyleFiles) {
    const content = readFileSync(new URL(relativePath, import.meta.url), "utf8").toLowerCase();
    for (const color of prohibitedFluorescentYellowValues) {
      assert.equal(
        content.includes(color),
        false,
        `${relativePath} must not contain fluorescent-yellow value ${color}`,
      );
    }
  }
});
