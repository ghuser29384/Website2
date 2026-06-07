import { NextResponse } from "next/server";

import {
  evaluateDeterministicMatch,
  getDeterministicSignalsFromSynthesis,
  normalizeBackgroundToken,
} from "@/lib/background-networking";
import { buildBackgroundOpportunityNotificationCopy } from "@/lib/background-helper-runs";
import {
  buildMatchExplanationSnapshot,
  buildPrivacySafeMatchAuditMetadata,
  buildPrivacySafeMatchAuditSummary,
  buildPrivacySafeMatchDigestLine,
} from "@/lib/background-explanations";
import {
  BACKGROUND_CANDIDATE_BUDGET_VERSION,
  evaluateBackgroundDelegatePurposeAuthorization,
  evaluateCandidateExposureForBackgroundRun,
  type BackgroundCandidateExposureDecision,
} from "@/lib/background-candidate-exposure";
import {
  PROFILE_SYNTHESIS_SENSITIVE_TEXT_FIELDS,
  WISH_PROFILE_SENSITIVE_TEXT_FIELDS,
  overlayBackgroundRecordSensitiveText,
} from "@/lib/background-field-encryption";
import { insertWishNotificationsWithSafeEmail } from "@/lib/background-notifications";
import {
  buildPrivacySafeRiskSignalInsert,
  completeBackgroundQueryEvent,
  insertMatchExplanationSnapshots,
  recordBackgroundQueryRiskSignal,
  reserveBackgroundQueryBudget,
  upsertBackgroundOpportunityBriefs,
} from "@/lib/background-operations";
import { buildOpportunityBriefRow } from "@/lib/background-opportunity-briefs";
import { getBackgroundQueryFingerprint } from "@/lib/background-query-budget";
import { type BackgroundPurposeBinding } from "@/lib/background-purpose-registry";
import { isCronRequestAuthorized } from "@/lib/cron";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type PersonalDelegateRow = Database["public"]["Tables"]["personal_delegates"]["Row"];
type HelperStrategyRow = Database["public"]["Tables"]["helper_strategies"]["Row"];
type WishProfileRow = Database["public"]["Tables"]["wish_profiles"]["Row"];
type WishProfilePreviewRow = Database["public"]["Views"]["wish_profile_previews"]["Row"];
type ProfileSynthesisRow = Database["public"]["Tables"]["profile_syntheses"]["Row"];
type PrivacyGrantRow = Database["public"]["Tables"]["privacy_grants"]["Row"];
type PrivacyAccessRequestRow =
  Database["public"]["Tables"]["privacy_access_requests"]["Row"];
type NetworkInviteRow = Database["public"]["Tables"]["network_invites"]["Row"];
type MatchIntroductionPlanRow =
  Database["public"]["Tables"]["match_introduction_plans"]["Row"];
type MatchIntroductionTaskRow =
  Database["public"]["Tables"]["match_introduction_tasks"]["Row"];
type MatchSuggestionInsert = Database["public"]["Tables"]["match_suggestions"]["Insert"];

function isDue(delegate: PersonalDelegateRow, now: Date) {
  if (delegate.status !== "active" || delegate.operating_mode === "paused") {
    return false;
  }

  if (!delegate.last_run_at) {
    return true;
  }

  const lastRunAt = new Date(delegate.last_run_at);
  const elapsedMs = now.getTime() - lastRunAt.getTime();

  return elapsedMs >= 24 * 60 * 60 * 1000;
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [] as string[];
  }

  return value
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);
}

