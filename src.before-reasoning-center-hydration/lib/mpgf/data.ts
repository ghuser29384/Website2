import type {
  MpgfBallot,
  MpgfCandidateAlternative,
  MpgfCycle,
  MpgfPledge,
  MpgfRecurringContributionCommitment,
} from "./types";

export const MPGF_DEMO_BASE_URL = "https://www.moraltrade.org";

export const MPGF_COPY = {
  mpgf_plain_language_summary:
    "The Moral Public Goods Fund is a pilot mechanism for coordinating support for goods that many moral views value.",
  moral_public_goods_explanation:
    "A moral public good is something many people value for moral reasons, such as reducing severe poverty, reducing existential risk, or improving animal welfare.",
  moral_trade_coordination_explanation:
    "MPGF is intended to help people with different moral views coordinate on shared moral public goods instead of each person acting alone.",
  pilot_status:
    "MPGF is currently a pilot mechanism. Some features may operate in pledge-only, test, dry-run, or non-real-money mode until production gates are approved.",
  non_real_money_status:
    "This production demo is non-real-money unless the page explicitly says real-money mode has passed all production gates.",
  pledge_only_explanation:
    "A pledge-only contribution records your non-real-money intent to support MPGF. It does not charge a payment method.",
  monthly_pledge_only_explanation:
    "A monthly pledge-only commitment records a recurring non-real-money pledge. It is not a subscription, charge, donation, or payment.",
  pool_proposal_explanation:
    "Pool proposals suggest moral public goods that could be considered by the MPGF mechanism.",
  ballot_demo_explanation:
    "Demo ballots let eligible participants test how the mechanism records preferences. They do not authorize real disbursements.",
  visible_demo_pool_explanation:
    "Visible demo pools are non-real-money alternatives used to show how the MPGF pilot mechanism works.",
  not_tax_advice:
    "This page does not provide tax, legal, financial, or investment advice.",
  tax_deductibility_disabled_by_default:
    "Unless this page explicitly says otherwise using legally approved wording, MPGF contributions are not represented as tax-deductible donations.",
  not_escrow:
    "Unless this page explicitly says otherwise using legally approved wording, MPGF is not representing that funds are held in legal escrow.",
  not_charity_evaluator:
    "MPGF is not a charity evaluator and does not guarantee that any pool is the most effective use of funds.",
  not_guaranteed_effectiveness:
    "MPGF does not guarantee outcomes or effectiveness. Public summaries describe the mechanism's records and assessments, not guaranteed impact.",
  refund_policy_default:
    "Refund availability depends on the current contribution mode, payment status, cycle timing, and published refund policy.",
  privacy_visibility:
    "Some MPGF records may appear in public summaries after privacy filtering. Private payment identifiers, verification evidence, private ballot identities, private appeal evidence, and private audit evidence are not public by default.",
  ballot_finality:
    "After final submission, your ballot is final for this cycle unless a formal correction rule applies.",
  allocation_not_disbursement:
    "An allocation or authorization is not the same as an external payment. External payment status is tracked separately.",
  support_or_access:
    "For MPGF access or support, contact support@moraltrade.org.",
  plainLanguageSummary:
    "The Moral Public Goods Fund coordinates support for goods many moral views value. The current public flow starts with manual external-payment evidence, reviewed before it counts.",
  moralPublicGoods:
    "Moral public goods are things many people value for moral reasons, such as global health, existential-risk reduction, animal welfare, and durable public-interest knowledge.",
  moralTrade:
    "Moral trade lets people with different moral priorities shift resources from isolated projects into shared wins when the shared good is valuable enough to each participant.",
  nonRealMoney:
    "This production demo is pledge-only and non-real-money. It does not collect payments, issue receipts, authorize payouts, or publish real-user financial totals.",
  pledgeOnly:
    "Pledges let participants rehearse the mechanism before evidence is reviewed. They do not charge a payment method.",
  monthlyPledgeOnly:
    "Monthly recurring commitments in this demo are non-real-money recurring pledges, not subscriptions, donations, charges, or payments.",
  allocationDisbursement:
    "Allocation describes an internal demo plan. Disbursement would require separate authorization, evidence, and legal/payment gates.",
  realMoneyContribution:
    "Real-money MPGF contributions use Stripe Checkout after production readiness, terms, refund, webhook, and compliance gates pass. Stripe records the payment; MPGF records contribution state from verified webhook events.",
  realMoneyTerms:
    "Real-money MPGF contributions are not represented as tax-deductible, escrowed, or guaranteed-effective unless legally approved copy explicitly says so. Allocation and disbursement remain separate MPGF records and payout/compliance gates.",
  manualExternalPaymentEvidence:
    "Manual evidence mode lets participants record evidence of a payment made through an approved external destination such as Open Collective or a fiscal host. Submitting evidence starts review; it does not move money or count as a verified MPGF contribution until review approves it.",
};

