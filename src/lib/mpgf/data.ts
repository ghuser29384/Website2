import type { MpgfBallot, MpgfCandidateAlternative, MpgfCycle, MpgfPledge } from "./types";

export const MPGF_DEMO_BASE_URL = "https://www.moraltrade.org";

export const MPGF_COPY = {
  plainLanguageSummary:
    "The Moral Public Goods Fund is a non-real-money pilot for coordinating contributions toward goods many moral views value.",
  moralPublicGoods:
    "Moral public goods are things many people value for moral reasons, such as global health, existential-risk reduction, animal welfare, and durable public-interest knowledge.",
  moralTrade:
    "Moral trade lets people with different moral priorities shift resources from isolated projects into shared wins when the shared good is valuable enough to each participant.",
  nonRealMoney:
    "This production demo is pledge-only and non-real-money. It does not collect payments, issue receipts, authorize payouts, or publish real-user financial totals.",
  pledgeOnly:
    "Pledges are commitments for testing the mechanism. They are excluded from real-money accounting and public real-user metrics.",
  monthlyPledgeOnly:
    "Monthly recurring commitments in this demo are non-real-money recurring pledges, not subscriptions, donations, charges, or payments.",
  allocationDisbursement:
    "Allocation describes an internal demo plan. Disbursement would require separate authorization, evidence, and legal/payment gates.",
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
    contributorLabel: "Demo participant",
    amountCents: 25_00,
    cadence: "one_time",
    status: "pledged",
  },
  {
    id: "pledge-demo-monthly",
    contributorLabel: "Demo monthly participant",
    amountCents: 10_00,
    cadence: "monthly",
    status: "pledged",
  },
];

export const mpgfPublicRoutes = [
  "/mpgf",
  "/mpgf/about",
  "/mpgf/contribute",
  "/mpgf/contribute/success",
  "/mpgf/contribute/cancel",
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
