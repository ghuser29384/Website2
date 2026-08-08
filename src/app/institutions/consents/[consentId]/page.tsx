import type { Metadata } from "next";
import Link from "next/link";

import { runInstitutionalAction } from "@/app/institutions/actions";
import styles from "@/app/institutions/institutions.module.css";
import { InstitutionalKeyValue, InstitutionalSectionHeader, InstitutionalStatus, formatInstitutionalLabel, institutionalStatusTone } from "@/components/institutions/institutional-ui";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { requireViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { loadInstitutionalConsent } from "@/lib/institutional-data";
import { institutionalIndividualDealHref } from "@/lib/institutional-trade";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Exact-term individual consent", robots: { index: false, follow: false } };

interface PageProps { params: Promise<{ consentId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>; }

export default async function InstitutionalConsentPage({ params, searchParams }: PageProps) {
  const [{ consentId }, resolvedSearch] = await Promise.all([params, searchParams]);
  await requireViewer(`/institutions/consents/${consentId}`);
  const { consent, deal, proposal, obligation } = await loadInstitutionalConsent(consentId);
  const message = getFormMessage(resolvedSearch);
  const actions = getTopbarActions(true);
  const returnTo = `/institutions/consents/${consentId}`;
  return <div className={styles.shell}><SiteTopbar brandHref="/" links={getPrimaryNavLinks(true)} authLink={actions.authLink} primaryAction={actions.primaryAction} showLogout />
    <header className={styles.hero}><div className={styles.heroInner}><div className={styles.heroCopy}><p className={styles.eyebrow}>Named-person consent</p><h1>{obligation?.title || "Exact-term consent"}</h1><p>{obligation?.description || deal?.summary || "Review the exact selected terms before deciding."}</p></div><aside className={styles.heroAside}><div className={styles.principle}><span>01</span><div><strong>Your decision is personal</strong><p>An organizational approval cannot affirm this consent on your behalf.</p></div></div><div className={styles.principle}><span>02</span><div><strong>Consent is exact-term-bound</strong><p>The proposal ID and database-owned hash below must match the selected deal terms.</p></div></div><div className={styles.principle}><span>03</span><div><strong>Declining blocks signature</strong><p>No party may sign a labor obligation that still lacks required affirmative consent.</p></div></div></aside></div></header>
    <main className={styles.main}>{message ? <p className={message.tone === "error" ? styles.errorNotice : styles.successNotice}>{message.text}</p> : null}<section className={styles.section}><InstitutionalSectionHeader title="Review and decide" description="This is not an organizational vote. It is the named person’s authenticated decision about the exact obligation and proposal version." />
      <article className={styles.panel}><div className={styles.cardHeader}><h3>{proposal?.title || "Proposal"}</h3><InstitutionalStatus tone={institutionalStatusTone(consent.decision)}>{formatInstitutionalLabel(consent.decision)}</InstitutionalStatus></div><InstitutionalKeyValue entries={[["Deal", deal?.title || consent.deal_id],["Proposal version", proposal ? `Version ${proposal.version}` : consent.proposal_version_id],["Obligation", obligation?.title || consent.obligation_id],["Exact terms hash", consent.terms_hash]]} /><details className={styles.commandPayload}><summary>Structured exact terms</summary><pre>{JSON.stringify(proposal?.terms ?? {}, null, 2)}</pre></details></article>
      {consent.decision === "pending" ? <form action={runInstitutionalAction} className={styles.formGrid}><input name="actionType" type="hidden" value="decide_individual_consent" /><input name="actingCapacity" type="hidden" value="individual" /><input name="returnTo" type="hidden" value={returnTo} /><input name="consentId" type="hidden" value={consent.id} /><label>Decision<select name="decision" defaultValue="affirmed"><option value="affirmed">Affirm exact terms</option><option value="declined">Decline</option></select></label><label className={styles.fullSpan}>Decision note<textarea name="decisionNote" required /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Record my decision</button></div></form> : <p className={styles.callout}>Consent is {formatInstitutionalLabel(consent.decision)}. A materially different proposal requires a new exact-term consent request.</p>}
      <div className={styles.inlineActions}>{deal ? <Link className={styles.secondaryButton} href={institutionalIndividualDealHref(String(deal.id))}>Return to deal</Link> : null}<Link className={styles.secondaryButton} href="/institutions/individual">Independent workspace</Link></div>
    </section></main><SiteFooter /></div>;
}