export const demoCycle: MpgfCycle = {
  id: "mpgf-cycle-demo-2026-05",
  label: "May 2026 MPGF Direct-Working Demo",
  stage: "pilot",
  mode: "non_real_money_demo",
  contributionMode: "pledge_only",
  currency: "usd",
  budgetCents: 100_000,
  proposalOpensAt: "2026-05-01T00:00:00.000Z",
  ballotOpensAt: "2026-05-07T00:00:00.000Z",
  ballotClosesAt: "2026-05-21T00:00:00.000Z",
  summaryPublishedAt: "2026-05-22T00:00:00.000Z",
  protocolParameterVersion: "mpgf-pilot-v0.3-demo-2026-05",
  termsVersion: "mpgf-demo-terms-v1",
  privacyVersion: "mpgf-demo-privacy-v1",
};

export const demoAlternatives: MpgfCandidateAlternative[] = [
  {
    id: "global-health-basic-needs",
    name: "Global health and basic needs reserve",
    shortName: "Global health",
    causeArea: "Global poverty and health",
    recipientName: "Demo recipient: vetted global health fund",
    description:
      "A demo ordinary-pool alternative representing cost-effective poverty, health, and basic-needs interventions.",
    moralPublicGoodRationale:
      "Many moral views value reducing severe poverty and preventable illness, even when they disagree about other priorities.",
    outcomeUnit: "expected severe-poverty relief unit",
    isConsensus: true,
    isHybrid: false,
    preferenceIntensityHint:
      "High default weight because several demo voter profiles converge on severe-poverty and health gains.",
    expectedMoralImpactTooltip:
      "Consensus demo good: modeled as broadly valuable across moral views, not as a charity-evaluator claim.",
    status: "approved_demo",
    operationalReliabilityBps: 9400,
    riskBps: 500,
    tailLossBps: 200,
    demoPriorityBps: 3600,
  },
  {
    id: "existential-risk-resilience",
    name: "Existential-risk resilience reserve",
    shortName: "Existential risk",
    causeArea: "Long-run future",
    recipientName: "Demo recipient: resilience research fund",
    description:
      "A demo ordinary-pool alternative for projects that reduce catastrophic or existential risk without live disbursement.",
    moralPublicGoodRationale:
      "Preserving the option of a flourishing future is broadly valuable across many longtermist, humanitarian, and pluralist views.",
    outcomeUnit: "risk-reduction research unit",
    isConsensus: false,
    isHybrid: true,
    preferenceIntensityHint:
      "High intensity for long-run views, with some cross-view support from resilience and option-value arguments.",
    expectedMoralImpactTooltip:
      "Hybrid demo good: different views may support it for different reasons, with impact still represented only by demo ballots.",
    status: "approved_demo",
    operationalReliabilityBps: 9000,
    riskBps: 900,
    tailLossBps: 350,
    demoPriorityBps: 3000,
  },
  {
    id: "animal-welfare-transition",
    name: "Animal welfare transition reserve",
    shortName: "Animal welfare",
    causeArea: "Animal welfare",
    recipientName: "Demo recipient: animal welfare transition fund",
    description:
      "A demo ordinary-pool alternative for reducing intense animal suffering while preserving ordinary pilot safeguards.",
    moralPublicGoodRationale:
      "Many moral views assign at least some weight to avoiding severe suffering, including nonhuman suffering.",
    outcomeUnit: "welfare-improvement unit",
    isConsensus: false,
    isHybrid: true,
    preferenceIntensityHint:
      "Medium default weight with stronger intensity for animal-inclusive moral views.",
    expectedMoralImpactTooltip:
      "Hybrid demo good: can combine direct animal-welfare concern with institutional transition benefits.",
    status: "approved_demo",
    operationalReliabilityBps: 9100,
    riskBps: 700,
    tailLossBps: 250,
    demoPriorityBps: 2200,
  },
  {
    id: "public-interest-knowledge",
    name: "Public-interest knowledge reserve",
    shortName: "Knowledge",
    causeArea: "Epistemics and institutions",
    recipientName: "Demo recipient: public-interest research fund",
    description:
      "A demo ordinary-pool alternative for knowledge infrastructure that helps diverse moral communities reason and coordinate.",
    moralPublicGoodRationale:
      "Better shared knowledge can improve coordination and allocation decisions across otherwise conflicting moral views.",
    outcomeUnit: "public-knowledge unit",
    isConsensus: true,
    isHybrid: true,
    preferenceIntensityHint:
      "Lower default weight, but high complementarity because shared evidence can improve later allocations.",
    expectedMoralImpactTooltip:
      "Consensus and hybrid demo good: shared knowledge is a coordination input and may benefit several causes indirectly.",
    status: "approved_demo",
    operationalReliabilityBps: 9300,
    riskBps: 400,
    tailLossBps: 150,
    demoPriorityBps: 1200,
  },
];

