import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  EvidenceStage,
  type EvidenceStageItem,
  type EvidenceStageRecord,
  type EvidenceStageRedactionState,
  type EvidenceStageState,
  type EvidenceStageTimelineEvent,
  type EvidenceStageViewerContext,
} from "@/components/evidence/evidence-stage";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { SmartQueryForm } from "@/components/search/smart-query-form";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { IconMark } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  filterAndRankEvidenceRecords,
  type SmartEvidenceSort,
} from "@/lib/smart-evidence-ranking";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import {
  getSmartQueryCauseLabel,
  parseSerializedSmartQueryFacets,
  parseSmartQuery,
  serializeSmartQueryFacets,
  type SmartQueryFacets,
} from "@/lib/smart-query";
import {
  hasSmartQueryConstraints,
  mergeSmartQueryFacets,
} from "@/lib/smart-query-facets";
import { loadSmartQueryCausePriorities } from "@/lib/smart-query-personalization";
import { createClient } from "@/lib/supabase/server";

import styles from "./evidence-directory.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type EvidenceState = EvidenceStageState;
type RedactionState = EvidenceStageRedactionState;
type EvidenceItem = EvidenceStageItem;
type TimelineEvent = EvidenceStageTimelineEvent;
type EvidenceRecord = EvidenceStageRecord;

