import { randomUUID } from "node:crypto";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { saveCoreOfferAction } from "@/app/core-trade-actions";
import { saveFeedCreateOfferAction } from "@/app/feed-create-actions";
import { CreateInterfaceFrame } from "@/components/create/create-interface-frame";
import {
  TradeDraftSignInGate,
  TradeDraftWorkbench,
  type TradeDraftSourceContext,
  type TradeDraftValues,
} from "@/components/core-trade/trade-draft-workbench";
import { getOfferById, getViewer } from "@/lib/app-data";
import { getSynthesisTemplate, synthesisClassificationLabel } from "@/lib/bottleneck-atlas";
import {
  feedCreateRequestFromSearchParams,
  isValidFeedCreateRequest,
  recordFeedCreateEvent,
  resolveFeedCreateSource,
} from "@/lib/feed-create/phase1";
import { getFormMessage } from "@/lib/form-state";
import {
  buildSynthesizedTradeDraftPrefill,
  isSynthesizedTradeDraftRole,
} from "@/lib/opportunity-synthesis";
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

function FeedCreateFailure({ message }: { message: string }) {
  return (
    <main
      id="main-content"
      style={{
        alignItems: "center",
        background: "#10121a",
        color: "white",
        display: "grid",
        minHeight: "100vh",
        padding: 24,
      }}
      tabIndex={-1}
    >
      <section
        style={{
          border: "1px solid rgba(255,255,255,.25)",
          margin: "0 auto",
          maxWidth: 720,
          padding: "clamp(28px, 6vw, 56px)",
          width: "100%",
        }}
      >
        <p
          style={{
            fontFamily: "monospace",
            letterSpacing: ".1em",
            textTransform: "uppercase",
          }}
        >
          Feed source unavailable
        </p>
        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: "clamp(38px, 7vw, 64px)",
            margin: "16px 0",
          }}
        >
          No draft was created.
        </h1>
        <p style={{ color: "#c3c7d4", lineHeight: 1.6 }}>{message}</p>
        <div
          style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28 }}
        >
          <Link
            href="/feed"
            style={{
              background: "#1d5bff",
              color: "white",
              padding: "13px 18px",
              textDecoration: "none",
            }}
          >
            Return to Feed
          </Link>
          <Link
            href="/trades/new"
            style={{
              border: "1px solid white",
              color: "white",
              padding: "13px 18px",
              textDecoration: "none",
            }}
          >
            Create independently
          </Link>
        </div>
      </section>
    </main>
  );
}