export const demoBallots: MpgfBallot[] = [
  {
    id: "demo-ballot-humanitarian",
    voterLabel: "Humanitarian sample voter",
    cycleId: demoCycle.id,
    weights: [
      { alternativeId: "global-health-basic-needs", valueBps: 6200, strongNegative: false },
      { alternativeId: "existential-risk-resilience", valueBps: 1800, strongNegative: false },
      { alternativeId: "animal-welfare-transition", valueBps: 1300, strongNegative: false },
      { alternativeId: "public-interest-knowledge", valueBps: 700, strongNegative: false },
    ],
  },
  {
    id: "demo-ballot-longtermist",
    voterLabel: "Longtermist sample voter",
    cycleId: demoCycle.id,
    weights: [
      { alternativeId: "global-health-basic-needs", valueBps: 1900, strongNegative: false },
      { alternativeId: "existential-risk-resilience", valueBps: 5800, strongNegative: false },
      { alternativeId: "animal-welfare-transition", valueBps: 800, strongNegative: false },
      { alternativeId: "public-interest-knowledge", valueBps: 1500, strongNegative: false },
    ],
  },
  {
    id: "demo-ballot-pluralist",
    voterLabel: "Pluralist sample voter",
    cycleId: demoCycle.id,
    weights: [
      { alternativeId: "global-health-basic-needs", valueBps: 3000, strongNegative: false },
      { alternativeId: "existential-risk-resilience", valueBps: 2600, strongNegative: false },
      { alternativeId: "animal-welfare-transition", valueBps: 2600, strongNegative: false },
      { alternativeId: "public-interest-knowledge", valueBps: 1800, strongNegative: false },
    ],
  },
];

export const demoPledges: MpgfPledge[] = [
  {
    id: "pledge-demo-one-time",
    userId: "demo-participant",
    contributorLabel: "Demo participant",
    amountCents: 25_00,
    currency: "usd",
    cadence: "one_time",
    status: "pledged",
    pledgeMode: "pledge_only",
    intendedCycleId: demoCycle.id,
    budgetEffectiveCycleId: demoCycle.id,
  },
  {
    id: "pledge-demo-monthly",
    userId: "demo-monthly-participant",
    contributorLabel: "Demo monthly participant",
    amountCents: 10_00,
    currency: "usd",
    cadence: "monthly",
    status: "pledged",
    pledgeMode: "pledge_only",
    intendedCycleId: demoCycle.id,
    budgetEffectiveCycleId: demoCycle.id,
    recurringCommitmentId: "monthly-commitment-demo",
  },
];

export const demoRecurringCommitments: MpgfRecurringContributionCommitment[] = [
  {
    id: "monthly-commitment-demo",
    userId: "demo-monthly-participant",
    amountCents: 10_00,
    currency: "usd",
    cadence: "monthly",
    mode: "pledge_only",
    status: "active",
    startCycleId: demoCycle.id,
    nextCycleId: demoCycle.id,
    nextScheduledAt: "2026-06-01T00:00:00.000Z",
    createdAt: "2026-05-01T00:00:00.000Z",
  },
];

export const mpgfPublicRoutes = [
  "/mpgf",
  "/mpgf/about",
  "/mpgf/contribute",
  "/mpgf/contribute/success",
  "/mpgf/contribute/cancel",
  "/mpgf/real-money-terms",
  "/mpgf/account/contributions",
  "/mpgf/pools",
  "/mpgf/pools/new",
  "/mpgf/pools/global-health-basic-needs",
  `/mpgf/ballot/${demoCycle.id}`,
  `/mpgf/cycles/${demoCycle.id}`,
  "/mpgf/technical-spec",
] as const;

export const mpgfAdminSections = [
  "genesis",
  "cycles",
  "pools",
  "recipients",
  "payments",
  "refunds",
  "payouts",
  "allocations",
  "audits",
  "launch",
  "legal",
  "incidents",
  "conformance",
  "rbac",
  "state-machines",
  "settings",
] as const;
