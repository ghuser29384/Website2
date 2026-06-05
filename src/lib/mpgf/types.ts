export type MpgfCompletionProfile = "demo_complete" | "exact_pilot_complete" | "real_money_complete";

export type MpgfValidationStatus = "passed" | "failed";

export interface MpgfValidationIssue {
  code: string;
  id: string;
  message: string;
  path?: string;
  locator?: string;
  conformanceRowId?: string;
  acceptanceCriterionId?: string;
}

export interface MpgfValidationResult {
  passed: boolean;
  status: MpgfValidationStatus;
  generatedAt: string;
  validatorName: string;
  validatorVersion: string;
  errors: MpgfValidationIssue[];
  warnings: MpgfValidationIssue[];
  blockers: string[];
}

export type MpgfValidationResultBase = MpgfValidationResult;

export interface Phase0Result {
  passed: boolean;
  blockers: string[];
  reports: {
    mechanicalNormalizationReportPath: string;
    canonicalMergeDiffReportPath: string;
    acceptanceCriteriaMigrationMapPath: string;
  };
}

export interface FormalSourceLocator {
  sourceId?: string;
  provisionalLocatorId?: string;
  locatorId: string;
  type:
    | "numbered_paragraph"
    | "equation"
    | "definition"
    | "table"
    | "rule"
    | "governance_object"
    | "transition_rule"
    | "eligibility_rule"
    | "allocation_rule"
    | "fallback_rule"
    | "disbursement_rule"
    | "carryover_rule"
    | "audit_rule"
    | "reauthorization_rule"
    | "ballot_rule"
    | "constraint";
  headingPath: string[];
  lineStart: number;
  lineEnd: number;
  textHash: string;
  excerpt: string;
  extractionStatus:
    | "extracted_from_embedded_id"
    | "extracted_without_embedded_id"
    | "manual_supplement_required"
    | "ambiguous_overlap"
    | "resolved_duplicate";
}

export type MpgfStage = "pilot" | "public_beta" | "mature";

export interface MpgfProtocolSnapshot {
  protocolVersion: string;
  protocolParameterVersion: string;
  thetaVersion: string;
  stage: MpgfStage;
  effectiveFrom: string;
  sourceHash: string;
  approvalStatus: "draft" | "approved" | "retired";
  conformanceRows: string[];
  representativeQuorum: Record<string, unknown>;
  strongNegative: Record<string, unknown>;
  riskExposure: Record<string, unknown>;
}

export interface SafeFallbackRecord {
  fallbackId: string;
  title: string;
  recipientId?: string;
  auditConfidenceBps: bigint;
  consensusBreadthBps: bigint;
  robustCostEffectivenessBps: bigint;
  reversibilityBps: bigint;
  substantiveRiskBps: bigint;
  threatScoreBps: bigint;
  tailLossBps: bigint;
  maxAllocationCents?: bigint;
}

export interface MpgfServerConfig {
  FEATURE_MPGF_ENABLED: boolean;
  MPGF_REAL_MONEY_ENABLED: boolean;
  MPGF_ENV: "local" | "test" | "staging" | "production";
  MPGF_PUBLIC_BASE_URL: string;
  MPGF_CANONICAL_HOST: string;
  MPGF_DIRECT_WORKING_BOOTSTRAP_ENABLED: boolean;
  MPGF_WWW_SMOKE_TEST_ENABLED?: boolean;
  MPGF_PARTICIPANT_ONBOARDING_ENABLED?: boolean;
  MPGF_PUBLIC_GOODS_ENABLED?: boolean;
  MPGF_PUBLIC_GOODS_COHORT?: string;
  MPGF_PUBLIC_GOODS_INVITED_USER_REFS?: string;
  MPGF_PUBLIC_GOODS_INVITED_EMAILS?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  STRIPE_PUBLISHABLE_KEY?: string;
  MPGF_ADMIN_BOOTSTRAP_SECRET?: string;
  MPGF_WWW_SMOKE_TEST_AUTH_SECRET?: string;
  MPGF_ENCRYPTION_KEY_ID?: string;
  MPGF_EMAIL_PROVIDER_SECRET?: string;
  MPGF_DEFAULT_TIMEZONE: string;
}

