import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { SubmissionReceipt } from "@/components/create/submission-receipt";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
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
    <div className="page-shell create-submission-receipt-shell">
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
        <SubmissionReceipt submission={submission} targetHref={targetHref} />
      </main>
      <SiteFooter />
    </div>
  );
}
