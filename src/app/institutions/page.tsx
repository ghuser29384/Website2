import type { Metadata } from "next";
import Link from "next/link";

import styles from "@/app/institutions/institutions.module.css";
import {
  InstitutionalEmpty,
  InstitutionalSectionHeader,
  InstitutionalStatus,
  formatInstitutionalLabel,
  institutionalStatusTone,
} from "@/components/institutions/institutional-ui";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { isInstitutionalFeatureEnabled } from "@/lib/institutional-feature-gates";
import { loadInstitutionalDirectory } from "@/lib/institutional-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Institutional Moral Trade",
  description: "Verified organizations and opted-in independent participants can enter governed institutional moral trades without conflating personal and organizational authority.",
};

export default async function InstitutionsPage() {
  const viewer = await getViewer();
  const enabled = isInstitutionalFeatureEnabled("trades");
  const directory = enabled ? await loadInstitutionalDirectory() : { organizations: [], programs: [], opportunities: [] };
  const actions = getTopbarActions(Boolean(viewer));
  const programsByOrganization = new Map<string, typeof directory.programs>();
  for (const program of directory.programs) {
    const list = programsByOrganization.get(String(program.organization_id)) ?? [];
    list.push(program);
    programsByOrganization.set(String(program.organization_id), list);
  }

  return (
    <div className={styles.shell}>
      <SiteTopbar brandHref="/" links={getPrimaryNavLinks(Boolean(viewer))} authLink={actions.authLink} primaryAction={actions.primaryAction} showLogout={Boolean(viewer)} />
      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <h1>Institutional moral trade</h1>
            <p>Foundations, research organizations, grantmakers, companies, and opted-in independent donors or professionals can negotiate governed trades. Personal and organizational authority stay separate: a person can bind only themselves unless they deliberately switch into a verified organization context.</p>
            <div className={styles.heroActions}>
              {viewer ? <Link className={styles.primaryButton} href="/institutions/individual">Participate independently</Link> : <Link className={styles.primaryButton} href="/login?returnTo=%2Finstitutions%2Findividual">Sign in to participate</Link>}
              {viewer ? <Link className={styles.secondaryButton} href="/institutions/new">Create or claim an organization</Link> : <Link className={styles.secondaryButton} href="/login?returnTo=%2Finstitutions%2Fnew">Represent an organization</Link>}
              <Link className={styles.secondaryButton} href="/what-is-moral-trade">How moral trade works</Link>
            </div>
          </div>
          <aside className={styles.heroAside}>
            <div className={styles.principle}><span>01</span><div><strong>Acting capacity is explicit</strong><p>Every consequential action states whether the person acts independently, for an organization, or as an accepted verifier.</p></div></div>
            <div className={styles.principle}><span>02</span><div><strong>Verification is fact-specific</strong><p>Domain control, legal identity, representative identity, authority, and payment readiness remain distinct claims.</p></div></div>
            <div className={styles.principle}><span>03</span><div><strong>Binding activity is private by default</strong><p>Public profiles support discovery; negotiation, reservation terms, approvals, and evidence remain access-controlled.</p></div></div>
          </aside>
        </div>
      </header>
      <main className={styles.main}>
        {!enabled ? <p className={styles.errorNotice}>Institutional trades are not enabled in this environment.</p> : null}
        <section className={styles.section}>
          <InstitutionalSectionHeader eyebrow="Directory" title="Verified organizations and programs" description="A verification label confirms only the stated fact. It is not an endorsement of a mission, moral view, effectiveness, or proposed trade." />
          {directory.organizations.length ? <div className={styles.grid}>{directory.organizations.map((organization) => (
            <article className={styles.card} key={organization.id}>
              <div className={styles.cardHeader}><div><p className={styles.eyebrow}>{formatInstitutionalLabel(organization.organization_type)}</p><h3><Link href={`/institutions/${organization.id}`}>{organization.display_name}</Link></h3></div><InstitutionalStatus tone={institutionalStatusTone(organization.verification_status)}>{formatInstitutionalLabel(organization.verification_status)}</InstitutionalStatus></div>
              <p>{organization.summary || "No public summary supplied."}</p>
              {(programsByOrganization.get(organization.id) ?? []).length ? <p><strong>Programs:</strong> {(programsByOrganization.get(organization.id) ?? []).map((program) => program.name).join(" · ")}</p> : null}
              <Link className={styles.textButton} href={`/institutions/${organization.id}`}>Open public profile and workspace</Link>
            </article>
          ))}</div> : <InstitutionalEmpty>No public institutional profile has been published.</InstitutionalEmpty>}
        </section>
        <section className={styles.section}>
          <InstitutionalSectionHeader eyebrow="Opportunities" title="Public institutional opportunities" description="Private, invited, network-only, and blind opportunities do not appear here. Verified members see them only through their authorized workspace." />
          {directory.opportunities.length ? <div className={styles.grid}>{directory.opportunities.map((opportunity) => (
            <article className={styles.card} key={opportunity.id}>
              <div className={styles.cardHeader}><h3>{opportunity.title}</h3><InstitutionalStatus tone="good">Published</InstitutionalStatus></div>
              <p>{opportunity.summary}</p>
              <p><strong>No-trade baseline:</strong> {opportunity.no_trade_summary}</p>
              {opportunity.moral_difference_statement ? <p><strong>Moral difference:</strong> {opportunity.moral_difference_statement}</p> : null}
            </article>
          ))}</div> : <InstitutionalEmpty>No public institutional opportunity is currently open.</InstitutionalEmpty>}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
