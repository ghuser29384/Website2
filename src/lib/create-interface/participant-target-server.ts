import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { ParticipantTarget } from "./participant-target";
import type { ValidatedCreatePayload } from "./types";

type AccountTarget = Extract<ParticipantTarget, { kind: "account" }>;
type ResolvedParticipantRow =
  Database["public"]["Functions"]["resolve_create_participants_v2"]["Returns"][number];

function collectAccountTargets(validated: ValidatedCreatePayload): AccountTarget[] {
  const targets: AccountTarget[] = [];
  const add = (target: ParticipantTarget) => {
    if (target.kind === "account") targets.push(target);
  };

  validated.poolTerms?.commonGround?.participants.forEach((participant) => add(participant.target));
  validated.groupContributionTerms.options.forEach((option) => {
    option.terms.participants.forEach(add);
  });

  return targets;
}

function publicMention(row: ResolvedParticipantRow): AccountTarget["publicMention"] {
  return row.public_invitation_mentions_enabled ? "username" : "pending-invitee";
}

function targetMatchesResolved(target: AccountTarget, row: ResolvedParticipantRow) {
  return (
    target.usernameSnapshot === row.username &&
    target.displayNameSnapshot === row.display_name &&
    target.accountType === row.account_type &&
    target.verification === row.verification &&
    target.publicMention === publicMention(row)
  );
}

export async function validateAccountParticipantTargets(input: {
  supabase: SupabaseClient<Database>;
  actorId: string;
  validated: ValidatedCreatePayload;
}): Promise<void> {
  const targets = collectAccountTargets(input.validated);
  if (targets.length === 0) return;

  for (const target of targets) {
    if (target.isCreator && target.profileId !== input.actorId) {
      throw new Error("The participating creator identity no longer matches the signed-in account.");
    }
    if (!target.isCreator && target.profileId === input.actorId) {
      throw new Error("The signed-in creator cannot be added again as another participant.");
    }
  }

  const profileIds = [...new Set(targets.map((target) => target.profileId))];
  const { data, error } = await input.supabase.rpc("resolve_create_participants_v2", {
    p_actor_profile_id: input.actorId,
    p_profile_ids: profileIds,
  });

  if (error) {
    throw new Error(`Participant identities could not be verified: ${error.message}`);
  }

  const rows = (data ?? []) as ResolvedParticipantRow[];
  const byProfileId = new Map(rows.map((row) => [row.profile_id, row]));

  for (const target of targets) {
    const resolved = byProfileId.get(target.profileId);
    if (!resolved) {
      throw new Error(
        `Participant @${target.usernameSnapshot} is no longer eligible or available. Remove and reselect the account.`,
      );
    }
    if (!targetMatchesResolved(target, resolved)) {
      throw new Error(
        `Participant @${target.usernameSnapshot} changed after selection. Remove and reselect the account before saving.`,
      );
    }
  }
}
