import { randomUUID } from "node:crypto";
import type { Metadata } from "next";

import { saveCoreOfferAction } from "@/app/core-trade-actions";
import {
  TradeDraftSignInGate,
  TradeDraftWorkbench,
  type TradeDraftValues,
} from "@/components/core-trade/trade-draft-workbench";
import { getOfferById, getViewer } from "@/lib/app-data";
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
  const resolvedSearchParams = await searchParams;
  const sourceOfferId = valueOf(resolvedSearchParams.source_offer);
  const acceptsCommandHandoff =
    valueOf(resolvedSearchParams.handoff) === "command-center";
  const [viewer, sourceOffer] = await Promise.all([
    getViewer(),
    sourceOfferId ? getOfferById(sourceOfferId) : Promise.resolve(null),
  ]);
  const templateId = valueOf(resolvedSearchParams.template);
  const structure = valueOf(resolvedSearchParams.structure);
  const returnParams = new URLSearchParams();
  if (templateId) returnParams.set("template", templateId);
  if (structure) returnParams.set("structure", structure);
  if (sourceOfferId) returnParams.set("source_offer", sourceOfferId);
  if (acceptsCommandHandoff) returnParams.set("handoff", "command-center");
  const returnTo = `/trades/new${returnParams.size ? `?${returnParams.toString()}` : ""}`;

  if (!viewer) {
    return <TradeDraftSignInGate returnTo={returnTo} />;
  }

  const example = valueOf(resolvedSearchParams.example);
  const templateValues = getPledgeTemplateInitialValues(templateId);
  const templateLabel = templateValues ? getTradeDraftTemplateLabel(templateId) : null;
  const counterofferValues: Partial<TradeDraftValues> | undefined = sourceOffer
    ? {
        offeredCause: sourceOffer.requested_cause,
        requestedCause: sourceOffer.offered_cause,
        proposedAction: sourceOffer.request_action,
        requestedAction: sourceOffer.offer_action,
        noTradeBaseline:
          "Without this counteroffer, the original proposal remains unchanged and neither participant takes on a new commitment.",
        duration: sourceOffer.duration,
        evidenceRule: sourceOffer.verification,
        exitConditions:
          "Either participant may decline before acceptance. After an agreement is formed, either participant may end future obligations under the final negotiated exit terms.",
        notes: `Counteroffer to proposal ${sourceOffer.id}. Original participant: ${sourceOffer.ownerProfile?.resolvedName ?? sourceOffer.owner_alias}. Review every reversed term before submitting.`,
      }
    : undefined;
  const sourceMessage =
    sourceOfferId && !sourceOffer
      ? {
          tone: "error" as const,
          text: "The source proposal is no longer available. Start a new draft only if you can restate every term independently.",
        }
      : null;

  return (
    <>
      <style>{WORKBENCH_GRID}</style>
      <TradeDraftWorkbench
        acceptCommandHandoff={acceptsCommandHandoff}
        formMessage={getFormMessage(resolvedSearchParams) ?? sourceMessage}
        initialValues={
          counterofferValues ??
          templateValues ??
          (example === "seed-victoria" ? VICTORIA_EXAMPLE : undefined)
        }
        saveAction={saveCoreOfferAction}
        submissionKey={randomUUID()}
        templateLabel={
          sourceOffer
            ? `Counteroffer to ${sourceOffer.ownerProfile?.resolvedName ?? sourceOffer.owner_alias}`
            : templateLabel
        }
      />
    </>
  );
}
