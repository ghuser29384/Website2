import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getViewer } from "@/lib/app-data";
import {
  BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER,
  BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE,
  BACKGROUND_FIELD_ENCRYPTION_VERSION,
  decryptBackgroundSensitiveText,
  encryptBackgroundSensitiveText,
  normalizeEncryptedFieldMap,
} from "@/lib/background-field-encryption";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ROUTE_FORMATS = new Set(["direct", "threshold", "redirect", "personal", "coalition"]);
const HORIZONS = new Set(["day", "week", "month", "quarter", "year"]);
const EVIDENCE_LEVELS = new Set(["standard", "high", "connected"]);
const UNCERTAINTY_LEVELS = new Set(["conservative", "balanced", "exploratory"]);
const INTERACTION_LEVELS = new Set(["solo", "open", "invite"]);
const PRIVACY_LEVELS = new Set(["private", "public-safe", "public"]);
const PAIRWISE_CHOICES = new Set(["left", "right", "equal", "neither", "unsure"]);
const GOAL_FIELD = "route_recommendation_profiles.goal";
const CAUSE_PRIORITIES_FIELD = "route_recommendation_profiles.cause_priorities";
const OTHERWISE_BASELINE_FIELD = "route_recommendation_profiles.otherwise_baseline";

interface StoredRouteProfile {
  profile_id: string;
  goal: string;
  cause_priorities: string[];
  money_budget_cents: number;
  time_budget_minutes: number;
  action_budget_count: number;
  horizon: string;
  route_formats: string[];
  evidence_preference: string;
  uncertainty_preference: string;
  interaction_preference: string;
  privacy_preference: string;
  planned_donation_baseline: boolean | null;
  planned_donation_cents: number;
  otherwise_baseline: string;
  pairwise_answers: Record<string, unknown>;
  interview_answers: Record<string, unknown>;
  sensitive_ciphertexts: Record<string, string>;
  sensitive_encryption_version: string;
  updated_at: string;
}

function privateJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      Vary: "Cookie",
    },
  });
}

function hasSupabaseAuthCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
}

function isSameOriginMutation(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (origin && origin !== requestOrigin) return false;
  if (fetchSite && !["same-origin", "none"].includes(fetchSite)) return false;
  if (!origin && referer) {
    try {
      return new URL(referer).origin === requestOrigin;
    } catch {
      return false;
    }
  }
  return true;
}

async function requireRouteProfileViewer() {
  const cookieStore = await cookies();
  if (!hasSupabaseEnv() || !hasSupabaseAuthCookie(cookieStore)) return null;
  return getViewer();
}

function text(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

function integer(value: unknown, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, Math.round(parsed)));
}

function choice(value: unknown, values: Set<string>, fallback: string) {
  const normalized = text(value, 40);
  return values.has(normalized) ? normalized : fallback;
}

function stringList(value: unknown, maximumItems: number, maximumLength: number) {
  if (!Array.isArray(value)) return [] as string[];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const entry of value) {
    const cleaned = text(entry, maximumLength);
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length >= maximumItems) break;
  }
  return result;
}

