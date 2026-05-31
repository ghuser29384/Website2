import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  Breadcrumbs,
  IconMark,
  PageHero,
  SectionHeader,
  StepCard,
  StatusBadge,
  TradeFlowDiagram,
} from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  getMoralTradeChallengeAppealContract,
  validateMoralTradeChallengeAppealContract,
} from "@/lib/moral-trade/challenge-appeal";
import { validateMoralTradeProtocolProfile } from "@/lib/moral-trade/protocol";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import {
  TRUST_BADGE_LADDER,
  VALIDATION_STATUS_STATES,
  VALIDATOR_OPERATION_STANDARDS,
  VALIDATOR_QUALITY_METRICS,
  VALIDATOR_REVIEW_ROLES,
  VALIDATOR_SCOPES,
} from "@/lib/validation";

export const metadata: Metadata = {
  title: "Validation and evidence",
  description:
    "How Moral Trade turns manual review into validator scopes, evidence states, challenge windows, and transaction-linked trust badges.",
  alternates: {
    canonical: "/validation",
  },
  openGraph: {
    title: "Validation and evidence",
    description:
      "Validator scopes, evidence states, challenge windows, and transaction-linked trust badges for Moral Trade.",
    url: getAbsoluteUrl("/validation"),
    type: "website",
  },
};

