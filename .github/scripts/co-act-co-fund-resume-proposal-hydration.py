from pathlib import Path
from textwrap import dedent

client_path = Path("src/lib/create-interface/group-contribution-client.ts")
client = client_path.read_text(encoding="utf-8")

old_mount_state = dedent('''\
  const saved = readStoredDrafts().drafts[key];
  const state = saved
    ? sanitizeStoredDraft(saved, key, underlying)
    : defaultGroupContributionDraft(key, underlying, readPrimaryText(card, underlying));
''')
new_mount_state = dedent('''\
  const resumed = draftFromResumedProposal(key, underlying);
  const saved = readStoredDrafts().drafts[key];
  const state = resumed ??
    (saved
      ? sanitizeStoredDraft(saved, key, underlying)
      : defaultGroupContributionDraft(key, underlying, readPrimaryText(card, underlying)));
''')
if client.count(old_mount_state) != 1:
    raise SystemExit(
        f"Expected one stored-draft mount block; found {client.count(old_mount_state)}"
    )
client = client.replace(old_mount_state, new_mount_state, 1)

helper_anchor = "function removeDetachedOptions(): void {\n"
if client.count(helper_anchor) != 1:
    raise SystemExit(
        f"Expected one detached-option helper anchor; found {client.count(helper_anchor)}"
    )

helpers = dedent('''\
function draftFromResumedProposal(
  optionKey: string,
  underlying: UnderlyingContributionKind,
): GroupContributionDraftState | null {
  if (!resumedProposal) return null;
  const option = resumedProposal.options.find((candidate) => candidate.optionKey === optionKey);
  if (!option) return null;

  const expectedMode = underlying === "financial" ? "co-fund" : "co-act";
  if (option.terms.mode !== expectedMode) return null;

  const primaryText =
    option.terms.mode === "co-act" ? option.terms.action : option.terms.project.title;
  const state = defaultGroupContributionDraft(optionKey, underlying, primaryText);
  applyCommonTermsToDraft(state, option.terms);

  if (option.terms.mode === "co-act") {
    applyCoActTermsToDraft(state, option.terms);
  } else {
    applyCoFundTermsToDraft(state, option.terms);
  }

  return sanitizeStoredDraft(state, optionKey, underlying);
}

function applyCommonTermsToDraft(
  state: GroupContributionDraftState,
  terms: GroupContributionTerms,
): void {
  state.participantLimit = terms.participantLimit;
  state.visibility = terms.visibility;
  state.combination = terms.combination;
  state.recruitmentDeadline = dateTimeLocalValue(terms.recruitmentDeadline);
  state.existingGroupId =
    terms.groupReference.mode === "attach-existing" ? terms.groupReference.groupId ?? "" : "";

  state.minimumReliability = null;
  state.geography = "";
  state.skill = "";
  for (const criterion of terms.eligibility) {
    if (criterion.type === "minimum-reliability") {
      state.minimumReliability = criterion.minimum;
    } else if (criterion.type === "geography") {
      state.geography = criterion.location;
    } else if (criterion.type === "skill") {
      state.skill = criterion.skill;
    }
  }
}

function applyCoActTermsToDraft(
  state: GroupContributionDraftState,
  terms: Extract<GroupContributionTerms, { mode: "co-act" }>,
): void {
  state.mode = "co-act";
  state.primaryText = terms.action;
  state.counterpartyParticipation = terms.counterpartyParticipation;
  state.coActStructure = terms.structure;
  state.complementaryRoles =
    terms.structure === "complementary-roles"
      ? terms.roles.map((role) => `${role.title}: ${role.obligation}`).join("\\n")
      : "";

  state.activationMode = terms.activation.mode;
  state.creatorCounts = terms.activation.creatorCounts;
  if (terms.activation.mode === "minimum-participants") {
    state.minimumParticipants = terms.activation.minimumParticipants;
    state.activationConfirmationHours = terms.activation.confirmationHours ?? 24;
  }

  state.performanceStartMode = terms.performanceStart.mode;
  state.performanceStartsAt =
    terms.performanceStart.mode === "scheduled"
      ? dateTimeLocalValue(terms.performanceStart.startsAt)
      : "";
  state.lateJoining = terms.lateJoining;
  state.coActTiming = terms.timing;
  state.coordination = terms.coordination;
  state.duration = terms.duration ?? "";
  state.frequency = terms.frequency ?? "";

  state.rewardMode = terms.reward.mode;
  state.rewardDescription = terms.reward.description;
  state.rewardRuleOrUnit =
    terms.reward.mode === "fixed-group" ? terms.reward.allocationRule : terms.reward.unit;

  state.baselineSource = terms.additionality.baselineSource;
  state.baselineQuantity = terms.additionality.baselineQuantity;
  state.baselineUnit = terms.additionality.unit;
  state.baselineConfidence = terms.additionality.confidence;

  state.evidenceVerification = terms.evidence.verification;
  state.allowedMisses = terms.evidence.allowedMisses;
  state.gracePeriodHours = terms.evidence.gracePeriodHours;
  state.makeUpAllowed = terms.evidence.makeUpAllowed;
  state.postActivationWithdrawal = terms.withdrawal.postActivation;

  state.redistributionEnabled = terms.redistribution.enabled;
  state.redistributionFallback = terms.redistribution.fallback;
  if (terms.redistribution.formula !== undefined) {
    state.redistributionFormula = terms.redistribution.formula;
  }
  if (terms.redistribution.participantMaximumQuantity !== undefined) {
    state.redistributionMaximumQuantity = terms.redistribution.participantMaximumQuantity;
  }
  if (terms.redistribution.replacementRecruitmentHours !== undefined) {
    state.replacementRecruitmentHours = terms.redistribution.replacementRecruitmentHours;
  }
}

function applyCoFundTermsToDraft(
  state: GroupContributionDraftState,
  terms: Extract<GroupContributionTerms, { mode: "co-fund" }>,
): void {
  state.mode = "co-fund";
  state.primaryText = terms.project.title;
  state.projectDescription = terms.project.description;
  state.allocationMode = terms.allocationMode;
  state.settlementCurrency = terms.settlementCurrency;
  state.targetMinor = terms.targetMinor;
  state.maximumBudgetMinor = terms.participantTerms.maximumBudgetMinor;
  state.noPoolDefault = terms.participantTerms.noPoolDefault;
  state.participationBeatsDefault = terms.participantTerms.participationBeatsDefault;
  state.preauthorizeExecutableFallback =
    terms.participantTerms.preauthorizeExecutableFallback;
  state.paymentMethods = [...terms.paymentMethods];
  state.paymentRepairWindowHours = terms.paymentFailure.repairWindowHours;
  state.milestoneBasedPayout = terms.project.milestoneBasedPayout;

  state.recurringMode = terms.recurring.mode;
  if (terms.recurring.mode !== "none") {
    state.recurringFrequency = terms.recurring.frequency;
    state.recurringMaximumMinor = terms.recurring.maximumPerCycleMinor;
  }

  state.coFundDeadlineOutcome = terms.failure.deadlineOutcome;
  state.coFundExtensionHours = terms.failure.extensionHours ?? state.coFundExtensionHours;
  state.coFundFailureFallback = terms.failure.underThresholdFallback;
}

function dateTimeLocalValue(value: string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function removeDetachedOptions(): void {
''')
client = client.replace(helper_anchor, helpers, 1)
client_path.write_text(client, encoding="utf-8")

