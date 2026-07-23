import type { Metadata } from "next";

import { TradeDraftSignInGate } from "@/components/core-trade/trade-draft-workbench";
import { MpgfConsole } from "@/components/mpgf/mpgf-console";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { loadMpgfParticipantState } from "@/lib/mpgf/persistence";
import { loadMpgfManualEvidenceReadiness, loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Propose MPGF Pool",
  description: "Draft a non-real-money MPGF candidate pool proposal without live allocation or payout effects.",
  alternates: {
    canonical: "/mpgf/pools/new",
  },
  openGraph: {
    title: "Propose MPGF Pool",
    description: "Draft a non-real-money MPGF candidate pool proposal without live allocation or payout effects.",
    url: getAbsoluteUrl("/mpgf/pools/new"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

interface MpgfNewPoolPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

const MAX_SAFE_FUNDING_DOLLARS = Math.floor(Number.MAX_SAFE_INTEGER / 100);

function positiveInteger(value: string, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(maximum, parsed) : 0;
}

function positiveMoney(value: string) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_SAFE_FUNDING_DOLLARS) return 0;
  return Math.round(parsed * 100) / 100;
}

function buildFutureDeadline(daysFromNow: number) {
  const deadline = new Date();
  deadline.setUTCDate(deadline.getUTCDate() + daysFromNow);
  return deadline.toISOString().slice(0, 10);
}

export default async function MpgfNewPoolPage({ searchParams }: MpgfNewPoolPageProps) {
  const resolved = await searchParams;
  const templateApplied = single(resolved.template) === "threshold-coalition";
  const commandTitle = single(resolved.title).slice(0, 180);
  const commandCause = single(resolved.cause).slice(0, 180);
  const requestedParticipants = positiveInteger(single(resolved.participants), 1_000_000_000);
  const requestedContribution = positiveMoney(single(resolved.contribution));
  const requestedThreshold = positiveInteger(single(resolved.threshold), 1_000_000_000);
  const commandTermsAreSafe =
    requestedParticipants >= 2 &&
    requestedThreshold >= 1 &&
    requestedThreshold <= requestedParticipants &&
    requestedContribution > 0 &&
    requestedContribution <= MAX_SAFE_FUNDING_DOLLARS / requestedParticipants;
  const commandParticipants = commandTermsAreSafe ? requestedParticipants : 0;
  const commandContribution = commandTermsAreSafe ? requestedContribution : 0;
  const commandThreshold = commandTermsAreSafe ? requestedThreshold : 0;
  const viewer = await getViewer();

  if (templateApplied && !viewer) {
    const returnParams = new URLSearchParams({ template: "threshold-coalition" });
    if (commandTitle) returnParams.set("title", commandTitle);
    if (commandCause) returnParams.set("cause", commandCause);
    if (commandTermsAreSafe) {
      returnParams.set("participants", String(commandParticipants));
      returnParams.set("contribution", String(commandContribution));
      returnParams.set("threshold", String(commandThreshold));
    }
    if (single(resolved.source) === "command") returnParams.set("source", "command");
    return <TradeDraftSignInGate returnTo={`/mpgf/pools/new?${returnParams.toString()}`} />;
  }

  const participantState = await loadMpgfParticipantState({
    userId: viewer?.authUser.id,
    displayName: viewer?.displayName,
  });
  const manualEvidenceReadiness = await loadMpgfManualEvidenceReadiness();
  const realMoneyReadiness = await loadMpgfRealMoneyReadiness();

  return (
    <MpgfPageFrame
      description="Draft a candidate pool proposal for review without creating live allocation or payout effects."
      title="Propose a moral public good."
      realMoneyReadiness={realMoneyReadiness}
      viewerPresent={Boolean(viewer)}
    >
      <section className="section section-white">
        <MpgfConsole
          initialPoolProposalDeadline={buildFutureDeadline(90)}
          initialPoolProposalTitle={commandTitle}
          initialPoolProposalCause={commandCause}
          initialPoolParticipantCount={commandParticipants}
          initialPoolContributionAmount={commandContribution}
          initialPoolThresholdCount={commandThreshold}
          initialTab="pools"
          manualEvidenceReadiness={manualEvidenceReadiness}
          participantState={participantState}
          poolTemplateApplied={templateApplied}
          realMoneyReadiness={realMoneyReadiness}
          viewerPresent={Boolean(viewer)}
        />
      </section>
    </MpgfPageFrame>
  );
}
