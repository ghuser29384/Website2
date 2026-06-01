import { NextResponse } from "next/server";

import {
  buildMoralTradeApiRateLimitBlocker,
  takeMoralTradeApiRateLimitSlot,
} from "@/lib/moral-trade/api-rate-limit";
import {
  evaluateMoralTradeRedactedProfileMatch,
  getMoralTradeMatchSignalContract,
  validateMoralTradeMatchSignal,
  validateMoralTradeMatchSignalContract,
  type MoralTradeLocationSensitivity,
  type MoralTradeMatchPrivacyStage,
  type MoralTradeMatchTradeMode,
  type MoralTradeRedactedProfile,
} from "@/lib/moral-trade/match-signal";

export const dynamic = "force-dynamic";

const MAX_TEXT_FIELD_LENGTH = 400;
const MAX_LIST_ITEMS = 24;

const TRADE_MODES = new Set<MoralTradeMatchTradeMode>([
  "pledge_swap",
  "donation_offset",
  "paid_action",
  "public_good_commitment",
]);

const LOCATION_SENSITIVITY = new Set<MoralTradeLocationSensitivity>([
  "none",
  "region",
  "city",
]);

const PRIVACY_STAGES = new Set<MoralTradeMatchPrivacyStage>([
  "broad_preview",
  "detail_request",
  "mutual_consent",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeStringField(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim().slice(0, MAX_TEXT_FIELD_LENGTH);
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim().slice(0, MAX_TEXT_FIELD_LENGTH))
    .filter(Boolean)
    .slice(0, MAX_LIST_ITEMS);
}

function normalizeTradeModes(value: unknown): MoralTradeMatchTradeMode[] {
  return normalizeStringList(value).filter((entry): entry is MoralTradeMatchTradeMode =>
    TRADE_MODES.has(entry as MoralTradeMatchTradeMode),
  );
}

function normalizeLocationSensitivity(value: unknown): MoralTradeLocationSensitivity {
  const normalized = normalizeStringField(value);

  return LOCATION_SENSITIVITY.has(normalized as MoralTradeLocationSensitivity)
    ? (normalized as MoralTradeLocationSensitivity)
    : "none";
}

function normalizePrivacyStage(value: unknown): MoralTradeMatchPrivacyStage {
  const normalized = normalizeStringField(value);

  return PRIVACY_STAGES.has(normalized as MoralTradeMatchPrivacyStage)
    ? (normalized as MoralTradeMatchPrivacyStage)
    : "broad_preview";
}

function normalizeRedactedProfile(record: Record<string, unknown>): MoralTradeRedactedProfile {
  return {
    profileId: normalizeStringField(record.profileId),
    causeAreas: normalizeStringList(record.causeAreas),
    offeredCauseAreas: normalizeStringList(record.offeredCauseAreas),
    requestedCauseAreas: normalizeStringList(record.requestedCauseAreas),
    tradeModes: normalizeTradeModes(record.tradeModes),
    verificationPreferences: normalizeStringList(record.verificationPreferences),
    locationSensitivity: normalizeLocationSensitivity(record.locationSensitivity),
    locationRegion: normalizeStringField(record.locationRegion) || null,
    locationCity: normalizeStringField(record.locationCity) || null,
    privacyStage: normalizePrivacyStage(record.privacyStage),
    privacyConstraints: normalizeStringList(record.privacyConstraints),
    statedExclusions: normalizeStringList(record.statedExclusions),
  };
}

function getProfilePair(body: Record<string, unknown>) {
  const candidate = isRecord(body.profilePair) ? body.profilePair : body;

  if (!isRecord(candidate.left) || !isRecord(candidate.right)) {
    return null;
  }

  return {
    left: normalizeRedactedProfile(candidate.left),
    right: normalizeRedactedProfile(candidate.right),
  };
}

function getInputBlockers(input: ReturnType<typeof getProfilePair>) {
  if (!input) {
    return ["profilePair.left/right: redacted profile pair is required"];
  }

  const blockers: string[] = [];

  for (const side of ["left", "right"] as const) {
    const profile = input[side];

    if (!profile.profileId) {
      blockers.push(`${side}.profileId: profile id is required`);
    }

    if (!profile.causeAreas.length) {
      blockers.push(`${side}.causeAreas: at least one broad cause area is required`);
    }

    if (!profile.tradeModes.length) {
      blockers.push(`${side}.tradeModes: at least one approved trade mode is required`);
    }

    if (!profile.verificationPreferences.length) {
      blockers.push(`${side}.verificationPreferences: at least one verification preference is required`);
    }
  }

  return blockers;
}

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
  headers: Record<string, string> = {},
) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      ...headers,
    },
  });
}

