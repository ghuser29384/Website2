import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

import {
  arbitrationClosesAt,
  conditionalRedirectKind,
  conditionalRedirectOutcomeCopy,
  rankConditionalRedirectCandidates,
  validateConditionalRedirectTerms,
} from "./conditional-redirect";
import { loadConditionalRedirectPageData } from "./conditional-redirect-page-data";

const now = Date.parse("2026-07-23T12:00:00.000Z");

function migrationSource() {
  const filename = readdirSync("supabase/migrations").find((entry) =>
    entry.endsWith("_conditional_redirect_offers.sql"),
  );
  assert.ok(filename, "conditional redirect migration should exist");
  return readFileSync(`supabase/migrations/${filename}`, "utf8");
}

test("same charity is presented as a matching donation with separate linked amounts", () => {
  const terms = {
    creatorAmountCents: 1000,
    matcherAmountCents: 500,
    fallbackDestinationId: "charity-a",
    matchedDestinationId: "charity-a",
    deadlineAt: "2026-07-30T12:00:00.000Z",
    currency: "usd" as const,
  };
  assert.equal(conditionalRedirectKind("charity-a", "charity-a"), "matching_donation");
  assert.deepEqual(validateConditionalRedirectTerms(terms, now), []);
  assert.match(conditionalRedirectOutcomeCopy(terms).matchedSummary, /Two linked donations/);
  assert.match(conditionalRedirectOutcomeCopy(terms).matchedSummary, /\$15\.00/);
});

test("different charities are presented as a redirection", () => {
  assert.equal(conditionalRedirectKind("local", "amf"), "redirection");
});

test("deadline bounds are 30 minutes through 30 days", () => {
  const base = {
    creatorAmountCents: 1000,
    matcherAmountCents: 500,
    fallbackDestinationId: "local",
    matchedDestinationId: "amf",
    currency: "usd" as const,
  };
  assert.equal(
    validateConditionalRedirectTerms(
      { ...base, deadlineAt: "2026-07-23T12:29:59.000Z" },
      now,
    ).length,
    1,
  );
  assert.deepEqual(
    validateConditionalRedirectTerms(
      { ...base, deadlineAt: "2026-07-23T12:30:00.000Z" },
      now,
    ),
    [],
  );
});

test("both conditional donation legs enforce Stripe's fifty-cent minimum", () => {
  const base = {
    creatorAmountCents: 49,
    matcherAmountCents: 500,
    fallbackDestinationId: "local",
    matchedDestinationId: "amf",
    deadlineAt: "2026-07-23T12:30:00.000Z",
    currency: "usd" as const,
  };
  assert.match(validateConditionalRedirectTerms(base, now).join(" "), /\$0\.50/);
  assert.match(
    validateConditionalRedirectTerms(
      { ...base, creatorAmountCents: 1_000, matcherAmountCents: 49 },
      now,
    ).join(" "),
    /\$0\.50/,
  );
});

test("arbitration is capped at deadline plus 15 minutes", () => {
  assert.equal(
    arbitrationClosesAt("2026-07-23T12:30:00.000Z"),
    "2026-07-23T12:45:00.000Z",
  );
});

test("eligible candidates rank by Stripe event time with deterministic ties", () => {
  const ranked = rankConditionalRedirectCandidates(
    [
      {
        id: "candidate-b",
        setupSucceededAt: "2026-07-23T12:29:59.000Z",
        stripeEventCreatedAt: "2026-07-23T12:29:58.000Z",
        stripeEventId: "evt_b",
      },
      {
        id: "candidate-a",
        setupSucceededAt: "2026-07-23T12:29:59.000Z",
        stripeEventCreatedAt: "2026-07-23T12:29:58.000Z",
        stripeEventId: "evt_a",
      },
      {
        id: "late",
        setupSucceededAt: "2026-07-23T12:30:01.000Z",
        stripeEventCreatedAt: "2026-07-23T12:29:57.000Z",
        stripeEventId: "evt_early_but_late_setup",
      },
    ],
    "2026-07-23T12:30:00.000Z",
  );
  assert.deepEqual(ranked.map((candidate) => candidate.id), ["candidate-a", "candidate-b"]);
});

test("conditional redirect persistence is private and arbitration is service-only", () => {
  const migration = migrationSource();
  assert.match(migration, /conditional_redirect_offers enable row level security/);
  assert.match(migration, /revoke all on public\.conditional_redirect_offers from anon, authenticated/);
  assert.match(
    migration,
    /revoke all on function public\.arbitrate_conditional_redirect_offer\(uuid\) from public, anon, authenticated/,
  );
  assert.match(
    migration,
    /grant execute on function public\.arbitrate_conditional_redirect_offer\(uuid\) to service_role/,
  );
  assert.match(migration, /arbitration_closes_at = deadline_at \+ interval '15 minutes'/);
  assert.match(migration, /unique \(offer_id, participant_role\)/);
  assert.match(migration, /authorization_consented_at timestamptz/);
  assert.match(migration, /promote_conditional_redirect_backup_or_fallback/);
  assert.match(migration, /creator_recovery_attempts between 0 and 1/);
  assert.match(migration, /recovery_attempts between 0 and 1/);
});