function toBoolean(value: unknown) {
  return value === true;
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function includesNormalized(values: string[], target: string) {
  const normalizedTarget = normalizeBackgroundToken(target);
  return values.some((value) => normalizeBackgroundToken(value) === normalizedTarget);
}

function getOrderedProfilePair(profileId: string, counterpartyId: string) {
  return profileId < counterpartyId
    ? { profileAId: profileId, profileBId: counterpartyId, viewerIsProfileA: true }
    : { profileAId: counterpartyId, profileBId: profileId, viewerIsProfileA: false };
}

async function reserveCandidateExposureSurface({
  candidateProfileId,
  cohortScopeId,
  decision,
  purposeBinding,
  supabase,
}: {
  candidateProfileId: string;
  cohortScopeId: string;
  decision: BackgroundCandidateExposureDecision;
  purposeBinding: BackgroundPurposeBinding;
  supabase: ReturnType<typeof createServiceClient>;
}) {
  if (!decision.allowed || !decision.budgetConfig) {
    return false;
  }

  const { data, error } = await supabase.rpc("reserve_background_candidate_exposure", {
    target_audience_scope: decision.normalizedAudienceScope,
    target_budget_version: decision.candidateBudgetVersion || BACKGROUND_CANDIDATE_BUDGET_VERSION,
    target_candidate_profile_id: candidateProfileId,
    target_cohort_scope_id: cohortScopeId,
    target_purpose_code: purposeBinding.purposeCode,
    target_purpose_policy_version: purposeBinding.purposePolicyVersion,
    target_surface_limit: decision.budgetConfig.surfaceLimit,
    target_window_days: decision.budgetConfig.windowDays,
  });

  if (error) {
    console.error("[background-networking] Failed to reserve delegate candidate exposure", {
      candidateProfileId,
      error: error.message,
    });
    return false;
  }

  return Boolean(data?.[0]?.allowed);
}

async function processDelegates(request: Request) {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  const now = new Date();
  const { data: delegates, error: delegateError } = await supabase
    .from("personal_delegates")
    .select("*")
    .eq("status", "active")
    .order("last_run_at", { ascending: true, nullsFirst: true })
    .limit(100);

  if (delegateError) {
    return NextResponse.json({ error: delegateError.message }, { status: 500 });
  }

  const dueDelegates = ((delegates ?? []) as PersonalDelegateRow[]).filter((delegate) =>
    isDue(delegate, now),
  );
  const delegateProfileIds = [...new Set(dueDelegates.map((delegate) => delegate.profile_id))];

  const [
    { data: strategies, error: strategiesError },
    { data: profiles, error: profilesError },
    { data: syntheses, error: synthesesError },
    { data: previews, error: previewsError },
    { data: previewSyntheses, error: previewSynthesesError },
    { data: candidateProfiles, error: candidateProfilesError },
    { data: privacyGrants, error: privacyGrantsError },
    { data: existingInvites, error: existingInvitesError },
    { data: introductionPlans, error: introductionPlansError },
    { data: introductionTasks, error: introductionTasksError },
    { data: privacyAccessRequests, error: privacyAccessRequestsError },
  ] = await Promise.all([
    delegateProfileIds.length
      ? supabase.from("helper_strategies").select("*").in("profile_id", delegateProfileIds).eq("status", "active")
      : Promise.resolve({ data: [] as HelperStrategyRow[], error: null }),
    delegateProfileIds.length
      ? supabase.from("wish_profiles").select("*").in("profile_id", delegateProfileIds)
      : Promise.resolve({ data: [] as WishProfileRow[], error: null }),
    delegateProfileIds.length
      ? supabase.from("profile_syntheses").select("*").in("profile_id", delegateProfileIds)
      : Promise.resolve({ data: [] as ProfileSynthesisRow[], error: null }),
    supabase.from("wish_profile_previews").select("*").eq("background_search_enabled", true).limit(500),
    supabase.from("profile_syntheses").select("*").limit(1000),
    supabase.from("wish_profiles").select("*").limit(1000),
    delegateProfileIds.length
      ? supabase.from("privacy_grants").select("*").in("profile_id", delegateProfileIds)
      : Promise.resolve({ data: [] as PrivacyGrantRow[], error: null }),
    delegateProfileIds.length
      ? supabase
          .from("network_invites")
          .select("*")
          .in("profile_id", delegateProfileIds)
          .eq("status", "draft")
      : Promise.resolve({ data: [] as NetworkInviteRow[], error: null }),
    delegateProfileIds.length
      ? supabase
          .from("match_introduction_plans")
          .select("*")
          .in("profile_id", delegateProfileIds)
      : Promise.resolve({ data: [] as MatchIntroductionPlanRow[], error: null }),
    delegateProfileIds.length
      ? supabase
          .from("match_introduction_tasks")
          .select("*")
          .in("profile_id", delegateProfileIds)
      : Promise.resolve({ data: [] as MatchIntroductionTaskRow[], error: null }),
    delegateProfileIds.length
      ? supabase
          .from("privacy_access_requests")
          .select("*")
          .in("owner_profile_id", delegateProfileIds)
          .eq("status", "pending")
      : Promise.resolve({ data: [] as PrivacyAccessRequestRow[], error: null }),
  ]);

  if (
    strategiesError ||
    profilesError ||
    synthesesError ||
    previewsError ||
    previewSynthesesError ||
    candidateProfilesError ||
    privacyGrantsError ||
    existingInvitesError ||
    introductionPlansError ||
    introductionTasksError ||
    privacyAccessRequestsError
  ) {
    return NextResponse.json(
      {
        error:
          strategiesError?.message ??
          profilesError?.message ??
          synthesesError?.message ??
          previewsError?.message ??
          previewSynthesesError?.message ??
          candidateProfilesError?.message ??
          privacyGrantsError?.message ??
          existingInvitesError?.message ??
          introductionPlansError?.message ??
          introductionTasksError?.message ??
          privacyAccessRequestsError?.message,
      },
      { status: 500 },
    );
  }

  const strategyRows = (strategies ?? []) as HelperStrategyRow[];
  const profileById = new Map(
    ((profiles ?? []) as WishProfileRow[]).map((profile) => [
      profile.profile_id,
      overlayBackgroundRecordSensitiveText(profile, WISH_PROFILE_SENSITIVE_TEXT_FIELDS),
    ]),
  );
  const synthesisById = new Map(
    ((syntheses ?? []) as ProfileSynthesisRow[]).map((synthesis) => [
      synthesis.profile_id,
      overlayBackgroundRecordSensitiveText(synthesis, PROFILE_SYNTHESIS_SENSITIVE_TEXT_FIELDS),
    ]),
  );
  const previewSynthesisById = new Map(
    ((previewSyntheses ?? []) as ProfileSynthesisRow[]).map((synthesis) => [
      synthesis.profile_id,
      overlayBackgroundRecordSensitiveText(synthesis, PROFILE_SYNTHESIS_SENSITIVE_TEXT_FIELDS),
    ]),
  );
  const candidateProfileById = new Map(
    ((candidateProfiles ?? []) as WishProfileRow[]).map((profile) => [profile.profile_id, profile]),
  );
  const previewRows = (previews ?? []) as WishProfilePreviewRow[];
  const privacyGrantsByProfileId = new Map<string, PrivacyGrantRow[]>();

  for (const grant of (privacyGrants ?? []) as PrivacyGrantRow[]) {
    const bucket = privacyGrantsByProfileId.get(grant.profile_id) ?? [];
    bucket.push(grant);
    privacyGrantsByProfileId.set(grant.profile_id, bucket);
  }

  const existingInviteKeys = new Set(
    ((existingInvites ?? []) as NetworkInviteRow[]).map((invite) =>
      [invite.profile_id, invite.target_kind, invite.target_label].join(":"),
    ),
  );
  const introductionPlansByProfileId = new Map<string, MatchIntroductionPlanRow[]>();
  const introductionTasksByPlanId = new Map<string, MatchIntroductionTaskRow[]>();
  const pendingPrivacyRequestsByOwnerId = new Map<string, PrivacyAccessRequestRow[]>();
  const strategiesByProfileId = new Map<string, HelperStrategyRow[]>();

  for (const strategy of strategyRows) {
    const bucket = strategiesByProfileId.get(strategy.profile_id) ?? [];
    bucket.push(strategy);
    strategiesByProfileId.set(strategy.profile_id, bucket);
  }

  for (const plan of (introductionPlans ?? []) as MatchIntroductionPlanRow[]) {
    const bucket = introductionPlansByProfileId.get(plan.profile_id) ?? [];
    bucket.push(plan);
    introductionPlansByProfileId.set(plan.profile_id, bucket);
  }

  for (const task of (introductionTasks ?? []) as MatchIntroductionTaskRow[]) {
    const bucket = introductionTasksByPlanId.get(task.plan_id) ?? [];
    bucket.push(task);
    introductionTasksByPlanId.set(task.plan_id, bucket);
  }

  for (const request of (privacyAccessRequests ?? []) as PrivacyAccessRequestRow[]) {
    const bucket = pendingPrivacyRequestsByOwnerId.get(request.owner_profile_id) ?? [];
    bucket.push(request);
    pendingPrivacyRequestsByOwnerId.set(request.owner_profile_id, bucket);
  }

  let delegatesProcessed = 0;
  let helperRunsCreated = 0;
  let riskSignalsCreated = 0;
  let networkInvitesCreated = 0;
  let notificationsCreated = 0;

  for (const delegate of dueDelegates) {
    const profile = profileById.get(delegate.profile_id);
    const synthesis = synthesisById.get(delegate.profile_id) ?? null;
    const strategyGroup = (strategiesByProfileId.get(delegate.profile_id) ?? []).sort(
      (left, right) => left.priority - right.priority,
    );
    const viewerSignals = getDeterministicSignalsFromSynthesis(synthesis);

    if (!strategyGroup.length) {
      const { error: signalError } = await supabase.from("risk_signals").insert(
        buildPrivacySafeRiskSignalInsert({
          profile_id: delegate.profile_id,
          signal_type: "no_helper_strategy",
          severity: "low",
          summary:
            "The delegate is active, but no active helper strategy exists. Add at least one strategy before expecting background coverage.",
          metadata: {
            delegateMode: delegate.operating_mode,
            searchScope: delegate.search_scope,
          },
        }),
      );

      if (!signalError) {
        riskSignalsCreated += 1;
      }
    }

    if (!profile || !synthesis || !viewerSignals) {
      const { error: signalError } = await supabase.from("risk_signals").insert(
        buildPrivacySafeRiskSignalInsert({
          profile_id: delegate.profile_id,
          signal_type: "missing_profile_synthesis",
          severity: "low",
          summary:
            "The delegate scan could not find a usable deterministic profile synthesis. Refresh the profile synthesis before relying on helper runs.",
          metadata: {
            hasProfile: Boolean(profile),
            hasSynthesis: Boolean(viewerSignals),
          },
        }),
      );

      if (!signalError) {
        riskSignalsCreated += 1;
      }

      await supabase
        .from("personal_delegates")
        .update({ last_run_at: now.toISOString() })
        .eq("profile_id", delegate.profile_id);
      delegatesProcessed += 1;
      continue;
    }

    const viewerSynthesis = synthesis;

    for (const strategy of strategyGroup) {
      const purposeBinding: BackgroundPurposeBinding = {
        purposeCode: strategy.purpose_code,
        purposePolicyVersion: strategy.purpose_policy_version,
      };
      const cohortScopeId = strategy.cohort_scope_id.trim();

      if (
        !evaluateBackgroundDelegatePurposeAuthorization({
          allowedPurposeBindings: delegate.allowed_purpose_bindings,
          purposeBinding,
        })
      ) {
        const { error: signalError } = await supabase.from("risk_signals").insert(
          buildPrivacySafeRiskSignalInsert({
            profile_id: delegate.profile_id,
            signal_type: "delegate_purpose_not_authorized",
            severity: "medium",
            summary:
              "A helper strategy was skipped because its purpose is not authorized by the delegate mandate.",
            metadata: {
              strategyId: strategy.id,
            },
          }),
        );

        if (!signalError) {
          riskSignalsCreated += 1;
        }

        await supabase.from("helper_runs").insert({
          strategy_id: strategy.id,
          profile_id: delegate.profile_id,
          status: "failed",
          candidates_scanned: 0,
          suggestions_created: 0,
          purpose_code: purposeBinding.purposeCode,
          purpose_policy_version: purposeBinding.purposePolicyVersion,
          notes: "Helper strategy purpose is not authorized by the active delegate mandate.",
          completed_at: now.toISOString(),
        });

        continue;
      }

      const config = strategy.strategy_config ?? {};
      const focusCauses = toStringArray(config.focusCauses);
      const requiredTerms = toStringArray(config.requiredTerms);
      const preferredRegions = toStringArray(config.preferredRegions);
      const maxMissingFields = toNumber(config.maxMissingFields, 9);
      const preferExistingSources = toBoolean(config.preferExistingSources);
      const requireCollective = toBoolean(config.requireCollective);
      const requireCollectiveApproval = toBoolean(config.requireCollectiveApproval);
      const requirePayment = toBoolean(config.requirePayment);
      const requirePledges = toBoolean(config.requirePledges);
      const requireVerification = toBoolean(config.requireVerification);
      const respectStrictPrivacy = toBoolean(config.respectStrictPrivacy);

      if (strategy.helper_kind === "risk_filter") {
        const createdSignals: string[] = [];
        const activePrivacyGrants = privacyGrantsByProfileId.get(delegate.profile_id) ?? [];
        const profileIntroductionPlans = introductionPlansByProfileId.get(delegate.profile_id) ?? [];
        const pendingAccessRequests = pendingPrivacyRequestsByOwnerId.get(delegate.profile_id) ?? [];

        if (viewerSignals.confidenceScore < 70) {
          const { error } = await supabase.from("risk_signals").insert(
            buildPrivacySafeRiskSignalInsert({
              profile_id: delegate.profile_id,
              signal_type: "delegate_low_confidence",
              severity: "low",
              summary:
                "This delegate is running on a low-confidence deterministic synthesis. Answer clarification questions before escalating a match.",
              metadata: {
                confidenceScore: viewerSignals.confidenceScore,
                missingFieldCount: viewerSignals.missingFields.length,
                strategyId: strategy.id,
              },
            }),
          );

          if (!error) {
            riskSignalsCreated += 1;
            createdSignals.push("low-confidence synthesis");
          }
        }

        if (profile.openness_to_payment && !viewerSignals.constraintFlags.includes("verification")) {
          const { error } = await supabase.from("risk_signals").insert(
            buildPrivacySafeRiskSignalInsert({
              profile_id: delegate.profile_id,
              signal_type: "payment_without_verification",
              severity: "medium",
              summary:
                "Payment-mediated trades are enabled, but verification preferences do not yet mention evidence, receipts, or attestations.",
              metadata: {
                strategyId: strategy.id,
              },
            }),
          );

          if (!error) {
            riskSignalsCreated += 1;
            createdSignals.push("payment without verification");
          }
        }

        if (profile.background_search_enabled && !activePrivacyGrants.length) {
          const { error } = await supabase.from("risk_signals").insert(
            buildPrivacySafeRiskSignalInsert({
              profile_id: delegate.profile_id,
              signal_type: "missing_privacy_grants",
              severity: "low",
              summary:
                "Background search is enabled, but no field-level privacy grants have been drafted yet.",
              metadata: {
                strategyId: strategy.id,
              },
            }),
          );

          if (!error) {
            riskSignalsCreated += 1;
            createdSignals.push("missing privacy grants");
          }
        }

        const stalledPlan = profileIntroductionPlans.find((plan) => {
          const ageMs = now.getTime() - new Date(plan.updated_at).getTime();
          const openTasks = (introductionTasksByPlanId.get(plan.id) ?? []).filter(
            (task) => task.status === "pending" || task.status === "in_progress",
          );

          return ageMs >= 10 * 24 * 60 * 60 * 1000 && openTasks.length >= 3;
        });

        if (stalledPlan) {
          const { error } = await supabase.from("risk_signals").insert(
            buildPrivacySafeRiskSignalInsert({
              profile_id: delegate.profile_id,
              match_id: stalledPlan.match_id,
              signal_type: "stalled_introduction_plan",
              severity: "medium",
              summary:
                "A consented introduction plan has been sitting open without enough completed checklist steps.",
              metadata: {
                planId: stalledPlan.id,
                strategyId: strategy.id,
              },
            }),
          );

          if (!error) {
            riskSignalsCreated += 1;
            createdSignals.push("stalled introduction plan");
          }
        }

        const stalePrivacyRequest = pendingAccessRequests.find((request) => {
          const ageMs = now.getTime() - new Date(request.created_at).getTime();
          return ageMs >= 7 * 24 * 60 * 60 * 1000;
        });

        if (stalePrivacyRequest) {
          const { error } = await supabase.from("risk_signals").insert(
            buildPrivacySafeRiskSignalInsert({
              profile_id: delegate.profile_id,
              match_id: stalePrivacyRequest.match_id,
              signal_type: "stale_privacy_access_request",
              severity: "low",
              summary:
                "A pending privacy access request has not been answered for at least a week.",
              metadata: {
                requestId: stalePrivacyRequest.id,
                strategyId: strategy.id,
              },
            }),
          );

          if (!error) {
            riskSignalsCreated += 1;
            createdSignals.push("stale privacy request");
          }
        }

        const { error } = await supabase.from("helper_runs").insert({
          strategy_id: strategy.id,
          profile_id: delegate.profile_id,
          status: "completed",
          candidates_scanned: 0,
          suggestions_created: createdSignals.length,
          purpose_code: purposeBinding.purposeCode,
          purpose_policy_version: purposeBinding.purposePolicyVersion,
          notes: createdSignals.length
            ? `Opened review prompts for ${createdSignals.join(", ")}.`
            : "Risk filter found no new deterministic review prompts.",
          completed_at: now.toISOString(),
        });

        if (!error) {
          helperRunsCreated += 1;
        }

        continue;
      }

      if (strategy.helper_kind === "network_expansion") {
        const targetCause =
          focusCauses[0] ?? viewerSynthesis.cause_priorities[0] ?? "Priority cause";
        const desiredCapability =
          requiredTerms[0] ??
          viewerSynthesis.capability_tags[0] ??
          viewerSynthesis.missing_fields[0] ??
          "credible counterparty";
        const targetKind = requireCollective ? "collective" : "community";
        const targetLabel = `${targetCause} outreach`;
        const inviteKey = [delegate.profile_id, targetKind, targetLabel].join(":");
        let created = false;

        if (!existingInviteKeys.has(inviteKey)) {
          const { error } = await supabase.from("network_invites").insert({
            profile_id: delegate.profile_id,
            target_kind: targetKind,
            target_label: targetLabel,
            target_context: `Priority area: ${targetCause}`,
            desired_capability: desiredCapability,
            suggested_message: `I’m exploring a bounded moral trade or coordination opportunity around ${targetCause}. If this is relevant, I’d like to compare concrete asks, verification expectations, and next steps.`,
            priority: strategy.priority,
            reason:
              "Delegate network-expansion helper drafted a proactive outreach target because background networking benefits from bringing more counterparties into view early.",
            status: "draft",
          });

          if (!error) {
            networkInvitesCreated += 1;
            created = true;
            existingInviteKeys.add(inviteKey);
          }
        }

        const { error } = await supabase.from("helper_runs").insert({
          strategy_id: strategy.id,
          profile_id: delegate.profile_id,
          status: "completed",
          candidates_scanned: 0,
          suggestions_created: created ? 1 : 0,
          purpose_code: purposeBinding.purposeCode,
          purpose_policy_version: purposeBinding.purposePolicyVersion,
          notes: created
            ? `Drafted outreach target "${targetLabel}" for ${desiredCapability}.`
            : `An outreach draft already exists for "${targetLabel}".`,
          completed_at: now.toISOString(),
        });

        if (!error) {
          helperRunsCreated += 1;
        }

        continue;
      }

      const budgetReservation = await reserveBackgroundQueryBudget({
        metadata: {
          delegateId: delegate.profile_id,
          strategyId: strategy.id,
          strategyKind: strategy.helper_kind,
        },
        profileId: delegate.profile_id,
        queryFingerprint: getBackgroundQueryFingerprint({
          delegateId: delegate.profile_id,
          focusCauses,
          helperKind: strategy.helper_kind,
          requiredTerms,
          strategyId: strategy.id,
        }),
        scope: "delegate_scan",
        supabase,
      });

      if (budgetReservation.limited) {
        await recordBackgroundQueryRiskSignal({
          eventId: budgetReservation.eventId,
          metadata: {
            limit: budgetReservation.limit,
            scope: "delegate_scan",
            strategyId: strategy.id,
            used: budgetReservation.used,
          },
          profileId: delegate.profile_id,
          signalType: "background_query_budget_pressure",
          summary:
            "A delegate helper scan was skipped because this profile reached its daily background query budget.",
          supabase,
        });
        await supabase.from("helper_runs").insert({
          strategy_id: strategy.id,
          profile_id: delegate.profile_id,
          status: "failed",
          candidates_scanned: 0,
          suggestions_created: 0,
          purpose_code: purposeBinding.purposeCode,
          purpose_policy_version: purposeBinding.purposePolicyVersion,
          notes: "Daily background query budget reached before this helper scan.",
          completed_at: now.toISOString(),
        });
        continue;
      }

      let candidatesScanned = 0;
      const compatibleMatches: Array<{
        candidateExposureDecision: BackgroundCandidateExposureDecision;
        evaluation: ReturnType<typeof evaluateDeterministicMatch>;
        preview: WishProfilePreviewRow;
        summary: string;
      }> = [];

      for (const preview of previewRows) {
        if (preview.profile_id === delegate.profile_id) {
          continue;
        }

        candidatesScanned += 1;
        const candidateExposureDecision = evaluateCandidateExposureForBackgroundRun({
          audienceScope: strategy.audience_scope,
          candidateProfile: candidateProfileById.get(preview.profile_id) ?? null,
          cohortScopeId,
          purposeBinding,
          surfaces: ["broad_profile"],
        });

        if (!candidateExposureDecision.allowed) {
          continue;
        }

        const evaluation = evaluateDeterministicMatch({
          counterparty: preview,
          counterpartySignals: getDeterministicSignalsFromSynthesis(
            previewSynthesisById.get(preview.profile_id) ?? null,
          ),
          runLabel: strategy.label,
          viewer: {
            askTerms: viewerSignals.askTerms,
            brokeragePreference: profile.brokerage_preference,
            capabilityTags: viewerSignals.capabilityTags,
            causes: profile.causes,
            collectiveName: profile.collective_name,
            locationCity: profile.location_city,
            locationRegion: profile.location_region,
            offerTerms: viewerSignals.offerTerms,
            offerText: profile.capabilities,
            openToPayment: profile.openness_to_payment,
            openToPledges: profile.openness_to_pledges,
            participantKind: profile.participant_kind,
            privacyStage: profile.privacy_stage,
            publicPreview: profile.public_preview,
            signals: viewerSignals,
            sourceCount: viewerSignals.sourceCount,
            wishText: viewerSynthesis.hopes,
            askText: viewerSynthesis.intent,
          },
        });

        if (evaluation.score < strategy.min_score) {
          continue;
        }

        if (focusCauses.length && !evaluation.sharedCauses.some((cause) => includesNormalized(focusCauses, cause))) {
          continue;
        }

        if (preferredRegions.length) {
          const locationMatches = preferredRegions.some((region) =>
            includesNormalized(
              [preview.location_city ?? "", preview.location_region ?? ""].filter(Boolean),
              region,
            ),
          );

          if (!locationMatches) {
            continue;
          }
        }

        if (requiredTerms.length) {
          const candidateTerms = [...evaluation.sharedTokens, ...evaluation.compatibilityTags];
          const hasRequiredTerm = requiredTerms.some((term) =>
            candidateTerms.some((candidate) => candidate.includes(normalizeBackgroundToken(term))),
          );

          if (!hasRequiredTerm) {
            continue;
          }
        }

        if (requireCollective && preview.participant_kind === "individual") {
          continue;
        }

        if (respectStrictPrivacy && preview.privacy_stage === "strict") {
          continue;
        }

        if (requirePayment && !preview.openness_to_payment) {
          continue;
        }

        if (requirePledges && !preview.openness_to_pledges) {
          continue;
        }

        if (
          requireVerification &&
          !evaluation.compatibilityTags.includes("verification_ready")
        ) {
          continue;
        }

        if (
          preferExistingSources &&
          !evaluation.compatibilityTags.includes("source_supported")
        ) {
          continue;
        }

        if (
          requireCollectiveApproval &&
          preview.participant_kind !== "individual" &&
          !preview.collective_name
        ) {
          continue;
        }

        if ((previewSynthesisById.get(preview.profile_id)?.missing_fields?.length ?? 0) > maxMissingFields) {
          continue;
        }

        if (
          strategy.helper_kind === "cause_overlap" &&
          !evaluation.compatibilityTags.includes("cause_overlap")
        ) {
          continue;
        }

        if (
          strategy.helper_kind === "payment_compatibility" &&
          !evaluation.compatibilityTags.includes("payment_compatible")
        ) {
          continue;
        }

        if (
          strategy.helper_kind === "geographic" &&
          !evaluation.compatibilityTags.includes("geographic_overlap")
        ) {
          continue;
        }

        compatibleMatches.push({
          candidateExposureDecision,
          evaluation,
          preview,
          summary: buildPrivacySafeMatchDigestLine({
            publicPreview: preview.public_preview,
            score: evaluation.score,
          }),
        });
      }

      const selectedMatches = compatibleMatches.slice(0, delegate.max_weekly_suggestions);
      const summary = selectedMatches.map((match) => match.summary);
      let matchSuggestionsCreated = 0;
      let matchSuggestionsRefreshed = 0;
      const explanationSnapshots: ReturnType<typeof buildMatchExplanationSnapshot>[] = [];
      const opportunityBriefs: Database["public"]["Tables"]["background_opportunity_briefs"]["Insert"][] = [];

      for (const { candidateExposureDecision, evaluation, preview } of selectedMatches) {
        const { profileAId, profileBId, viewerIsProfileA } = getOrderedProfilePair(
          delegate.profile_id,
          preview.profile_id,
        );
        const dedupeKey = [profileAId, profileBId, `delegate:${strategy.id}`].join(":");
        const { data: existingMatch } = await supabase
          .from("match_suggestions")
          .select("id, status")
          .eq("dedupe_key", dedupeKey)
          .maybeSingle();

        if (existingMatch?.status === "dismissed" || existingMatch?.status === "archived") {
          continue;
        }

        const exposureReserved = await reserveCandidateExposureSurface({
          candidateProfileId: preview.profile_id,
          cohortScopeId,
          decision: candidateExposureDecision,
          purposeBinding,
          supabase,
        });

        if (!exposureReserved) {
          continue;
        }

        const reasonForDelegateOwner = `${evaluation.viewerReason} This came from your ${strategy.label} helper.`;
        const reasonForCounterparty =
          "A possible counterparty matched one of your broad registry previews through a helper scan. No exact wishes, helper labels, private query text, or contact details were disclosed.";
        const matchBasis = [
          ...evaluation.compatibilityTags.map((tag) => `Compatibility tag: ${tag}`),
          "Delegate helper hit",
          `Generated by deterministic scan: delegate:${strategy.helper_kind}`,
        ];
        const matchPayload: MatchSuggestionInsert = {
          background_owner_profile_id: delegate.profile_id,
          dedupe_key: dedupeKey,
          generated_by: "delegate-cron",
          last_scored_at: now.toISOString(),
          match_basis: matchBasis,
          profile_a_entry_id: null,
          profile_a_id: profileAId,
          profile_b_entry_id: null,
          profile_b_id: profileBId,
          reason_for_a: viewerIsProfileA ? reasonForDelegateOwner : reasonForCounterparty,
          reason_for_b: viewerIsProfileA ? reasonForCounterparty : reasonForDelegateOwner,
          risk_notes: evaluation.riskNotes,
          score: evaluation.score,
          shared_causes: evaluation.sharedCauses,
          status: existingMatch?.status ?? "suggested",
          suggested_first_step: evaluation.suggestedFirstStep,
        };
        const { data: upsertedMatch, error: upsertError } = await supabase
          .from("match_suggestions")
          .upsert(matchPayload, { onConflict: "dedupe_key" })
          .select("id, status")
          .maybeSingle();

        if (upsertError || !upsertedMatch) {
          continue;
        }

        if (existingMatch) {
          matchSuggestionsRefreshed += 1;
        } else {
          matchSuggestionsCreated += 1;
          const notificationCopy = buildBackgroundOpportunityNotificationCopy();
          const notificationResult = await insertWishNotificationsWithSafeEmail({
            notifications: {
              profile_id: delegate.profile_id,
              kind: "match",
              title: notificationCopy.title,
              body: notificationCopy.body,
              match_id: upsertedMatch.id,
            },
            supabase,
          });

          if (notificationResult.notificationError || notificationResult.emailError) {
            console.error("[background-networking] Failed to notify delegate match participants", {
              emailError: notificationResult.emailError?.message ?? null,
              matchDedupeKey: dedupeKey,
              notificationError: notificationResult.notificationError?.message ?? null,
            });
          }
        }

        explanationSnapshots.push(
          buildMatchExplanationSnapshot({
            canRevealIdentity: false,
            counterpartyConsented: false,
            generatedBy: "delegate-cron",
            matchBasis,
            matchId: upsertedMatch.id,
            profileId: delegate.profile_id,
            purposeCode: purposeBinding.purposeCode,
            purposePolicyVersion: purposeBinding.purposePolicyVersion,
            riskNotes: evaluation.riskNotes,
            score: evaluation.score,
            sharedCauses: evaluation.sharedCauses,
            sourceRunId: strategy.id,
            sourceRunKind: "delegate_scan",
            status: upsertedMatch.status,
            suggestedFirstStep: evaluation.suggestedFirstStep,
            viewerConsented: false,
          }),
        );
        opportunityBriefs.push(
          buildOpportunityBriefRow({
            canRevealIdentity: false,
            candidateProfileId: preview.profile_id,
            counterpartyConsented: false,
            generatedBy: "delegate-cron",
            matchBasis,
            matchId: upsertedMatch.id,
            profileId: delegate.profile_id,
            purposeCode: purposeBinding.purposeCode,
            purposePolicyVersion: purposeBinding.purposePolicyVersion,
            riskNotes: evaluation.riskNotes,
            score: evaluation.score,
            sharedCauses: evaluation.sharedCauses,
            status: upsertedMatch.status,
            suggestedFirstStep: evaluation.suggestedFirstStep,
            title: "Opportunity brief: helper lead",
            viewerConsented: false,
          }),
        );

        await supabase.from("match_audit_events").insert({
          match_id: upsertedMatch.id,
          actor_profile_id: delegate.profile_id,
          event_type: existingMatch ? "match_refreshed" : "match_created",
          summary: buildPrivacySafeMatchAuditSummary({
            score: evaluation.score,
            sourceLabel: "Delegate helper scan",
          }),
          metadata: buildPrivacySafeMatchAuditMetadata({
            compatibilityTags: evaluation.compatibilityTags,
            runReason: "delegate-cron",
            sharedCauseCount: evaluation.sharedCauses.length,
            sharedTokenCount: evaluation.sharedTokens.length,
          }),
        });
      }

      const opportunityBriefError = await upsertBackgroundOpportunityBriefs({
        briefs: opportunityBriefs,
        supabase,
      });

      if (opportunityBriefError) {
        console.error("[background-networking] Failed to save delegate opportunity briefs", {
          error: opportunityBriefError.message,
          strategyId: strategy.id,
        });
      }

      const snapshotError = await insertMatchExplanationSnapshots({
        snapshots: explanationSnapshots,
        supabase,
      });

      if (snapshotError) {
        console.error("[background-networking] Failed to save delegate explanation snapshots", {
          error: snapshotError.message,
          strategyId: strategy.id,
        });
      }

      const budgetCompletionError = await completeBackgroundQueryEvent({
        candidateCount: candidatesScanned,
        eventId: budgetReservation.eventId,
        metadata: {
          matchesCreated: matchSuggestionsCreated,
          matchesRefreshed: matchSuggestionsRefreshed,
          strategyId: strategy.id,
        },
        resultCount: matchSuggestionsCreated + matchSuggestionsRefreshed,
        supabase,
      });

      if (budgetCompletionError) {
        console.error("[background-networking] Failed to complete delegate budget event", {
          error: budgetCompletionError.message,
          strategyId: strategy.id,
        });
      }

      if (summary.length) {
        const notificationResult = await insertWishNotificationsWithSafeEmail({
          notifications: {
            profile_id: delegate.profile_id,
            kind: "system",
            title: `Helper scan: ${strategy.label}`,
            body: `The ${strategy.helper_kind} helper found ${compatibleMatches.length} promising broad previews. Top examples: ${summary.join(" | ")}`,
          },
          supabase,
        });

        if (notificationResult.notificationError || notificationResult.emailError) {
          console.error("[background-networking] Failed to notify delegate helper scan", {
            delegateProfileId: delegate.profile_id,
            emailError: notificationResult.emailError?.message ?? null,
            notificationError: notificationResult.notificationError?.message ?? null,
            strategyId: strategy.id,
          });
        }

        if (!notificationResult.notificationError) {
          notificationsCreated += 1;
        }
      }

      const { error } = await supabase.from("helper_runs").insert({
        strategy_id: strategy.id,
        profile_id: delegate.profile_id,
        status: "completed",
        candidates_scanned: candidatesScanned,
        suggestions_created: matchSuggestionsCreated + matchSuggestionsRefreshed,
        purpose_code: purposeBinding.purposeCode,
        purpose_policy_version: purposeBinding.purposePolicyVersion,
        notes: summary.length
          ? `Top deterministic hits: ${summary.join(" | ")}`
          : "No candidates cleared the deterministic threshold for this helper.",
        completed_at: now.toISOString(),
      });

      if (!error) {
        helperRunsCreated += 1;
      }

      await supabase
        .from("helper_strategies")
        .update({ last_run_at: now.toISOString() })
        .eq("id", strategy.id);
    }

    await supabase
      .from("personal_delegates")
      .update({ last_run_at: now.toISOString() })
      .eq("profile_id", delegate.profile_id);
    delegatesProcessed += 1;
  }

  return NextResponse.json({
    delegatesProcessed,
    helperRunsCreated,
    networkInvitesCreated,
    notificationsCreated,
    riskSignalsCreated,
  });
}

export async function GET(request: Request) {
  return processDelegates(request);
}

export async function POST(request: Request) {
  return processDelegates(request);
}