export interface DirectWorkingSmokeTestResult {
  passed: boolean;
  baseUrl: string;
  checkedAt: string;
  environment: "local" | "test" | "staging" | "production";
  featureMode: "demo" | "pledge_only" | "test_mode";
  deployedCommitShaOrBuildId?: string;
  checks: Array<{
    routeOrAction: string;
    check: string;
    passed: boolean;
    evidence: string;
  }>;
  blockers: string[];
}

export interface DryRunResult {
  dryRunCycleId: string;
  passed: boolean;
  completedAt: string;
  scenarioResults: Array<{
    scenario: string;
    passed: boolean;
    evidence: string;
    blockers: string[];
  }>;
  prohibitedMutationChecks: Array<{
    check: string;
    passed: boolean;
    evidence: string;
  }>;
  outputSummaryReference: string;
  blockers: string[];
}

export interface ProductionDeploymentTarget {
  targetVersion: string;
  provider: "vercel" | "other_repository_approved_provider";
  projectIdOrName: string;
  teamOrAccountId?: string;
  canonicalBaseUrl: "https://www.moraltrade.org";
  canonicalHost: "www.moraltrade.org";
  productionEnvironmentName: "production";
  sourceBranchOrRef: string;
  deploymentCommandOrWorkflow: string;
  deploymentStatusCheck: string;
  environmentVariableManagementWorkflow: string;
  secretManagementWorkflow: string;
  requiredEnvironmentVariables: string[];
  requiredSecretsByCapability: Array<{
    capability: string;
    secretNames: string[];
    requiredWhenEnabled: boolean;
  }>;
  migrationCommandOrWorkflow: string;
  productionDatabaseRef: string;
  domainBindingEvidencePath: string;
  rollbackCommandOrWorkflow: string;
  productionAccessValidationMethod: string;
  approverRole: "super_admin" | "deployment_admin";
  evidencePaths: string[];
}

export interface ProductionDeploymentTargetValidationResult extends MpgfValidationResultBase {
  target: ProductionDeploymentTarget;
  matchedLocalVercelProject?: boolean;
  approvedDivergenceFromLocalProject?: boolean;
}

export interface ProductionDeploymentPrerequisiteValidationResult extends MpgfValidationResultBase {
  target: ProductionDeploymentTarget;
  deploymentProviderReachable: boolean;
  productionProjectResolved: boolean;
  canonicalDomainBound: boolean;
  productionEnvironmentConfigurable: boolean;
  requiredEnvironmentVariablesPresent: boolean;
  requiredSecretsPresentForEnabledCapabilities: boolean;
  productionMigrationsExecutable: boolean;
  rollbackExecutable: boolean;
  canDeployIntendedCommit: boolean;
}

export interface WwwSmokeTestProfile {
  profileVersion: string;
  enabled: boolean;
  authMode: "repository_test_session" | "preexisting_user_session" | "server_side_test_harness";
  smokeUserRef: string;
  demoParticipantRef: string;
  allowedRoutes: string[];
  allowedActions: string[];
  termsVersion: string;
  privacyVersion: string;
  eligibilitySnapshotRef: string;
  candidateSetSnapshotRef: string;
  credentialSource: "server_env" | "deployment_secret" | "repo_test_session";
  credentialRotationPolicy: string;
  auditLogRequired: true;
  rateLimitPolicy: "normal" | "smoke_test_scoped";
}

export interface WwwSmokeTestIdentityResult {
  passed: boolean;
  smokeUserRef: string;
  demoParticipantRef: string;
  repositoryAuthMapped: boolean;
  nonRealMoneyOnly: boolean;
  demoEligible: boolean;
  blockers: string[];
}

export interface WwwSmokeTestSessionResult {
  passed: boolean;
  smokeUserRef: string;
  authMode: WwwSmokeTestProfile["authMode"];
  sessionEstablished: boolean;
  expiresAt?: string;
  blockers: string[];
}

