import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  decryptTradeInvitationToken,
  hashTradeInvitationToken,
  type TradeInvitationPreview,
} from "@/lib/trade-invitations";

export const CORE_OFFER_STATES = [
  "draft",
  "pending_review",
  "published",
  "changes_requested",
  "rejected",
  "paused",
  "closed",
  "deleted",
] as const;

export type CoreOfferState = (typeof CORE_OFFER_STATES)[number];

export interface CoreOffer {
  id: string;
  owner_id: string;
  owner_alias: string;
  mode: string;
  offered_cause: string;
  requested_cause: string;
  offer_action: string;
  request_action: string;
  verification: string;
  duration: string;
  notes: string;
  status: string;
  workflow_status: CoreOfferState;
  moderation_reason: string;
  no_trade_baseline: string;
  start_date: string | null;
  exit_conditions: string;
  maximum_burden: string;
  privacy_scope: string;
  evidence_due_date: string | null;
  terms_version: number;
  submitted_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CoreProfile {
  id: string;
  display_name: string | null;
}

export interface CoreInvitation {
  id: string;
  offer_id: string;
  sender_id: string;
  recipient_user_id: string | null;
  recipient_email: string;
  token: string;
  delivery_kind: "email" | "share_link";
  message: string;
  status: string;
  opened_at: string | null;
  responded_at: string | null;
  expires_at: string;
  revoked_at: string | null;
  revocation_reason: string;
  created_at: string;
}

export interface CoreCounterproposal {
  id: string;
  thread_id: string;
  offer_id: string;
  proposer_id: string;
  version: number;
  status: string;
  proposed_action: string;
  requested_action: string;
  duration: string;
  start_date: string | null;
  evidence_rule: string;
  evidence_due_date: string | null;
  exit_conditions: string;
  maximum_burden: string;
  privacy_scope: string;
  no_trade_baseline: string;
  terms_hash: string;
  created_at: string;
  responded_at: string | null;
}

export interface CoreThreadSummary {
  id: string;
  offerId: string;
  offerTitle: string;
  counterpart: CoreProfile | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  status: string;
  agreementId: string | null;
}

export interface CoreThreadDetail {
  thread: Record<string, any>;
  offer: CoreOffer;
  viewer: CoreProfile;
  counterpart: CoreProfile | null;
  messages: Array<Record<string, any>>;
  proposals: CoreCounterproposal[];
  latestProposal: CoreCounterproposal | null;
  blocked: boolean;
  agreementId: string | null;
  interestId: string | null;
}

export interface CoreAgreementDetail {
  agreement: Record<string, any>;
  offer: CoreOffer | null;
  version: Record<string, any> | null;
  versions: Array<Record<string, any>>;
  confirmations: Array<Record<string, any>>;
  milestones: Array<Record<string, any>>;
  evidenceBundles: Array<Record<string, any>>;
  evidenceBundleItems: Array<Record<string, any> & { signedUrl: string | null }>;
  milestoneReviews: Array<Record<string, any>>;
  milestoneAppeals: Array<Record<string, any>>;
  milestonePayouts: Array<Record<string, any>>;
  externalPaymentReceipts: Array<Record<string, any>>;
  paymentReviewCases: Array<Record<string, any>>;
  paymentReviewDecisions: Array<Record<string, any>>;
  paymentAppeals: Array<Record<string, any>>;
  evidence: Array<Record<string, any> & { signedUrl: string | null }>;
  completionConfirmations: Array<Record<string, any>>;
  exitRequests: Array<Record<string, any>>;
  proposer: CoreProfile | null;
  responder: CoreProfile | null;
  threadId: string | null;
}

function toCoreOffer(row: Record<string, any>): CoreOffer {
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    owner_alias: String(row.owner_alias ?? "Participant"),
    mode: String(row.mode ?? "pledge"),
    offered_cause: String(row.offered_cause ?? ""),
    requested_cause: String(row.requested_cause ?? ""),
    offer_action: String(row.offer_action ?? ""),
    request_action: String(row.request_action ?? ""),
    verification: String(row.verification ?? ""),
    duration: String(row.duration ?? ""),
    notes: String(row.notes ?? ""),
    status: String(row.status ?? "paused"),
    workflow_status: CORE_OFFER_STATES.includes(row.workflow_status as CoreOfferState)
      ? (row.workflow_status as CoreOfferState)
      : "draft",
    moderation_reason: String(row.moderation_reason ?? ""),
    no_trade_baseline: String(row.no_trade_baseline ?? ""),
    start_date: row.start_date ? String(row.start_date) : null,
    exit_conditions: String(row.exit_conditions ?? ""),
    maximum_burden: String(row.maximum_burden ?? ""),
    privacy_scope: String(row.privacy_scope ?? "Participants and operator only"),
    evidence_due_date: row.evidence_due_date ? String(row.evidence_due_date) : null,
    terms_version: Number(row.terms_version ?? 1),
    submitted_at: row.submitted_at ? String(row.submitted_at) : null,
    published_at: row.published_at ? String(row.published_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function toProfile(row: Record<string, any> | null | undefined): CoreProfile | null {
  if (!row?.id) return null;
  return {
    id: String(row.id),
    display_name: row.display_name ? String(row.display_name) : null,
  };
}

async function loadProfiles(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const result = new Map<string, CoreProfile>();
  if (!unique.length) return result;

  const supabase = (await createClient()) as any;
  const { data } = await supabase.rpc("get_safe_profile_labels_v1", {
    p_profile_ids: unique,
  });

  for (const row of data ?? []) {
    const profile = toProfile(row);
    if (profile) result.set(profile.id, profile);
  }
  return result;
}

async function loadOffers(ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  const result = new Map<string, CoreOffer>();
  if (!unique.length) return result;

  const supabase = (await createClient()) as any;
  const { data } = await supabase.from("offers").select("*").in("id", unique);
  for (const row of data ?? []) {
    const offer = toCoreOffer(row);
    result.set(offer.id, offer);
  }
  return result;
}

export async function getCoreOfferForOwner(offerId: string, ownerId: string) {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase
    .from("offers")
    .select("*")
    .eq("id", offerId)
    .eq("owner_id", ownerId)
    .neq("workflow_status", "deleted")
    .maybeSingle();

  if (error || !data) return null;
  return toCoreOffer(data);
}

export async function listCoreOffersForOwner(ownerId: string): Promise<CoreOffer[]> {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from("offers")
    .select("*")
    .eq("owner_id", ownerId)
    .neq("workflow_status", "deleted")
    .order("updated_at", { ascending: false });
  return (data ?? []).map(toCoreOffer);
}

export async function listTradeInvitationsForOffer(
  offerId: string,
  senderId: string,
): Promise<CoreInvitation[]> {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from("trade_invitations")
    .select(
      "id,offer_id,sender_id,recipient_user_id,recipient_email,token_ciphertext,delivery_kind,message,status,opened_at,responded_at,expires_at,revoked_at,revocation_reason,created_at",
    )
    .eq("offer_id", offerId)
    .eq("sender_id", senderId)
    .order("created_at", { ascending: false });
  return (data ?? []).map((row: Record<string, any>) => ({
    id: String(row.id),
    offer_id: String(row.offer_id),
    sender_id: String(row.sender_id),
    recipient_user_id: row.recipient_user_id ? String(row.recipient_user_id) : null,
    recipient_email: String(row.recipient_email ?? ""),
    token: decryptTradeInvitationToken(
      row.token_ciphertext ? String(row.token_ciphertext) : "",
      String(row.id),
    ),
    delivery_kind: row.delivery_kind === "email" ? "email" : "share_link",
    message: String(row.message ?? ""),
    status: String(row.status),
    opened_at: row.opened_at ? String(row.opened_at) : null,
    responded_at: row.responded_at ? String(row.responded_at) : null,
    expires_at: String(row.expires_at),
    revoked_at: row.revoked_at ? String(row.revoked_at) : null,
    revocation_reason: String(row.revocation_reason ?? ""),
    created_at: String(row.created_at),
  })) satisfies CoreInvitation[];
}

export async function listReciprocalMatches(offer: CoreOffer): Promise<CoreOffer[]> {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from("offers")
    .select("*")
    .eq("workflow_status", "published")
    .eq("status", "open")
    .eq("mode", offer.mode)
    .neq("owner_id", offer.owner_id)
    .neq("id", offer.id)
    .ilike("offered_cause", offer.requested_cause)
    .ilike("requested_cause", offer.offered_cause)
    .limit(8);
  return (data ?? []).map(toCoreOffer);
}

export async function getInvitationByToken(token: string, actorId?: string | null) {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase.rpc("preview_trade_invitation_v2", {
    p_actor_id: actorId ?? null,
    p_token_hash: hashTradeInvitationToken(token),
  });
  if (error || !data) return null;
  return data as TradeInvitationPreview;
}

export async function listThreadsForUser(userId: string): Promise<CoreThreadSummary[]> {
  const supabase = (await createClient()) as any;
  const { data: threads } = await supabase
    .from("trade_threads")
    .select("*")
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .order("last_message_at", { ascending: false });

  if (!threads?.length) return [];

  const threadIds = threads.map((thread: any) => String(thread.id));
  const offerMap = await loadOffers(threads.map((thread: any) => String(thread.offer_id)));
  const counterpartIds = threads.map((thread: any) =>
    String(thread.participant_a) === userId ? String(thread.participant_b) : String(thread.participant_a),
  );
  const profileMap = await loadProfiles(counterpartIds);

  const [{ data: messages }, { data: reads }] = await Promise.all([
    supabase
      .from("trade_messages")
      .select("thread_id,sender_id,body,created_at")
      .in("thread_id", threadIds)
      .order("created_at", { ascending: false }),
    supabase.from("trade_thread_reads").select("thread_id,last_read_at").eq("user_id", userId),
  ]);

  const readByThread = new Map<string, string>();
  for (const read of reads ?? []) readByThread.set(String(read.thread_id), String(read.last_read_at));

  const lastByThread = new Map<string, any>();
  const unreadByThread = new Map<string, number>();
  for (const message of messages ?? []) {
    const threadId = String(message.thread_id);
    if (!lastByThread.has(threadId)) lastByThread.set(threadId, message);
    const readAt = readByThread.get(threadId);
    if (String(message.sender_id ?? "") !== userId && (!readAt || String(message.created_at) > readAt)) {
      unreadByThread.set(threadId, (unreadByThread.get(threadId) ?? 0) + 1);
    }
  }

  return threads.map((thread: any) => {
    const offer = offerMap.get(String(thread.offer_id));
    const counterpartId =
      String(thread.participant_a) === userId ? String(thread.participant_b) : String(thread.participant_a);
    const last = lastByThread.get(String(thread.id));
    return {
      id: String(thread.id),
      offerId: String(thread.offer_id),
      offerTitle: offer
        ? `${offer.offered_cause} ↔ ${offer.requested_cause}`
        : "Moral Trade proposal",
      counterpart: profileMap.get(counterpartId) ?? null,
      lastMessage: last ? String(last.body) : "No messages yet.",
      lastMessageAt: last ? String(last.created_at) : String(thread.last_message_at),
      unreadCount: unreadByThread.get(String(thread.id)) ?? 0,
      status: String(thread.status),
      agreementId: thread.agreement_id ? String(thread.agreement_id) : null,
    };
  });
}

export async function getThreadForUser(threadId: string, userId: string): Promise<CoreThreadDetail | null> {
  const supabase = (await createClient()) as any;
  const { data: thread } = await supabase
    .from("trade_threads")
    .select("*")
    .eq("id", threadId)
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`)
    .maybeSingle();
  if (!thread) return null;

  const counterpartId =
    String(thread.participant_a) === userId ? String(thread.participant_b) : String(thread.participant_a);
  const [offerMap, profileMap, messagesResult, proposalsResult, blocksResult, interestsResult] = await Promise.all([
    loadOffers([String(thread.offer_id)]),
    loadProfiles([userId, counterpartId]),
    supabase.from("trade_messages").select("*").eq("thread_id", threadId).order("created_at", { ascending: true }),
    supabase
      .from("trade_counterproposals")
      .select("*")
      .eq("thread_id", threadId)
      .order("version", { ascending: true }),
    supabase.from("trade_blocks").select("id").eq("thread_id", threadId).limit(1),
    supabase.from("interests").select("id,user_id,status").eq("offer_id", thread.offer_id),
  ]);

  const offer = offerMap.get(String(thread.offer_id));
  const viewer = profileMap.get(userId);
  if (!offer || !viewer) return null;

  await supabase.from("trade_thread_reads").upsert(
    { thread_id: threadId, user_id: userId, last_read_at: new Date().toISOString() },
    { onConflict: "thread_id,user_id" },
  );

  const proposals = (proposalsResult.data ?? []) as CoreCounterproposal[];
  const latestProposal = proposals.length ? proposals[proposals.length - 1] : null;
  const interest = (interestsResult.data ?? []).find((row: any) => String(row.user_id) === userId);

  return {
    thread,
    offer,
    viewer,
    counterpart: profileMap.get(counterpartId) ?? null,
    messages: messagesResult.data ?? [],
    proposals,
    latestProposal,
    blocked: Boolean(blocksResult.data?.length) || thread.status === "blocked",
    agreementId: thread.agreement_id ? String(thread.agreement_id) : null,
    interestId: interest?.id ? String(interest.id) : null,
  };
}

export async function getCoreAgreementForUser(
  agreementId: string,
  userId: string,
): Promise<CoreAgreementDetail | null> {
  const supabase = (await createClient()) as any;
  const { data: agreement } = await supabase
    .from("agreements")
    .select("*")
    .eq("id", agreementId)
    .or(`proposer_id.eq.${userId},responder_id.eq.${userId}`)
    .maybeSingle();
  if (!agreement) return null;

  const [
    offerMap,
    profileMap,
    versionsResult,
    confirmationsResult,
    evidenceResult,
    milestonesResult,
    completionResult,
    exitResult,
    threadResult,
  ] = await Promise.all([
      loadOffers(agreement.offer_id ? [String(agreement.offer_id)] : []),
      loadProfiles([String(agreement.proposer_id), String(agreement.responder_id)]),
      supabase
        .from("trade_agreement_versions")
        .select("*")
        .eq("agreement_id", agreementId)
        .order("version", { ascending: false }),
      supabase
        .from("trade_agreement_confirmations")
        .select("*")
        .in(
          "agreement_version_id",
          agreement.current_version_id ? [String(agreement.current_version_id)] : ["00000000-0000-0000-0000-000000000000"],
        ),
      supabase
        .from("trade_evidence_items")
        .select("*")
        .eq("agreement_id", agreementId)
        .order("created_at", { ascending: false }),
      supabase
        .from("trade_agreement_milestones")
        .select("*")
        .eq("agreement_version_id", String(agreement.current_version_id))
        .order("position", { ascending: true }),
      supabase.from("trade_completion_confirmations").select("*").eq("agreement_id", agreementId),
      supabase
        .from("trade_exit_requests")
        .select("*")
        .eq("agreement_id", agreementId)
        .order("created_at", { ascending: false }),
      supabase.from("trade_threads").select("id").eq("agreement_id", agreementId).maybeSingle(),
    ]);

  const versions = versionsResult.data ?? [];
  const version = versions.find((row: any) => String(row.id) === String(agreement.current_version_id)) ?? versions[0] ?? null;
  const milestones = milestonesResult.data ?? [];
  const milestoneIds = milestones.map((row: any) => String(row.id));
  const bundlesResult = milestoneIds.length
    ? await supabase
        .from("trade_evidence_bundles")
        .select("*")
        .in("milestone_id", milestoneIds)
        .order("created_at", { ascending: false })
    : { data: [] };
  const evidenceBundles = bundlesResult.data ?? [];
  const bundleIds = evidenceBundles.map((row: any) => String(row.id));
  const [
    bundleItemsResult,
    milestoneReviewsResult,
    milestoneAppealsResult,
    milestonePayoutsResult,
  ] = await Promise.all([
    bundleIds.length
      ? supabase
          .from("trade_evidence_bundle_items")
          .select("*")
          .in("bundle_id", bundleIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    milestoneIds.length
      ? supabase
          .from("trade_milestone_reviews")
          .select("*")
          .in("milestone_id", milestoneIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    milestoneIds.length
      ? supabase
          .from("trade_milestone_appeals")
          .select("*")
          .in("milestone_id", milestoneIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    milestoneIds.length
      ? supabase
          .from("trade_milestone_payouts")
          .select("*")
          .in("milestone_id", milestoneIds)
      : Promise.resolve({ data: [] }),
  ]);
  const milestonePayouts = milestonePayoutsResult.data ?? [];
  const payoutIds = milestonePayouts.map((row: any) => String(row.id));
  const [externalPaymentReceiptsResult, paymentReviewCasesResult] =
    payoutIds.length
      ? await Promise.all([
          supabase
            .from("trade_external_payment_receipts")
            .select("*")
            .in("payout_id", payoutIds)
            .order("payment_cycle", { ascending: false })
            .order("attempt_number", { ascending: false }),
          supabase
            .from("trade_payment_review_cases")
            .select("*")
            .in("payout_id", payoutIds)
            .order("payment_cycle", { ascending: false }),
        ])
      : [{ data: [] }, { data: [] }];
  const paymentReviewCases = paymentReviewCasesResult.data ?? [];
  const paymentCaseIds = paymentReviewCases.map((row: any) => String(row.id));
  const [paymentReviewDecisionsResult, paymentAppealsResult] =
    paymentCaseIds.length
      ? await Promise.all([
          supabase
            .from("trade_payment_review_decisions")
            .select("*")
            .in("case_id", paymentCaseIds)
            .order("created_at", { ascending: false }),
          supabase
            .from("trade_payment_appeals")
            .select("*")
            .in("case_id", paymentCaseIds)
            .order("created_at", { ascending: false }),
        ])
      : [{ data: [] }, { data: [] }];
  const evidenceWithUrls = await Promise.all(
    (evidenceResult.data ?? []).map(async (item: any) => {
      let signedUrl: string | null = null;
      if (item.storage_path) {
        const { data } = await supabase.storage.from("trade-evidence").createSignedUrl(String(item.storage_path), 3600);
        signedUrl = data?.signedUrl ?? null;
      }
      return { ...item, signedUrl };
    }),
  );
  const bundleItemsWithUrls = await Promise.all(
    (bundleItemsResult.data ?? []).map(async (item: any) => {
      let signedUrl: string | null = null;
      if (item.storage_path) {
        const { data } = await supabase.storage
          .from("trade-evidence")
          .createSignedUrl(String(item.storage_path), 3600);
        signedUrl = data?.signedUrl ?? null;
      }
      return { ...item, signedUrl };
    }),
  );
  const externalPaymentReceiptsWithUrls = await Promise.all(
    (externalPaymentReceiptsResult.data ?? []).map(async (receipt: any) => {
      let signedUrl: string | null = null;
      if (receipt.receipt_storage_path) {
        const { data } = await supabase.storage
          .from("trade-evidence")
          .createSignedUrl(String(receipt.receipt_storage_path), 3600);
        signedUrl = data?.signedUrl ?? null;
      }
      return { ...receipt, signedUrl };
    }),
  );

  return {
    agreement,
    offer: agreement.offer_id ? offerMap.get(String(agreement.offer_id)) ?? null : null,
    version,
    versions,
    confirmations: confirmationsResult.data ?? [],
    milestones,
    evidenceBundles,
    evidenceBundleItems: bundleItemsWithUrls,
    milestoneReviews: milestoneReviewsResult.data ?? [],
    milestoneAppeals: milestoneAppealsResult.data ?? [],
    milestonePayouts,
    externalPaymentReceipts: externalPaymentReceiptsWithUrls,
    paymentReviewCases,
    paymentReviewDecisions: paymentReviewDecisionsResult.data ?? [],
    paymentAppeals: paymentAppealsResult.data ?? [],
    evidence: evidenceWithUrls,
    completionConfirmations: completionResult.data ?? [],
    exitRequests: exitResult.data ?? [],
    proposer: profileMap.get(String(agreement.proposer_id)) ?? null,
    responder: profileMap.get(String(agreement.responder_id)) ?? null,
    threadId: threadResult.data?.id ? String(threadResult.data.id) : null,
  };
}

export async function listTradeNotifications(userId: string, limit = 20) {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from("trade_notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}

export async function listTradeReviewerCandidates() {
  const supabase = (await createClient()) as any;
  const { data, error } = await supabase.rpc("list_trade_reviewer_candidates_v1");
  if (error) return [];
  return (data ?? []).map((row: Record<string, any>) => ({
    id: String(row.profile_id),
    label: String(row.display_name ?? "Neutral reviewer"),
  }));
}

export async function listTradeReviewQueue() {
  const supabase = (await createClient()) as any;
  const [{ data: offers }, { data: reports }] = await Promise.all([
    supabase
      .from("offers")
      .select("*")
      .in("workflow_status", ["pending_review", "changes_requested", "rejected", "paused"])
      .neq("workflow_status", "deleted")
      .order("submitted_at", { ascending: true, nullsFirst: false }),
    supabase
      .from("trade_reports")
      .select("*")
      .in("status", ["open", "reviewing"])
      .order("created_at", { ascending: true }),
  ]);
  const ownerMap = await loadProfiles((offers ?? []).map((offer: any) => String(offer.owner_id)));
  return {
    offers: (offers ?? []).map((row: any) => ({
      offer: toCoreOffer(row),
      owner: ownerMap.get(String(row.owner_id)) ?? null,
    })),
    reports: reports ?? [],
  };
}

export async function getCoreLoopAnalytics() {
  const supabase = createServiceClient() as any;
  const [{ data: summary }, { data: recent }] = await Promise.all([
    supabase.from("core_loop_funnel_summary").select("*").order("event_type"),
    supabase
      .from("core_loop_events")
      .select("event_type,profile_id,entity_type,entity_id,created_at")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  return { summary: summary ?? [], recent: recent ?? [] };
}