test("server actions require consent and keep Next redirects outside caught work", () => {
  const actions = readFileSync(
    "src/app/donation-offsets/conditional/actions.ts",
    "utf8",
  );
  assert.match(actions, /function requireConsent/);
  assert.match(actions, /formData\.get\("consent"\) !== "on"/);
  assert.match(actions, /reauthorizeConditionalRedirectAction/);
  assert.match(actions, /const RETURN_PATH = `\$\{CREATE_PATH\}\?structure=\$\{CONDITIONAL_STRUCTURE\}`/);
  assert.match(actions, /redirect\(checkoutUrl!\)/);
  assert.doesNotMatch(
    actions,
    /try \{[\s\S]*?redirect\(result\.checkoutUrl\);[\s\S]*?\} catch/,
  );
});

test("settlement reuses one batch per outcome and distinguishes uncertainty from declines", () => {
  const settlement = readFileSync(
    "src/lib/payments/conditional-redirect-settlement.ts",
    "utf8",
  );
  assert.match(settlement, /ignoreDuplicates: true/);
  assert.match(settlement, /claim_conditional_settlement_batch/);
  assert.match(settlement, /authorization_consented_at/);
  assert.match(settlement, /"definitive" \| "pending"/);
  assert.match(settlement, /settlement_batch_id: input\.batchId/);
  assert.match(settlement, /payment_attempt_id: String\(attempt\.id\)/);
  assert.match(settlement, /settlement_transfer_id: transferId/);
  assert.match(settlement, /separateDonorLegs: true/);
});

test("the feature is discoverable and exposes recovery, withdrawal, and local deadlines", () => {
  const page = readFileSync(
    "src/app/trades/new/conditional-donation.tsx",
    "utf8",
  );
  const createPage = readFileSync("src/app/trades/new/page.tsx", "utf8");
  const nextConfig = readFileSync("next.config.ts", "utf8");
  const createInterface = readFileSync(
    "public/moral-trade-create/index.html",
    "utf8",
  );
  const deadlineField = readFileSync(
    "src/app/donation-offsets/conditional/deadline-field.tsx",
    "utf8",
  );
  const offsetsPage = readFileSync("src/app/donation-offsets/page.tsx", "utf8");
  assert.match(page, /reauthorizeConditionalRedirectAction/);
  assert.match(page, /withdrawConditionalRedirectCandidateAction/);
  assert.match(page, /backup and can be charged only if I/);
  assert.match(deadlineField, /toLocaleString/);
  assert.match(deadlineField, /seven days in your local/);
  assert.match(createPage, /structure === "conditional-donation"/);
  assert.match(createPage, /<ConditionalDonationCreate params=\{resolvedSearchParams\} \/>/);
  assert.match(createInterface, /data-fund-mode="conditional"/);
  assert.match(
    createInterface,
    /window\.top\.location\.assign\("\/trades\/new\?structure=conditional-donation"\)/,
  );
  assert.match(
    offsetsPage,
    /href="\/trades\/new\?structure=conditional-donation"/,
  );
  assert.match(
    nextConfig,
    /source: "\/donation-offsets\/conditional"[\s\S]*destination: "\/trades\/new\?structure=conditional-donation"[\s\S]*permanent: true/,
  );
});

test("conditional donation data fails closed when the service client is unavailable", async () => {
  let warning = "";
  const pageData = await loadConditionalRedirectPageData(
    {
      livemode: true,
      nowIso: "2026-07-23T12:00:00.000Z",
      viewerId: "viewer-1",
    },
    {
      createClient: () => {
        throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY.");
      },
      warn: (message, details) => {
        warning = `${message}: ${details.message}`;
      },
    },
  );

  assert.deepEqual(pageData, {
    available: false,
    destinations: [],
    offers: [],
    creatorOffers: [],
    viewerCandidates: [],
    settlementLegs: [],
  });
  assert.match(warning, /Missing SUPABASE_SERVICE_ROLE_KEY/);
});

test("the conditional donation page renders and enforces the unavailable state", () => {
  const page = readFileSync(
    "src/app/trades/new/conditional-donation.tsx",
    "utf8",
  );
  assert.match(page, /loadConditionalRedirectPageData/);
  assert.match(
    page,
    /Donation Upgrade authorizations are temporarily unavailable/,
  );
  assert.match(
    page,
    /disabled=\{!pageData\.available \|\| !readiness\.canCreateMandates\}/,
  );
});

test("Stripe and server-action returns stay inside the Create route", () => {
  const service = readFileSync(
    "src/lib/payments/conditional-redirect-service.ts",
    "utf8",
  );
  const actions = readFileSync(
    "src/app/donation-offsets/conditional/actions.ts",
    "utf8",
  );

  assert.match(
    service,
    /\/trades\/new\?structure=conditional-donation&setup=success&offer=/,
  );
  assert.match(
    service,
    /\/trades\/new\?structure=conditional-donation&setup=cancelled&offer=/,
  );
  assert.doesNotMatch(service, /\/donation-offsets\/conditional\?setup=/);
  assert.match(actions, /returnPath\(\{ change: "cancelled" \}\)/);
  assert.match(actions, /returnPath\(\{ change: "withdrawn" \}\)/);
});
