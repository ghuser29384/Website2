import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { saveCoreOfferAction } from "@/app/core-trade-actions";
import { CreateInterfaceFrame } from "@/components/create/create-interface-frame";
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
import { ConditionalDonationCreate } from "./conditional-donation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Create",
  description:
    "Create a pledge-swap, donation redirect, Donation Upgrade, existing-pool contribution offer, or moral public-goods pool through one interface.",
  robots: { index: false, follow: false },
};

interface NewTradePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

interface SourceOfferCoreTerms {
  no_trade_baseline: string;
  start_date: string | null;
  evidence_due_date: string | null;
  maximum_burden: string;
  privacy_scope: string;
  exit_conditions: string;
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
  const templateId = valueOf(resolvedSearchParams.template);
  const structure = valueOf(resolvedSearchParams.structure);
  if (structure === "conditional-donation") {
    return <ConditionalDonationCreate params={resolvedSearchParams} />;
  }

  const sourceOfferId = valueOf(resolvedSearchParams.source_offer);
  const [viewer, sourceOffer] = await Promise.all([
    getViewer(),
    sourceOfferId ? getOfferById(sourceOfferId) : Promise.resolve(null),
  ]);
  if (sourceOfferId && !sourceOffer) {
    notFound();
  }

  const acceptsCommandHandoff =
    valueOf(resolvedSearchParams.handoff) === "command-center";
  const returnParams = new URLSearchParams();
  if (templateId) returnParams.set("template", templateId);
  if (structure) returnParams.set("structure", structure);
  if (acceptsCommandHandoff) returnParams.set("handoff", "command-center");
  if (sourceOfferId) returnParams.set("source_offer", sourceOfferId);
  const returnTo = `/trades/new${returnParams.size ? `?${returnParams.toString()}` : ""}`;
  const example = valueOf(resolvedSearchParams.example);
  const useLegacyDraft = Boolean(
    templateId || structure || acceptsCommandHandoff || example || sourceOffer,
  );

  if (!useLegacyDraft) {
    // CreateInterfaceFrame embeds /moral-trade-create/index.html as same-origin srcDoc.
    const resume = valueOf(resolvedSearchParams.resume);
    return <CreateInterfaceFrame resume={resume === "create"} />;
  }

  if (!viewer) {
    return <TradeDraftSignInGate returnTo={returnTo} />;
  }

  const templateValues = getPledgeTemplateInitialValues(templateId);
  // These current-core columns exist in production and QA, but the legacy
  // generated OfferRow type has not yet been regenerated with them.
  const sourceOfferWithCoreTerms = sourceOffer
    ? (sourceOffer as NonNullable<typeof sourceOffer> & SourceOfferCoreTerms)
    : null;
  const sourceValues: Partial<TradeDraftValues> | undefined =
    sourceOffer && sourceOfferWithCoreTerms
      ? {
          offeredCause: sourceOffer.requested_cause,
          requestedCause: sourceOffer.offered_cause,
          proposedAction: sourceOffer.request_action,
          requestedAction: sourceOffer.offer_action,
          noTradeBaseline: sourceOfferWithCoreTerms.no_trade_baseline,
          duration: sourceOffer.duration,
          startDate: sourceOfferWithCoreTerms.start_date ?? "",
          evidenceDueDate: sourceOfferWithCoreTerms.evidence_due_date ?? "",
          evidenceRule: sourceOffer.verification,
          maximumBurden: sourceOfferWithCoreTerms.maximum_burden,
          privacyScope: sourceOfferWithCoreTerms.privacy_scope,
          exitConditions: sourceOfferWithCoreTerms.exit_conditions,
          notes: "",
          voluntaryCertification: false,
        }
      : undefined;
  const templateLabel = sourceOffer
    ? `Counteroffer to ${sourceOffer.ownerProfile?.resolvedName ?? sourceOffer.owner_alias}`
    : templateValues
      ? getTradeDraftTemplateLabel(templateId)
      : null;

  return (
    <>
      <style>{WORKBENCH_GRID}</style>
      <TradeDraftWorkbench
        acceptCommandHandoff={acceptsCommandHandoff}
        formMessage={getFormMessage(resolvedSearchParams)}
        initialValues={
          sourceValues ?? templateValues ?? (example === "seed-victoria" ? VICTORIA_EXAMPLE : undefined)
        }
        saveAction={saveCoreOfferAction}
        submissionKey={randomUUID()}
        templateLabel={templateLabel}
      />
    </>
  );
}