stability_path = Path(
    "src/lib/create-interface/group-contribution-client-stability.test.ts"
)
stability = stability_path.read_text(encoding="utf-8")
test_name = "validated authentication resume hydrates the editable group draft before first render"
if test_name in stability:
    raise SystemExit("The validated proposal-to-draft hydration regression already exists")

stability += "\n" + dedent(r'''
test("validated authentication resume hydrates the editable group draft before first render", () => {
  const mount = functionBody("mountOption");
  assert.match(mount, /draftFromResumedProposal\(key, underlying\)/);
  assert.ok(
    mount.indexOf("draftFromResumedProposal(key, underlying)") <
      mount.indexOf("readStoredDrafts().drafts[key]"),
  );
  assert.match(mount, /const state = resumed \?\?/);

  const hydrate = functionBody("draftFromResumedProposal");
  assert.match(hydrate, /option\.terms\.mode !== expectedMode/);
  assert.match(hydrate, /applyCommonTermsToDraft\(state, option\.terms\)/);
  assert.match(hydrate, /applyCoActTermsToDraft\(state, option\.terms\)/);
  assert.match(hydrate, /applyCoFundTermsToDraft\(state, option\.terms\)/);
  assert.match(hydrate, /sanitizeStoredDraft\(state, optionKey, underlying\)/);

  const coAct = functionBody("applyCoActTermsToDraft");
  assert.match(coAct, /state\.mode = "co-act"/);
  assert.match(coAct, /state\.participantLimit/);
  assert.match(coAct, /state\.counterpartyParticipation = terms\.counterpartyParticipation/);

  const coFund = functionBody("applyCoFundTermsToDraft");
  assert.match(coFund, /state\.mode = "co-fund"/);
  assert.match(coFund, /state\.targetMinor = terms\.targetMinor/);
  assert.match(coFund, /state\.maximumBudgetMinor = terms\.participantTerms\.maximumBudgetMinor/);
});
''')
stability_path.write_text(stability, encoding="utf-8")
