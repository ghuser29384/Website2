// Test-only client entry. This is never imported by an application route.
import { useState } from "react";
import { createRoot } from "react-dom/client";

import {
  TradeDraftWorkbench,
  type TradeDraftSourceContext,
  type TradeDraftValues,
} from "@/components/core-trade/trade-draft-workbench";
import {
  COMMAND_CENTER_HANDOFF_KEY,
  COMMAND_CENTER_HANDOFF_VERSION,
} from "@/lib/command-center-handoff";

export const fixtureValues: TradeDraftValues = {
  offeredCause: "Neighborhood green-space restoration",
  requestedCause: "Community access to science books",
  proposedAction: "Restore two raised garden beds with the community group.",
  requestedAction: "Catalog twelve donated science books at the community library.",
  noTradeBaseline: "Both groups keep their existing schedules without these extra activities.",
  duration: "Four Saturday sessions",
  startDate: "2031-01-15",
  evidenceDueDate: "2031-02-15",
  evidenceRule: "A dated activity log shared privately with the assigned reviewer.",
  maximumBurden: "",
  privacyScope: "Activity logs and identities stay private. Only safe completion metadata may be public.",
  exitConditions: "Either person may end future sessions by privately notifying the other person.",
  notes: "Fixture example only. No invitation, agreement, payment, or real data write.",
  voluntaryCertification: false,
};

type FixtureTone = "success" | "error";

declare global {
  interface Window {
    __tradeDraftFixture: {
      submissions: Record<string, string>[];
      finishSave: (tone: FixtureTone) => void;
    };
  }
}

const scenario = new URLSearchParams(window.location.search).get("scenario") || "empty";
const submissions: Record<string, string>[] = [];
let finishPending: ((tone: FixtureTone) => void) | undefined;

window.__tradeDraftFixture = {
  submissions,
  finishSave: (tone) => finishPending?.(tone),
};

if (scenario === "command") {
  sessionStorage.setItem(COMMAND_CENTER_HANDOFF_KEY, JSON.stringify({
    version: COMMAND_CENTER_HANDOFF_VERSION,
    source: "command-center",
    createdAt: Date.now(),
    reviewFields: ["noTradeBaseline", "evidenceRule"],
    values: fixtureValues,
  }));
}

const sourceContext: TradeDraftSourceContext = {
  mode: "counteroffer",
  counterpartyName: "Fixture participant",
  sourceUrl: "/offers/fixture-source",
  sourceOpportunityId: "fixture-source",
  exposureRequestId: "fixture-exposure",
  sourceRevision: 3,
  matchContextStorageKey: "trade-draft-palette-fixture-match",
  duplicateDraftCount: 1,
  sourceSnapshot: {
    offeredCause: fixtureValues.requestedCause,
    requestedCause: fixtureValues.offeredCause,
    offerAction: fixtureValues.requestedAction,
    requestAction: fixtureValues.proposedAction,
    verification: fixtureValues.evidenceRule,
    duration: fixtureValues.duration,
  },
};

if (scenario === "source") {
  sessionStorage.setItem(sourceContext.matchContextStorageKey, JSON.stringify({
    createdAt: Date.now(),
    actionFitLabel: "Fixture terms match",
    ownerAlias: sourceContext.counterpartyName,
    reason: "Illustrative session-only context",
    reasonDetails: ["Both activities have a clear scope and private evidence."],
  }));
}

function Fixture() {
  const [formMessage, setFormMessage] = useState<{
    text: string;
    tone: FixtureTone;
  } | null>(() => scenario === "success" || scenario === "error"
    ? { text: `${scenario === "success" ? "Successful" : "Failed"} fixture response. No real data was saved.`, tone: scenario }
    : null);

  async function saveAction(formData: FormData) {
    // Deliberately in-memory: no fetch, server action, auth session, or persistence.
    submissions.push(Object.fromEntries(
      Array.from(formData.entries(), ([key, value]) => [key, String(value)]),
    ));
    await new Promise<void>((resolve) => {
      finishPending = (tone) => {
        setFormMessage({
          tone,
          text: `${tone === "success" ? "Successful" : "Failed"} fixture response. No real data was saved.`,
        });
        finishPending = undefined;
        resolve();
      };
    });
  }

  return <TradeDraftWorkbench
    acceptCommandHandoff={scenario === "command" || scenario === "unavailable"}
    formMessage={formMessage}
    initialValues={scenario === "template"
      ? { ...fixtureValues, offeredCause: "[Replace: the priority you advance]" }
      : ["complete", "source", "success", "error"].includes(scenario) ? fixtureValues : undefined}
    saveAction={saveAction}
    sourceContext={scenario === "source" ? sourceContext : undefined}
    submissionKey="palette-fixture-only"
    templateLabel={scenario === "template" ? "Fixture template" : undefined}
  />;
}

const container = document.getElementById("fixture-root");
if (!container) throw new Error("Missing fixture root");
createRoot(container).render(<Fixture />);
