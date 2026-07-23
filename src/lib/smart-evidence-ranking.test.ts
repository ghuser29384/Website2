import assert from "node:assert/strict";
import test from "node:test";

import type {
  EvidenceStageItem,
  EvidenceStageRecord,
} from "@/components/evidence/evidence-stage";

import {
  filterAndRankEvidenceRecords,
  smartEvidenceReviewState,
} from "./smart-evidence-ranking";
import { parseSmartQuery } from "./smart-query";

function evidenceItem(
  id: string,
  state: EvidenceStageItem["state"],
  title: string,
): EvidenceStageItem {
  return {
    id,
    title,
    summary: `${title} public-safe summary`,
    evidenceType: "file",
    mimeType: "application/pdf",
    state,
    group: "Fulfillment",
    submittedBy: "Participant",
    submittedById: null,
    submittedAt: "2026-07-20T00:00:00.000Z",
    reviewedAt: state === "submitted" ? null : "2026-07-21T00:00:00.000Z",
    challengeWindowEndsAt: null,
    challengeReason: null,
    redactionState: "redacted",
    redactionNote: "Identifiers removed.",
    fileName: `${id}.pdf`,
    publicUrl: null,
    preview: "live",
  };
}

function evidenceRecord({
  cause,
  evidence,
  id,
  updatedAt,
}: {
  cause: string;
  evidence: EvidenceStageItem[];
  id: string;
  updatedAt: string;
}): EvidenceStageRecord {
  return {
    id,
    isExample: false,
    accessScope: "public",
    lifecycle: "evidence_due",
    offeredCause: cause,
    requestedCause: "Open governance",
    proposedAction: `Complete a documented ${cause} action`,
    requestedAction: "Fund public civic infrastructure",
    evidenceRule: "Submit a public-safe receipt and completion record.",
    duration: "One month",
    privacyScope: "Public-safe artifacts only",
    proposer: "Proposer",
    responder: "Responder",
    proposerId: null,
    responderId: null,
    createdAt: "2026-07-19T00:00:00.000Z",
    activatedAt: "2026-07-19T01:00:00.000Z",
    completedAt: null,
    updatedAt,
    evidence,
    timeline: [],
  };
}

const acceptedAnimal = evidenceRecord({
  cause: "Animal welfare",
  evidence: [evidenceItem("animal-receipt", "accepted", "Animal-welfare receipt")],
  id: "accepted-animal",
  updatedAt: "2026-07-22T00:00:00.000Z",
});
const submittedAnimal = evidenceRecord({
  cause: "Animal welfare",
  evidence: [evidenceItem("animal-submission", "submitted", "Animal-welfare receipt")],
  id: "submitted-animal",
  updatedAt: "2026-07-23T00:00:00.000Z",
});
const challengedCivic = evidenceRecord({
  cause: "Civic infrastructure",
  evidence: [evidenceItem("civic-challenge", "challenged", "Civic completion record")],
  id: "challenged-civic",
  updatedAt: "2026-07-21T00:00:00.000Z",
});

test("classifies only fully accepted dossiers as accepted", () => {
  assert.equal(smartEvidenceReviewState(acceptedAnimal), "accepted");
  assert.equal(smartEvidenceReviewState(submittedAnimal), "submitted");
  assert.equal(smartEvidenceReviewState(challengedCivic), "challenged");
});

test("applies cause and review-state constraints before ranking", () => {
  const parsed = parseSmartQuery("animal welfare receipt", { surface: "evidence" });
  const records = filterAndRankEvidenceRecords({
    facets: { ...parsed.facets, evidenceStates: ["accepted"] },
    personalPriorities: [],
    query: "animal welfare receipt",
    records: [submittedAnimal, challengedCivic, acceptedAnimal],
    sort: "best_match",
  });

  assert.deepEqual(records.map((record) => record.id), ["accepted-animal"]);
});

test("fails closed when an evidence query contains unsupported amount constraints", () => {
  const parsed = parseSmartQuery("accepted evidence under $50", { surface: "evidence" });
  const records = filterAndRankEvidenceRecords({
    facets: parsed.facets,
    personalPriorities: [],
    query: "accepted evidence under $50",
    records: [acceptedAnimal, submittedAnimal],
    sort: "best_match",
  });

  assert.deepEqual(records, []);
});

test("supports an explicit challenges-first ordering without discarding matching records", () => {
  const parsed = parseSmartQuery("receipt or completion record", { surface: "evidence" });
  const records = filterAndRankEvidenceRecords({
    facets: parsed.facets,
    personalPriorities: [],
    query: "receipt or completion record",
    records: [acceptedAnimal, submittedAnimal, challengedCivic],
    sort: "challenged",
  });

  assert.equal(records[0]?.id, "challenged-civic");
  assert.equal(records.length, 3);
});