export async function POST(request: Request) {
  const rateLimit = takeMoralTradeApiRateLimitSlot(request, "match_signal_evaluate");

  if (rateLimit.limited) {
    return jsonResponse(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        error: "rate_limited",
        rateLimit: {
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          resetAt: new Date(rateLimit.resetAt).toISOString(),
          surface: rateLimit.surface,
          windowMs: rateLimit.windowMs,
        },
        fallback:
          "Rate-limited match-signal evaluation falls back to no match preview without changing state or disclosing counterparties.",
        blockers: [buildMoralTradeApiRateLimitBlocker(rateLimit.surface)],
      },
      429,
      {
        "Retry-After": String(rateLimit.retryAfterSeconds),
      },
    );
  }

  const contract = getMoralTradeMatchSignalContract();
  const contractValidation = validateMoralTradeMatchSignalContract(contract);
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        contractVersion: contract.version,
        decisioningMode: contract.decisioningMode,
        stateMutation: false,
        inputBundleUsed: ["redacted_profile_pair", "match_signal_contract", "match_signal_privacy_policy"],
        contractValidation,
        fallback:
          "Invalid JSON falls back to no match preview without changing state or disclosing counterparties.",
        blockers: ["invalid_json_body"],
      },
      400,
    );
  }

  if (!isRecord(body)) {
    return jsonResponse(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        contractVersion: contract.version,
        decisioningMode: contract.decisioningMode,
        stateMutation: false,
        inputBundleUsed: ["redacted_profile_pair", "match_signal_contract", "match_signal_privacy_policy"],
        contractValidation,
        fallback:
          "Missing request object falls back to no match preview without changing state or disclosing counterparties.",
        blockers: ["request_body: object is required"],
      },
      400,
    );
  }

  const profilePair = getProfilePair(body);
  const inputBlockers = getInputBlockers(profilePair);

  if (!profilePair || inputBlockers.length) {
    return jsonResponse(
      {
        ok: false,
        checkedAt: new Date().toISOString(),
        contractVersion: contract.version,
        decisioningMode: contract.decisioningMode,
        stateMutation: false,
        inputBundleUsed: ["redacted_profile_pair", "match_signal_contract", "match_signal_privacy_policy"],
        contractValidation,
        fallback:
          "Incomplete redacted profiles fall back to no match preview without changing state or disclosing counterparties.",
        blockers: inputBlockers,
      },
      400,
    );
  }

  const checkedAt = new Date().toISOString();
  const signal = evaluateMoralTradeRedactedProfileMatch({
    ...profilePair,
    createdAt: checkedAt,
  });
  const signalValidation = validateMoralTradeMatchSignal(signal);
  const blockers = [
    ...contractValidation.blockers,
    ...signalValidation.blockers,
  ];

  return jsonResponse(
    {
      ok: blockers.length === 0,
      checkedAt,
      contractVersion: contract.version,
      decisioningMode: contract.decisioningMode,
      stateMutation: false,
      inputBundleUsed: ["redacted_profile_pair", "match_signal_contract", "match_signal_privacy_policy"],
      profilePair,
      signal,
      signalValidation,
      contractValidation,
      blockers,
    },
    blockers.length ? 422 : 200,
  );
}