function object(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function encryptedStringList(value: string, maximumItems: number, maximumLength: number) {
  if (!value || value === BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE) return [] as string[];
  try {
    return stringList(JSON.parse(value), maximumItems, maximumLength);
  } catch {
    return [] as string[];
  }
}

function defaultProfile(profileId: string): StoredRouteProfile {
  return {
    profile_id: profileId,
    goal: "",
    cause_priorities: [],
    money_budget_cents: 0,
    time_budget_minutes: 0,
    action_budget_count: 0,
    horizon: "month",
    route_formats: ["direct"],
    evidence_preference: "high",
    uncertainty_preference: "balanced",
    interaction_preference: "open",
    privacy_preference: "private",
    planned_donation_baseline: null,
    planned_donation_cents: 0,
    otherwise_baseline: "",
    pairwise_answers: {},
    interview_answers: {},
    sensitive_ciphertexts: {},
    sensitive_encryption_version: "",
    updated_at: "",
  };
}

function normalizeStoredProfile(value: unknown, profileId: string): StoredRouteProfile {
  const row = object(value);
  const fallback = defaultProfile(profileId);
  const ciphertexts = normalizeEncryptedFieldMap(row.sensitive_ciphertexts);
  const formats = stringList(row.route_formats, 5, 24).filter((format) =>
    ROUTE_FORMATS.has(format),
  );
  const plannedDonationBaseline = row.planned_donation_baseline === true
    ? true
    : row.planned_donation_baseline === false
      ? false
      : null;

  return {
    profile_id: profileId,
    goal: text(
      ciphertexts[GOAL_FIELD]
        ? decryptBackgroundSensitiveText(ciphertexts[GOAL_FIELD], GOAL_FIELD)
        : row.goal,
      180,
    ),
    cause_priorities: ciphertexts[CAUSE_PRIORITIES_FIELD]
      ? encryptedStringList(
          decryptBackgroundSensitiveText(
            ciphertexts[CAUSE_PRIORITIES_FIELD],
            CAUSE_PRIORITIES_FIELD,
          ),
          16,
          120,
        )
      : stringList(row.cause_priorities, 16, 120),
    money_budget_cents: integer(row.money_budget_cents, 0, 0, 100_000_000),
    time_budget_minutes: integer(row.time_budget_minutes, 0, 0, 100_000),
    action_budget_count: integer(row.action_budget_count, 0, 0, 1_000),
    horizon: choice(row.horizon, HORIZONS, fallback.horizon),
    route_formats: formats.length ? formats : fallback.route_formats,
    evidence_preference: choice(
      row.evidence_preference,
      EVIDENCE_LEVELS,
      fallback.evidence_preference,
    ),
    uncertainty_preference: choice(
      row.uncertainty_preference,
      UNCERTAINTY_LEVELS,
      fallback.uncertainty_preference,
    ),
    interaction_preference: choice(
      row.interaction_preference,
      INTERACTION_LEVELS,
      fallback.interaction_preference,
    ),
    privacy_preference: choice(
      row.privacy_preference,
      PRIVACY_LEVELS,
      fallback.privacy_preference,
    ),
    planned_donation_baseline: plannedDonationBaseline,
    planned_donation_cents: plannedDonationBaseline === true
      ? integer(row.planned_donation_cents, 0, 0, 100_000_000)
      : 0,
    otherwise_baseline: text(
      ciphertexts[OTHERWISE_BASELINE_FIELD]
        ? decryptBackgroundSensitiveText(
            ciphertexts[OTHERWISE_BASELINE_FIELD],
            OTHERWISE_BASELINE_FIELD,
          )
        : row.otherwise_baseline,
      700,
    ),
    pairwise_answers: object(row.pairwise_answers),
    interview_answers: object(row.interview_answers),
    sensitive_ciphertexts: ciphertexts,
    sensitive_encryption_version: text(row.sensitive_encryption_version, 80),
    updated_at: text(row.updated_at, 80),
  };
}

function normalizeProfileInput(value: unknown, current: StoredRouteProfile) {
  const input = object(value);
  const has = (key: string) => Object.prototype.hasOwnProperty.call(input, key);
  const goal = has("goal") ? text(input.goal, 180) : current.goal;
  const causePriorities = has("causePriorities")
    ? stringList(input.causePriorities, 16, 120)
    : current.cause_priorities;
  const formats = stringList(input.routeFormats, 5, 24).filter((format) =>
    ROUTE_FORMATS.has(format),
  );
  const plannedDonationBaseline = has("plannedDonationBaseline")
    ? typeof input.plannedDonationBaseline === "boolean"
      ? input.plannedDonationBaseline
      : null
    : current.planned_donation_baseline;

  return {
    ...current,
    goal,
    cause_priorities: has("causePriorities") ? causePriorities : current.cause_priorities,
    money_budget_cents: integer(input.moneyBudgetCents, current.money_budget_cents, 0, 100_000_000),
    time_budget_minutes: integer(
      input.timeBudgetMinutes,
      current.time_budget_minutes,
      0,
      100_000,
    ),
    action_budget_count: integer(
      input.actionBudgetCount,
      current.action_budget_count,
      0,
      1_000,
    ),
    horizon: choice(input.horizon, HORIZONS, current.horizon),
    route_formats: formats.length ? formats : current.route_formats,
    evidence_preference: choice(
      input.evidencePreference,
      EVIDENCE_LEVELS,
      current.evidence_preference,
    ),
    uncertainty_preference: choice(
      input.uncertaintyPreference,
      UNCERTAINTY_LEVELS,
      current.uncertainty_preference,
    ),
    interaction_preference: choice(
      input.interactionPreference,
      INTERACTION_LEVELS,
      current.interaction_preference,
    ),
    privacy_preference: choice(
      input.privacyPreference,
      PRIVACY_LEVELS,
      current.privacy_preference,
    ),
    planned_donation_baseline: plannedDonationBaseline,
    planned_donation_cents: plannedDonationBaseline === true
      ? integer(input.plannedDonationCents, current.planned_donation_cents, 0, 100_000_000)
      : 0,
    otherwise_baseline: has("otherwiseBaseline")
      ? text(input.otherwiseBaseline, 700)
      : current.otherwise_baseline,
  };
}

function encryptPrivateProfileText(
  profile: ReturnType<typeof normalizeProfileInput>,
  current: StoredRouteProfile,
  inputValue: unknown,
) {
  const ciphertexts = { ...current.sensitive_ciphertexts };
  const input = object(inputValue);
  const privateValues = {
    [GOAL_FIELD]: profile.goal,
    [CAUSE_PRIORITIES_FIELD]: profile.cause_priorities.length
      ? JSON.stringify(profile.cause_priorities)
      : "",
    [OTHERWISE_BASELINE_FIELD]: profile.otherwise_baseline,
  };
  const inputKeys: Record<string, string> = {
    [GOAL_FIELD]: "goal",
    [CAUSE_PRIORITIES_FIELD]: "causePriorities",
    [OTHERWISE_BASELINE_FIELD]: "otherwiseBaseline",
  };

  for (const [fieldKey, value] of Object.entries(privateValues)) {
    const wasProvided = Object.prototype.hasOwnProperty.call(input, inputKeys[fieldKey]);
    if (ciphertexts[fieldKey] && !wasProvided) continue;
    if (value === BACKGROUND_ENCRYPTED_TEXT_UNAVAILABLE) continue;
    if (value) {
      ciphertexts[fieldKey] = encryptBackgroundSensitiveText(value, fieldKey);
    } else {
      delete ciphertexts[fieldKey];
    }
  }

  return {
    ciphertexts,
    encryptionVersion: Object.keys(ciphertexts).length
      ? BACKGROUND_FIELD_ENCRYPTION_VERSION
      : "",
  };
}

async function readCurrentProfile(typedSupabase: any, profileId: string) {
  const { data, error } = await typedSupabase
    .from("route_recommendation_profiles")
    .select(
      "profile_id,goal,cause_priorities,money_budget_cents,time_budget_minutes,action_budget_count,horizon,route_formats,evidence_preference,uncertainty_preference,interaction_preference,privacy_preference,planned_donation_baseline,planned_donation_cents,otherwise_baseline,pairwise_answers,interview_answers,sensitive_ciphertexts,sensitive_encryption_version,updated_at",
    )
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) throw error;
  return normalizeStoredProfile(data, profileId);
}

