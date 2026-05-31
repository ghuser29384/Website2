import { NextResponse } from "next/server";

import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringField(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function numberField(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value ?? fallback);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function retentionDaysField(value: unknown): 30 | 90 | 180 | 365 {
  const parsed = numberField(value, 90, 30, 365);

  if (parsed === 30 || parsed === 90 || parsed === 180 || parsed === 365) {
    return parsed;
  }

  return 90;
}

function stringList(value: unknown) {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string").map((entry) => entry.trim()).filter(Boolean)
    : [];
}

function stageField(value: unknown) {
  const normalized = stringField(value);

  if (normalized === "registry" || normalized === "introduced") {
    return normalized;
  }

  return "consent";
}

function privateJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    headers: { "Cache-Control": "private, no-store" },
    status,
  });
}

async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user };
}

export async function GET() {
  if (!hasSupabaseEnv()) {
    return privateJson({ error: "Supabase is not configured." }, 503);
  }

  const { supabase, user } = await getUser();

  if (!user) {
    return privateJson({ error: "Authentication required." }, 401);
  }

  const [{ data: collectives, error: collectiveError }, { data: memberships, error: memberError }] =
    await Promise.all([
      supabase.from("collectives").select("*").order("created_at", { ascending: false }),
      supabase
        .from("collective_members")
        .select("*")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  if (collectiveError || memberError) {
    return privateJson(
      { error: collectiveError?.message ?? memberError?.message ?? "Unable to load collectives." },
      500,
    );
  }

  const collectiveIds = [
    ...new Set([
      ...(collectives ?? []).map((collective) => collective.id),
      ...(memberships ?? []).map((membership) => membership.collective_id),
    ]),
  ];
  const { data: policies, error: policyError } = collectiveIds.length
    ? await supabase
        .from("background_collective_policies")
        .select("*")
        .in("collective_id", collectiveIds)
    : { data: [], error: null };

  if (policyError) {
    return privateJson({ error: policyError.message }, 500);
  }

  return privateJson({
    collectives: collectives ?? [],
    memberships: memberships ?? [],
    policies: policies ?? [],
    privacyNotice:
      "Collective policies describe approval and disclosure defaults; they do not disclose private wishes or source notes.",
  });
}

export async function POST(request: Request) {
  if (!hasSupabaseEnv()) {
    return privateJson({ error: "Supabase is not configured." }, 503);
  }

  const { supabase, user } = await getUser();

  if (!user) {
    return privateJson({ error: "Authentication required." }, 401);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return privateJson({ error: "Invalid JSON body." }, 400);
  }

  if (!isRecord(body) || !stringField(body.name)) {
    return privateJson({ error: "name is required." }, 400);
  }

  const { data: collective, error } = await supabase
    .from("collectives")
    .insert({
      contact_policy: stringField(body.contactPolicy),
      decision_rule: stringField(body.decisionRule) || "single_owner",
      description: stringField(body.description),
      homepage_url: stringField(body.homepageUrl),
      name: stringField(body.name),
      owner_id: user.id,
      verification_notes: stringField(body.verificationNotes),
      verification_status: "unverified",
    })
    .select("id")
    .maybeSingle();

  if (error || !collective) {
    return privateJson({ error: error?.message ?? "Unable to create collective." }, 500);
  }

  await supabase.from("collective_members").insert({
    can_approve_matches: true,
    can_grant_privacy: true,
    can_manage_bounties: true,
    collective_id: collective.id,
    delegation_scope: "Full authority for initial setup.",
    profile_id: user.id,
    role: "owner",
    status: "active",
  });

  const approverRoles = stringList(body.approverRoles);
  const { error: policyError } = await supabase.from("background_collective_policies").insert({
    approval_threshold: numberField(body.approvalThreshold, 1, 1, 20),
    approver_roles: approverRoles.length ? approverRoles : ["owner", "admin"],
    collective_id: collective.id,
    default_retention_days: retentionDaysField(body.defaultRetentionDays),
    disclosure_rules: {
      requirePurpose: true,
      reviewerNote: stringField(body.reviewerNote),
    },
    group_public_preview: stringField(body.groupPublicPreview),
    max_auto_grant_stage: stageField(body.maxAutoGrantStage),
  });

  if (policyError) {
    return privateJson(
      {
        collectiveId: collective.id,
        error: `Collective created, but policy setup failed: ${policyError.message}`,
      },
      500,
    );
  }

  return privateJson({
    collectiveId: collective.id,
    stateMutation: "collective_principal_created",
  });
}
