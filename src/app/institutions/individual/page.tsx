import type { Metadata } from "next";
import Link from "next/link";

import { runInstitutionalAction } from "@/app/institutions/actions";
import styles from "@/app/institutions/institutions.module.css";
import {
  InstitutionalDate,
  InstitutionalEmpty,
  InstitutionalMetric,
  InstitutionalSectionHeader,
  InstitutionalStatus,
  formatInstitutionalLabel,
  institutionalStatusTone,
} from "@/components/institutions/institutional-ui";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { requireViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { loadIndividualInstitutionalWorkspace } from "@/lib/institutional-data";
import { INDIVIDUAL_INSTITUTIONAL_NAV, institutionalIndividualDealHref } from "@/lib/institutional-trade";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  title: "Independent institutional participation",
  description: "A reduced institutional workspace for people acting only for themselves and resources they personally control.",
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function base(actionType: string) {
  return <>
    <input name="actionType" type="hidden" value={actionType} />
    <input name="actingCapacity" type="hidden" value="individual" />
    <input name="returnTo" type="hidden" value="/institutions/individual" />
  </>;
}

export default async function IndividualInstitutionalWorkspacePage({ searchParams }: PageProps) {
  const [viewer, resolvedSearchParams] = await Promise.all([
    requireViewer("/institutions/individual"),
    searchParams,
  ]);
  const data = await loadIndividualInstitutionalWorkspace(viewer.authUser.id);
  const message = getFormMessage(resolvedSearchParams);
  const actions = getTopbarActions(true);
  const active = data.participation?.status === "active";
  const dealById = new Map(data.deals.map((deal) => [String(deal.id), deal]));
  const partyById = new Map(data.parties.map((party) => [String(party.id), party]));
  const pendingParties = data.parties.filter((party) => !party.joined_at);
  const pendingConsents = data.consents.filter((consent) => consent.decision === "pending");
  const pendingAssignments = data.verifierAssignments.filter((assignment) => assignment.status === "invited");

  return <div className={styles.shell}>
    <SiteTopbar brandHref="/" links={getPrimaryNavLinks(true)} authLink={actions.authLink} primaryAction={actions.primaryAction} showLogout />
    <header className={styles.hero}><div className={styles.heroInner}>
      <div className={styles.heroCopy}>
        <p className={styles.eyebrow}>Acting as: Personal / independent</p>
        <h1>Independent institutional participation</h1>
        <p>You may negotiate and sign only for yourself, your own work, your own money, and rights you personally control. An affiliation does not authorize you to bind that institution while you are in this capacity.</p>
        <div className={styles.heroActions}>
          <Link className={styles.secondaryButton} href="/institutions">Institutional directory</Link>
          <Link className={styles.secondaryButton} href="/institutions/new">Switch to an organization context</Link>
        </div>
        <nav aria-label="Independent institutional workspace" className={styles.subnav}>
          {INDIVIDUAL_INSTITUTIONAL_NAV.map((item) => <a href={`#${item.toLowerCase().replaceAll(" ", "-")}`} key={item}>{item}</a>)}
        </nav>
      </div>
      <aside className={styles.heroAside}>
        <div className={styles.principle}><span>01</span><div><strong>Self authority only</strong><p>Your personal signature cannot commit an employer, university, funder, colleague, or affiliated institution.</p></div></div>
        <div className={styles.principle}><span>02</span><div><strong>Named consent remains separate</strong><p>No approval from another party can replace your consent to obligations involving your labor or personal rights.</p></div></div>
        <div className={styles.principle}><span>03</span><div><strong>Explicit opt-in</strong><p>Your ordinary Moral Trade profile is not made discoverable here unless you activate this workspace.</p></div></div>
      </aside>
    </div></header>

    <main className={styles.main}>
      {message ? <p className={message.tone === "error" ? styles.errorNotice : styles.successNotice}>{message.text}</p> : null}

      {!active ? <section className={styles.section}>
        <InstitutionalSectionHeader eyebrow="Opt in" title="Enable independent participation" description="This creates a professional institutional profile for matching and deal participation. It does not create an organization or grant authority over one." />
        <form action={runInstitutionalAction} className={`${styles.formGrid} ${styles.panel}`}>
          {base("enable_individual_participation")}
          <label>Professional headline<input name="headline" placeholder="Independent donor, grantmaker, researcher, consultant…" defaultValue={String(data.participation?.headline ?? "")} /></label>
          <label>Visibility<select name="visibility" defaultValue={String(data.participation?.visibility ?? "private")}><option value="private">Private</option><option value="verified_only">Verified participants</option><option value="public">Public</option></select></label>
          <label className={styles.fullSpan}>Summary<textarea name="summary" defaultValue={String(data.participation?.summary ?? "")} placeholder="Describe the professional capacity you personally control." /></label>
          <label className={styles.fullSpan}>Participation roles<input name="participationRoles" defaultValue={Array.isArray(data.participation?.participation_roles) ? data.participation.participation_roles.join(", ") : ""} placeholder="independent funder, researcher, consultant, secondee, verifier" /></label>
          <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Enable independent participation</button></div>
        </form>
      </section> : <>
        <section className={styles.section}>
          <InstitutionalSectionHeader eyebrow="Personal capacity" title="Your institutional activity" description="Only records connected to you as an opted-in person are shown here." action={<form action={runInstitutionalAction}>{base("pause_individual_participation")}<button className={styles.secondaryButton} type="submit">Pause participation</button></form>} />
          <div className={styles.metricGrid}>
            <InstitutionalMetric label="Deals" value={data.deals.length} note="Personal party or lead" />
            <InstitutionalMetric label="Pending matches" value={pendingParties.length} note="Invitations awaiting you" />
            <InstitutionalMetric label="Obligations" value={data.obligations.length} note="Where you are a party" />
            <InstitutionalMetric label="Decisions" value={pendingConsents.length + pendingAssignments.length} note="Consent or verification" />
          </div>
          <details className={styles.disclosure}><summary>Create a personal-capacity deal</summary><div className={styles.disclosureBody}>
            <form action={runInstitutionalAction} className={styles.formGrid}>
              {base("create_deal")}
              <label>Title<input name="title" required /></label>
              <label>Deal type<select name="dealType" defaultValue="bilateral_trade"><option value="bilateral_trade">Bilateral trade</option><option value="multi_party_exchange">Multi-party exchange</option><option value="funding_redirect">Funding redirect</option></select></label>
              <label>Classification<select name="classification" defaultValue="unclassified"><option value="unclassified">Unclassified</option><option value="pure_moral_trade">Pure moral trade</option><option value="mixed_moral_trade">Mixed moral trade</option><option value="ordinary_mission_exchange">Ordinary mission exchange</option></select></label>
              <label>Visibility<select name="visibility" defaultValue="parties_only"><option value="parties_only">Parties only</option><option value="invited_only">Invited only</option><option value="public">Public</option></select></label>
              <label className={styles.fullSpan}>Summary<textarea name="summary" /></label>
              <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Create personal-capacity deal</button></div>
            </form>
          </div></details>
        </section>

        <section className={styles.section} id="opportunities">
          <InstitutionalSectionHeader eyebrow="Discovery" title="Opportunities" description="Public institutional opportunities that may be relevant to an independent donor or professional." />
          {data.opportunities.length ? <div className={styles.grid}>{data.opportunities.map((opportunity) => <article className={styles.card} key={opportunity.id}><div className={styles.cardHeader}><h3>{opportunity.title}</h3><InstitutionalStatus tone="good">Published</InstitutionalStatus></div><p>{opportunity.summary}</p><p><strong>No-trade baseline:</strong> {opportunity.no_trade_summary}</p></article>)}</div> : <InstitutionalEmpty>No public opportunity is currently available.</InstitutionalEmpty>}
        </section>

        <section className={styles.section} id="matches">
          <InstitutionalSectionHeader eyebrow="Invitations" title="Matches" description="A match becomes active only when you accept the exact named personal-capacity party record." />
          {pendingParties.length ? <div className={styles.grid}>{pendingParties.map((party) => { const deal = dealById.get(String(party.deal_id)); return <article className={styles.card} key={party.id}><div className={styles.cardHeader}><h3>{deal?.title ?? "Institutional deal invitation"}</h3><InstitutionalStatus tone="warn">Awaiting acceptance</InstitutionalStatus></div><p>{deal?.summary || "Review the deal before accepting."}</p><p><strong>Capacity:</strong> {formatInstitutionalLabel(party.party_capacity)} · <strong>Role:</strong> {formatInstitutionalLabel(party.party_role)}</p><form action={runInstitutionalAction}><input name="actionType" type="hidden" value="accept_deal_party" /><input name="actingCapacity" type="hidden" value="individual" /><input name="partyId" type="hidden" value={party.id} /><input name="returnTo" type="hidden" value={deal ? institutionalIndividualDealHref(String(deal.id)) : "/institutions/individual"} /><button className={styles.primaryButton} type="submit">Accept participation</button></form></article>; })}</div> : <InstitutionalEmpty>No pending personal-capacity match.</InstitutionalEmpty>}
        </section>

        <section className={styles.section} id="deals">
          <InstitutionalSectionHeader eyebrow="Deal rooms" title="Deals" description="Deals where you are the personal lead, an invited participant, a service provider, or an accepted verifier." />
          {data.deals.length ? <div className={styles.grid}>{data.deals.map((deal) => { const party = data.parties.find((candidate) => candidate.deal_id === deal.id); return <article className={styles.card} key={deal.id}><div className={styles.cardHeader}><h3><Link href={institutionalIndividualDealHref(String(deal.id))}>{deal.title}</Link></h3><InstitutionalStatus tone={institutionalStatusTone(deal.stage)}>{formatInstitutionalLabel(deal.stage)}</InstitutionalStatus></div><p>{deal.summary || "No summary supplied."}</p><p>{formatInstitutionalLabel(party?.party_capacity)} · {formatInstitutionalLabel(party?.party_role)} · {party?.joined_at ? "accepted" : "invited"}</p><Link className={styles.textButton} href={institutionalIndividualDealHref(String(deal.id))}>Open reduced deal room</Link></article>; })}</div> : <InstitutionalEmpty>No personal-capacity deal yet.</InstitutionalEmpty>}
        </section>

        <section className={styles.section} id="obligations">
          <InstitutionalSectionHeader eyebrow="Performance" title="Obligations" description="These are exact-proposal obligations connected to your party record. A draft does not become binding merely because it appears here." />
          {data.obligations.length ? <div className={styles.grid}>{data.obligations.map((obligation) => { const obligor = partyById.get(String(obligation.obligor_party_id)); const deal = dealById.get(String(obligation.deal_id)); return <article className={styles.card} key={obligation.id}><div className={styles.cardHeader}><h3>{obligation.title}</h3><InstitutionalStatus tone={institutionalStatusTone(obligation.status)}>{formatInstitutionalLabel(obligation.status)}</InstitutionalStatus></div><p>{obligation.description || "No description supplied."}</p><p>{obligor?.profile_id === viewer.authUser.id ? "You are the obligor." : "You are connected as a beneficiary or other party."}</p>{deal ? <Link className={styles.textButton} href={institutionalIndividualDealHref(String(deal.id))}>Open exact terms</Link> : null}</article>; })}</div> : <InstitutionalEmpty>No obligation connected to you.</InstitutionalEmpty>}
        </section>

        <section className={styles.section} id="evidence">
          <InstitutionalSectionHeader eyebrow="Verification" title="Evidence" description="Evidence you submitted remains linked to the exact deal, proposal, obligation, milestone, and requirement." />
          {data.evidenceSubmissions.length ? <div className={styles.timeline}>{data.evidenceSubmissions.map((submission) => <article className={styles.timelineItem} key={submission.id}><time><InstitutionalDate value={submission.created_at} /></time><div><strong>{formatInstitutionalLabel(submission.status)}</strong><p>Requirement {String(submission.requirement_id)}</p></div></article>)}</div> : <InstitutionalEmpty>No submitted evidence.</InstitutionalEmpty>}
        </section>

        <section className={styles.section} id="consent-and-verification">
          <InstitutionalSectionHeader eyebrow="Personal decisions" title="Consent and verification" description="Your consent and verifier acceptance are independent of any other party's organizational approval." />
          <article className={styles.panel}>
            <div className={styles.cardHeader}><h3>Independent profile verification</h3><InstitutionalStatus tone={institutionalStatusTone(data.participation?.verification_status)}>{formatInstitutionalLabel(data.participation?.verification_status)}</InstitutionalStatus></div>
            <p>You cannot verify your own institutional identity or qualifications. A verified status must come from an authorized reviewer and does not grant authority over any organization.</p>
          </article>
          <div className={styles.twoColumn}>
            <div><h3>Named-person consent</h3>{data.consents.length ? <div className={styles.grid}>{data.consents.map((consent) => { const deal = dealById.get(String(consent.deal_id)); return <article className={styles.card} key={consent.id}><div className={styles.cardHeader}><strong>{deal?.title ?? "Consent request"}</strong><InstitutionalStatus tone={institutionalStatusTone(consent.decision)}>{formatInstitutionalLabel(consent.decision)}</InstitutionalStatus></div><p>Exact terms {String(consent.terms_hash).slice(0, 12)}…</p><Link className={styles.textButton} href={`/institutions/consents/${consent.id}`}>Review consent</Link></article>; })}</div> : <InstitutionalEmpty>No consent request.</InstitutionalEmpty>}</div>
            <div><h3>Independent verification</h3>{data.verifierAssignments.length ? <div className={styles.grid}>{data.verifierAssignments.map((assignment) => <article className={styles.card} key={assignment.id}><div className={styles.cardHeader}><strong>{formatInstitutionalLabel(assignment.scope)}</strong><InstitutionalStatus tone={institutionalStatusTone(assignment.status)}>{formatInstitutionalLabel(assignment.status)}</InstitutionalStatus></div><p>{assignment.conflict_declaration || "No conflict declaration supplied."}</p><Link className={styles.textButton} href={`/institutions/verifier-assignments/${assignment.id}`}>Review assignment</Link></article>)}</div> : <InstitutionalEmpty>No verifier assignment.</InstitutionalEmpty>}</div>
          </div>
        </section>
      </>}
    </main>
    <SiteFooter />
  </div>;
}
