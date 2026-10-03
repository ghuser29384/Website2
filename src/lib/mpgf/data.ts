import type {
  MpgfBallot,
  MpgfCandidateAlternative,
  MpgfCycle,
  MpgfPledge,
  MpgfPublicGoodsCampaign,
  MpgfPublicGoodsExperimentAssignment,
  MpgfPublicGoodsIdentityAttestation,
  MpgfPublicGoodsMatchPool,
  MpgfPublicGoodsPaymentProof,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsReviewCase,
  MpgfPublicGoodsRound,
  MpgfPublicGoodsSubscription,
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
    "The Moral Public Goods Fund coordinates support for goods many moral views value. The contribution flow starts with a direct-to-charity Every.org route when available, keeps conditional participation pledge-only, and uses reviewed external evidence as fallback.",
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
    "Project funding must use an approved fiscal sponsor or another legally approved external provider. Native Stripe checkout remains disabled until entity, sponsor, terms, refund, webhook, recipient, and compliance gates pass. MPGF records contribution state only from verified provider events or reviewed evidence.",
  realMoneyTerms:
    "Real-money MPGF contributions are not represented as tax-deductible, escrowed, or guaranteed-effective unless legally approved copy explicitly says so. Allocation and disbursement remain separate MPGF records and payout/compliance gates.",
  manualExternalPaymentEvidence:
    "Manual evidence mode remains the fallback when Every.org, a fiscal sponsor, or another approved external provider cannot import a contribution. Submitting evidence starts review; it does not move money or count as a verified MPGF contribution until review approves it.",
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

export const demoMpgfMatchPool: MpgfPublicGoodsMatchPool = {
  id: "mpgf-common-ground-sponsor-pool-2026-05",
  funderType: "demo_common_ground_pool",
  budgetCents: 150_000,
  baseMatchRatio: 1,
  qfBonusCents: 50_000,
  visibleCommitment:
    "A demo common-ground sponsor pool releases a 1:1 challenge match only after assurance and review gates pass.",
  restrictionsJson: {
    noCustody: true,
    baseMatchDefault: "1:1",
    qfCapMultiple: 1.5,
    perDonorQfCapCents: 10_000,
    qfAfterThresholdOnly: true,
    verificationWeightPolicy: "identity_confidence_only_no_moral_reputation",
    transferableTokens: false,
  },
};

export const demoMpgfAssuranceRound: MpgfPublicGoodsRound = {
  id: "mpgf-assurance-round-demo-2026-05",
  name: "May 2026 moral public goods demo",
  startsAt: "2026-05-01T00:00:00.000Z",
  endsAt: "2026-05-31T23:59:59.000Z",
  matchPoolId: demoMpgfMatchPool.id,
  qfEnabled: true,
  qfCapMultiple: 1.5,
  supporterGate: "demo_self_attestation",
};

export const demoMpgfPublicGoodsCampaigns: MpgfPublicGoodsCampaign[] = [
  {
    id: "campaign-global-health-basic-needs",
    slug: "global-health-basic-needs",
    poolAlternativeId: "global-health-basic-needs",
    title: "Global health and basic needs assurance campaign",
    destinationType: "external_charity",
    destinationRef: "Demo external destination: vetted global health fund",
    causeTags: ["global health", "basic needs", "consensus good"],
    publicSummary:
      "A thresholded route for participants who want an external global-health destination to receive support only after enough verified people join.",
    thresholdAmountCents: 25_000,
    thresholdSupporters: 3,
    deadlineAt: "2026-05-31T23:59:59.000Z",
    verificationMethod: "External receipt or fiscal-host evidence reviewed before counting.",
    baselineRule: "No participant is asked to worsen a baseline or pay to prevent new harm.",
    exitRule: "If the threshold fails, pledges expire without charge or custody.",
    reviewStatus: "approved",
    challengeWindowEndsAt: "2026-06-03T23:59:59.000Z",
  },
  {
    id: "campaign-existential-risk-resilience",
    slug: "existential-risk-resilience",
    poolAlternativeId: "existential-risk-resilience",
    title: "Existential-risk resilience assurance campaign",
    destinationType: "fiscal_host",
    destinationRef: "Demo fiscal-host route: resilience research fund",
    causeTags: ["long-run future", "resilience", "hybrid good"],
    publicSummary:
      "A fiscal-hosted route that can attract support from longtermist, humanitarian, and pluralist participants without making a global moral ranking.",
    thresholdAmountCents: 50_000,
    thresholdSupporters: 3,
    deadlineAt: "2026-05-31T23:59:59.000Z",
    verificationMethod: "Fiscal-host confirmation plus reviewer acceptance.",
    baselineRule: "No threat, coercion, political quid pro quo, or perverse-incentive baseline is allowed.",
    exitRule: "If the route misses either threshold, pledged intents are voided.",
    reviewStatus: "challenge_window",
    challengeWindowEndsAt: "2026-06-04T23:59:59.000Z",
  },
  {
    id: "campaign-animal-welfare-transition",
    slug: "animal-welfare-transition",
    poolAlternativeId: "animal-welfare-transition",
    title: "Animal welfare transition assurance campaign",
    destinationType: "external_charity",
    destinationRef: "Demo external destination: animal welfare transition fund",
    causeTags: ["animal welfare", "transition", "hybrid good"],
    publicSummary:
      "A thresholded external-handoff route for reducing intense animal suffering while preserving review and challenge windows.",
    thresholdAmountCents: 20_000,
    thresholdSupporters: 3,
    deadlineAt: "2026-05-31T23:59:59.000Z",
    verificationMethod: "External receipt evidence and destination review before allocation.",
    baselineRule: "The campaign cannot reward newly increased harm or extortionary threats.",
    exitRule: "Pledges expire if threshold or review gates do not pass.",
    reviewStatus: "approved",
    challengeWindowEndsAt: "2026-06-03T23:59:59.000Z",
  },
  {
    id: "campaign-public-interest-knowledge",
    slug: "public-interest-knowledge",
    poolAlternativeId: "public-interest-knowledge",
    title: "Public-interest knowledge assurance campaign",
    destinationType: "signed_sponsor_route",
    destinationRef: "Demo signed intent: public-interest research fund",
    causeTags: ["epistemics", "public knowledge", "consensus good"],
    publicSummary:
      "A signed-intent route for shared evidence infrastructure that only becomes payable after supporter and review thresholds clear.",
    thresholdAmountCents: 18_000,
    thresholdSupporters: 2,
    deadlineAt: "2026-05-20T23:59:59.000Z",
    verificationMethod: "Signed sponsor intent plus public reviewer note.",
    baselineRule: "No private wish text or sensitive evidence is published by default.",
    exitRule: "Missed thresholds are recorded as expired, not as failed donations.",
    reviewStatus: "submitted",
  },
];

export const demoMpgfAssurancePledges: MpgfPublicGoodsPledge[] = [
  {
    id: "pledge-assurance-global-health-1",
    campaignId: "campaign-global-health-basic-needs",
    userId: "demo-supporter-alix",
    amountCents: 10_000,
    visibilityMode: "public_reason",
    isRecurring: false,
    captureMode: "external_handoff",
    eligibilityState: "eligible",
    humanScoreBps: 9_500,
    status: "pledged",
    supporterReason: "Global health is a compromise destination I expect many moral views can endorse.",
    createdAt: "2026-05-03T14:00:00.000Z",
  },
  {
    id: "pledge-assurance-global-health-2",
    campaignId: "campaign-global-health-basic-needs",
    userId: "demo-supporter-briar",
    amountCents: 9_000,
    visibilityMode: "public_supporter",
    isRecurring: false,
    captureMode: "external_handoff",
    eligibilityState: "eligible",
    humanScoreBps: 8_800,
    status: "pledged",
    createdAt: "2026-05-04T16:30:00.000Z",
  },
  {
    id: "pledge-assurance-global-health-3",
    campaignId: "campaign-global-health-basic-needs",
    userId: "demo-supporter-cy",
    amountCents: 8_500,
    visibilityMode: "private_amount",
    isRecurring: false,
    captureMode: "signed_intent",
    eligibilityState: "eligible",
    humanScoreBps: 7_900,
    status: "pledged",
    createdAt: "2026-05-06T11:00:00.000Z",
  },
  {
    id: "pledge-assurance-xrisk-1",
    campaignId: "campaign-existential-risk-resilience",
    userId: "demo-supporter-dara",
    amountCents: 20_000,
    visibilityMode: "public_supporter",
    isRecurring: false,
    captureMode: "signed_intent",
    eligibilityState: "eligible",
    humanScoreBps: 9_200,
    status: "pledged",
    createdAt: "2026-05-08T13:00:00.000Z",
  },
  {
    id: "pledge-assurance-xrisk-2",
    campaignId: "campaign-existential-risk-resilience",
    userId: "demo-supporter-eli",
    amountCents: 16_000,
    visibilityMode: "private_amount",
    isRecurring: false,
    captureMode: "external_handoff",
    eligibilityState: "eligible",
    humanScoreBps: 8_200,
    status: "pledged",
    createdAt: "2026-05-09T13:00:00.000Z",
  },
  {
    id: "pledge-assurance-animal-1",
    campaignId: "campaign-animal-welfare-transition",
    userId: "demo-supporter-fin",
    amountCents: 8_000,
    visibilityMode: "public_reason",
    isRecurring: false,
    captureMode: "external_handoff",
    eligibilityState: "eligible",
    humanScoreBps: 8_700,
    status: "pledged",
    supporterReason: "I value reducing intense suffering and like the external proof requirement.",
    createdAt: "2026-05-05T15:00:00.000Z",
  },
  {
    id: "pledge-assurance-animal-2",
    campaignId: "campaign-animal-welfare-transition",
    userId: "demo-supporter-gale",
    amountCents: 7_500,
    visibilityMode: "public_supporter",
    isRecurring: false,
    captureMode: "external_handoff",
    eligibilityState: "eligible",
    humanScoreBps: 8_300,
    status: "pledged",
    createdAt: "2026-05-07T09:00:00.000Z",
  },
  {
    id: "pledge-assurance-animal-3",
    campaignId: "campaign-animal-welfare-transition",
    userId: "demo-supporter-harper",
    amountCents: 7_000,
    visibilityMode: "private_amount",
    isRecurring: false,
    captureMode: "external_handoff",
    eligibilityState: "eligible",
    humanScoreBps: 7_600,
    status: "pledged",
    createdAt: "2026-05-08T10:00:00.000Z",
  },
  {
    id: "pledge-assurance-animal-duplicate",
    campaignId: "campaign-animal-welfare-transition",
    userId: "demo-supporter-harper-shadow",
    amountCents: 7_000,
    visibilityMode: "private_amount",
    isRecurring: false,
    captureMode: "external_handoff",
    eligibilityState: "duplicate_identity",
    humanScoreBps: 0,
    status: "pledged",
    createdAt: "2026-05-08T10:05:00.000Z",
  },
  {
    id: "pledge-assurance-knowledge-1",
    campaignId: "campaign-public-interest-knowledge",
    userId: "demo-supporter-ira",
    amountCents: 9_000,
    visibilityMode: "public_supporter",
    isRecurring: false,
    captureMode: "signed_intent",
    eligibilityState: "eligible",
    humanScoreBps: 8_000,
    status: "pledged",
    createdAt: "2026-05-10T10:00:00.000Z",
  },
];

export const demoMpgfPublicGoodsIdentityAttestations: MpgfPublicGoodsIdentityAttestation[] = [
  {
    userId: "demo-supporter-alix",
    provider: "repository_profile",
    humanScoreBps: 9_500,
    expiresAt: "2026-12-31T23:59:59.000Z",
    status: "active",
    redactedReference: "repo-profile:alix:verified-human",
  },
  {
    userId: "demo-supporter-briar",
    provider: "demo_self_attestation",
    humanScoreBps: 8_800,
    expiresAt: "2026-12-31T23:59:59.000Z",
    status: "active",
    redactedReference: "demo-self-attestation:briar",
  },
  {
    userId: "demo-supporter-harper-shadow",
    provider: "demo_self_attestation",
    humanScoreBps: 0,
    expiresAt: "2026-06-30T23:59:59.000Z",
    status: "revoked",
    redactedReference: "duplicate-cluster:harper:redacted",
  },
];

export const demoMpgfPublicGoodsReviewCases: MpgfPublicGoodsReviewCase[] = [
  {
    id: "review-case-global-health-approved",
    campaignId: "campaign-global-health-basic-needs",
    state: "approved",
    action: "approve",
    reasonCode: "destination_verified",
    reviewerId: "demo-reviewer-public-goods",
    openedAt: "2026-05-10T12:00:00.000Z",
    closedAt: "2026-05-12T12:00:00.000Z",
    appealStatus: "none",
    challengeWindowEndsAt: "2026-06-03T23:59:59.000Z",
    publicNotes: "Destination, no-threat baseline, and receipt evidence plan passed pilot review.",
    allowedNextActions: ["challenge", "finalize"],
  },
  {
    id: "review-case-xrisk-challenge",
    campaignId: "campaign-existential-risk-resilience",
    state: "challenge_window",
    action: "challenge",
    reasonCode: "challenge_opened",
    reviewerId: "demo-reviewer-public-goods",
    openedAt: "2026-05-14T12:00:00.000Z",
    appealStatus: "none",
    challengeWindowEndsAt: "2026-06-04T23:59:59.000Z",
    publicNotes: "Reviewer opened the public challenge window before payable status.",
    allowedNextActions: ["approve", "needs_evidence", "block", "finalize"],
  },
  {
    id: "review-case-knowledge-needs-evidence",
    campaignId: "campaign-public-interest-knowledge",
    state: "needs_evidence",
    action: "needs_evidence",
    reasonCode: "needs_destination_evidence",
    reviewerId: "demo-reviewer-public-goods",
    openedAt: "2026-05-15T12:00:00.000Z",
    appealStatus: "none",
    publicNotes: "Signed sponsor intent needs a public destination reference before approval.",
    allowedNextActions: ["approve", "block", "challenge"],
  },
];

export const demoMpgfPublicGoodsSubscriptions: MpgfPublicGoodsSubscription[] = [
  {
    id: "subscription-common-ground-sponsor-demo",
    userId: "demo-sponsor-circle-member",
    poolId: demoMpgfMatchPool.id,
    amountCents: 2_500,
    interval: "monthly",
    status: "active",
    captureMode: "external_handoff",
    mode: "pledge_only",
    nextChargeAt: "2026-06-01T00:00:00.000Z",
    createdAt: "2026-05-15T00:00:00.000Z",
  },
];

export const demoMpgfPublicGoodsExperimentAssignments: MpgfPublicGoodsExperimentAssignment[] = [
  {
    id: "experiment-assurance-framing-demo",
    userRefHash: "sha256:demo-supporter-redacted",
    experimentKey: "public_goods_assurance_framing_v1",
    variant: "pledge_only_if_threshold_met",
    assignedAt: "2026-05-01T00:00:00.000Z",
    analyticsPolicy: "privacy_safe_no_raw_private_text",
  },
];

export const demoMpgfPublicGoodsPaymentProofs: MpgfPublicGoodsPaymentProof[] = [
  {
    id: "payment-proof-global-health-demo",
    pledgeId: "pledge-assurance-global-health-1",
    campaignId: "campaign-global-health-basic-needs",
    externalReceiptRef: "external-receipt:redacted-global-health-001",
    charityReceiptRef: "charity-receipt:redacted-global-health-001",
    amountVerifiedCents: 10_000,
    status: "verified",
    reasonCode: "external_handoff_verified",
    reconciliationSource: "external_receipt",
    verifiedAt: "2026-05-13T12:00:00.000Z",
    createdAt: "2026-05-12T12:00:00.000Z",
  },
];

export const mpgfPublicRoutes = [
  "/mpgf",
  "/mpgf/about",
  "/mpgf/governance",
  "/mpgf/metrics",
  "/mpgf/contribute",
  "/mpgf/contribute/success",
  "/mpgf/contribute/cancel",
  "/mpgf/real-money-terms",
  "/mpgf/account/contributions",
  "/mpgf/pools",
  "/mpgf/pools/new",
  ...demoMpgfPublicGoodsCampaigns.map((campaign) => `/mpgf/pools/${campaign.slug}`),
  `/mpgf/ballot/${demoCycle.id}`,
  `/mpgf/cycles/${demoCycle.id}`,
  "/mpgf/technical-spec",
] as const;

export const mpgfAdminSections = [
  "genesis",
  "cycles",
  "pools",
  "public-goods",
  "failure-bonus",
  "registry",
  "round",
  "safety",
  "sybil-collusion",
  "sponsor-governance",
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