async function updatePairwiseAnswers(
  typedSupabase: any,
  profileId: string,
  initial: StoredRouteProfile,
  mutate: (answers: Record<string, unknown>) => Record<string, unknown>,
) {
  let current = initial;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const pairwiseAnswers = mutate({ ...current.pairwise_answers });
    if (current.updated_at) {
      const { data, error } = await typedSupabase
        .from("route_recommendation_profiles")
        .update({ pairwise_answers: pairwiseAnswers })
        .eq("profile_id", profileId)
        .eq("updated_at", current.updated_at)
        .select("updated_at")
        .maybeSingle();
      if (error) throw error;
      if (data) return;
    } else {
      const { error } = await typedSupabase.from("route_recommendation_profiles").insert({
        profile_id: profileId,
        pairwise_answers: pairwiseAnswers,
      });
      if (!error) return;
      if (error.code !== "23505") throw error;
    }
    current = await readCurrentProfile(typedSupabase, profileId);
  }
  throw new Error("The route profile changed concurrently. Please retry.");
}

async function saveProfile(
  typedSupabase: any,
  profileId: string,
  current: StoredRouteProfile,
  profileInput: unknown,
  interviewConfirmed: boolean,
) {
  const normalized = normalizeProfileInput(profileInput, current);
  const encrypted = encryptPrivateProfileText(normalized, current, profileInput);
  const interviewAnswers = interviewConfirmed
    ? {
        confirmed: true,
        version: "guided-route-interview-v1",
        confirmedAt: new Date().toISOString(),
      }
    : current.interview_answers;
  const normalizedProfile = normalized;

  const profile = {
    profile_id: profileId,
    goal: encrypted.ciphertexts[GOAL_FIELD] ? BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER : "",
    cause_priorities: [] as string[],
    money_budget_cents: normalizedProfile.money_budget_cents,
    time_budget_minutes: normalizedProfile.time_budget_minutes,
    action_budget_count: normalizedProfile.action_budget_count,
    horizon: normalizedProfile.horizon,
    route_formats: normalizedProfile.route_formats,
    evidence_preference: normalizedProfile.evidence_preference,
    uncertainty_preference: normalizedProfile.uncertainty_preference,
    interaction_preference: normalizedProfile.interaction_preference,
    privacy_preference: normalizedProfile.privacy_preference,
    planned_donation_baseline: normalizedProfile.planned_donation_baseline,
    planned_donation_cents: normalizedProfile.planned_donation_cents,
    otherwise_baseline: encrypted.ciphertexts[OTHERWISE_BASELINE_FIELD]
      ? BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER
      : "",
    sensitive_ciphertexts: encrypted.ciphertexts,
    sensitive_encryption_version: encrypted.encryptionVersion,
    ...(interviewConfirmed ? { interview_answers: interviewAnswers } : {}),
  };

  const { error } = await typedSupabase.from("route_recommendation_profiles").upsert(
    profile,
    { onConflict: "profile_id" },
  );

  if (error) throw error;
}