export interface ParticipantOnboardingProfile {
  profileVersion: string;
  enabled: boolean;
  onboardingMode: "public_signup" | "private_beta_invite" | "preexisting_participant_access";
  publicEntryRoute: string;
  authEntryRoute: string;
  supportRouteOrEmail: string;
  returnToMpgfSupported: boolean;
  termsRoute: string;
  privacyRoute: string;
  requiredTermsVersion: string;
  requiredPrivacyVersion: string;
  verificationMode: "demo_self_attestation" | "repository_existing_verification" | "admin_seeded_demo_verification";
  participantTestAccountPolicy: "fixture_owned" | "preexisting_test_account";
  allowedJourneyActions: string[];
  fixtureKeys: string[];
  auditLogRequired: true;
}

export interface ProductionAuthSessionProfile {
  profileVersion: string;
  enabled: boolean;
  baseUrl: "https://www.moraltrade.org";
  authProvider: string;
  loginRoute: string;
  signupRoute: string;
  callbackRoute: string;
  signOutRouteOrAction: string;
  returnToParam: string;
  allowedRedirectOrigins: string[];
  allowedPostAuthRoutes: string[];
  requiredProviderRedirectUrls: string[];
  sessionCookieScope: "host_only" | "www.moraltrade.org" | ".moraltrade.org";
  sessionCookieSameSite: "lax" | "strict" | "none";
  secureCookiesRequired: true;
  csrfProtectionRequired: true;
  emailConfirmationMode: "disabled" | "optional" | "required";
  inviteDeliveryMode: "disabled" | "provider_invite" | "repository_email" | "manual_preexisting_access";
  accountProvisioningMode: "on_signup" | "on_login" | "on_auth_callback" | "mapped_repository_profile";
  supportRouteOrEmail: string;
}

export interface PublicExperienceProfile {
  profileVersion: string;
  enabled: boolean;
  baseUrl: "https://www.moraltrade.org";
  publicEntryRoute: "/mpgf";
  requiredRoutes: string[];
  requiredCopyKeys: string[];
  requiredModeLabels: string[];
  primaryActionRoutes: string[];
  supportRouteOrEmail: string;
  requireVisibleDemoOrdinaryPoolAlternative: true;
  allowCarryoverOnlyDemoComplete: false;
  requireMobileAndDesktopChecks: true;
}

export interface WwwProductionHealthCheckProfile {
  profileVersion: string;
  enabled: boolean;
  baseUrl: "https://www.moraltrade.org";
  monitorWindow: string;
  sampleIntervalSeconds: number;
  minimumMonitorWindowSeconds: number;
  minimumSampleCount: number;
  maxUnresolvedCriticalIncidents: 0;
  checks: Array<{
    id: string;
    severity: "critical" | "warning";
    implementation: string;
    accessControl: string;
    expected: string;
    timeoutSeconds: number;
    conformanceRowId: string;
  }>;
}

export interface MpgfCheckResult {
  id: string;
  label: string;
  status: MpgfValidationStatus;
  evidence: string;
  routeOrAction: string;
  check: string;
  passed: boolean;
}

export interface MpgfCandidateAlternative {
  id: string;
  name: string;
  shortName: string;
  causeArea: string;
  recipientName: string;
  description: string;
  moralPublicGoodRationale: string;
  outcomeUnit: string;
  isConsensus: boolean;
  isHybrid: boolean;
  preferenceIntensityHint: string;
  expectedMoralImpactTooltip: string;
  status: "approved_demo" | "carryover_only";
  operationalReliabilityBps: number;
  riskBps: number;
  tailLossBps: number;
  demoPriorityBps: number;
}

export interface MpgfCycle {
  id: string;
  label: string;
  stage: "pilot" | "public_beta" | "mature";
  mode: "non_real_money_demo" | "pledge_only" | "test_mode" | "real_money";
  contributionMode: "pledge_only";
  currency: "usd";
  budgetCents: number;
  proposalOpensAt: string;
  ballotOpensAt: string;
  ballotClosesAt: string;
  summaryPublishedAt: string;
  protocolParameterVersion: string;
  termsVersion: string;
  privacyVersion: string;
}

export interface MpgfBallotWeight {
  alternativeId: string;
  valueBps: number;
  strongNegative: boolean;
}

export interface MpgfRationalJson {
  num: string;
  den: string;
}

