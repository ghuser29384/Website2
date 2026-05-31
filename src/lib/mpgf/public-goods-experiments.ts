import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/server";

import { assignMpgfPublicGoodsExperiment } from "./mechanism";
import type { MpgfPublicGoodsExperimentAssignment } from "./types";

type SupabaseServiceAny = ReturnType<typeof createServiceClient> & {
  from: (table: string) => any;
};

export interface MpgfPublicGoodsExperimentAssignmentRow {
  profile_id: string | null;
  user_ref_hash: string;
  experiment_key: string;
  variant: string;
  analytics_policy: "privacy_safe_no_raw_private_text";
  assigned_at: string;
}

export interface PersistMpgfPublicGoodsExperimentAssignmentResult {
  ok: boolean;
  status: "persisted" | "dry_run" | "not_configured";
  assignment: MpgfPublicGoodsExperimentAssignment;
  row: MpgfPublicGoodsExperimentAssignmentRow;
  persistedId: string | null;
  warnings: string[];
}

const forbiddenExperimentTextPattern =
  /@|phone|contact|private[_-]?wish|raw[_-]?evidence|raw[_-]?text|receipt[_-]?text|payment[_-]?secret|provider[_-]?payload|token|password|private[_-]?key/i;

function hasServiceRoleEnv() {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function isUuid(value: string | undefined) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

function assertSafeExperimentLabel(value: string, label: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    throw new Error(`${label} is required for MPGF public-goods experiment assignment.`);
  }

  if (trimmed.length > 80) {
    throw new Error(`${label} is too long for MPGF public-goods experiment assignment.`);
  }

  if (forbiddenExperimentTextPattern.test(trimmed)) {
    throw new Error(`${label} cannot contain raw private text or contact-like content.`);
  }
}

function assertSafeVariants(variants: readonly string[]) {
  if (variants.length < 2) {
    throw new Error("MPGF public-goods experiments require at least two variants.");
  }

  if (variants.length > 8) {
    throw new Error("MPGF public-goods experiments support at most eight variants.");
  }

  for (const variant of variants) {
    assertSafeExperimentLabel(variant, "Experiment variant");
  }
}

export function buildMpgfPublicGoodsExperimentAssignmentRow(input: {
  userId: string;
  profileId?: string | null;
  experimentKey: string;
  variants: readonly string[];
  assignedAt?: string;
}) {
  assertSafeExperimentLabel(input.experimentKey, "Experiment key");
  assertSafeVariants(input.variants);

  const assignment = assignMpgfPublicGoodsExperiment({
    userId: input.userId,
    experimentKey: input.experimentKey,
    variants: input.variants,
    assignedAt: input.assignedAt,
  });
  const row = {
    profile_id: isUuid(input.profileId ?? undefined) ? input.profileId ?? null : null,
    user_ref_hash: assignment.userRefHash,
    experiment_key: assignment.experimentKey,
    variant: assignment.variant,
    analytics_policy: assignment.analyticsPolicy,
    assigned_at: assignment.assignedAt,
  } satisfies MpgfPublicGoodsExperimentAssignmentRow;

  return {
    assignment,
    row,
  };
}

export async function persistMpgfPublicGoodsExperimentAssignment(input: {
  userId: string;
  profileId?: string | null;
  experimentKey: string;
  variants: readonly string[];
  assignedAt?: string;
  dryRun?: boolean;
}): Promise<PersistMpgfPublicGoodsExperimentAssignmentResult> {
  const { assignment, row } = buildMpgfPublicGoodsExperimentAssignmentRow(input);

  if (input.dryRun) {
    return {
      ok: true,
      status: "dry_run",
      assignment,
      row,
      persistedId: null,
      warnings: [],
    };
  }

  if (!hasSupabaseEnv() || !hasServiceRoleEnv()) {
    return {
      ok: false,
      status: "not_configured",
      assignment,
      row,
      persistedId: null,
      warnings: ["Supabase service-role configuration is required to persist MPGF public-goods experiment assignments."],
    };
  }

  const supabase = createServiceClient() as SupabaseServiceAny;
  const result = await supabase
    .from("mpgf_public_goods_experiment_assignments")
    .upsert(row, { onConflict: "experiment_key,user_ref_hash" })
    .select("id, user_ref_hash, experiment_key, variant, analytics_policy, assigned_at")
    .single();

  if (result.error) {
    throw new Error(`Could not persist MPGF public-goods experiment assignment: ${result.error.message}`);
  }

  const persisted = result.data as Record<string, unknown> | null;
  const persistedId = typeof persisted?.id === "string" ? persisted.id : null;

  return {
    ok: true,
    status: "persisted",
    assignment: {
      ...assignment,
      id: persistedId ?? assignment.id,
    },
    row,
    persistedId,
    warnings: [],
  };
}
