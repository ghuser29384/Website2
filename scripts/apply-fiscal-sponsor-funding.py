from pathlib import Path


def write_file(path: str, content: str) -> None:
    file_path = Path(path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_text(content)


def replace_exact(path: str, old: str, new: str) -> None:
    file_path = Path(path)
    source = file_path.read_text()
    count = source.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match in {path}, found {count}: {old!r}")
    file_path.write_text(source.replace(old, new))


write_file(
    "src/lib/funding.ts",
    '''export type MoralTradeFundingMode = "external_charities_only" | "fiscal_sponsor";
export type FiscalSponsorStatus = "not_configured" | "configuration_incomplete" | "active";

export interface FiscalSponsorDisclosure {
  legalName: string;
  jurisdiction: string;
  contributionUrl: string;
  feeDisclosure: string;
  taxReceiptDisclosure: string;
  refundPolicyUrl: string;
}

export interface MoralTradeFundingReadiness {
  mode: MoralTradeFundingMode;
  sponsorStatus: FiscalSponsorStatus;
  directToCharityAvailable: true;
  projectFundingAvailable: boolean;
  nativeCheckoutAvailable: false;
  conditionalFundingMode: "pledge_only_external_handoff";
  sponsor: FiscalSponsorDisclosure | null;
  blockers: string[];
}

function optionalTrimmed(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function requiredText(
  environment: NodeJS.ProcessEnv,
  key: string,
  label: string,
  blockers: string[],
) {
  const value = optionalTrimmed(environment[key]);
  if (!value) {
    blockers.push(`${label} is missing.`);
  }
  return value;
}

function requiredHttpsUrl(
  environment: NodeJS.ProcessEnv,
  key: string,
  label: string,
  blockers: string[],
) {
  const value = requiredText(environment, key, label, blockers);
  if (!value) {
    return undefined;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "https:") {
      blockers.push(`${label} must use HTTPS.`);
      return undefined;
    }
    return url.toString();
  } catch {
    blockers.push(`${label} must be a valid URL.`);
    return undefined;
  }
}

export function getMoralTradeFundingReadiness(
  environment: NodeJS.ProcessEnv = process.env,
): MoralTradeFundingReadiness {
  const configuredMode = optionalTrimmed(environment.MORAL_TRADE_FUNDING_MODE)?.toLowerCase();
  const sponsorRequested = configuredMode === "fiscal_sponsor";
  const blockers: string[] = [];

  if (configuredMode && configuredMode !== "external_charities_only" && configuredMode !== "fiscal_sponsor") {
    blockers.push(
      "MORAL_TRADE_FUNDING_MODE must be external_charities_only or fiscal_sponsor.",
    );
  }

  if (!sponsorRequested) {
    return {
      mode: "external_charities_only",
      sponsorStatus: "not_configured",
      directToCharityAvailable: true,
      projectFundingAvailable: false,
      nativeCheckoutAvailable: false,
      conditionalFundingMode: "pledge_only_external_handoff",
      sponsor: null,
      blockers,
    };
  }

  const legalName = requiredText(
    environment,
    "FISCAL_SPONSOR_LEGAL_NAME",
    "Fiscal sponsor legal name",
    blockers,
  );
  const jurisdiction = requiredText(
    environment,
    "FISCAL_SPONSOR_JURISDICTION",
    "Fiscal sponsor jurisdiction",
    blockers,
  );
  const contributionUrl = requiredHttpsUrl(
    environment,
    "FISCAL_SPONSOR_CONTRIBUTION_URL",
    "Fiscal sponsor contribution URL",
    blockers,
  );
  const feeDisclosure = requiredText(
    environment,
    "FISCAL_SPONSOR_FEE_DISCLOSURE",
    "Fiscal sponsor fee disclosure",
    blockers,
  );
  const taxReceiptDisclosure = requiredText(
    environment,
    "FISCAL_SPONSOR_TAX_RECEIPT_DISCLOSURE",
    "Fiscal sponsor tax-receipt disclosure",
    blockers,
  );
  const refundPolicyUrl = requiredHttpsUrl(
    environment,
    "FISCAL_SPONSOR_REFUND_POLICY_URL",
    "Fiscal sponsor refund-policy URL",
    blockers,
  );

  if (
    blockers.length > 0 ||
    !legalName ||
    !jurisdiction ||
    !contributionUrl ||
    !feeDisclosure ||
    !taxReceiptDisclosure ||
    !refundPolicyUrl
  ) {
    return {
      mode: "external_charities_only",
      sponsorStatus: "configuration_incomplete",
      directToCharityAvailable: true,
      projectFundingAvailable: false,
      nativeCheckoutAvailable: false,
      conditionalFundingMode: "pledge_only_external_handoff",
      sponsor: null,
      blockers,
    };
  }

  return {
    mode: "fiscal_sponsor",
    sponsorStatus: "active",
    directToCharityAvailable: true,
    projectFundingAvailable: true,
    nativeCheckoutAvailable: false,
    conditionalFundingMode: "pledge_only_external_handoff",
    sponsor: {
      legalName,
      jurisdiction,
      contributionUrl,
      feeDisclosure,
      taxReceiptDisclosure,
      refundPolicyUrl,
    },
    blockers: [],
  };
}
''',
)

write_file(
    "src/lib/funding.test.ts",
    '''import assert from "node:assert/strict";
import test from "node:test";

import { getMoralTradeFundingReadiness } from "@/lib/funding";

test("funding defaults to direct-to-charity routes and pledge-only external handoff", () => {
  const readiness = getMoralTradeFundingReadiness({} as NodeJS.ProcessEnv);

  assert.equal(readiness.mode, "external_charities_only");
  assert.equal(readiness.sponsorStatus, "not_configured");
  assert.equal(readiness.directToCharityAvailable, true);
  assert.equal(readiness.projectFundingAvailable, false);
  assert.equal(readiness.nativeCheckoutAvailable, false);
  assert.equal(readiness.conditionalFundingMode, "pledge_only_external_handoff");
  assert.equal(readiness.sponsor, null);
});

test("fiscal-sponsor mode fails closed when disclosures are incomplete", () => {
  const readiness = getMoralTradeFundingReadiness({
    MORAL_TRADE_FUNDING_MODE: "fiscal_sponsor",
    FISCAL_SPONSOR_LEGAL_NAME: "Example Sponsor",
  } as NodeJS.ProcessEnv);

  assert.equal(readiness.mode, "external_charities_only");
  assert.equal(readiness.sponsorStatus, "configuration_incomplete");
  assert.equal(readiness.projectFundingAvailable, false);
  assert.ok(readiness.blockers.length >= 5);
});

test("fiscal-sponsor mode activates only with complete public disclosures", () => {
  const readiness = getMoralTradeFundingReadiness({
    MORAL_TRADE_FUNDING_MODE: "fiscal_sponsor",
    FISCAL_SPONSOR_LEGAL_NAME: "Example Sponsor",
    FISCAL_SPONSOR_JURISDICTION: "United States — 501(c)(3)",
    FISCAL_SPONSOR_CONTRIBUTION_URL: "https://www.every.org/example-project#/donate",
    FISCAL_SPONSOR_FEE_DISCLOSURE: "Sponsor fee: 10% of incoming project funds.",
    FISCAL_SPONSOR_TAX_RECEIPT_DISCLOSURE:
      "US charitable receipts are issued by the sponsor; treatment elsewhere depends on donor jurisdiction.",
    FISCAL_SPONSOR_REFUND_POLICY_URL: "https://example.org/refunds",
  } as NodeJS.ProcessEnv);

  assert.equal(readiness.mode, "fiscal_sponsor");
  assert.equal(readiness.sponsorStatus, "active");
  assert.equal(readiness.projectFundingAvailable, true);
  assert.equal(readiness.nativeCheckoutAvailable, false);
  assert.equal(readiness.sponsor?.legalName, "Example Sponsor");
  assert.equal(readiness.blockers.length, 0);
});

test("fiscal-sponsor mode rejects non-HTTPS contribution and refund URLs", () => {
  const readiness = getMoralTradeFundingReadiness({
    MORAL_TRADE_FUNDING_MODE: "fiscal_sponsor",
    FISCAL_SPONSOR_LEGAL_NAME: "Example Sponsor",
    FISCAL_SPONSOR_JURISDICTION: "United States — 501(c)(3)",
    FISCAL_SPONSOR_CONTRIBUTION_URL: "http://example.org/donate",
    FISCAL_SPONSOR_FEE_DISCLOSURE: "Sponsor fee disclosed.",
    FISCAL_SPONSOR_TAX_RECEIPT_DISCLOSURE: "Receipt status disclosed.",
    FISCAL_SPONSOR_REFUND_POLICY_URL: "not-a-url",
  } as NodeJS.ProcessEnv);

  assert.equal(readiness.projectFundingAvailable, false);
  assert.equal(readiness.sponsorStatus, "configuration_incomplete");
  assert.match(readiness.blockers.join(" "), /HTTPS|valid URL/);
});
''',
)

write_file(
    "src/app/api/funding/readiness/route.ts",
    '''import { NextResponse } from "next/server";

import { getMoralTradeFundingReadiness } from "@/lib/funding";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET() {
  return NextResponse.json(getMoralTradeFundingReadiness(), {
    headers: {
      "cache-control": "no-store",
    },
  });
}
''',
)

write_file(
    "src/app/support/page.tsx",
    '''import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { StatusBadge } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { getMoralTradeFundingReadiness } from "@/lib/funding";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support Moral Trade",
  description:
    "Use direct Every.org routes for existing charities and review the sponsor-gated funding posture for Moral Trade itself.",
  alternates: {
    canonical: "/support",
  },
  openGraph: {
    title: "Support Moral Trade",
    description:
      "Direct-to-charity giving is available now. Project funding activates only through a disclosed fiscal sponsor.",
    url: getAbsoluteUrl("/support"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const viewer = await getViewer();
  const isAuthenticated = Boolean(viewer);
  const funding = getMoralTradeFundingReadiness();
  const sponsor = funding.sponsor;

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showLogout={isAuthenticated}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Support</p>
            <h1>Fund public goods now. Fund Moral Trade only through an approved sponsor.</h1>
            <p className="hero-text">
              Existing charities can receive donations directly through Every.org. Moral Trade does
              not accept project funds into a personal account or native checkout. Project funding
              activates only after a fiscal sponsor is contractually in place and fully disclosed.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/donate">
                Donate to an existing charity
              </Link>
              <a className="button button-secondary" href="#moral-trade-project">
                Review project funding
              </a>
            </div>
            <ul className="hero-signals" aria-label="Funding safeguards">
              <li>No personal-account donations</li>
              <li>No native payment custody</li>
              <li>Exact sponsor disclosures required</li>
              <li>Conditional pools stay pledge-only</li>
            </ul>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Current funding posture</p>
            <dl className="profile-stats profile-stats-hero">
              <div>
                <dt>Existing charities</dt>
                <dd>Available</dd>
              </div>
              <div>
                <dt>Moral Trade project</dt>
                <dd>{funding.projectFundingAvailable ? "Sponsor-backed" : "Not accepting funds"}</dd>
              </div>
              <div>
                <dt>Native checkout</dt>
                <dd>Disabled</dd>
              </div>
              <div>
                <dt>Conditional pools</dt>
                <dd>Pledge-only</dd>
              </div>
            </dl>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Available now</p>
            <h2>Donate directly to an established recipient</h2>
            <p>
              Every.org handles payment, receipt, refund, and recipient disbursement. Moral Trade
              provides reviewed links and optional evidence reconciliation, but does not receive the
              donation.
            </p>
          </div>
          <div className="panel data-card data-card-wide">
            <div className="protocol-workflow-card-head">
              <h3>Direct-to-charity Every.org routes</h3>
              <StatusBadge>available</StatusBadge>
            </div>
            <p className="route-text">
              Choose among the configured animal-welfare, global-poverty, climate, and long-term-future
              routes. The recipient shown by Every.org is the beneficiary; Moral Trade is not.
            </p>
            <div className="offer-actions">
              <Link className="button button-primary" href="/donate">
                Choose a charity route
              </Link>
              <Link className="button button-secondary" href="/status">
                Review service boundaries
              </Link>
            </div>
          </div>
        </section>

        <section className="section section-subtle" id="moral-trade-project">
          <div className="section-head">
            <p className="eyebrow">Moral Trade project</p>
            <h2>
              {funding.projectFundingAvailable
                ? "Project support is available through the disclosed sponsor"
                : "Project support is not yet accepting funds"}
            </h2>
            <p>
              A sponsor-backed route must identify the legal recipient, jurisdiction, sponsor fee,
              tax-receipt treatment, and refund policy before a contribution button appears.
            </p>
          </div>

          <article className="panel data-card data-card-wide">
            <div className="protocol-workflow-card-head">
              <h3>Fiscal sponsorship</h3>
              <StatusBadge tone={funding.projectFundingAvailable ? "default" : "warning"}>
                {funding.projectFundingAvailable ? "active" : "pending"}
              </StatusBadge>
            </div>

            {sponsor ? (
              <>
                <dl className="profile-stats">
                  <div>
                    <dt>Legal recipient</dt>
                    <dd>{sponsor.legalName}</dd>
                  </div>
                  <div>
                    <dt>Jurisdiction</dt>
                    <dd>{sponsor.jurisdiction}</dd>
                  </div>
                  <div>
                    <dt>Sponsor fee</dt>
                    <dd>{sponsor.feeDisclosure}</dd>
                  </div>
                  <div>
                    <dt>Tax receipts</dt>
                    <dd>{sponsor.taxReceiptDisclosure}</dd>
                  </div>
                </dl>
                <div className="offer-actions">
                  <a
                    className="button button-primary"
                    href={sponsor.contributionUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Contribute through the fiscal sponsor
                  </a>
                  <a
                    className="button button-secondary"
                    href={sponsor.refundPolicyUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Read the sponsor refund policy
                  </a>
                </div>
              </>
            ) : (
              <>
                <p className="route-text">
                  No fiscal sponsor relationship is currently represented as active. Do not send money
                  to Moral Trade, its operators, or a personal payment account. The site will remain in
                  this fail-closed state until an approved sponsor route is configured.
                </p>
                <div className="offer-actions">
                  <Link className="button button-primary" href="/contact">
                    Ask about fiscal sponsorship
                  </Link>
                  <a className="button button-secondary" href="/api/funding/readiness">
                    Open funding readiness JSON
                  </a>
                </div>
              </>
            )}
          </article>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Conditional funding</p>
            <h2>Pledges remain non-custodial until an approved route exists</h2>
            <p>
              Moral Trade can record bounded pledge intent and evidence states. It does not store a
              payment method or charge a participant in the current production posture.
            </p>
          </div>
          <div className="data-grid">
            <article className="panel data-card">
              <h3>Before a threshold clears</h3>
              <p className="route-text">
                The system records a maximum amount, deadline, acceptable counterpart conditions,
                and failure path. No money moves.
              </p>
            </article>
            <article className="panel data-card">
              <h3>After a threshold clears</h3>
              <p className="route-text">
                The participant is directed to the approved external recipient. Provider or sponsor
                evidence must be reviewed before the contribution counts.
              </p>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
''',
)

write_file(
    "docs/fiscal-sponsorship-application.md",
    '''# Fiscal sponsorship application packet

Status: draft for project-lead review; no sponsor relationship is represented as active.

## Recommended first candidate

Rethink Priorities Special Projects Program is the first-fit candidate because it publicly offers fiscal sponsorship, finance administration, fundraising support, international hiring support, and operational assistance to high-impact projects. Its public page states that fees for new projects typically start at 14% and that expressions of interest are currently accepted.

- Program page: https://rethinkpriorities.org/our-services/special-projects/
- Expression of interest: https://docs.google.com/forms/d/e/1FAIpQLSeZMyp-GIhghd8gpS0ocuJUQzm1kUt1TAeHDyzyfJg465zUiA/viewform
- Contact: specialprojects@rethinkpriorities.org
- Public website: https://www.moraltrade.org/

Verify the program, fee, and application fields immediately before submission. Do not include identity documents, home addresses, bank details, signatures, or credentials in this repository.

## Project summary

Moral Trade is a public-interest coordination platform and research project for voluntary cooperation among people with different moral priorities. It supports three bounded mechanisms:

1. reciprocal commitments that both parties prefer to the stated no-deal default;
2. donation-offset redirection into a shared external recipient; and
3. conditional public-good pledges that activate only after published thresholds and review gates.

The product keeps the default, maximum exposure, evidence standard, settlement path, and exit rule visible before reliance. It does not rank moral worldviews globally and treats threats, coercion, fraud, forged evidence, and identity abuse as eligibility blockers rather than tradeable costs.

## Current operating posture

- The public site is live in beta.
- Donations to existing charities use direct Every.org routes.
- Moral Trade does not hold those donations.
- Native Stripe test mode is blocked on the production site.
- Moral Trade is not accepting project-support funds until a fiscal sponsor is active.
- Conditional pools are pledge-only and use external handoff plus reviewed evidence.
- Payment, custody, authorization, settlement, refund, and tax-receipt capabilities are disclosed at the point of reliance.

## Public-benefit case

Moral Trade develops open coordination infrastructure, educational material, and applied research on moral pluralism, voluntary cooperation, conflict reduction, evidence, and funding of moral public goods. The project is intended to reduce waste from opposed actions and make positive-sum agreements easier to discover, specify, verify, and review.

## Support requested

- Fiscal sponsorship for grants and donations supporting Moral Trade itself.
- Sponsor-owned receipt, refund, accounting, compliance, and disbursement processes.
- A sponsor-approved Every.org project page or equivalent hosted contribution route.
- Finance administration, budgeting, contracting, and reimbursement support.
- Review of whether any conditional-funding workflow is within sponsor policy before it can move money.
- Support appropriate for an internationally located project lead and future contractors or staff.

## Safeguards proposed for the sponsorship agreement

- The sponsor remains the legal recipient and retains variance power over charitable funds.
- Moral Trade does not describe itself as a nonprofit, charity, or tax-exempt entity.
- Sponsor legal name, jurisdiction, fee, receipt treatment, and refund policy are displayed beside every project-support contribution link.
- Direct-to-charity gifts remain separate from funds supporting Moral Trade operations.
- No personal payment account is used.
- Conditional settlement remains disabled unless the sponsor, payment provider, recipient, refund, legal, and governance gates are explicitly approved.
- Public progress and contribution totals use privacy thresholds and do not expose private payment identifiers.

## Information the project lead must confirm before submission

- Legal name and preferred public name.
- Country of residence and work authorization constraints.
- LinkedIn or professional profile URL, if supplied.
- Current team members and decision-making authority.
- Twelve-month operating plan and budget.
- Funding already committed or under discussion.
- Expected donation and grant jurisdictions.
- Whether staff, contractors, grants, events, or subgrants are expected.
- Desired timing and future Hong Kong incorporation plan.

## Suggested short expression of interest

Moral Trade is a public-interest coordination platform and research project that helps people with different moral priorities form voluntary commitments, redirect offsetting donations, and coordinate support for moral public goods. The public beta already provides direct-to-charity Every.org routes, bounded pledge and evidence workflows, and explicit non-custody and safety controls. We are seeking fiscal sponsorship so that grants and donations supporting the project itself can be received by an established legal entity with proper accounting, compliance, receipts, refunds, and disbursement controls. We would also like the sponsor to review any conditional-funding workflow before it is allowed to move money. The project may later incorporate as a Hong Kong company limited by guarantee, but no nonprofit or tax-exempt status is currently claimed.
''',
)

replace_exact(
    ".env.example",
    "CONDITIONAL_PAYMENTS_MODE=disabled\nMPGF_REAL_MONEY_ENABLED=false\n",
    '''CONDITIONAL_PAYMENTS_MODE=disabled
# Moral Trade project funding defaults to direct-to-charity routes only. Change to
# fiscal_sponsor only after a signed sponsorship agreement and all public disclosures exist.
MORAL_TRADE_FUNDING_MODE=external_charities_only
FISCAL_SPONSOR_LEGAL_NAME=
FISCAL_SPONSOR_JURISDICTION=
FISCAL_SPONSOR_CONTRIBUTION_URL=
FISCAL_SPONSOR_FEE_DISCLOSURE=
FISCAL_SPONSOR_TAX_RECEIPT_DISCLOSURE=
FISCAL_SPONSOR_REFUND_POLICY_URL=
MPGF_REAL_MONEY_ENABLED=false
''',
)

replace_exact(
    "src/lib/site.ts",
    '''      { href: "/team-and-governance", label: "Team and governance" },
      { href: "/cohort", label: "Join the network" },
      { href: "/contact", label: "Contact" },
''',
    '''      { href: "/team-and-governance", label: "Team and governance" },
      { href: "/cohort", label: "Join the network" },
      { href: "/support", label: "Support" },
      { href: "/contact", label: "Contact" },
''',
)

replace_exact(
    "src/app/sitemap.ts",
    '''    {
      url: getAbsoluteUrl("/status"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.78,
    },
''',
    '''    {
      url: getAbsoluteUrl("/status"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.78,
    },
    {
      url: getAbsoluteUrl("/support"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.76,
    },
''',
)

replace_exact(
    "src/app/donate/page.tsx",
    '''import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
''',
    '''import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { StatusBadge } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { getMoralTradeFundingReadiness } from "@/lib/funding";
''',
)

replace_exact(
    "src/app/donate/page.tsx",
    '''  description:
    "Donate through vetted Every.org routes from Moral Trade in three steps: choose a cause, pay on Every.org, and use MPGF webhook import or reviewed fallback where evidence is needed.",
''',
    '''  description:
    "Donate directly to established charities through vetted Every.org routes. These donations do not fund Moral Trade itself.",
''',
)

replace_exact(
    "src/app/donate/page.tsx",
    '''    title: "Donate through Every.org",
    description:
      "Choose a vetted route, pay on Every.org, and use MPGF webhook import or reviewed fallback where evidence is needed.",
''',
    '''    title: "Donate directly through Every.org",
    description:
      "Choose a vetted external recipient and complete the donation on Every.org. Moral Trade does not receive the gift.",
''',
)

replace_exact(
    "src/app/donate/page.tsx",
    '''};

interface DonatePageProps {
''',
    '''};

export const dynamic = "force-dynamic";

interface DonatePageProps {
''',
)

replace_exact(
    "src/app/donate/page.tsx",
    '''  const viewer = hasSupabaseEnv() ? await getViewer() : null;
  const returnedTarget = readParam(resolvedSearchParams.target);
''',
    '''  const viewer = hasSupabaseEnv() ? await getViewer() : null;
  const returnedTarget = readParam(resolvedSearchParams.target);
  const fundingReadiness = getMoralTradeFundingReadiness();
''',
)

replace_exact(
    "src/app/donate/page.tsx",
    '''            <h1>Donate through a vetted route in three steps.</h1>
            <p className="hero-text">
              Choose a cause, complete payment securely on Every.org, and use MPGF webhook
              import or reviewed fallback where a funding workflow needs evidence.
            </p>
            <p className="hero-followup">
              The payment happens off-site. Moral Trade does not hold donations, provide escrow,
              or decide tax treatment.
            </p>
''',
    '''            <h1>Donate directly to an existing charity through Every.org.</h1>
            <p className="hero-text">
              Choose a reviewed external recipient, complete payment on Every.org, and use optional
              evidence reconciliation only when a Moral Trade workflow needs it.
            </p>
            <p className="hero-followup">
              The recipient shown by Every.org receives the donation. These gifts do not fund Moral
              Trade itself, and Moral Trade does not hold funds or decide tax treatment.
            </p>
''',
)

replace_exact(
    "src/app/donate/page.tsx",
    '''              <Link className="button button-secondary" href="/donation-offsets">
                Review donation offsets
              </Link>
''',
    '''              <Link className="button button-secondary" href="/support">
                Support Moral Trade
              </Link>
''',
)

replace_exact(
    "src/app/donate/page.tsx",
    '''              <li>Payment on Every.org</li>
              <li>Webhook import when available</li>
              <li>No custody or escrow</li>
              <li>Reviewed fallback only</li>
''',
    '''              <li>Payment on Every.org</li>
              <li>Existing charity is the recipient</li>
              <li>No Moral Trade custody</li>
              <li>Not project-support funding</li>
''',
)

replace_exact(
    "src/app/donate/page.tsx",
    '''        <section className="section section-white" id="direct-routes">
''',
    '''        <section className="section section-subtle" aria-labelledby="funding-paths-heading">
          <div className="section-head">
            <p className="eyebrow">Separate funding paths</p>
            <h2 id="funding-paths-heading">Charity gifts and project support are not the same transaction</h2>
            <p>
              Direct gifts can proceed now. Moral Trade project support appears only after a fiscal
              sponsor is active and its legal and financial disclosures are configured.
            </p>
          </div>
          <div className="data-grid">
            <article className="panel data-card">
              <div className="protocol-workflow-card-head">
                <h3>Donate to an existing charity</h3>
                <StatusBadge>available</StatusBadge>
              </div>
              <p className="route-text">
                Every.org receives and processes the gift for the named external recipient.
              </p>
              <a className="text-button" href="#direct-routes">
                Choose a direct route
              </a>
            </article>
            <article className="panel data-card">
              <div className="protocol-workflow-card-head">
                <h3>Support Moral Trade operations</h3>
                <StatusBadge tone={fundingReadiness.projectFundingAvailable ? "default" : "warning"}>
                  {fundingReadiness.projectFundingAvailable ? "sponsor-backed" : "not accepting funds"}
                </StatusBadge>
              </div>
              <p className="route-text">
                Project support is available only through the legal fiscal sponsor disclosed on the
                support page. No personal or native checkout route is used.
              </p>
              <Link className="text-button" href="/support">
                Review project funding
              </Link>
            </article>
          </div>
        </section>

        <section className="section section-white" id="direct-routes">
''',
)

replace_exact(
    "src/app/status/page.tsx",
    '''import { getMarketplaceOverview, getViewer } from "@/lib/app-data";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd, getAbsoluteUrl } from "@/lib/seo";
''',
    '''import { getMarketplaceOverview, getViewer } from "@/lib/app-data";
import { getMoralTradeFundingReadiness } from "@/lib/funding";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd, getAbsoluteUrl } from "@/lib/seo";
''',
)

replace_exact(
    "src/app/status/page.tsx",
    '''    title: "Provider-hosted financial contributions",
    detail:
      "Choose a reviewed Every.org destination, complete payment with the provider, and use imported or reviewed evidence when a linked workflow requires it. Moral Trade does not hold the donation.",
    href: "/donate",
    action: "Choose a funding route",
''',
    '''    title: "Direct-to-charity financial contributions",
    detail:
      "Choose a reviewed Every.org destination and complete payment with the provider. The named external charity receives the gift; Moral Trade does not.",
    href: "/donate",
    action: "Choose a charity route",
''',
)

replace_exact(
    "src/app/status/page.tsx",
    '''  const [viewer, overview] = await Promise.all([getViewer(), getMarketplaceOverview()]);
  const isAuthenticated = Boolean(viewer);
''',
    '''  const [viewer, overview] = await Promise.all([getViewer(), getMarketplaceOverview()]);
  const isAuthenticated = Boolean(viewer);
  const fundingReadiness = getMoralTradeFundingReadiness();
''',
)

replace_exact(
    "src/app/status/page.tsx",
    '''              Moral Trade is an operating coordination service with a provider-hosted financial
              contribution route plus backed account, offer, onboarding, matching, evidence, review,
              and public-good workflows. This page states the limits that remain in force.
''',
    '''              Moral Trade is an operating coordination service with direct-to-charity Every.org
              routes plus backed account, offer, onboarding, matching, evidence, review, and public-good
              workflows. Project funding remains sponsor-gated. This page states the limits in force.
''',
)

replace_exact(
    "src/app/status/page.tsx",
    '''              <Link className="button button-primary" href="/donate">
                Make a financial contribution
              </Link>
''',
    '''              <Link className="button button-primary" href="/support">
                Review funding routes
              </Link>
''',
)

replace_exact(
    "src/app/status/page.tsx",
    '''                <dd>Available</dd>
''',
    '''                <dd>{fundingReadiness.projectFundingAvailable ? "Sponsor-backed" : "Direct-to-charity only"}</dd>
''',
)

replace_exact(
    "src/app/status/page.tsx",
    '''            {supportedCapabilities.map((capability) => (
              <article className="panel data-card" key={capability.title}>
                <div className="protocol-workflow-card-head">
                  <h3>{capability.title}</h3>
                  <StatusBadge tone="default">available</StatusBadge>
                </div>
                <p className="route-text">{capability.detail}</p>
                <Link className="text-button" href={capability.href}>
                  {capability.action}
                </Link>
              </article>
            ))}
''',
    '''            {supportedCapabilities.map((capability) => (
              <article className="panel data-card" key={capability.title}>
                <div className="protocol-workflow-card-head">
                  <h3>{capability.title}</h3>
                  <StatusBadge tone="default">available</StatusBadge>
                </div>
                <p className="route-text">{capability.detail}</p>
                <Link className="text-button" href={capability.href}>
                  {capability.action}
                </Link>
              </article>
            ))}
            <article className="panel data-card">
              <div className="protocol-workflow-card-head">
                <h3>Moral Trade project funding</h3>
                <StatusBadge tone={fundingReadiness.projectFundingAvailable ? "default" : "warning"}>
                  {fundingReadiness.projectFundingAvailable ? "sponsor-backed" : "pending sponsor"}
                </StatusBadge>
              </div>
              <p className="route-text">
                {fundingReadiness.projectFundingAvailable
                  ? "Project support is routed through the disclosed fiscal sponsor; native checkout remains disabled."
                  : "Moral Trade is not accepting project-support funds until a fiscal sponsor is contractually active and fully disclosed."}
              </p>
              <Link className="text-button" href="/support">
                Review funding posture
              </Link>
            </article>
''',
)

replace_exact(
    "src/components/mpgf/mpgf-page-frame.tsx",
    '''              <span>{realMoneyReady ? "Integrated checkout available" : "External-payment route active"}</span>
''',
    '''              <span>{realMoneyReady ? "Approved external checkout available" : "Direct-to-charity or pledge-only"}</span>
''',
)

replace_exact(
    "src/components/mpgf/mpgf-page-frame.tsx",
    '''                <dd>Use the Every.org fast route, saved commitment path, or fallback evidence flow.</dd>
''',
    '''                <dd>Use Every.org, a sponsor-backed route when active, or a non-custodial pledge intent.</dd>
''',
)

replace_exact(
    "src/components/mpgf/mpgf-page-frame.tsx",
    '''                  {realMoneyReady
                    ? "Integrated checkout is available for eligible signed-in participants"
                    : "External provider payment and reviewed evidence remain available"}
''',
    '''                  {realMoneyReady
                    ? "An approved external provider route is available for eligible signed-in participants"
                    : "Direct-to-charity payment, pledge intent, and reviewed external evidence only"}
''',
)

replace_exact(
    "src/lib/mpgf/data.ts",
    '''    "The Moral Public Goods Fund coordinates support for goods many moral views value. The upgraded contribution flow starts with an Every.org fast route when available, then keeps manual external-payment evidence as a reviewed fallback.",
''',
    '''    "The Moral Public Goods Fund coordinates support for goods many moral views value. The contribution flow starts with a direct-to-charity Every.org route when available, keeps conditional participation pledge-only, and uses reviewed external evidence as fallback.",
''',
)

replace_exact(
    "src/lib/mpgf/data.ts",
    '''    "Real-money MPGF contributions use partner-held routes or Stripe after production readiness, terms, refund, webhook, and compliance gates pass. Provider systems record payment; MPGF records contribution state from verified webhook or reviewed evidence events.",
''',
    '''    "Project funding must use an approved fiscal sponsor or another legally approved external provider. Native Stripe checkout remains disabled until entity, sponsor, terms, refund, webhook, recipient, and compliance gates pass. MPGF records contribution state only from verified provider events or reviewed evidence.",
''',
)

replace_exact(
    "src/lib/mpgf/data.ts",
    '''    "Manual evidence mode remains the fallback when Every.org, Stripe, or a fiscal-host webhook cannot import a contribution. Submitting evidence starts review; it does not move money or count as a verified MPGF contribution until review approves it.",
''',
    '''    "Manual evidence mode remains the fallback when Every.org, a fiscal sponsor, or another approved external provider cannot import a contribution. Submitting evidence starts review; it does not move money or count as a verified MPGF contribution until review approves it.",
''',
)

replace_exact(
    "src/app/mpgf/contribute/page.tsx",
    '''  description: "Use the Every.org fast route, save a conditional commitment, or fall back to reviewed manual evidence.",
''',
    '''  description: "Use a direct-to-charity Every.org route, save a non-custodial pledge intent, or submit reviewed external evidence.",
''',
)

replace_exact(
    "src/app/mpgf/contribute/page.tsx",
    '''    description: "Use the Every.org fast route, save a conditional commitment, or fall back to reviewed manual evidence.",
''',
    '''    description: "Use a direct-to-charity Every.org route, save a non-custodial pledge intent, or submit reviewed external evidence.",
''',
)

replace_exact(
    "src/app/mpgf/contribute/page.tsx",
    '''       description="Start with the Every.org fast route when available, save a conditional commitment for threshold-cleared rounds, or use manual evidence only as fallback."
       title="Contribute through fast-route or conditional verification."
''',
    '''       description="Start with a direct-to-charity Every.org route, save a pledge-only intent for threshold-cleared rounds, or use reviewed external evidence as fallback."
       title="Contribute through an external route or pledge intent."
''',
)

replace_exact(
    "src/components/mpgf/mpgf-console.tsx",
    '''  const [savedCommitmentMessage, setSavedCommitmentMessage] = useState(
    "Saved commitments use Stripe SetupIntent first. PaymentIntent creation waits for threshold, review, and challenge gates.",
  );
''',
    '''  const [savedCommitmentMessage, setSavedCommitmentMessage] = useState(
    "Production participation is pledge-only and uses external handoff. Moral Trade does not store a payment method.",
  );
''',
)

replace_exact(
    "src/components/mpgf/mpgf-console.tsx",
    '''  const [realMoneyMessage, setRealMoneyMessage] = useState(
    realMoneyReadiness?.ready
      ? "Legacy direct checkout remains behind production readiness gates; saved commitments use SetupIntent above."
      : "Direct checkout is not the default MPGF flow and remains gated behind provider approval.",
  );
''',
    '''  const [realMoneyMessage, setRealMoneyMessage] = useState(
    realMoneyReadiness?.ready
      ? "An approved external checkout route is available behind the published readiness gates."
      : "Native checkout is disabled. Use Every.org, a future sponsor-backed route, or pledge-only external handoff.",
  );
''',
)

replace_exact(
    "src/components/mpgf/mpgf-console.tsx",
    '''  const selectedPublicGoodsCampaign =
    demoMpgfPublicGoodsCampaigns.find((campaign) => campaign.id === publicGoodsCampaignId) ??
    demoMpgfPublicGoodsCampaigns[0];
''',
    '''  const selectedPublicGoodsCampaign =
    demoMpgfPublicGoodsCampaigns.find((campaign) => campaign.id === publicGoodsCampaignId) ??
    demoMpgfPublicGoodsCampaigns[0];
  const storedPaymentCommitmentsEnabled = Boolean(realMoneyReadiness?.ready);
''',
)

replace_exact(
    "src/components/mpgf/mpgf-console.tsx",
    '''            <p>
              If the fast route is not the right fit, save a contribution intent or a Stripe
              SetupIntent commitment. PaymentIntent creation waits for supporter, identity,
              threshold, review, provider-event, and challenge gates.
            </p>
''',
    '''            <p>
              Save a non-custodial pledge intent. When the published conditions clear, the
              participant pays the approved external recipient through Every.org or a sponsor-backed
              route. Moral Trade does not store a payment method in the current production posture.
            </p>
''',
)

replace_exact(
    "src/components/mpgf/mpgf-console.tsx",
    '''              <label className="checkbox-label">
                <input
                  checked={futureUseConsentAccepted}
                  type="checkbox"
                  onChange={(event) => setFutureUseConsentAccepted(event.currentTarget.checked)}
                />
                <span>
                  I consent to save this payment method for one future MPGF charge only after
                  threshold, review, challenge, and parameter-lock gates clear.
                </span>
              </label>
''',
    '''              {storedPaymentCommitmentsEnabled ? (
                <label className="checkbox-label">
                  <input
                    checked={futureUseConsentAccepted}
                    type="checkbox"
                    onChange={(event) => setFutureUseConsentAccepted(event.currentTarget.checked)}
                  />
                  <span>
                    I consent to save this payment method for one future MPGF charge only after
                    threshold, review, challenge, and parameter-lock gates clear.
                  </span>
                </label>
              ) : null}
''',
)

replace_exact(
    "src/components/mpgf/mpgf-console.tsx",
    '''                 <dd>SetupIntent first</dd>
''',
    '''                 <dd>{storedPaymentCommitmentsEnabled ? "SetupIntent first" : "external handoff or pledge-only"}</dd>
''',
)

replace_exact(
    "src/components/mpgf/mpgf-console.tsx",
    '''              <button
                className="button button-primary"
                disabled={
                  !viewerPresent ||
                  pendingAction === "savedCommitment" ||
                  publicGoodsPledgeAmount < 1 ||
                  !futureUseConsentAccepted
                }
                type="button"
                onClick={startSavedCommitment}
              >
                Save Stripe commitment
              </button>
              <button
                className="button button-secondary"
                disabled={pendingAction === "publicGoodsPledge" || publicGoodsPledgeAmount < 1}
                type="button"
                onClick={recordPublicGoodsAssurancePledge}
              >
                {viewerPresent ? "Save pledge intent" : "Record demo contribution intent"}
              </button>
''',
    '''              {storedPaymentCommitmentsEnabled ? (
                <button
                  className="button button-secondary"
                  disabled={
                    !viewerPresent ||
                    pendingAction === "savedCommitment" ||
                    publicGoodsPledgeAmount < 1 ||
                    !futureUseConsentAccepted
                  }
                  type="button"
                  onClick={startSavedCommitment}
                >
                  Save provider commitment
                </button>
              ) : null}
              <button
                className={storedPaymentCommitmentsEnabled ? "button button-secondary" : "button button-primary"}
                disabled={pendingAction === "publicGoodsPledge" || publicGoodsPledgeAmount < 1}
                type="button"
                onClick={recordPublicGoodsAssurancePledge}
              >
                {viewerPresent ? "Save pledge intent" : "Record demo contribution intent"}
              </button>
''',
)

replace_exact(
    "src/components/mpgf/mpgf-console.tsx",
    '''          <section className="mpgf-panel">
            <p className="eyebrow">Provider checkout gate</p>
            <h2>Legacy direct checkout remains gated</h2>
            <p>{MPGF_COPY.realMoneyContribution}</p>
            <div className="mpgf-confirmation" role="status">
              {realMoneyReadiness?.ready
                ? "All configured real-money acceptance gates are passed, but saved commitments remain the CG-VQAF default."
                : "Direct checkout is planned only after provider approval and production gates."}
            </div>
            <div className="mpgf-inline-actions">
              <button
                className="button button-primary"
                disabled={
                  !viewerPresent ||
                  !realMoneyReadiness?.ready ||
                  pendingAction === "checkout" ||
                  !Number.isFinite(oneTimePledge) ||
                  oneTimePledge < 1
                }
                type="button"
                onClick={() => startRealMoneyCheckout("one_time")}
              >
                Open one-time checkout
              </button>
              <button
                className="button button-secondary"
                disabled={
                  !viewerPresent ||
                  !realMoneyReadiness?.ready ||
                  pendingAction === "checkout" ||
                  !Number.isFinite(monthlyPledge) ||
                  monthlyPledge < 1
                }
                type="button"
                onClick={() => startRealMoneyCheckout("monthly")}
              >
                Open monthly checkout
              </button>
            </div>
            <p className="mpgf-small" role="status">
              {realMoneyMessage}
            </p>
            {!viewerPresent ? (
              <Link className="inline-link" href="/login?returnTo=/mpgf/contribute">
                Sign in before creating a Stripe Checkout session.
              </Link>
            ) : null}
            <Link className="inline-link" href="/mpgf/real-money-terms">
              Review real-money terms and refund policy
            </Link>
          </section>
''',
    '''          <section className="mpgf-panel">
            <p className="eyebrow">Project funding gate</p>
            <h2>{realMoneyReadiness?.ready ? "Approved external checkout is available" : "Native checkout is disabled"}</h2>
            <p>{MPGF_COPY.realMoneyContribution}</p>
            <div className="mpgf-confirmation" role="status">
              {realMoneyReadiness?.ready
                ? "All configured provider and acceptance gates are passed. The external provider remains the payment and refund source of truth."
                : "Moral Trade is not accepting project funds through native checkout. Direct-to-charity Every.org routes and pledge-only participation remain available."}
            </div>
            {realMoneyReadiness?.ready ? (
              <div className="mpgf-inline-actions">
                <button
                  className="button button-primary"
                  disabled={
                    !viewerPresent ||
                    pendingAction === "checkout" ||
                    !Number.isFinite(oneTimePledge) ||
                    oneTimePledge < 1
                  }
                  type="button"
                  onClick={() => startRealMoneyCheckout("one_time")}
                >
                  Open one-time checkout
                </button>
                <button
                  className="button button-secondary"
                  disabled={
                    !viewerPresent ||
                    pendingAction === "checkout" ||
                    !Number.isFinite(monthlyPledge) ||
                    monthlyPledge < 1
                  }
                  type="button"
                  onClick={() => startRealMoneyCheckout("monthly")}
                >
                  Open monthly checkout
                </button>
              </div>
            ) : (
              <div className="mpgf-inline-actions">
                <Link className="button button-primary" href="/support">
                  Review support routes
                </Link>
              </div>
            )}
            <p className="mpgf-small" role="status">
              {realMoneyMessage}
            </p>
            <Link className="inline-link" href="/mpgf/real-money-terms">
              Review funding terms and refund boundaries
            </Link>
          </section>
''',
)

replace_exact(
    "src/lib/mpgf/public-goods-every-org.ts",
    '''    description: `Moral Trade Public Goods Fund fast-route donation for ${campaign.title}`,
    designation: `Moral Trade MPGF: ${campaign.title}`,
''',
    '''    description: `External charity donation selected through Moral Trade MPGF for ${campaign.title}`,
    designation: `External recipient for MPGF campaign: ${campaign.title}`,
''',
)

replace_exact(
    "src/app/mpgf/page.tsx",
    '''       "Set the most you are willing to contribute and define fallback treatment before any payment authorization is requested.",
''',
    '''       "Set the most you are willing to contribute and define fallback treatment before any external payment handoff is opened.",
''',
)

replace_exact(
    "src/app/mpgf/page.tsx",
    '''       "Threshold, identity, review, challenge, authorization, destination, and settlement checks must pass before a contribution counts.",
''',
    '''       "Threshold, identity, review, challenge, destination, external-payment, and evidence checks must pass before a contribution counts.",
''',
)

replace_exact(
    "src/app/mpgf/page.tsx",
    '''  "Moral Trade does not hold participant funds or provide legal escrow.",
''',
    '''  "Moral Trade does not hold participant funds or provide legal escrow.",
  "Project support requires an active fiscal sponsor or another legally approved external recipient.",
''',
)

replace_exact(
    "src/app/mpgf/page.tsx",
    '''            Review real-money terms
''',
    '''            Review funding terms
''',
)

write_file(
    "src/app/mpgf/real-money-terms/page.tsx",
    '''import type { Metadata } from "next";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { getMoralTradeFundingReadiness } from "@/lib/funding";
import { MPGF_COPY } from "@/lib/mpgf/data";
import { loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "MPGF Funding Terms",
  description:
    "External-provider, fiscal-sponsor, receipt, refund, evidence, and non-custody notices for MPGF contribution routes.",
  alternates: {
    canonical: "/mpgf/real-money-terms",
  },
  openGraph: {
    title: "MPGF Funding Terms",
    description:
      "Review the external-provider and fiscal-sponsor boundaries that apply before an MPGF contribution can count.",
    url: getAbsoluteUrl("/mpgf/real-money-terms"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function MpgfRealMoneyTermsPage() {
  const viewer = await getViewer();
  const realMoneyReadiness = await loadMpgfRealMoneyReadiness();
  const funding = getMoralTradeFundingReadiness();
  const sponsor = funding.sponsor;

  return (
    <MpgfPageFrame
      actions={<Link className="button button-primary" href="/mpgf/contribute">Return to contribution flow</Link>}
      description="Read the provider, sponsor, receipt, refund, allocation, privacy, and compliance notices before relying on any MPGF funding record."
      title="MPGF funding terms."
      realMoneyReadiness={realMoneyReadiness}
      viewerPresent={Boolean(viewer)}
    >
      <section className="section section-white">
        <div className="mpgf-workflow-grid">
          <article className="mpgf-panel">
            <p className="eyebrow">Current payment posture</p>
            <h2>External providers remain the payment source of truth</h2>
            <p>{MPGF_COPY.realMoneyContribution}</p>
            <p>
              A direct-to-charity gift is recorded in MPGF only after an Every.org provider event or
              reviewed evidence confirms the transaction. A redirect or success page is not final
              payment confirmation.
            </p>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Fiscal sponsorship</p>
            <h2>{sponsor ? "The active sponsor must remain fully disclosed" : "No sponsor-backed project route is active"}</h2>
            {sponsor ? (
              <ul className="mpgf-check-list">
                <li>Legal recipient: {sponsor.legalName}</li>
                <li>Jurisdiction: {sponsor.jurisdiction}</li>
                <li>Fee: {sponsor.feeDisclosure}</li>
                <li>Tax receipts: {sponsor.taxReceiptDisclosure}</li>
              </ul>
            ) : (
              <p>
                Moral Trade is not accepting funds for its own operations. A contribution button for
                project support remains unavailable until a sponsor contract and all required public
                disclosures are configured.
              </p>
            )}
            <Link className="inline-link" href="/support">
              Review current support routes
            </Link>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Disclaimers</p>
            <h2>No tax, escrow, or outcome guarantee</h2>
            <ul className="mpgf-check-list">
              <li>{MPGF_COPY.not_tax_advice}</li>
              <li>{MPGF_COPY.tax_deductibility_disabled_by_default}</li>
              <li>{MPGF_COPY.not_escrow}</li>
              <li>{MPGF_COPY.not_guaranteed_effectiveness}</li>
            </ul>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Manual evidence</p>
            <h2>External payments require review</h2>
            <p>{MPGF_COPY.manualExternalPaymentEvidence}</p>
            <p>
              Every.org, fiscal-sponsor, bank-transfer, PayPal, or other external evidence is treated
              as participant-submitted evidence until an MPGF reviewer verifies destination, amount,
              timing, and policy fit.
            </p>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Refunds</p>
            <h2>The provider or sponsor controls the refund process</h2>
            <p>
              Refund availability depends on the external provider or fiscal sponsor, transaction
              status, applicable law, and the policy disclosed at payment. MPGF can record a refund
              state but cannot promise or execute a refund for funds it never held.
            </p>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Payout gates</p>
            <h2>Allocation is separate from disbursement</h2>
            <p>{MPGF_COPY.realMoneyTerms}</p>
            <p>
              Recipient accreditation, compliance review, payout approval, and external disbursement
              evidence must pass before a payment is represented as complete.
            </p>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Compliance screening</p>
            <h2>AML, KYC, KYB, sanctions, and charity-law checks remain external gates</h2>
            <p>
              The custody, receipt, and payout partner must perform the screening required for its
              role and jurisdiction. Moral Trade records readiness and provider-event state only; it
              does not convert compliance outcomes into moral reputation signals.
            </p>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Recurring support</p>
            <h2>Monthly project support is disabled until a sponsor approves the route</h2>
            <p>
              A monthly pledge in MPGF is not a subscription or charge. Recurring project support
              becomes available only through a sponsor-approved external contribution page whose
              cancellation and refund terms are displayed before payment.
            </p>
          </article>

          <article className="mpgf-panel">
            <p className="eyebrow">Privacy</p>
            <h2>Public summaries are filtered</h2>
            <p>{MPGF_COPY.privacy_visibility}</p>
          </article>
        </div>
      </section>
    </MpgfPageFrame>
  );
}
''',
)

Path(".github/workflows/implement-fiscal-sponsor-funding.yml").unlink()
Path("scripts/apply-fiscal-sponsor-funding.py").unlink()