export interface MpgfBallotCurve {
  alternativeId: string;
  curveJson: {
    representation: "piecewise_linear";
    domainStartCents: number;
    domainEndCents: number;
    breakpoints: Array<{
      xCents: number;
      valueRational: MpgfRationalJson;
    }>;
  };
  absIntegralRationalJson: MpgfRationalJson;
  signedIntegralRationalJson: MpgfRationalJson;
  absIntegralDecimalCache?: number;
  signedIntegralDecimalCache?: number;
}

export interface MpgfBallot {
  id: string;
  voterLabel: string;
  cycleId: string;
  weights: MpgfBallotWeight[];
  status?: "draft" | "submitted" | "invalidated" | "voided";
  draftVersion?: number;
  eligibilitySnapshotId?: string;
  candidateSetSnapshotId?: string;
  totalAbsIntegralRationalJson?: MpgfRationalJson;
  totalAbsIntegralDecimalCache?: number;
  lockedBudgetCentsAtSubmission?: number;
  validationTraceId?: string;
  curves?: MpgfBallotCurve[];
}

export interface MpgfPledge {
  id: string;
  userId?: string;
  contributorLabel: string;
  amountCents: number;
  currency: "usd";
  cadence: "one_time" | "monthly";
  status: "pledged" | "cancelled" | "converted_to_payment_intent" | "expired";
  pledgeMode: "pledge_only";
  intendedCycleId?: string;
  budgetEffectiveCycleId?: string;
  recurringCommitmentId?: string;
  convertedPaymentIntentId?: string;
  cancelledAt?: string;
  expiresAt?: string;
}

export interface MpgfRecurringContributionCommitment {
  id: string;
  userId: string;
  amountCents: number;
  currency: "usd";
  cadence: "monthly";
  mode: "pledge_only" | "test_payment" | "real_money";
  status: "active" | "paused" | "cancelled" | "expired" | "provider_action_required" | "provider_failed";
  startCycleId?: string;
  nextCycleId?: string;
  nextScheduledAt?: string;
  providerSubscriptionId?: string;
  createdAt?: string;
  pausedAt?: string;
  cancelledAt?: string;
}

export type MpgfPublicGoodsCampaignStatus =
  | "threshold_pending"
  | "threshold_met"
  | "review_pending"
  | "payable"
  | "expired"
  | "blocked";

export type MpgfPublicGoodsCampaignReviewStatus =
  | "draft"
  | "submitted"
  | "needs_evidence"
  | "challenge_window"
  | "approved"
  | "blocked"
  | "finalized";

export type MpgfPublicGoodsDestinationType =
  | "external_charity"
  | "fiscal_host"
  | "internal_demo_pool"
  | "signed_sponsor_route";

export type MpgfPublicGoodsCaptureMode = "external_handoff" | "stored_payment_method" | "signed_intent";

export type MpgfPublicGoodsVisibilityMode = "private_amount" | "public_supporter" | "public_reason";

export interface MpgfPublicGoodsCrossViewIntentTerms {
  acceptableCounterpartBuckets: string[];
  minimumCounterpartyClearedCents: number;
  counterpartDistinctBucketRequired: true;
  fallbackRule: {
    roundNotClearedMode: "expire_without_charge";
    recipientVerificationFailedMode: "release_authorization_or_reroute_to_next_eligible_common_ground_project";
    authorizationExpiredMode: "reauthorize_only_after_clearance_reconfirmed";
  };
  recognitionConsent: MpgfPublicGoodsVisibilityMode;
}

export interface MpgfPublicGoodsDonorExposureDisclosure {
  maxExposureCents: number;
  exactClearanceConditions: string[];
  roundFailureBehavior: string;
  recipientVerificationFailureBehavior: string;
  authorizationTiming: string;
  authorizationExpiryBehavior: string;
}

export type MpgfPublicGoodsReviewAction = "approve" | "needs_evidence" | "block" | "challenge" | "finalize";

export type MpgfPublicGoodsReviewReasonCode =
  | "destination_verified"
  | "needs_destination_evidence"
  | "needs_identity_evidence"
  | "blocked_threat_baseline"
  | "blocked_destination_risk"
  | "challenge_opened"
  | "challenge_resolved"
  | "external_handoff_verified"
  | "external_handoff_failed"
  | "duplicate_identity_blocked"
  | "appeal_requested"
  | "appeal_denied"
  | "appeal_upheld";

