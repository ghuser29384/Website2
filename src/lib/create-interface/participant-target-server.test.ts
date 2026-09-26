import assert from "node:assert/strict";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import { validateAccountParticipantTargets } from "./participant-target-server";
import type { ValidatedCreatePayload } from "./types";

const actorId = "11111111-1111-4111-8111-111111111111";
const participantId = "22222222-2222-4222-8222-222222222222";

function target(profileId: string, username: string, isCreator: boolean) {
  return {
    rowId: isCreator ? "creator-row" : "participant-row",
    kind: "account" as const,
    profileId,
    usernameSnapshot: username,
    displayNameSnapshot: isCreator ? "Creator Example" : "Participant Example",
    accountType: "individual" as const,
    verification: "identity-verified" as const,
    publicMention: "username" as const,
    invitationState: "draft" as const,
    isCreator,
  };
}

function validated(): ValidatedCreatePayload {
  return {
    source: {} as ValidatedCreatePayload["source"],
    kind: "pool_create",
    cause: "Future flourishing",
    requestedAction: "Shared research",
    offeredTerms: [],
    offeredSummary: "",
    existingPoolReference: null,
    existingPoolAmountCents: null,
    existingPoolCurrency: null,
    poolTerms: {
      commonGround: {
        targetAmountCents: 10_000,
        allocationStatus: "open",
        creatorParticipation: "participating",
        privateValueEstimatesStored: false,
        participants: [
          {
            target: target(actorId, "creator-example", true),
            participantTerms: {
              maximumBudgetMinor: 5_000,
              noPoolDefault: "Another approved project",
              participationBeatsDefault: true,
              preauthorizeExecutableFallback: false,
            },
          },
          { target: target(participantId, "participant-example", false), participantTerms: null },
        ],
      },
    } as ValidatedCreatePayload["poolTerms"],
    groupContributionTerms: { schemaVersion: 1, execution: "proposal-only", options: [] },
    groupContributionReviewRecord: null,
    payloadHash: "hash",
  };
}

function client(rows: unknown[], error: { message: string } | null = null) {
  return {
    rpc: async () => ({ data: rows, error }),
  } as unknown as SupabaseClient<Database>;
}

function row(profileId: string, username: string, displayName: string) {
  return {
    profile_id: profileId,
    username,
    display_name: displayName,
    avatar_url: null,
    account_type: "individual",
    verification: "identity-verified",
    public_invitation_mentions_enabled: true,
  };
}

test("re-resolves every account target immediately before persistence", async () => {
  await assert.doesNotReject(
    validateAccountParticipantTargets({
      supabase: client([
        row(actorId, "creator-example", "Creator Example"),
        row(participantId, "participant-example", "Participant Example"),
      ]),
      actorId,
      validated: validated(),
    }),
  );
});

test("fails closed when an account is blocked, unavailable, or changed", async () => {
  await assert.rejects(
    validateAccountParticipantTargets({
      supabase: client([row(actorId, "creator-example", "Creator Example")]),
      actorId,
      validated: validated(),
    }),
    /no longer eligible or available/i,
  );

  await assert.rejects(
    validateAccountParticipantTargets({
      supabase: client([
        row(actorId, "creator-example", "Creator Example"),
        row(participantId, "renamed-participant", "Participant Example"),
      ]),
      actorId,
      validated: validated(),
    }),
    /changed after selection/i,
  );
});