export default async function NewTradePage({ searchParams }: NewTradePageProps) {
  const resolvedSearchParams = await searchParams;
  const feedCreateRequested = valueOf(resolvedSearchParams.fromFeed) === "1";
  const feedCreateRequest = feedCreateRequestFromSearchParams(resolvedSearchParams);
  const templateId = valueOf(resolvedSearchParams.template);
  const synthesisSource = valueOf(resolvedSearchParams.source);
  const synthesizedDraftRequested = synthesisSource === "bottleneck_atlas_synthesis";
  const synthesisCause = valueOf(resolvedSearchParams.cause).trim().slice(0, 120);
  const requestedSynthesisRole = valueOf(resolvedSearchParams.role);
  const synthesisRole = isSynthesizedTradeDraftRole(requestedSynthesisRole)
    ? requestedSynthesisRole
    : "first_party";
  const synthesisTemplate = synthesizedDraftRequested
    ? getSynthesisTemplate(templateId)
    : null;
  const structure = valueOf(resolvedSearchParams.structure);
  if (structure === "conditional-donation") {
    return <ConditionalDonationCreate params={resolvedSearchParams} />;
  }

  const sourceOfferId = valueOf(resolvedSearchParams.source_offer);
  if (synthesizedDraftRequested && !synthesisTemplate) {
    return (
      <FeedCreateFailure message="The Bottleneck Atlas template is missing or is not recognized." />
    );
  }
  if (synthesizedDraftRequested && (feedCreateRequested || sourceOfferId)) {
    return (
      <FeedCreateFailure message="A Bottleneck Atlas hypothesis cannot be combined with a live feed source or existing offer." />
    );
  }
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
  if (feedCreateRequested) {
    returnParams.set("fromFeed", "1");
    for (const key of [
      "sourceType",
      "sourceId",
      "exposureRequestId",
      "sourceRevision",
    ] as const) {
      const value = valueOf(resolvedSearchParams[key]);
      if (value) returnParams.set(key, value);
    }
  }
  if (templateId) returnParams.set("template", templateId);
  if (synthesizedDraftRequested) {
    returnParams.set("source", "bottleneck_atlas_synthesis");
    if (synthesisCause) returnParams.set("cause", synthesisCause);
    returnParams.set("role", synthesisRole);
  }
  if (structure) returnParams.set("structure", structure);
  if (acceptsCommandHandoff) returnParams.set("handoff", "command-center");
  if (sourceOfferId) returnParams.set("source_offer", sourceOfferId);
  const returnTo = `/trades/new${
    returnParams.size ? `?${returnParams.toString()}` : ""
  }`;
  const example = valueOf(resolvedSearchParams.example);
  const useLegacyDraft = Boolean(
    feedCreateRequested ||
      templateId ||
      structure ||
      acceptsCommandHandoff ||
      example ||
      sourceOffer,
  );

  if (!useLegacyDraft) {
    // CreateInterfaceFrame embeds /moral-trade-create/index.html as same-origin srcDoc.
    const resume = valueOf(resolvedSearchParams.resume);
    return <CreateInterfaceFrame resume={resume === "create"} />;
  }

  if (!viewer) {
    return <TradeDraftSignInGate returnTo={returnTo} />;
  }

  if (feedCreateRequested) {
    if (!feedCreateRequest || !isValidFeedCreateRequest(feedCreateRequest)) {
      return (
        <FeedCreateFailure message="The Feed-to-Create link is invalid or incomplete." />
      );
    }
    const resolvedSource = await resolveFeedCreateSource(
      feedCreateRequest,
      viewer.authUser.id,
    );
    if (!resolvedSource.ok) {
      return <FeedCreateFailure message={resolvedSource.failure.message} />;
    }
    await recordFeedCreateEvent({
      actorId: viewer.authUser.id,
      eventType: "create_opened",
      request: feedCreateRequest,
    });

    const source = resolvedSource.source;
    const sourceContext: TradeDraftSourceContext = {
      mode: "counteroffer",
      counterpartyName: source.counterpartyName,
      sourceUrl: source.sourceUrl,
      sourceOpportunityId: source.request.opportunityId,
      exposureRequestId: source.request.exposureRequestId,
      sourceRevision: source.request.sourceRevision,
      matchContextStorageKey: source.matchContextStorageKey,
      duplicateDraftCount: source.duplicateDraftCount,
      sourceSnapshot: {
        offeredCause: source.sourceSnapshot.offeredCause,
        requestedCause: source.sourceSnapshot.requestedCause,
        offerAction: source.sourceSnapshot.offerAction,
        requestAction: source.sourceSnapshot.requestAction,
        verification: source.sourceSnapshot.verification,
        duration: source.sourceSnapshot.duration,
      },
    };

    return (
      <>
        <style>{WORKBENCH_GRID}</style>
        <TradeDraftWorkbench
          formMessage={getFormMessage(resolvedSearchParams)}
          initialValues={source.initialValues}
          saveAction={saveFeedCreateOfferAction}
          sourceContext={sourceContext}
          submissionKey={randomUUID()}
        />
      </>
    );
  }

  const synthesizedTemplateValues = synthesisTemplate
    ? buildSynthesizedTradeDraftPrefill({
        template: synthesisTemplate,
        matchedCause: synthesisCause,
        role: synthesisRole,
      })
    : undefined;
  const templateValues =
    synthesizedTemplateValues ?? getPledgeTemplateInitialValues(templateId);
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
    : synthesisTemplate
      ? `Bottleneck Atlas hypothesis · ${synthesisClassificationLabel(synthesisTemplate.classification)} · ${
          synthesisRole === "first_party" ? "first-party side" : "counterparty side"
        }`
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
          sourceValues ??
          templateValues ??
          (example === "seed-victoria" ? VICTORIA_EXAMPLE : undefined)
        }
        saveAction={saveCoreOfferAction}
        submissionKey={randomUUID()}
        templateLabel={templateLabel}
      />
    </>
  );
}