export type MpgfPublicGoodsAppealStatus = "none" | "appeal_requested" | "appeal_denied" | "appeal_upheld";

export interface MpgfPublicGoodsCampaign {
  id: string;
  slug: string;
  poolAlternativeId?: string;
  title: string;
  destinationType: MpgfPublicGoodsDestinationType;
  destinationRef: string;
  causeTags: string[];
  publicSummary: string;
  thresholdAmountCents: number;
  thresholdSupporters: number;
  deadlineAt: string;
  verificationMethod: string;
  baselineRule: string;
  exitRule: string;
  reviewStatus: MpgfPublicGoodsCampaignReviewStatus;
  challengeWindowEndsAt?: string;
}

export interface MpgfPublicGoodsRound {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  matchPoolId: string;
  qfEnabled: boolean;
  qfCapMultiple: number;
  supporterGate: "demo_self_attestation" | "verified_human" | "repository_existing_verification";
}

export interface MpgfPublicGoodsMatchPool {
  id: string;
  funderType: "demo_common_ground_pool" | "sponsor" | "subscription_pool" | "institution";
  budgetCents: number;
  baseMatchRatio: number;
  qfBonusCents: number;
  visibleCommitment: string;
  restrictionsJson: Record<string, unknown>;
}

export interface MpgfPublicGoodsPledge {
  id: string;
  campaignId: string;
  userId: string;
  amountCents: number;
  acceptableCounterpartBuckets?: string[];
  minimumCounterpartyClearedCents?: number;
  counterpartDistinctBucketRequired?: true;
  maxExposureCents?: number;
  donorExposureDisclosure?: MpgfPublicGoodsDonorExposureDisclosure;
  visibilityMode: MpgfPublicGoodsVisibilityMode;
  isRecurring: boolean;
  captureMode: MpgfPublicGoodsCaptureMode;
  paymentIntentRef?: string;
  eligibilityState: "eligible" | "pending_review" | "duplicate_identity" | "below_minimum" | "blocked";
  humanScoreBps: number;
  status: "pledged" | "captured" | "voided" | "expired";
  supporterReason?: string;
  createdAt: string;
}

export interface MpgfPublicGoodsIdentityAttestation {
  userId: string;
  provider: "demo_self_attestation" | "repository_profile" | "external_proof_of_personhood";
  humanScoreBps: number;
  expiresAt: string;
  status: "active" | "expired" | "revoked" | "pending_review";
  redactedReference: string;
}

export interface MpgfPublicGoodsPaymentProof {
  id: string;
  pledgeId?: string;
  campaignId: string;
  sourceEventRef?: string;
  externalReceiptRef?: string;
  charityReceiptRef?: string;
  amountVerifiedCents: number;
  status: "pending_review" | "verified" | "rejected" | "superseded";
  reasonCode: MpgfPublicGoodsReviewReasonCode;
  reconciliationSource:
    | "external_receipt"
    | "fiscal_host_webhook"
    | "sponsor_signed_intent"
    | "every_org_partner_webhook";
  verifiedAt?: string;
  createdAt: string;
}

export interface MpgfPublicGoodsReviewCase {
  id: string;
  campaignId: string;
  state: MpgfPublicGoodsCampaignReviewStatus;
  action: MpgfPublicGoodsReviewAction;
  reasonCode: MpgfPublicGoodsReviewReasonCode;
  reviewerId: string;
  openedAt: string;
  closedAt?: string;
  appealStatus: MpgfPublicGoodsAppealStatus;
  challengeWindowEndsAt?: string;
  publicNotes: string;
  allowedNextActions: MpgfPublicGoodsReviewAction[];
}

export interface MpgfPublicGoodsSubscription {
  id: string;
  userId: string;
  poolId: string;
  amountCents: number;
  interval: "monthly" | "annual";
  status: "active" | "paused" | "cancelled" | "past_due" | "expired";
  captureMode: MpgfPublicGoodsCaptureMode;
  mode: "pledge_only" | "test_payment" | "real_money";
  nextChargeAt: string;
  createdAt: string;
}

