import { readFileSync } from "node:fs";
import path from "node:path";

import { integrateCommonGroundCreateSource } from "@/lib/create-interface/common-ground-integration";

interface CreateInterfaceFrameProps {
  resume?: boolean;
}

const createInterfaceSource = integrateCommonGroundCreateSource(
  readFileSync(
    path.join(process.cwd(), "public", "moral-trade-create", "index.html"),
    "utf8",
  ),
);
const resumeExpression =
  'const shouldResume = new URLSearchParams(window.location.search).get("resume") === "create";';

function replaceRequired(
  source: string,
  search: string,
  replacement: string,
  label: string,
  expectedOccurrences = 1,
) {
  const occurrences = source.split(search).length - 1;
  if (occurrences !== expectedOccurrences) {
    throw new Error(
      `The Moral Trade Create ${label} contract was expected ${expectedOccurrences} time(s), but appeared ${occurrences}.`,
    );
  }
  return source.split(search).join(replacement);
}

function integrateThresholdSignOnMode(source: string) {
  let integrated = replaceRequired(
    source,
    "Create a trade, Donation Upgrade, or public-goods pool.",
    "Create a trade, Donation Upgrade, Threshold Sign-On, or public-goods pool.",
    "subtitle",
  );
  integrated = replaceRequired(
    integrated,
    `    .request-kind-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));`,
    `    .request-kind-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));`,
    "request-kind grid",
  );
  integrated = replaceRequired(
    integrated,
    "Choose Commitment, Skill, or Fund. Fund includes swaps, redirects, Donation Upgrades, shared-project pools, and threshold pools.",
    "Choose Commitment, Skill, Fund, or Threshold Sign-On. Fund includes swaps, redirects, Donation Upgrades, Co-Fund, and threshold pools.",
    "request introduction",
    2,
  );

  const fundCard = `            <button type="button" class="request-choice" data-request-kind="fund" aria-pressed="false">
              <span class="request-check" aria-hidden="true">✓</span>
              <span class="request-mark">$</span>
              <strong>Fund</strong>
              <p>A monetary contribution to a specified organization, project, fund, or cause.</p>
              <span class="request-example">Examples: donate $50 to GiveDirectly; fund one month of hosting for Moral Trade.</span>
            </button>`;
  const thresholdSignOnCard = `${fundCard}

            <button type="button" class="request-choice" data-request-kind="collective" aria-pressed="false">
              <span class="request-check" aria-hidden="true">✓</span>
              <span class="request-mark">◎</span>
              <strong>Threshold Sign-On</strong>
              <p>Gather verified people around one frozen proposition and exact threshold.</p>
              <span class="request-example">Names stay private until the threshold is reached, then the complete verified set is revealed together.</span>
            </button>`;
  integrated = replaceRequired(
    integrated,
    fundCard,
    thresholdSignOnCard,
    "Threshold Sign-On request card",
  );

  integrated = replaceRequired(
    integrated,
    `      fund: {
        label: "Fund",
        fieldLabel: "What should the other person fund?",
        placeholder: "e.g. Donate $50 to GiveDirectly"
      }
    };`,
    `      fund: {
        label: "Fund",
        fieldLabel: "What should the other person fund?",
        placeholder: "e.g. Donate $50 to GiveDirectly"
      },
      collective: {
        label: "Threshold Sign-On",
        fieldLabel: "Create a verified identity-threshold proposition",
        placeholder: ""
      }
    };`,
    "request metadata",
  );

  integrated = replaceRequired(
    integrated,
    `    function selectRequestKind(button) {
      const nextKind = button.dataset.requestKind;
      const kindChanged = state.requestKind !== nextKind;`,
    `    function selectRequestKind(button) {
      const nextKind = button.dataset.requestKind;
      if (nextKind === "collective") {
        const params = new URLSearchParams({ mode: "collective" });
        if (state.cause) params.set("cause", state.cause);
        const target = \`/trades/new?\${params.toString()}\`;
        if (window.parent && window.parent !== window) window.parent.location.assign(target);
        else window.location.assign(target);
        return;
      }
      const kindChanged = state.requestKind !== nextKind;`,
    "Threshold Sign-On routing",
  );

  return integrated;
}

const integratedCreateInterfaceSource = integrateThresholdSignOnMode(createInterfaceSource);

function getCreateInterfaceSource(resume: boolean) {
  if (!resume) return integratedCreateInterfaceSource;
  if (!integratedCreateInterfaceSource.includes(resumeExpression)) {
    throw new Error("The Moral Trade Create resume contract could not be located.");
  }

  return integratedCreateInterfaceSource.replace(
    resumeExpression,
    `const shouldResume = true || new URLSearchParams(window.location.search).get("resume") === "create";`,
  );
}

export function CreateInterfaceFrame({ resume = false }: CreateInterfaceFrameProps) {
  return (
    <main id="main-content" style={{ minHeight: "100vh" }} tabIndex={-1}>
      <iframe
        allow="clipboard-write"
        aria-label="Moral Trade Create"
        data-create-interface-frame="true"
        srcDoc={getCreateInterfaceSource(resume)}
        style={{
          border: 0,
          display: "block",
          height: "100vh",
          minHeight: 720,
          width: "100%",
        }}
        title="Moral Trade Create"
      />
    </main>
  );
}