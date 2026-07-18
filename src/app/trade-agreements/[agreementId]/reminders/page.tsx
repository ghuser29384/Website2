import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReminderManagement } from "@/components/core-trade/reminder-management";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { requireViewer } from "@/lib/app-data";
import { getCoreAgreementForUser } from "@/lib/core-trade";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import {
  deriveAgreementReminderMilestones,
  loadTradeReminderConfiguration,
  reconcileReminderRules,
} from "@/lib/trade-reminders";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Manage reminders",
  robots: { index: false, follow: false },
};

interface ReminderPageProps {
  params: Promise<{ agreementId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const REMINDER_VIEWS = new Set(["schedule", "timeline", "rules", "calendar"] as const);
type ReminderView = "schedule" | "timeline" | "rules" | "calendar";

export default async function ReminderPage({ params, searchParams }: ReminderPageProps) {
  const [{ agreementId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const viewer = await requireViewer(`/trade-agreements/${agreementId}/reminders`);
  const detail = await getCoreAgreementForUser(agreementId, viewer.authUser.id);
  if (!detail) notFound();

  const configuration = await loadTradeReminderConfiguration(
    agreementId,
    viewer.authUser.id,
  );
  const milestones = deriveAgreementReminderMilestones(detail);
  const rules = reconcileReminderRules(configuration, agreementId, milestones);
  const { agreement, offer, proposer, responder } = detail;
  const viewerIsProposer = String(agreement.proposer_id) === viewer.authUser.id;
  const counterpart = viewerIsProposer ? responder : proposer;
  const agreementTitle = offer
    ? `${offer.offered_cause} ↔ ${offer.requested_cause}`
    : "Private Moral Trade agreement";
  const requestedView = Array.isArray(resolvedSearchParams.view)
    ? resolvedSearchParams.view[0]
    : resolvedSearchParams.view;
  const initialView: ReminderView = REMINDER_VIEWS.has(requestedView as ReminderView)
    ? (requestedView as ReminderView)
    : "schedule";

  return (
    <div className="page-shell marketplace-app-shell">
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showSearch={false}
          showLogout
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <ReminderManagement
          agreementId={agreementId}
          agreementTitle={agreementTitle}
          counterpartName={counterpart?.display_name ?? "counterparty"}
          hasSavedPreferences={configuration.hasSavedPreferences}
          initialCalendarFeed={configuration.calendarFeed}
          initialMilestones={milestones}
          initialPreferences={configuration.preferences}
          initialRules={rules}
          initialView={initialView}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