export interface MpgfPublicGoodsExperimentAssignment {
  id: string;
  userRefHash: string;
  experimentKey: string;
  variant: string;
  assignedAt: string;
  analyticsPolicy: "privacy_safe_no_raw_private_text";
}

export interface MpgfPublicGoodsCampaignValidationResult {
  passed: boolean;
  errors: MpgfValidationIssue[];
  warnings: MpgfValidationIssue[];
}

export interface MpgfPublicGoodsAssuranceStatus {
  campaignId: string;
  status: MpgfPublicGoodsCampaignStatus;
  directEligibleCents: number;
  verifiedSupporterCount: number;
  thresholdAmountCents: number;
  thresholdSupporters: number;
  amountProgressBps: number;
  supporterProgressBps: number;
  thresholdPassed: boolean;
  reviewPassed: boolean;
  deadlinePassed: boolean;
  eligiblePledgeCount: number;
  excludedPledgeCount: number;
  captureModes: MpgfPublicGoodsCaptureMode[];
  blockers: string[];
}

export interface MpgfPublicGoodsAllocationLine {
  campaignId: string;
  status: MpgfPublicGoodsCampaignStatus;
  directEligibleCents: number;
  verifiedSupporterCount: number;
  baseMatchCents: number;
  qfScore: number;
  qfBonusCents: number;
  totalPayoutCents: number;
  qfBonusCapCents: number;
  custodyMode: "no_custody_external_handoff" | "provider_or_fiscal_host_required";
  proofRequired: "external_destination_receipt" | "provider_webhook_and_review" | "signed_intent_review";
  blockers: string[];
}

export interface MpgfPublicGoodsRoundAllocation {
  roundId: string;
  matchPoolId: string;
  formulaVersion: "cg_vqaf_capital_constrained_qf_v1";
  qfAllocationPolicy: "capital_constrained_lambda_bisection_with_per_campaign_cap";
  qfLambda: number;
  baseMatchBudgetCents: number;
  qfBonusBudgetCents: number;
  baseMatchAllocatedCents: number;
  qfBonusAllocatedCents: number;
  totalDirectEligibleCents: number;
  totalPayoutCents: number;
  unallocatedMatchPoolCents: number;
  proofPageRequired: true;
  lines: MpgfPublicGoodsAllocationLine[];
}

export interface MpgfAllocationLine {
  alternativeId: string;
  name: string;
  scoreBps: number;
  allocationCents: number;
  remainderNumerator: bigint;
}

export interface MpgfAllocationResult {
  cycleId: string;
  budgetCents: number;
  allocatedCents: number;
  carryoverCents: number;
  lines: MpgfAllocationLine[];
  certificate: {
    algorithm: "exact_integer_proportional_v0";
    totalScoreBps: number;
    deterministicTieBreak: "alternative_id_ascending";
    generatedAt: string;
  };
}

export interface MpgfLedgerEntry {
  account: string;
  direction: "debit" | "credit";
  amountCents: number;
  currency: "usd";
}

export interface MpgfLedgerTransaction {
  id: string;
  templateId: string;
  description: string;
  entries: MpgfLedgerEntry[];
}

export interface MpgfPublicSummary {
  cycleId: string;
  mode: MpgfCycle["mode"];
  nonRealMoneyStatus: string;
  budgetCents: number;
  pledgedCents: number;
  releasedInternalCents: number;
  payoutAuthorizedCents: number;
  externallyPaidCents: number;
  allocations: Array<{
    alternativeId: string;
    name: string;
    allocationCents: number;
    outcomeUnit: string;
  }>;
  disclaimers: Record<string, string>;
}

export interface MpgfDirectWorkingResult {
  passed: boolean;
  baseUrl: string;
  checkedAt: string;
  environment: "local" | "test" | "staging" | "production";
  featureMode: "demo" | "pledge_only" | "test_mode";
  deployedCommitShaOrBuildId?: string;
  checks: MpgfCheckResult[];
  status: MpgfValidationStatus;
  blockers: string[];
  generatedAt: string;
}

export interface WwwParticipantJourneyVerificationResult {
  passed: boolean;
  baseUrl: "https://www.moraltrade.org";
  deployedCommitShaOrBuildId: string;
  onboardingMode: ParticipantOnboardingProfile["onboardingMode"];
  publicEntryRoute: string;
  authEntryRoute: string;
  participantRef: string;
  checks: DirectWorkingSmokeTestResult["checks"];
  blockers: string[];
}

