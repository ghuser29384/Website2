import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { getViewer } from "@/lib/app-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Create submission",
  robots: { index: false, follow: false },
};

interface SubmissionPageProps {
  params: Promise<{ submissionId: string }>;
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export default async function CreateSubmissionPage({ params }: SubmissionPageProps) {
  const { submissionId } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?returnTo=${encodeURIComponent(`/create/submissions/${submissionId}`)}`);

  const supabase = (await createClient()) as any;
  const { data: submission } = await supabase
    .from("moral_trade_create_submissions")
    .select("*")
    .eq("id", submissionId)
    .eq("owner_profile_id", viewer.authUser.id)
    .maybeSingle();

  if (!submission) notFound();

  const targetHref = submission.target_type === "offer"
    ? `/trades/${submission.target_id}/manage`
    : submission.target_type === "mpgf_pool_proposal"
      ? "/mpgf"
      : null;

  return (
    <div className="page-shell marketplace-app-shell create-submission-receipt-shell">
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showLogout
          showSearch={false}
        />
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Durable Create receipt</p>
            <h1>{label(submission.submission_kind)}</h1>
            <p>
              This record was saved atomically. It is not public and creates no payment, pledge,
              trade, or payout obligation while its status is {label(submission.status).toLowerCase()}.
            </p>
          </div>
          <article className="panel">
            <dl className="deal-economics-grid">
              <div><dt>Submission ID</dt><dd>{submission.id}</dd></div>
              <div><dt>Target type</dt><dd>{submission.target_type ? label(submission.target_type) : "Unavailable"}</dd></div>
              <div><dt>Target ID</dt><dd>{submission.target_id ?? "Unavailable"}</dd></div>
              <div><dt>Status</dt><dd>{label(submission.status)}</dd></div>
              <div><dt>Cause</dt><dd>{submission.cause_area}</dd></div>
              <div><dt>Requested action</dt><dd>{submission.requested_action}</dd></div>
              <div>
                <dt>Created</dt>
                <dd><LocalDateTime value={submission.created_at} fallback="Date unavailable" /></dd>
              </div>
              <div><dt>Interface version</dt><dd>{submission.interface_version}</dd></div>
            </dl>
            <div className="offer-actions">
              {targetHref ? <Link className="button button-primary" href={targetHref}>Open target record</Link> : null}
              <Link className="button button-secondary" href="/trades/new">Create another</Link>
            </div>
          </article>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
