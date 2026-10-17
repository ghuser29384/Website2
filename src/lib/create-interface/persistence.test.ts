import assert from "node:assert/strict";
import test from "node:test";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildGroupContributionTerms,
  defaultGroupContributionDraft,
} from "./group-contribution-draft";
import { persistCreateSubmission } from "./persistence";
import { CREATE_INTERFACE_VERSION } from "./types";
import { validateCreatePayload } from "./validation";

function validatedCoActProposal() {
  const draft = defaultGroupContributionDraft(
    "behavior:1",
    "nonfinancial",
    "Avoid meat for one meal per week",
  );
  draft.mode = "co-act";
  draft.creatorParticipation = "organizer-only";
  draft.participants = [];
  draft.counterpartyParticipation = "explicitly-included";
  draft.duration = "12 weeks";
  draft.frequency = "one meal per week";
  const terms = buildGroupContributionTerms(draft);
  assert(terms);

  return validateCreatePayload({
    interfaceVersion: CREATE_INTERFACE_VERSION,
    submissionKey: "create-persistence-co-act",
    cause: "Future flourishing",
    requestKind: "commitment",
    fundMode: null,
    dacPath: null,
    requestAction: "Avoid meat for one meal per week",
    existingPoolAmount: "",
    existingPoolCurrency: "USD",
    offers: [
      {
        id: "behavior",
        title: "A behavior change",
        options: [
          {
            action: "Avoid meat for one meal per week",
            duration: "12 weeks",
          },
        ],
      },
    ],
    pool: null,
    groupContributionTerms: {
      schemaVersion: 1,
      execution: "proposal-only",
      options: [{ optionKey: "behavior:1", terms }],
    },
  });
}

test("persists canonical group terms only inside the private Create source record", async () => {
  const rpcCall: { name: string; arguments: Record<string, unknown> | null } = {
    name: "",
    arguments: null,
  };
  const supabase = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcCall.name = name;
      rpcCall.arguments = args;
      return {
        data: {
          submission_id: "submission-1",
          target_type: "offer",
          target_id: "offer-1",
          submission_status: "pending_review",
          canonical_path: "/create/submissions/submission-1",
        },
        error: null,
      };
    },
  } as unknown as SupabaseClient;

  const result = await persistCreateSubmission({
    supabase,
    actorId: "actor-1",
    validated: validatedCoActProposal(),
    origin: "https://moraltrade.org",
  });

  assert.equal(rpcCall.name, "moral_trade_create_submit_service");
  const rpcArguments = rpcCall.arguments;
  assert(rpcArguments);
  const sourcePayload = rpcArguments.p_source_payload as {
    groupContributionTerms: {
      visibility: string;
      execution: string;
      canonicalJson: string;
    };
  };
  assert.equal(sourcePayload.groupContributionTerms.visibility, "private-review");
  assert.equal(sourcePayload.groupContributionTerms.execution, "proposal-only");
  const canonical = JSON.parse(sourcePayload.groupContributionTerms.canonicalJson) as {
    options: Array<{ optionKey: string; terms: { mode: string } }>;
  };
  assert.equal(canonical.options[0]?.optionKey, "behavior:1");
  assert.equal(canonical.options[0]?.terms.mode, "co-act");

  const offeredTerms = rpcArguments.p_offered_terms as unknown;
  assert.equal(JSON.stringify(offeredTerms).includes("groupContributionTerms"), false);
  assert.equal(JSON.stringify(rpcArguments).includes("publishIdentities"), false);
  assert.equal(JSON.stringify(rpcArguments).includes("paymentIntent"), false);
  assert.equal(result.objectLabel, "Co-Act proposal");
  assert.match(result.lede, /do not activate a group/i);
});