export async function POST(request: Request) {
  if (!isSameOriginMutation(request)) {
    return privateJson({ error: "Cross-site route preference changes are not permitted." }, 403);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return privateJson({ error: "Route preference changes require JSON." }, 415);
  }

  const viewer = await requireRouteProfileViewer();
  if (!viewer) return privateJson({ authenticated: false }, 401);

  let body: Record<string, unknown>;
  try {
    body = object(await request.json());
  } catch {
    return privateJson({ error: "Invalid JSON payload." }, 400);
  }

  const action = text(body.action, 40);
  const profileId = viewer.authUser.id;
  const supabase = await createClient();
  const typedSupabase = supabase as any;

  let current: StoredRouteProfile;
  try {
    current = await readCurrentProfile(typedSupabase, profileId);
  } catch (error) {
    console.error("[route-profile] Failed to read private route profile", {
      message: error instanceof Error ? error.message : "unknown",
      profileId,
    });
    return privateJson({ error: "Route preferences are unavailable." }, 503);
  }

  if (action === "save_profile" || action === "save_interview") {
    try {
      const input = action === "save_interview" ? body.interview ?? body.profile : body.profile;
      await saveProfile(typedSupabase, profileId, current, input, action === "save_interview");
    } catch (error) {
      console.error("[route-profile] Failed to save private route profile", {
        message: error instanceof Error ? error.message : "unknown",
        profileId,
      });
      return privateJson(
        { error: "Private route preferences could not be saved securely." },
        503,
      );
    }

    return privateJson({ authenticated: true, saved: true, action });
  }

  if (action === "answer_comparison") {
    const answer = object(body.answer);
    const key = text(answer.key, 120);
    const leftFormat = text(answer.leftFormat, 24);
    const rightFormat = text(answer.rightFormat, 24);
    const selectedChoice = text(answer.choice, 20);
    const canonicalKey = `route-format:${leftFormat}:${rightFormat}`;
    if (
      key !== canonicalKey ||
      !ROUTE_FORMATS.has(leftFormat) ||
      !ROUTE_FORMATS.has(rightFormat) ||
      leftFormat === rightFormat ||
      !PAIRWISE_CHOICES.has(selectedChoice)
    ) {
      return privateJson({ error: "Comparison answer is invalid." }, 400);
    }
    try {
      await updatePairwiseAnswers(typedSupabase, profileId, current, (answers) => {
        const pairAlreadySaved = Object.entries(answers).some(([savedKey, savedValue]) => {
          if (savedKey === key) return false;
          const saved = object(savedValue);
          const formats = [text(saved.leftFormat, 24), text(saved.rightFormat, 24)].sort();
          return formats.join(":") === [leftFormat, rightFormat].sort().join(":");
        });
        if (pairAlreadySaved) throw new Error("comparison_pair_exists");
        if (!Object.prototype.hasOwnProperty.call(answers, key) && Object.keys(answers).length >= 10) {
          throw new Error("comparison_limit");
        }
        return {
          ...answers,
          [key]: {
            choice: selectedChoice,
            leftFormat,
            rightFormat,
            answeredAt: new Date().toISOString(),
          },
        };
      });
    } catch (error) {
      if (
        error instanceof Error &&
        ["comparison_pair_exists", "comparison_limit"].includes(error.message)
      ) {
        return privateJson({ error: "That comparison is already complete." }, 400);
      }
      console.error("[route-profile] Failed to save comparison answer", {
        message: error instanceof Error ? error.message : "unknown",
        profileId,
      });
      return privateJson({ error: "Comparison answer could not be saved." }, 503);
    }
    return privateJson({ authenticated: true, saved: true, action });
  }

  if (action === "undo_comparison") {
    const key = text(body.key, 120);
    if (!/^route-format:(direct|threshold|redirect|personal|coalition):(direct|threshold|redirect|personal|coalition)$/.test(key)) {
      return privateJson({ error: "Comparison key is invalid." }, 400);
    }
    try {
      await updatePairwiseAnswers(typedSupabase, profileId, current, (answers) => {
        delete answers[key];
        return answers;
      });
    } catch {
      return privateJson({ error: "Comparison answer could not be undone." }, 503);
    }
    return privateJson({ authenticated: true, saved: true, action });
  }

  if (action === "reset_calibration") {
    try {
      await updatePairwiseAnswers(typedSupabase, profileId, current, () => ({}));
    } catch {
      return privateJson({ error: "Calibration could not be reset." }, 503);
    }
    return privateJson({ authenticated: true, saved: true, action });
  }

  return privateJson({ error: "Unknown route-profile action." }, 400);
}