export interface WwwAuthSessionVerificationResult {
  passed: boolean;
  baseUrl: "https://www.moraltrade.org";
  deployedCommitShaOrBuildId: string;
  profileVersion: string;
  authProvider: string;
  checks: DirectWorkingSmokeTestResult["checks"];
  blockers: string[];
}

export interface WwwPublicExperienceVerificationResult {
  passed: boolean;
  baseUrl: "https://www.moraltrade.org";
  deployedCommitShaOrBuildId: string;
  profileVersion: string;
  routesChecked: string[];
  visibleDemoOrdinaryPoolAlternativeId: string;
  checks: DirectWorkingSmokeTestResult["checks"];
  blockers: string[];
}

export interface WwwProductionHealthCheckResult {
  passed: boolean;
  baseUrl: "https://www.moraltrade.org";
  deployedCommitShaOrBuildId: string;
  checkedAt: string;
  checks: Array<{
    id: string;
    check: string;
    severity: "critical" | "warning";
    passed: boolean;
    evidence: string;
  }>;
  blockers: string[];
}

export interface WwwDirectWorkingVerificationResult extends DirectWorkingSmokeTestResult {
  baseUrl: "https://www.moraltrade.org";
  environment: "production";
  deployedCommitShaOrBuildId: string;
  authSessionVerificationResult: WwwAuthSessionVerificationResult;
  publicExperienceVerificationResult: WwwPublicExperienceVerificationResult;
  participantJourneyVerificationResult: WwwParticipantJourneyVerificationResult;
  productionHealthCheckResult: WwwProductionHealthCheckResult;
}

export interface WwwExactPilotDryRunVerificationResult {
  passed: boolean;
  baseUrl: "https://www.moraltrade.org";
  deployedCommitShaOrBuildId: string;
  dryRunCycleId: string;
  exactSolverResult: unknown;
  certificateVerificationResult: unknown;
  productionEquivalentDryRunResult: DryRunResult;
  prohibitedMutationChecks: DryRunResult["prohibitedMutationChecks"];
  blockers: string[];
}

export interface WwwPostLaunchMonitorResult {
  passed: boolean;
  baseUrl: "https://www.moraltrade.org";
  deployedCommitShaOrBuildId: string;
  monitorWindow: string;
  samples: WwwProductionHealthCheckResult[];
  incidentCount: number;
  criticalIncidentCount: number;
  blockers: string[];
}

export interface ProductionDirectWorkingLaunchResult {
  passed: boolean;
  baseUrl: "https://www.moraltrade.org";
  deployedCommitShaOrBuildId: string;
  deploymentTargetValidationResult: ProductionDeploymentTargetValidationResult;
  deploymentPrerequisiteValidationResult: ProductionDeploymentPrerequisiteValidationResult;
  preLaunchEnvironmentValidationResult: MpgfValidationResultBase;
  genesisActivationResult: unknown;
  bootstrapResult: unknown;
  wwwSmokeTestProfileValidationResult: MpgfValidationResultBase;
  smokeTestIdentityResult: WwwSmokeTestIdentityResult;
  productionAuthSessionProfileValidationResult: MpgfValidationResultBase;
  authSessionVerificationResult: WwwAuthSessionVerificationResult;
  participantOnboardingProfileValidationResult: MpgfValidationResultBase;
  publicExperienceProfileValidationResult: MpgfValidationResultBase;
  publicExperienceVerificationResult: WwwPublicExperienceVerificationResult;
  participantJourneyVerificationResult: WwwParticipantJourneyVerificationResult;
  productionHealthCheckResult: WwwProductionHealthCheckResult;
  wwwVerificationResult: WwwDirectWorkingVerificationResult;
  blockers: string[];
}

export interface MpgfPayoutProviderAdapter {
  createRecipient(input: unknown): Promise<unknown>;
  verifyDestination(input: unknown): Promise<unknown>;
  createPayout(input: unknown): Promise<unknown>;
  handleWebhook(event: unknown): Promise<unknown>;
  reverseOrRecallPayout(input: unknown): Promise<unknown>;
}