type PageProps = {
  params: Promise<{ recordId?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type EvidenceDirectoryData = {
  candidateLimitReached: boolean;
  loadState: "ready" | "unavailable";
  page: number;
  records: EvidenceRecord[];
  totalPages: number;
  totalRecords: number;
};

const DIRECTORY_PAGE_SIZE = 24;
const SMART_EVIDENCE_CANDIDATE_LIMIT = 1_000;
const EVIDENCE_SORT_OPTIONS: ReadonlyArray<{ value: SmartEvidenceSort; label: string }> = [
  { value: "best_match", label: "Best match" },
  { value: "most_verified", label: "Most fully accepted" },
  { value: "challenged", label: "Challenges first" },
  { value: "newest", label: "Newest" },
];

function clean(value: unknown, fallback = "") {
  const result = typeof value === "string" ? value.trim() : "";
  return result || fallback;
}

function label(value: unknown, fallback: string) {
  const result = clean(value, fallback).replace(/\s+/g, " ");
  return result.length > 60 ? `${result.slice(0, 57).trimEnd()}…` : result;
}

function state(value: unknown): EvidenceState {
  return value === "accepted" || value === "challenged" ? value : "submitted";
}

function redaction(value: unknown): RedactionState {
  return value === "not_required" || value === "redacted" || value === "withheld"
    ? value
    : "pending_review";
}

function groupFor(title: string, evidenceType: string) {
  const value = `${title} ${evidenceType}`.toLowerCase();
  if (/(agreement|terms|contract)/.test(value)) return "Terms";
  if (/(payment|completion|confirmation|sign[- ]?off)/.test(value)) return "Payment & confirmation";
  if (evidenceType === "attestation") return "Attestations";
  return "Fulfillment";
}

function formatDate(value: string | null, includeTime = false) {
  if (!value) return "Not recorded";
  return (
    <LocalDateTime
      value={value}
      fallback={value}
      dateOnly={!includeTime}
      locale="en"
      options={{
        day: "numeric",
        hour: includeTime ? "numeric" : undefined,
        minute: includeTime ? "2-digit" : undefined,
        month: "short",
        year: "numeric",
      }}
    />
  );
}

function buildTimeline(record: Omit<EvidenceRecord, "timeline">, confirmations: Array<Record<string, unknown>>) {
  const events: TimelineEvent[] = [{
    id: "created",
    at: record.createdAt,
    label: "Agreement",
    title: "Trade record created",
    description: "The parties created the bilateral agreement record.",
    actor: record.proposer,
  }];
  if (record.activatedAt) events.push({
    id: "activated",
    at: record.activatedAt,
    label: "Agreement",
    title: "Terms activated",
    description: "Both participants confirmed the same frozen term version.",
    actor: "Both parties",
  });
  for (const item of record.evidence) {
    events.push({ id: `submitted-${item.id}`, at: item.submittedAt, label: "Evidence", title: `${item.title} submitted`, description: item.summary, actor: item.submittedBy, evidenceId: item.id });
    if (item.reviewedAt) events.push({
      id: `reviewed-${item.id}`,
      at: item.reviewedAt,
      label: item.state === "challenged" ? "Challenge" : "Review",
      title: item.state === "challenged" ? `${item.title} challenged` : `${item.title} accepted`,
      description: item.state === "challenged" ? "The counterparty opened a factual or scope challenge." : "The counterparty accepted this evidence item.",
      actor: item.submittedBy === record.proposer ? record.responder : record.proposer,
      evidenceId: item.id,
    });
  }
  confirmations.forEach((confirmation, index) => {
    const at = clean(confirmation.confirmed_at);
    const confirmerId = clean(confirmation.user_id);
    const actor = clean(confirmation.actor_display_name)
      || (confirmerId === record.proposerId
        ? record.proposer
        : confirmerId === record.responderId
          ? record.responder
          : "Participant");
    if (at) events.push({ id: `confirmation-${index}`, at, label: "Confirmation", title: "Completion confirmation recorded", description: "A participant independently confirmed completion.", actor });
  });
  if (record.completedAt) events.push({ id: "completed", at: record.completedAt, label: "Completion", title: "Trade completed", description: "The public record was finalized after both completion confirmations.", actor: "Both parties" });
  return events.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

async function signedPublicUrl(supabase: any, row: Record<string, any>) {
  if (clean(row.public_visibility ?? row.publicVisibility, "public") !== "public") return null;
  if (!["redacted", "not_required"].includes(redaction(row.redaction_status ?? row.redactionState))) return null;
  const direct = clean(row.public_url ?? row.publicUrl);
  if (direct) return direct;
  const path = clean(row.public_storage_path ?? row.publicObjectPath);
  if (!path) return null;
  const { data, error } = await supabase.storage.from("trade-evidence").createSignedUrl(path, 300);
  return error ? null : data?.signedUrl ?? null;
}

async function hydratePublic(
  rows: Array<Record<string, any>>,
  includeUrls: boolean,
  supabase: any,
): Promise<EvidenceRecord[]> {
  if (!rows.length) return [];
  const records: EvidenceRecord[] = [];
  for (const agreement of rows) {
    if (!agreement || typeof agreement !== "object") continue;
    const id = String(agreement.id);
    const rawEvidence = Array.isArray(agreement.evidence) ? agreement.evidence : [];
    const evidence: EvidenceItem[] = await Promise.all(rawEvidence.map(async (item: any) => {
      const evidenceType = clean(item.evidenceType, "file");
      const title = clean(item.title, evidenceType === "attestation" ? "Participant attestation" : evidenceType === "link" ? "External evidence link" : "Submitted evidence file");
      return {
        id: String(item.id),
        title,
        summary: clean(item.summary, "Evidence submitted under the parties’ frozen agreement."),
        evidenceType,
        mimeType: clean(item.mimeType, evidenceType),
        state: state(item.state),
        group: groupFor(title, evidenceType),
        submittedBy: label(item.submittedBy, "Participant"),
        submittedById: null,
        submittedAt: clean(item.submittedAt, agreement.createdAt),
        reviewedAt: item.reviewedAt ? String(item.reviewedAt) : null,
        challengeWindowEndsAt: item.challengeWindowEndsAt
          ? String(item.challengeWindowEndsAt)
          : null,
        challengeReason: null,
        redactionState: redaction(item.redactionState),
        redactionNote: clean(item.redactionNote, "Sensitive identifiers should be removed before publication."),
        fileName: clean(item.fileName),
        publicUrl: includeUrls ? await signedPublicUrl(supabase, item) : null,
        preview: "live" as const,
      };
    }));
    const partial = {
      id,
      isExample: false,
      accessScope: "public" as const,
      lifecycle: clean(agreement.lifecycle, "active"),
      offeredCause: clean(agreement.offeredCause, "Moral priority"),
      requestedCause: clean(agreement.requestedCause, "Counterparty priority"),
      proposedAction: clean(agreement.proposedAction, "Action recorded in the agreement."),
      requestedAction: clean(agreement.requestedAction, "Reciprocal action recorded in the agreement."),
      evidenceRule: clean(agreement.evidenceRule, "Evidence is evaluated against the frozen agreement."),
      duration: clean(agreement.duration, "Duration recorded in the agreement"),
      privacyScope: clean(agreement.privacyScope, "Public by default with narrow safety exceptions."),
      proposer: label(agreement.proposer, "Proposer"),
      responder: label(agreement.responder, "Responder"),
      proposerId: null,
      responderId: null,
      createdAt: clean(agreement.createdAt, new Date(0).toISOString()),
      activatedAt: agreement.activatedAt ? String(agreement.activatedAt) : null,
      completedAt: agreement.completedAt ? String(agreement.completedAt) : null,
      updatedAt: clean(agreement.updatedAt, agreement.createdAt),
      evidence,
    };
    const confirmations = Array.isArray(agreement.completionConfirmations)
      ? agreement.completionConfirmations
      : [];
    records.push({ ...partial, timeline: buildTimeline(partial, confirmations) });
  }
  return records;
}

async function hydrateParticipant(
  rows: Array<Record<string, any>>,
  includeUrls: boolean,
  supabase: any,
): Promise<EvidenceRecord[]> {
  if (!rows.length) return [];
  const agreementIds = rows.map((row) => String(row.id));
  const offerIds = rows.map((row) => clean(row.offer_id)).filter(Boolean);
  const profileIds = rows.flatMap((row) => [clean(row.proposer_id), clean(row.responder_id)]).filter(Boolean);
  const versionIds = rows.map((row) => clean(row.current_version_id)).filter(Boolean);
  const [evidenceResult, offerResult, profileResult, versionResult, confirmationResult] = await Promise.all([
    supabase
      .from("trade_evidence_items")
      .select("id,agreement_id,evidence_type,status,submitted_by,created_at,reviewed_at,challenge_window_ends_at,challenge_reason,redaction_status,public_visibility,public_title,public_summary,public_original_filename,public_mime_type,public_redaction_note,public_url,public_storage_path")
      .in("agreement_id", agreementIds)
      .in("public_visibility", ["public", "withheld_safety"])
      .order("created_at", { ascending: true }),
    offerIds.length ? supabase.from("offers").select("id,offered_cause,requested_cause").in("id", offerIds) : Promise.resolve({ data: [] }),
    profileIds.length ? supabase.from("profiles").select("id,display_name").in("id", profileIds) : Promise.resolve({ data: [] }),
    versionIds.length ? supabase.from("trade_agreement_versions").select("id,proposed_action,requested_action,duration,evidence_rule,privacy_scope").in("id", versionIds) : Promise.resolve({ data: [] }),
    supabase.from("trade_completion_confirmations").select("agreement_id,user_id,confirmed_at").in("agreement_id", agreementIds).order("confirmed_at", { ascending: true }),
  ]);
  const queryError = evidenceResult.error
    ?? offerResult.error
    ?? profileResult.error
    ?? versionResult.error
    ?? confirmationResult.error;
  if (queryError) throw queryError;

  const byAgreement = new Map<string, Array<Record<string, any>>>();
  for (const item of evidenceResult.data ?? []) {
    const id = String(item.agreement_id);
    byAgreement.set(id, [...(byAgreement.get(id) ?? []), item]);
  }
  const offers = new Map((offerResult.data ?? []).map((row: any) => [String(row.id), row]));
  const profiles = new Map((profileResult.data ?? []).map((row: any) => [String(row.id), row]));
  const versions = new Map((versionResult.data ?? []).map((row: any) => [String(row.id), row]));
  const confirmations = new Map<string, Array<Record<string, unknown>>>();
  for (const item of confirmationResult.data ?? []) {
    const id = String(item.agreement_id);
    confirmations.set(id, [...(confirmations.get(id) ?? []), item]);
  }
  const records: EvidenceRecord[] = [];
  for (const agreement of rows) {
    const id = String(agreement.id);
    const rawEvidence = byAgreement.get(id) ?? [];
    const offer: any = offers.get(clean(agreement.offer_id)) ?? {};
    const version: any = versions.get(clean(agreement.current_version_id)) ?? {};
    const proposer: any = profiles.get(clean(agreement.proposer_id)) ?? {};
    const responder: any = profiles.get(clean(agreement.responder_id)) ?? {};
    const evidence: EvidenceItem[] = await Promise.all(rawEvidence.map(async (item: any) => {
      const evidenceType = clean(item.evidence_type, "file");
      const title = clean(item.public_title, evidenceType === "attestation" ? "Participant attestation" : evidenceType === "link" ? "External evidence link" : "Submitted evidence file");
      const fileName = clean(item.public_original_filename, clean(item.storage_path).split("/").pop() ?? "");
      return {
        id: String(item.id),
        title,
        summary: clean(item.public_summary, clean(item.attestation, "Evidence submitted under the parties’ frozen agreement.")),
        evidenceType,
        mimeType: clean(item.public_mime_type, evidenceType),
        state: state(item.status),
        group: groupFor(title, evidenceType),
        submittedBy: label(String(item.submitted_by) === String(agreement.proposer_id) ? proposer.display_name : responder.display_name, "Participant"),
        submittedById: item.submitted_by ? String(item.submitted_by) : null,
        submittedAt: clean(item.created_at, agreement.created_at),
        reviewedAt: item.reviewed_at ? String(item.reviewed_at) : null,
        challengeWindowEndsAt: item.challenge_window_ends_at
          ? String(item.challenge_window_ends_at)
          : null,
        challengeReason: clean(item.challenge_reason) || null,
        redactionState: redaction(item.redaction_status),
        redactionNote: clean(item.public_redaction_note, "Sensitive identifiers should be removed before publication."),
        fileName,
        publicUrl: includeUrls ? await signedPublicUrl(supabase, item) : null,
        preview: "live" as const,
      };
    }));
    const partial = {
      id,
      isExample: false,
      accessScope: agreement.public_evidence_enabled === false ? "participant" as const : "public" as const,
      lifecycle: clean(agreement.lifecycle_status, "active"),
      offeredCause: clean(offer.offered_cause, "Moral priority"),
      requestedCause: clean(offer.requested_cause, "Counterparty priority"),
      proposedAction: clean(version.proposed_action, "Action recorded in the agreement."),
      requestedAction: clean(version.requested_action, "Reciprocal action recorded in the agreement."),
      evidenceRule: clean(version.evidence_rule, "Evidence is evaluated against the frozen agreement."),
      duration: clean(version.duration, "Duration recorded in the agreement"),
      privacyScope: clean(version.privacy_scope, "Public by default with narrow safety exceptions."),
      proposer: label(proposer.display_name, "Proposer"),
      responder: label(responder.display_name, "Responder"),
      proposerId: agreement.proposer_id ? String(agreement.proposer_id) : null,
      responderId: agreement.responder_id ? String(agreement.responder_id) : null,
      createdAt: clean(agreement.created_at, new Date(0).toISOString()),
      activatedAt: agreement.activated_at ? String(agreement.activated_at) : null,
      completedAt: agreement.completed_at ? String(agreement.completed_at) : null,
      updatedAt: clean(agreement.public_evidence_updated_at, clean(agreement.updated_at, agreement.created_at)),
      evidence,
    };
    records.push({ ...partial, timeline: buildTimeline(partial, confirmations.get(id) ?? []) });
  }
  return records;
}

function pageNumber(value: string | string[] | undefined) {
  const parsed = Number.parseInt(Array.isArray(value) ? value[0] ?? "" : value ?? "", 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function readParam(
  searchParams: Record<string, string | string[] | undefined>,
  key: string,
) {
  const value = searchParams[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function parseEvidenceSort(value: string, hasSmartSearch: boolean): SmartEvidenceSort {
  if (EVIDENCE_SORT_OPTIONS.some((option) => option.value === value)) {
    return value as SmartEvidenceSort;
  }
  return hasSmartSearch ? "best_match" : "newest";
}

function buildEvidenceHref({
  facets,
  page,
  query,
  sort,
}: {
  facets: SmartQueryFacets;
  page?: number;
  query: string;
  sort: SmartEvidenceSort;
}) {
  const params = new URLSearchParams();
  if (query) {
    params.set("q", query);
    params.set("smart", "1");
  }
  serializeSmartQueryFacets(params, facets);
  const defaultSort = query || hasSmartQueryConstraints(facets) ? "best_match" : "newest";
  if (sort !== defaultSort) params.set("sort", sort);
  if (page && page > 1) params.set("page", String(page));
  const queryString = params.toString();
  return queryString ? `/evidence?${queryString}` : "/evidence";
}

async function loadPublicEvidenceCandidates(supabase: any) {
  const rows: Array<Record<string, any>> = [];
  let sourceTotalRecords = 0;
  let offset = 0;

  while (rows.length < SMART_EVIDENCE_CANDIDATE_LIMIT) {
    const requested = Math.min(200, SMART_EVIDENCE_CANDIDATE_LIMIT - rows.length);
    const { data, error } = await supabase.rpc("list_public_moral_trade_evidence_v1", {
      p_limit: requested,
      p_offset: offset,
    });
    if (error) return { error, rows: [], sourceTotalRecords: 0 };
    const batch = Array.isArray(data?.records) ? data.records : [];
    const reportedTotal = Number(data?.totalRecords ?? batch.length);
    sourceTotalRecords = Number.isFinite(reportedTotal)
      ? Math.max(0, reportedTotal)
      : rows.length + batch.length;
    rows.push(...batch);
    if (!batch.length || rows.length >= sourceTotalRecords) break;
    offset += batch.length;
  }

  return { error: null, rows, sourceTotalRecords };
}

async function listRecords({
  facets,
  page,
  personalPriorities,
  query,
  sort,
}: {
  facets: SmartQueryFacets;
  page: number;
  personalPriorities: readonly string[];
  query: string;
  sort: SmartEvidenceSort;
}): Promise<EvidenceDirectoryData> {
  try {
    const supabase = (await createClient()) as any;
    const smartSearch = Boolean(query || hasSmartQueryConstraints(facets) || sort !== "newest");

    if (smartSearch) {
      const candidates = await loadPublicEvidenceCandidates(supabase);
      if (candidates.error) {
        return {
          candidateLimitReached: false,
          loadState: "unavailable",
          page,
          records: [],
          totalPages: 1,
          totalRecords: 0,
        };
      }
      const hydrated = await hydratePublic(candidates.rows, false, supabase);
      const ranked = filterAndRankEvidenceRecords({
        facets,
        personalPriorities,
        query,
        records: hydrated,
        sort,
      });
      const totalRecords = ranked.length;
      const totalPages = Math.max(1, Math.ceil(totalRecords / DIRECTORY_PAGE_SIZE));
      if (page > totalPages) {
        return listRecords({ facets, page: totalPages, personalPriorities, query, sort });
      }
      const from = (page - 1) * DIRECTORY_PAGE_SIZE;
      return {
        candidateLimitReached: candidates.sourceTotalRecords > candidates.rows.length,
        loadState: "ready",
        page,
        records: ranked.slice(from, from + DIRECTORY_PAGE_SIZE),
        totalPages,
        totalRecords,
      };
    }

    const from = (page - 1) * DIRECTORY_PAGE_SIZE;
    const { data, error } = await supabase.rpc("list_public_moral_trade_evidence_v1", {
      p_limit: DIRECTORY_PAGE_SIZE,
      p_offset: from,
    });
    if (error) {
      return {
        candidateLimitReached: false,
        loadState: "unavailable",
        page,
        records: [],
        totalPages: 1,
        totalRecords: 0,
      };
    }

    const totalRecords = Number(data?.totalRecords ?? 0);
    const totalPages = Math.max(1, Math.ceil(totalRecords / DIRECTORY_PAGE_SIZE));
    if (page > totalPages) {
      return listRecords({ facets, page: totalPages, personalPriorities, query, sort });
    }
    const records = await hydratePublic(
      Array.isArray(data?.records) ? data.records : [],
      false,
      supabase,
    );
    return {
      candidateLimitReached: false,
      loadState: "ready",
      page,
      records,
      totalPages,
      totalRecords,
    };
  } catch {
    return {
      candidateLimitReached: false,
      loadState: "unavailable",
      page,
      records: [],
      totalPages: 1,
      totalRecords: 0,
    };
  }
}

async function getRecord(id: string, viewerId: string | null = null) {
  if (id === "example") return EXAMPLE;
  try {
    const supabase = (await createClient()) as any;
    if (viewerId) {
      const { data: participantAgreement, error: participantError } = await supabase
        .from("agreements")
        .select("id,offer_id,proposer_id,responder_id,lifecycle_status,current_version_id,created_at,updated_at,public_evidence_updated_at,activated_at,completed_at,public_evidence_enabled")
        .eq("id", id)
        .maybeSingle();
      if (!participantError && participantAgreement) {
        const isParticipant = String(participantAgreement.proposer_id) === viewerId
          || String(participantAgreement.responder_id) === viewerId;
        if (isParticipant) {
          return (await hydrateParticipant([participantAgreement], true, supabase))[0] ?? null;
        }
      }
    }

    const { data: publicAgreement, error: publicError } = await supabase.rpc(
      "get_public_moral_trade_evidence_v1",
      { p_record_id: id },
    );
    if (publicError || !publicAgreement) return null;
    return (await hydratePublic([publicAgreement], true, supabase))[0] ?? null;
  } catch { return null; }
}

const EXAMPLE_EVIDENCE: EvidenceItem[] = [
  { id:"receipt",title:"Itemized receipt",summary:"The itemized cafe receipt lists a lentil bowl, roasted vegetables, feta, tahini, and sparkling water; no meat, poultry, or fish is listed.",evidenceType:"file",mimeType:"text/plain",state:"submitted",group:"Required evidence",submittedBy:"Jordan M.",submittedById:null,submittedAt:"2026-07-18T19:39:00.000Z",reviewedAt:null,challengeWindowEndsAt:null,challengeReason:null,redactionState:"redacted",redactionNote:"Order and payment identifiers are masked in the shared copy.",fileName:"green-table-receipt.txt",publicUrl:"/evidence/example/green-table-receipt.txt",preview:"receipt" },
  { id:"before",title:"Before-meal photo",summary:"A time-stamped public-safe photo shows a lentil bowl, roasted vegetables, chickpeas, feta, and tahini before the meal.",evidenceType:"file",mimeType:"image/webp",state:"submitted",group:"Required evidence",submittedBy:"Jordan M.",submittedById:null,submittedAt:"2026-07-18T19:43:00.000Z",reviewedAt:null,challengeWindowEndsAt:null,challengeReason:null,redactionState:"redacted",redactionNote:"Location metadata and unrelated background details are removed.",fileName:"meal-before.webp",publicUrl:"/evidence/example/meal-before.webp",preview:"meal_before" },
  { id:"after",title:"After-meal photo",summary:"An optional follow-up photo shows the same bowl after the meal and provides additional context beyond the two required artifacts.",evidenceType:"file",mimeType:"image/webp",state:"submitted",group:"Optional context",submittedBy:"Jordan M.",submittedById:null,submittedAt:"2026-07-18T20:01:00.000Z",reviewedAt:null,challengeWindowEndsAt:null,challengeReason:null,redactionState:"redacted",redactionNote:"Location metadata and unrelated background details are removed.",fileName:"meal-after.webp",publicUrl:"/evidence/example/meal-after.webp",preview:"meal_after" },
];

const EXAMPLE_BASE = {
  id:"example",isExample:true,accessScope:"public" as const,lifecycle:"evidence_due",offeredCause:"$10 payment",requestedCause:"one meat-free meal",proposedAction:"Casey R. pays Jordan M. $10 after reviewing the agreed public-safe evidence.",requestedAction:"Jordan M. eats one meal without meat, poultry, or fish.",evidenceRule:"A before-meal photo and itemized receipt captured during the agreed meal window; an after-meal photo is optional context.",duration:"One meal · 18 Jul 2026",privacyScope:"Public-safe copies only. Location, order, payment, and unrelated personal details are removed.",proposer:"Casey R.",responder:"Jordan M.",proposerId:null,responderId:null,createdAt:"2026-07-18T18:16:00.000Z",activatedAt:"2026-07-18T18:18:00.000Z",completedAt:null,updatedAt:"2026-07-18T20:02:00.000Z",evidence:EXAMPLE_EVIDENCE,
};
const EXAMPLE: EvidenceRecord = { ...EXAMPLE_BASE, timeline: buildTimeline(EXAMPLE_BASE, []) };

function recordReviewState(record: EvidenceRecord) {
  if (record.evidence.some((item) => item.state === "challenged")) {
    return { className: styles.recordStatusChallenged, label: "Challenged" };
  }
  if (record.evidence.length && record.evidence.every((item) => item.state === "accepted")) {
    return { className: styles.recordStatusAccepted, label: "Participant accepted" };
  }
  if (record.evidence.some((item) => item.state === "accepted")) {
    return { className: styles.recordStatusReviewing, label: "Partially reviewed" };
  }
  return { className: "", label: "Submitted" };
}

function Directory({
  directory,
  facets,
  query,
  sort,
}: {
  directory: EvidenceDirectoryData;
  facets: SmartQueryFacets;
  query: string;
  sort: SmartEvidenceSort;
}) {
  const {
    candidateLimitReached,
    loadState,
    page,
    records,
    totalPages,
    totalRecords,
  } = directory;
  const visibleEvidenceCount = records.reduce((total, record) => total + record.evidence.length, 0);
  const hasFilters = Boolean(query || hasSmartQueryConstraints(facets) || sort !== "newest");
  const activeConstraints = [
    ...facets.causes.map((cause) => `Cause: ${getSmartQueryCauseLabel(cause)}`),
    ...facets.evidenceStates.map((value) => `State: ${value}`),
    facets.verified === true
      ? "Fully accepted only"
      : facets.verified === false
        ? "Not fully accepted"
        : null,
  ].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);

  return (
    <div className={styles.shell} data-testid="evidence-product-shell">
      <aside aria-label="Evidence sections" className={styles.rail}>
        <div className={styles.railGroup}>
          <p className={styles.railLabel}>Ledger</p>
          <nav aria-label="Evidence navigation" className={styles.railNav}>
            <Link
              aria-current="page"
              className={`${styles.railLink} ${styles.railLinkActive}`}
              href="/evidence"
            >
              <IconMark name="evidence" />
              <strong>All evidence</strong>
              <span>{loadState === "ready" ? totalRecords : "—"}</span>
            </Link>
            <Link className={styles.railLink} href="/evidence/example">
              <IconMark name="review" />
              <strong>Review guide</strong>
              <span>Example</span>
            </Link>
          </nav>
        </div>

        <div className={styles.railGroup}>
          <p className={styles.railLabel}>Scope</p>
          <div className={styles.railFact}>
            <span aria-hidden="true" className={styles.railDot} />
            <span>Grouped by trade</span>
          </div>
          <div className={styles.railFact}>
            <span aria-hidden="true" className={styles.railDot} />
            <span>Public-safe artifacts</span>
          </div>
          <div className={styles.railFact}>
            <span aria-hidden="true" className={styles.railDot} />
            <span>{hasFilters ? "Constraint-first ranking" : "Newest first"}</span>
          </div>
        </div>

        <div className={styles.railNote}>
          <IconMark name="lock" />
          <strong>Public evidence, not public exposure.</strong>
          <p>Private identifiers and unrelated personal details stay outside the public ledger.</p>
          <Link href="/privacy">Read the privacy standard</Link>
        </div>
      </aside>

      <div className={styles.workspace}>
        <section className={styles.hero}>
          <div>
            <p className={styles.kicker}>Global evidence ledger</p>
            <h1>Evidence</h1>
            <p className={styles.lead}>
              Every public-safe artifact from every Moral Trade appears here, grouped by trade.
              Open any record to inspect the complete dossier, review state, redactions, and
              chronology.
            </p>
          </div>
          <div className={styles.heroFacts} aria-label="Ledger scope">
            <div><span>Records</span><strong>{loadState === "ready" ? totalRecords : "Unavailable"}</strong></div>
            <div><span>Visibility</span><strong>Public-safe only</strong></div>
          </div>
        </section>

        <section aria-labelledby="published-evidence-heading" className={styles.ledger}>
          <div className={styles.sectionHead}>
            <div>
              <p className={styles.sectionKicker}>Every moral trade</p>
              <h2 id="published-evidence-heading">Published evidence</h2>
            </div>
            <span className={styles.count}>
              {loadState === "ready"
                ? `${totalRecords} ${hasFilters ? "matching " : ""}trade${totalRecords === 1 ? "" : "s"}${records.length ? ` · ${visibleEvidenceCount} item${visibleEvidenceCount === 1 ? "" : "s"} on this page` : ""}`
                : "Evidence temporarily unavailable"}
            </span>
          </div>

          <SmartQueryForm
            action="/evidence"
            className="panel stack-form"
            method="get"
            queryName="q"
            surface="evidence"
          >
            <div className="field-grid">
              <label className="field">
                <span>Search public evidence</span>
                <input
                  defaultValue={query}
                  name="q"
                  placeholder="e.g. accepted animal-welfare receipts"
                  type="search"
                />
              </label>
              <label className="field">
                <span>Sort</span>
                <select defaultValue={sort} name="sort">
                  {EVIDENCE_SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button className="button button-primary" type="submit">Apply smart search</button>
              {hasFilters ? (
                <Link className="button button-secondary" href="/evidence">Clear search</Link>
              ) : null}
            </div>
            {query || activeConstraints.length ? (
              <div className="tag-row" aria-live="polite">
                {query ? <span className="badge">Query: {query}</span> : null}
                {activeConstraints.map((value) => <span className="badge" key={value}>{value}</span>)}
              </div>
            ) : null}
            <p className="form-help">
              Search considers public-safe causes, actions, evidence rules, artifact titles,
              summaries, types, groups, and review states. Private files, participant-only notes,
              identities, challenge evidence, and storage paths are never search inputs.
            </p>
          </SmartQueryForm>

          {candidateLimitReached ? (
            <div className="status-banner" role="status">
              Search ranked the newest {SMART_EVIDENCE_CANDIDATE_LIMIT.toLocaleString()} public-safe records.
              Add a cause or review state to narrow a larger ledger.
            </div>
          ) : null}

          <div className={styles.resultBar}>
            <span><strong>{loadState === "ready" ? totalRecords : "—"}</strong> {hasFilters ? "matching " : ""}public trade records</span>
            <span>
              {hasFilters
                ? "Hard constraints → semantic relevance → accepted evidence → saved cause fit"
                : "Public-safe artifacts · newest first"}
            </span>
          </div>

          {loadState === "unavailable" ? (
            <div className={styles.empty} data-testid="evidence-unavailable-state">
              <div aria-hidden="true" className={styles.emptyCount}>—</div>
              <div role="status">
                <p className={styles.emptyLabel}>Ledger unavailable</p>
                <h3>Evidence could not be loaded.</h3>
                <p>
                  Nothing is being reported as empty while the ledger is unavailable. Please try
                  again before relying on the current count.
                </p>
              </div>
              <div className={styles.emptyActions}>
                <form action="/evidence" method="get">
                  <button className={styles.primaryAction} type="submit">Try again</button>
                </form>
                <Link className={styles.secondaryAction} href="/privacy">Privacy standard</Link>
              </div>
            </div>
          ) : records.length ? (
            <div className={styles.records} data-testid="evidence-record-list">
              {records.map((record) => {
                const reviewState = recordReviewState(record);
                const titleId = `evidence-record-title-${record.id}`;
                return (
                  <article
                    aria-labelledby={titleId}
                    className={styles.recordCard}
                    data-testid="evidence-record"
                    key={record.id}
                  >
                    <div className={styles.recordTitle}>
                      <small className={`${styles.recordStatus} ${reviewState.className}`}>{reviewState.label}</small>
                      <h3 id={titleId}>
                        <Link href={`/evidence/${record.id}`}>
                          {record.offeredCause} ↔ {record.requestedCause}
                        </Link>
                      </h3>
                      <span>{record.proposer} → {record.responder}</span>
                    </div>
                    <dl className={styles.recordMeta}>
                      <div>
                        <dt>Evidence</dt>
                        <dd>{record.evidence.length} public item{record.evidence.length === 1 ? "" : "s"}</dd>
                      </div>
                      <div>
                        <dt>Updated</dt>
                        <dd>{formatDate(record.updatedAt)}</dd>
                      </div>
                    </dl>
                    <Link
                      aria-label={`Inspect evidence dossier for ${record.offeredCause} and ${record.requestedCause}`}
                      className={styles.inspect}
                      href={`/evidence/${record.id}`}
                    >
                      Inspect →
                    </Link>
                    <ol
                      aria-label={`Evidence submitted for ${record.offeredCause} and ${record.requestedCause}`}
                      className={styles.recordItems}
                    >
                      {record.evidence.map((item, index) => (
                        <li key={item.id}>
                          <i className={styles.itemIndex}>{String(index + 1).padStart(2, "0")}</i>
                          <span className={styles.itemCopy}>
                            <strong>{item.title}</strong>
                            <small>{item.submittedBy} · {formatDate(item.submittedAt)}</small>
                          </span>
                          <b className={styles.itemState}>{item.state} · {item.redactionState.replaceAll("_", " ")}</b>
                        </li>
                      ))}
                    </ol>
                  </article>
                );
              })}
              {totalPages > 1 ? (
                <nav aria-label="Evidence pages" className={styles.pagination}>
                  {page > 1 ? (
                    <Link href={buildEvidenceHref({ facets, page: page - 1, query, sort })}>← Previous page</Link>
                  ) : <span />}
                  <span>Page {page} of {totalPages}</span>
                  {page < totalPages ? (
                    <Link href={buildEvidenceHref({ facets, page: page + 1, query, sort })}>Next page →</Link>
                  ) : <span />}
                </nav>
              ) : null}
            </div>
          ) : (
            <div className={styles.empty} data-testid="evidence-empty-state">
              <div aria-hidden="true" className={styles.emptyCount}>0</div>
              <div role="status">
                <p className={styles.emptyLabel}>{hasFilters ? "Current search" : "Current ledger"}</p>
                <h3>{hasFilters ? "No public evidence satisfies every hard constraint." : "No evidence has been submitted yet."}</h3>
                <p>
                  {hasFilters
                    ? "Broaden the cause, review state, or verification requirement. Missing and private fields are never treated as matches."
                    : "There are no real Moral Trade evidence artifacts to list. The interface example below demonstrates the viewer but is not a trade, submission, or evidence record."}
                </p>
              </div>
              <div className={styles.emptyActions}>
                {hasFilters ? (
                  <Link className={styles.primaryAction} href="/evidence">Clear search</Link>
                ) : (
                  <Link className={styles.primaryAction} href="/discover">Browse trades</Link>
                )}
                <Link className={styles.secondaryAction} href="/evidence/example">Open example viewer</Link>
              </div>
            </div>
          )}
        </section>

        <section aria-labelledby="example-evidence-heading" className={styles.exampleSection}>
          <article className={styles.example}>
            <div className={styles.exampleCopy}>
              <p className={styles.exampleLabel}>Interface guide · no live data</p>
              <h2 id="example-evidence-heading">See how an evidence dossier is reviewed.</h2>
              <p>
                Open an illustrative meat-free-meal record to try artifact review, privacy details,
                evidence limits, and the proof timeline. It is not listed or counted as evidence.
              </p>
            </div>
            <Link className={styles.exampleAction} href="/evidence/example">Open illustrated viewer →</Link>
          </article>
        </section>
      </div>
    </div>
  );
}

async function Desk({
  record,
  viewerId,
}: {
  record: EvidenceRecord;
  viewerId: string | null;
}) {
  const isParticipant = Boolean(
    viewerId &&
      (viewerId === record.proposerId || viewerId === record.responderId),
  );
  let threadHref: string | null = null;

  if (isParticipant && !record.isExample) {
    try {
      const supabase = (await createClient()) as any;
      const { data } = await supabase
        .from("trade_threads")
        .select("id")
        .eq("agreement_id", record.id)
        .maybeSingle();
      threadHref = data?.id ? `/messages/${String(data.id)}` : null;
    } catch {
      threadHref = null;
    }
  }

  const viewerContext: EvidenceStageViewerContext = {
    viewerId: isParticipant ? viewerId : null,
    isParticipant,
    agreementHref: isParticipant && !record.isExample ? `/trade-agreements/${record.id}#evidence` : null,
    threadHref,
  };
  const publicRecord: EvidenceRecord = {
    ...record,
    proposerId: null,
    responderId: null,
    evidence: record.evidence.map((item) => ({
      ...item,
      submittedById: isParticipant ? item.submittedById : null,
      challengeReason: isParticipant ? item.challengeReason : null,
    })),
  };

  return <EvidenceStage record={publicRecord} viewer={viewerContext} />;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { recordId } = await params;
  const id = recordId?.[0];
  if (!id) return { title:"Public evidence", description:"Inspect the evidence, review state, redactions, and chronology behind Moral Trade records." };
  const record = await getRecord(id);
  if (!record) return { title:"Evidence record unavailable", robots:{index:false,follow:false} };
  return { title:record.isExample?"Example public evidence record":`${record.offeredCause} ↔ ${record.requestedCause} evidence`, description:"Inspect the public evidence, review state, redactions, and proof timeline for this Moral Trade record.", robots:record.isExample?{index:false,follow:false}:{index:true,follow:true}, alternates:record.isExample?undefined:{canonical:`/evidence/${record.id}`} };
}

export default async function EvidencePage({ params, searchParams }: PageProps) {
  const [{ recordId }, resolvedSearchParams, viewer] = await Promise.all([
    params,
    searchParams,
    getViewer(),
  ]);
  const id = recordId?.[0];
  const record = id ? await getRecord(id, viewer?.authUser.id ?? null) : null;
  if (id && !record) notFound();
  const query = readParam(resolvedSearchParams, "q").trim().slice(0, 500);
  const parsed = parseSmartQuery(query, { surface: "evidence" });
  const facets = mergeSmartQueryFacets(
    parsed.facets,
    parseSerializedSmartQueryFacets(resolvedSearchParams),
  );
  const hasSmartSearch = Boolean(query || hasSmartQueryConstraints(facets));
  const sort = parseEvidenceSort(
    readParam(resolvedSearchParams, "sort") || facets.sort || "",
    hasSmartSearch,
  );
  const personalPriorities = id
    ? []
    : await loadSmartQueryCausePriorities(viewer?.authUser.id);
  const directory = id
    ? {
        candidateLimitReached: false,
        loadState: "ready" as const,
        page: 1,
        records: [],
        totalPages: 1,
        totalRecords: 0,
      }
    : await listRecords({
        facets,
        page: pageNumber(resolvedSearchParams.page),
        personalPriorities,
        query,
        sort,
      });
  return (
    <div className={record ? undefined : styles.page}>
      {!record ? (
        <header className={styles.header}>
          <SiteTopbar
            brandHref="/"
            links={getPrimaryNavLinks(Boolean(viewer))}
            {...getTopbarActions(Boolean(viewer))}
            showSearch
            showLogout={Boolean(viewer)}
          />
        </header>
      ) : null}
      <main className={record ? styles.recordPage : styles.main} id="main-content" tabIndex={-1}>
        {record ? (
          <Desk record={record} viewerId={viewer?.authUser.id ?? null} />
        ) : (
          <Directory directory={directory} facets={facets} query={query} sort={sort} />
        )}
      </main>
      {!record ? <SiteFooter /> : null}
    </div>
  );
}
