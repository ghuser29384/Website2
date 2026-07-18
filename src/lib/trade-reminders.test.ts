import assert from "node:assert/strict";
import test from "node:test";

import type { CoreAgreementDetail } from "@/lib/core-trade";
import {
  buildDefaultReminderRules,
  buildReminderCalendarIcs,
  deriveAgreementReminderMilestones,
  offsetLabel,
} from "@/lib/trade-reminders";

function agreementDetail(overrides: Partial<CoreAgreementDetail> = {}): CoreAgreementDetail {
  return {
    agreement: {
      id: "11111111-1111-4111-8111-111111111111",
      proposer_id: "22222222-2222-4222-8222-222222222222",
      responder_id: "33333333-3333-4333-8333-333333333333",
      lifecycle_status: "active",
      evidence_due_at: "2026-07-20",
    },
    offer: null,
    version: {
      start_date: "2026-07-19",
      evidence_due_date: "2026-07-20",
    },
    versions: [],
    confirmations: [],
    evidence: [],
    completionConfirmations: [],
    exitRequests: [],
    proposer: null,
    responder: null,
    threadId: null,
    ...overrides,
  };
}

test("derives only dated, real agreement milestones", () => {
  const milestones = deriveAgreementReminderMilestones(
    agreementDetail({
      evidence: [
        {
          id: "evidence-1",
          status: "submitted",
          challenge_window_ends_at: "2026-07-22T18:00:00.000Z",
          signedUrl: null,
        },
      ],
    }),
  );

  assert.deepEqual(
    milestones.map((milestone) => milestone.key),
    ["agreement_start", "verification_due", "challenge_window:evidence-1"],
  );
  assert.equal(milestones[1]?.dueAt, "2026-07-20T23:59:00.000Z");
  assert.equal(milestones.some((milestone) => milestone.key === "campaign_close"), false);
});

test("defaults progress from broad notice to due-time notice", () => {
  const milestones = deriveAgreementReminderMilestones(agreementDetail());
  const rules = buildDefaultReminderRules(
    "11111111-1111-4111-8111-111111111111",
    milestones,
  );
  const verificationOffsets = rules
    .filter((rule) => rule.milestoneKey === "verification_due")
    .map((rule) => rule.offsetMinutes);

  assert.deepEqual(verificationOffsets, [-1_440, -180, 0]);
  assert.equal(offsetLabel(-180), "3 hours before");
  assert.equal(offsetLabel(60), "1 hour after");
});

test("builds a read-only calendar event without private agreement terms", () => {
  const calendar = buildReminderCalendarIcs({
    generatedAt: new Date("2026-07-18T12:00:00.000Z"),
    items: [
      {
        agreementId: "11111111-1111-4111-8111-111111111111",
        ruleId: "44444444-4444-4444-8444-444444444444",
        milestoneLabel: "Verification, review; due",
        dueAt: "2026-07-20T23:59:00.000Z",
        remindAt: "2026-07-20T20:59:00.000Z",
        agreementTitle: null,
      },
    ],
  });
  const unfoldedCalendar = calendar.replaceAll("\r\n ", "");

  assert.match(calendar, /BEGIN:VCALENDAR\r\n/);
  assert.match(unfoldedCalendar, /SUMMARY:Moral Trade: Verification\\, review\\; due/);
  assert.match(unfoldedCalendar, /DTSTART:20260720T205900Z/);
  assert.match(
    unfoldedCalendar,
    /trade-agreements\/11111111-1111-4111-8111-111111111111\/reminders/,
  );
  assert.doesNotMatch(calendar, /counterparty|payment information|evidence content/i);
});
