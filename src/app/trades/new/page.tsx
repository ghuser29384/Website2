import { randomUUID } from "node:crypto";
import type { Metadata } from "next";

import { saveCoreOfferAction } from "@/app/core-trade-actions";
import {
  CollectiveCreateSignInGate,
  CollectiveCreateWorkspace,
} from "@/components/create/collective-create-workspace";
import { CreateInterfaceFrame } from "@/components/create/create-interface-frame";
import {
  TradeDraftSignInGate,
  TradeDraftWorkbench,
  type TradeDraftValues,
} from "@/components/core-trade/trade-draft-workbench";
import { getViewer } from "@/lib/app-data";
import {
  getCollectiveCommitmentMinimumDeadlineMinutes,
  isCollectiveCommitmentsEnabled,
} from "@/lib/collective-commitments/config";
import {
  getCollectiveIdentityCredential,
  listCollectiveCommitments,
} from "@/lib/collective-commitments/service";
import type {
  CollectiveCommitmentSummary,
  CollectiveIdentityCredential,
} from "@/lib/collective-commitments/types";
import { getFormMessage } from "@/lib/form-state";
import {
  getPledgeTemplateInitialValues,
  getTradeDraftTemplateLabel,
} from "@/lib/trade-template-library";
import { ConditionalDonationCreate } from "./conditional-donation";

// The default Create surface is rendered from public/moral-trade-create/index.html by
// CreateInterfaceFrame; Threshold Sign-On is a sibling workflow within this same route.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Create",
  description:
    "Create a pledge-swap, donation redirect, Donation Upgrade, Threshold Sign-On, existing-pool contribution offer, or moral public-goods pool through one interface.",
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
  const templateId = valueOf(resolvedSearchParams.template);
  const structure = valueOf(resolvedSearchParams.structure);
  if (structure === "conditional-donation") {
    return <ConditionalDonationCreate params={resolvedSearchParams} />;
  }

  const mode = valueOf(resolvedSearchParams.mode);
  const selectedCause = valueOf(resolvedSearchParams.cause).slice(0, 120);
  if (mode === "collective") {
    const viewer = await getViewer();
    const collectiveParams = new URLSearchParams({ mode: "collective" });
    if (selectedCause) collectiveParams.set("cause", selectedCause);
    const returnTo = `/trades/new?${collectiveParams.toString()}`;
    if (!viewer) return <CollectiveCreateSignInGate returnTo={returnTo} />;

    const enabled = isCollectiveCommitmentsEnabled();
    let credential: CollectiveIdentityCredential | null = null;
    let commitments: CollectiveCommitmentSummary[] = [];
    if (enabled) {
      [credential, commitments] = await Promise.all([
        getCollectiveIdentityCredential(viewer.profile.id),
        listCollectiveCommitments(),
      ]);
    }

    return (
      <CollectiveCreateWorkspace
        cause={selectedCause || undefined}
        commitments={commitments}
        credential={credential}
        enabled={enabled}
        minimumDeadlineMinutes={getCollectiveCommitmentMinimumDeadlineMinutes()}
      />
    );
  }

  const acceptsCommandHandoff =
    valueOf(resolvedSearchParams.handoff) === "command-center";
  const returnParams = new URLSearchParams();
  if (templateId) returnParams.set("template", templateId);
  if (structure) returnParams.set("structure", structure);
  if (acceptsCommandHandoff) returnParams.set("handoff", "command-center");
  const returnTo = `/trades/new${returnParams.size ? `?${returnParams.toString()}` : ""}`;
  const example = valueOf(resolvedSearchParams.example);
  const useLegacyDraft = Boolean(templateId || structure || acceptsCommandHandoff || example);

  if (!useLegacyDraft) {
    // CreateInterfaceFrame embeds /moral-trade-create/index.html as same-origin srcDoc.
    const resume = valueOf(resolvedSearchParams.resume);
    return <CreateInterfaceFrame resume={resume === "create"} />;
  }

  const viewer = await getViewer();
  if (!viewer) {
    return <TradeDraftSignInGate returnTo={returnTo} />;
  }

  const templateValues = getPledgeTemplateInitialValues(templateId);
  const templateLabel = templateValues ? getTradeDraftTemplateLabel(templateId) : null;

  return (
    <>
      <style>{WORKBENCH_GRID}</style>
      <TradeDraftWorkbench
        acceptCommandHandoff={acceptsCommandHandoff}
        formMessage={getFormMessage(resolvedSearchParams)}
        initialValues={templateValues ?? (example === "seed-victoria" ? VICTORIA_EXAMPLE : undefined)}
        saveAction={saveCoreOfferAction}
        submissionKey={randomUUID()}
        templateLabel={templateLabel}
      />
    </>
  );
}
