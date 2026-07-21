import { randomUUID } from "node:crypto";
import type { Metadata } from "next";

import { saveCoreOfferAction } from "@/app/core-trade-actions";
import {
  TradeDraftSignInGate,
  TradeDraftWorkbench,
  type TradeDraftValues,
} from "@/components/core-trade/trade-draft-workbench";
import { getViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import {
  getPledgeTemplateInitialValues,
  getTradeDraftTemplateLabel,
} from "@/lib/trade-template-library";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Create a trade",
  description:
    "Build one bounded Moral Trade proposal through progressive terms, then save privately or submit it once for review.",
  robots: { index: false, follow: false },
};

interface NewTradePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function valueOf(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

const VICTORIA_EXAMPLE: Partial<TradeDraftValues> = {
  offeredCause: "Global poverty reduction",
  requestedCause: "Animal welfare",
  proposedAction:
    "Donate 1% of income to an agreed global-poverty charity for the stated term.",
  requestedAction: "Follow a vegetarian diet for the stated term.",
  noTradeBaseline:
    "Without an agreement, I keep my current giving and the counterparty keeps their current diet.",
  duration: "12 months",
  evidenceRule:
    "Donation receipt for the giving commitment and participant attestation for the diet commitment.",
  maximumBurden: "The stated 1% donation and the stated 12-month dietary commitment only.",
  privacyScope:
    "Agreement evidence and public-safe source copies are public by default. Private messages remain private. A documented safety exception may withhold specific proof.",
  exitConditions:
    "Either participant may end future obligations by notifying the other; completed periods remain recorded.",
};

const WORKBENCH_GRID = `
  #main-content > form {
    grid-template-rows: 76px auto minmax(0, 1fr) 96px;
  }

  @media (max-width: 840px) {
    #main-content > form {
      grid-template-rows: 68px auto auto 88px;
    }
  }
`;

export default async function NewTradePage({ searchParams }: NewTradePageProps) {
  const [viewer, resolvedSearchParams] = await Promise.all([getViewer(), searchParams]);
  const templateId = valueOf(resolvedSearchParams.template);
  const structure = valueOf(resolvedSearchParams.structure);
  const returnParams = new URLSearchParams();
  if (templateId) returnParams.set("template", templateId);
  if (structure) returnParams.set("structure", structure);
  const returnTo = `/trades/new${returnParams.size ? `?${returnParams.toString()}` : ""}`;

  if (!viewer) {
    return <TradeDraftSignInGate returnTo={returnTo} />;
  }

  const example = valueOf(resolvedSearchParams.example);
  const templateValues = getPledgeTemplateInitialValues(templateId);
  const templateLabel = templateValues ? getTradeDraftTemplateLabel(templateId) : null;

  return (
    <>
      <style>{WORKBENCH_GRID}</style>
      <TradeDraftWorkbench
        formMessage={getFormMessage(resolvedSearchParams)}
        initialValues={templateValues ?? (example === "seed-victoria" ? VICTORIA_EXAMPLE : undefined)}
        saveAction={saveCoreOfferAction}
        submissionKey={randomUUID()}
        templateLabel={templateLabel}
      />
    </>
  );
}
