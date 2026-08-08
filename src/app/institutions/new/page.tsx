import type { Metadata } from "next";
import Link from "next/link";

import { runInstitutionalAction } from "@/app/institutions/actions";
import styles from "@/app/institutions/institutions.module.css";
import { InstitutionalSectionHeader } from "@/components/institutions/institutional-ui";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { requireViewer } from "@/lib/app-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = { title: "Create or claim an organization", robots: { index: false, follow: false } };

export default async function NewInstitutionPage() {
  await requireViewer("/institutions/new");
  const actions = getTopbarActions(true);
  return <div className={styles.shell}>
    <SiteTopbar brandHref="/" links={getPrimaryNavLinks(true)} authLink={actions.authLink} primaryAction={actions.primaryAction} showLogout />
    <header className={styles.hero}><div className={styles.heroInner}><div className={styles.heroCopy}><h1>Create or claim an organization</h1><p>Search should be used before creating a duplicate. The workspace begins unverified. Legal identity, domain control, representative identity, authority, and payment readiness are reviewed separately.</p><div className={styles.heroActions}><Link className={styles.secondaryButton} href="/institutions">Search the directory</Link></div></div><aside className={styles.heroAside}><div className={styles.principle}><span>01</span><div><strong>Your personal account remains the actor</strong><p>No shared institutional password is created.</p></div></div><div className={styles.principle}><span>02</span><div><strong>Founding authority is provisional</strong><p>Replace broad bootstrap permissions with reviewed, time-limited, program-scoped grants before binding activity.</p></div></div></aside></div></header>
    <main className={styles.main}><section className={styles.section}><InstitutionalSectionHeader title="Organization identity" description="Provide public and registry-facing facts. Do not paste passwords, API keys, private keys, bank credentials, or identity documents into these fields." />
      <form action={runInstitutionalAction} className={styles.formGrid}>
        <input name="actionType" type="hidden" value="create_organization" /><input name="returnTo" type="hidden" value="/institutions/new" />
        <label>Public name<input name="displayName" required /></label><label>URL slug<input name="slug" required pattern="[a-z0-9-]+" /></label>
        <label>Organization type<select name="organizationType" defaultValue="nonprofit"><option value="foundation">Foundation</option><option value="grantmaker">Grantmaker</option><option value="nonprofit">Nonprofit</option><option value="charity">Charity</option><option value="research_organization">Research organization</option><option value="university">University</option><option value="laboratory">Laboratory</option><option value="for_profit">For-profit company</option><option value="independent_funder">Independent funder</option><option value="fiscally_sponsored_project">Fiscally sponsored project</option><option value="fund">Fund</option><option value="donor_advised_fund">Donor-advised-fund participant</option><option value="informal_initiative">Informal initiative</option><option value="other">Other</option></select></label>
        <label>Legal name<input name="legalName" /></label><label>Official website<input name="websiteUrl" type="url" /></label><label>Official domain<input name="officialDomain" placeholder="example.org" /></label>
        <label>Jurisdiction<input name="jurisdiction" /></label><label>Registration number<input name="registrationNumber" /></label>
        <label className={styles.fullSpan}>Public summary<textarea name="summary" /></label>
        <div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Create organization workspace</button></div>
      </form>
    </section></main><SiteFooter />
  </div>;
}