export default async function ValidationPage() {
  const viewer = await getViewer();
  const protocolValidation = validateMoralTradeProtocolProfile();
  const challengeAppealContract = getMoralTradeChallengeAppealContract();
  const challengeAppealValidation =
    validateMoralTradeChallengeAppealContract(challengeAppealContract);

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
        <Breadcrumbs items={[{ href: "/validation", label: "Validation" }]} />

        <PageHero
          eyebrow="Validation and evidence"
          title="Manual review becomes an explicit institution."
          description="The pilot should not rely on vague trust. Every visible proof claim needs a scope, evidence schema, challenge lane, and completion state."
          actions={
            <>
              <Link className="button button-primary" href={viewer ? "/offers/new?mode=offset" : "/signup?returnTo=/offers/new%3Fmode%3Doffset"}>
                Create reviewed offset
              </Link>
              <Link className="button button-secondary" href="/admin">
                Open operator console
              </Link>
            </>
          }
        >
          <TradeFlowDiagram
            title="Validation flow"
            steps={["State baseline", "Attach evidence", "Screen risk", "Open challenge", "Review completion"]}
          />
        </PageHero>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="scope-heading">
          <SectionHeader eyebrow="Validator scope" id="scope-heading" title="What reviewers are allowed to certify.">
            Reviewers certify narrow evidence claims, not broad moral worth, legal enforceability, tax treatment, escrow status, or final real-world impact.
          </SectionHeader>
          <div className="concept-grid">
            {VALIDATOR_SCOPES.map((scope) => (
              <article className="panel concept-card" key={scope.title}>
                <IconMark name="review" />
                <h3>{scope.title}</h3>
                <p>{scope.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="core-protocol-heading">
          <SectionHeader
            eyebrow="Public validator"
            id="core-protocol-heading"
            title="The core Moral Trade protocol now has a public check surface."
          >
            The validator publishes required proposal fields, status values, factor codes, evidence
            schemas, and provenance objects so the core feature is inspectable like MPGF.
          </SectionHeader>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Core profile</p>
              <h3>{protocolValidation.profileVersion}</h3>
              <p>
                {protocolValidation.checks.length} check(s),{" "}
                {protocolValidation.blockers.length} blocker(s), status {protocolValidation.status}.
              </p>
            </div>
            <div className="hero-actions">
              <Link className="button button-primary" href="/moral-trade/technical-spec">
                Open technical spec
              </Link>
              <Link className="button button-secondary" href="/api/moral-trade/health">
                View health JSON
              </Link>
            </div>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="states-heading">
          <SectionHeader eyebrow="Status taxonomy" id="states-heading" title="Every proof claim should have a visible state." />
          <div className="data-grid">
            {VALIDATION_STATUS_STATES.map((state, index) => (
              <article className="panel data-card" key={state.state}>
                <p className="detail-kicker">State {index + 1}</p>
                <h3>{state.state}</h3>
                <p>{state.meaning}</p>
                <p className="panel-note">{state.reviewerAction}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="reviewer-roles-heading">
          <SectionHeader eyebrow="Reviewer roles" id="reviewer-roles-heading" title="Manual review has named responsibilities.">
            Each role certifies a narrow operational question so users can tell whether a record is complete, evidenced, appealed, or still unresolved.
          </SectionHeader>
          <div className="concept-grid">
            {VALIDATOR_REVIEW_ROLES.map((role) => (
              <article className="panel concept-card" key={role.title}>
                <IconMark name="review" />
                <h3>{role.title}</h3>
                <p>{role.scope}</p>
                <p className="panel-note">
                  <strong>Publishes:</strong> {role.publishes}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="operations-heading">
          <SectionHeader eyebrow="Operating targets" id="operations-heading" title="Review needs SLAs, conflict rules, and appeals.">
            These targets turn the trust problem from a site-wide disclaimer into a visible operating promise that can be audited over time.
          </SectionHeader>
          <div className="data-grid">
            {VALIDATOR_OPERATION_STANDARDS.map((standard) => (
              <article className="panel data-card" key={standard.title}>
                <p className="detail-kicker">{standard.target}</p>
                <h3>{standard.title}</h3>
                <p>{standard.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="challenge-appeal-heading">
          <SectionHeader
            eyebrow="Challenge and appeal contract"
            id="challenge-appeal-heading"
            title="Appeals are scoped to reviewable claims, not general moral disagreement."
          >
            Challenges can target a specific claim, evidence row, baseline concern, disclosure
            decision, externality trigger, completion state, or policy flag. They do not mutate
            live state by themselves; they route a human review lane with redacted provenance.
          </SectionHeader>
          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Appeal contract {challengeAppealContract.version}</p>
              <div className="protocol-workflow-card-head">
                <h3>{challengeAppealValidation.status}</h3>
                <StatusBadge tone={challengeAppealValidation.status === "pass" ? "default" : "warning"}>
                  {challengeAppealValidation.status}
                </StatusBadge>
              </div>
              <p>
                {challengeAppealValidation.checks.length} check(s),{" "}
                {challengeAppealValidation.blockers.length} blocker(s),{" "}
                {challengeAppealContract.appealTriggers.length} trigger(s).
              </p>
            </div>
            <Link className="button button-secondary" href="/api/moral-trade/challenge-appeal/contract">
              Open appeal contract JSON
            </Link>
          </div>
          <div className="data-grid">
            <article className="panel data-card">
              <h3>Reviewable subjects</h3>
              <p className="route-text">
                {challengeAppealContract.subjects.map((subject) => subject.replaceAll("_", " ")).join(", ")}.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Standing categories</h3>
              <p className="route-text">
                {challengeAppealContract.standingCategories
                  .map((standing) => standing.replaceAll("_", " "))
                  .join(", ")}
                .
              </p>
            </article>
            <article className="panel data-card">
              <h3>Appeal triggers</h3>
              <p className="route-text">
                {challengeAppealContract.appealTriggers
                  .map((trigger) => trigger.replaceAll("_", " "))
                  .join(", ")}
                .
              </p>
            </article>
            <article className="panel data-card">
              <h3>Allowed outcomes</h3>
              <p className="route-text">
                {challengeAppealContract.allowedOutcomes
                  .map((outcome) => outcome.replaceAll("_", " "))
                  .join(", ")}
                .
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="quality-heading">
          <SectionHeader eyebrow="Reviewer quality" id="quality-heading" title="Trust metrics should be published before trust badges scale.">
            The pilot should track reviewer performance and failure modes before expanding reputation or paid-action volume.
          </SectionHeader>
          <div className="checklist-card-grid">
            {VALIDATOR_QUALITY_METRICS.map((metric) => (
              <article className="panel checklist-card" key={metric}>
                <span aria-hidden="true">Track</span>
                <h3>{metric}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="badges-heading">
          <SectionHeader eyebrow="Trust ladder" id="badges-heading" title="Badges are transaction-linked, never decorative." />
          <div className="step-card-grid">
            {TRUST_BADGE_LADDER.map((badge, index) => (
              <StepCard index={index + 1} key={badge} title={badge}>
                {badge === "Provider payment verified"
                  ? "Only provider-linked receipts or webhooks should create this badge."
                  : "Show this badge only when the underlying record and review scope support it."}
              </StepCard>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="governance-heading">
          <SectionHeader eyebrow="Governance" id="governance-heading" title="Centralized operator, published rules, independent review.">
            The next operating model is founder-led moderation with a public rulebook, an appeal path, external reviewer panel, and real transparency numbers.
          </SectionHeader>
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Rulebook first</h3>
              <p>No threats, coercive baselines, hidden platform fees, unsupported jurisdictions, or campaign-contribution offsets.</p>
            </article>
            <article className="panel concept-card">
              <h3>Appeals and audits</h3>
              <p>Hard cases should leave an internal audit log and, when safe, a short publishable reasoning summary.</p>
            </article>
            <article className="panel concept-card">
              <h3>Portable later</h3>
              <p>The pilot stays centralized for safety and compliance while preserving exportable records for future interoperability.</p>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
