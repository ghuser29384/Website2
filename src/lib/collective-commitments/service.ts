import "server-only";

import { randomUUID } from "node:crypto";

import {
  assertCollectiveCommitmentsReady,
  getCollectiveCommitmentMinimumDeadlineMinutes,
} from "@/lib/collective-commitments/config";
import {
  canonicalRevealString,
  createAccountToken,
  createHumanToken,
  createIdentityCommitment,
  createRevealNonce,
  decryptSignaturePayload,
  deriveRevealMacKey,
  encryptSignaturePayload,
  generateCommitmentDataKey,
  hmacSha256Hex,
  sha256Hex,
  unwrapCommitmentDataKey,
  wrapCommitmentDataKey,
  type EncryptedPayload,
} from "@/lib/collective-commitments/crypto";
import { createCollectiveCommitmentServiceClient } from "@/lib/collective-commitments/service-client";
import {
  canonicalizeFrozenTerms,
  type CollectiveCommitmentDetail,
  type CollectiveCommitmentReceipt,
  type CollectiveCommitmentSummary,
  type CollectiveIdentityCredential,
  type CollectivePropositionType,
  type CollectivePublicSigner,
  type CollectiveRiskDimension,
  type FrozenCollectiveCommitmentTerms,
} from "@/lib/collective-commitments/types";

interface CredentialRow {
  id: string;
  profile_id: string;
  credential_version: number;
  status: CollectiveIdentityCredential["status"];
  verified_real_name: string;
  verified_affiliation: string;
  human_uniqueness_ref_hash: string;
  provider: string;
  verification_method: string;
  assurance_tier: string;
  duplicate_check_result: CollectiveIdentityCredential["duplicateCheckResult"];
  manual_review_status: CollectiveIdentityCredential["manualReviewStatus"];
  verified_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CommitmentRow {
  id: string;
  creator_id: string;
  title: string;
  proposition_type: CollectivePropositionType;
  proposition_text: string;
  requirements_text: string;
  eligibility_rule: string;
  threshold_count: number;
  deadline_at: string;
  risk_class: "standard" | "high";
  risk_dimensions: CollectiveRiskDimension[];
  status: CollectiveCommitmentSummary["status"];
  terms_hash: string;
  created_at: string;
  activated_at: string | null;
  expired_at: string | null;
}

interface KeyRow {
  commitment_id: string;
  wrapped_key_ciphertext: string;
  wrapped_key_iv: string;
  wrapped_key_tag: string;
}

interface PrivateSignatureRow {
  id: string;
  commitment_id: string;
  identity_commitment: string;
  reveal_nonce: string;
  encrypted_identity_payload: string;
  payload_iv: string;
  payload_tag: string;
  signed_at: string;
}

interface SignaturePayload {
  profileId: string;
  credentialId: string;
  credentialVersion: number;
  verifiedRealName: string;
  verifiedAffiliation: string | null;
  credentialVerifiedAt: string;
  credentialExpiresAt: string | null;
  revealNonce: string;
  identityCommitment: string;
}

interface PublicSignerRow {
  id: string;
  commitment_id: string;
  ordinal: number;
  verified_real_name: string;
  verified_affiliation: string | null;
  signed_at: string;
  revealed_at: string;
  identity_commitment: string;
}

interface ReceiptRow {
  id: string;
  commitment_id: string;
  outcome: "active" | "expired";
  terms_hash: string;
  signer_manifest_hash: string | null;
  signer_count: number;
  receipt_hash: string;
  created_at: string;
}

function requireData<T>(data: T | null, error: { message: string } | null, fallback: string): T {
  if (error) throw new Error(error.message);
  if (data == null) throw new Error(fallback);
  return data;
}

function mapCredential(row: CredentialRow): CollectiveIdentityCredential {
  return {
    id: row.id,
    profileId: row.profile_id,
    credentialVersion: row.credential_version,
    status: row.status,
    verifiedRealName: row.verified_real_name,
    verifiedAffiliation: row.verified_affiliation,
    provider: row.provider,
    verificationMethod: row.verification_method,
    assuranceTier: row.assurance_tier,
    duplicateCheckResult: row.duplicate_check_result,
    manualReviewStatus: row.manual_review_status,
    verifiedAt: row.verified_at,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function credentialIsCurrent(row: CredentialRow, now = Date.now()) {
  return (
    row.status === "verified" &&
    row.manual_review_status === "approved" &&
    row.duplicate_check_result === "clear" &&
    Boolean(row.verified_at) &&
    (!row.expires_at || new Date(row.expires_at).getTime() > now)
  );
}

function mapPublicSigner(row: PublicSignerRow): CollectivePublicSigner {
  return {
    id: row.id,
    commitmentId: row.commitment_id,
    ordinal: row.ordinal,
    verifiedRealName: row.verified_real_name,
    verifiedAffiliation: row.verified_affiliation,
    signedAt: row.signed_at,
    revealedAt: row.revealed_at,
    identityCommitment: row.identity_commitment,
  };
}

function mapReceipt(row: ReceiptRow): CollectiveCommitmentReceipt {
  return {
    id: row.id,
    commitmentId: row.commitment_id,
    outcome: row.outcome,
    termsHash: row.terms_hash,
    signerManifestHash: row.signer_manifest_hash,
    signerCount: row.signer_count,
    receiptHash: row.receipt_hash,
    createdAt: row.created_at,
  };
}

async function loadCreatorNames(creatorIds: string[]) {
  const service = createCollectiveCommitmentServiceClient();
  const uniqueIds = [...new Set(creatorIds)];
  if (!uniqueIds.length) return new Map<string, string>();

  const { data, error } = await service
    .from("profiles")
    .select("id,display_name")
    .in("id", uniqueIds);
  if (error) throw new Error(error.message);

  return new Map(
    (data ?? []).map((row) => [
      String(row.id),
      String(row.display_name ?? "Verified creator"),
    ]),
  );
}

function mapSummary(
  row: CommitmentRow,
  creatorDisplayName: string,
  qualifyingSignerCount: number,
): CollectiveCommitmentSummary {
  return {
    id: row.id,
    creatorId: row.creator_id,
    creatorDisplayName,
    title: row.title,
    propositionType: row.proposition_type,
    propositionText: row.proposition_text,
    requirementsText: row.requirements_text,
    eligibilityRule: row.eligibility_rule,
    thresholdCount: Number(row.threshold_count),
    qualifyingSignerCount,
    deadlineAt: row.deadline_at,
    riskClass: row.risk_class,
    riskDimensions: row.risk_dimensions ?? [],
    status: row.status,
    termsHash: row.terms_hash,
    createdAt: row.created_at,
    activatedAt: row.activated_at,
    expiredAt: row.expired_at,
  };
}

async function loadKeyRow(commitmentId: string) {
  const service = createCollectiveCommitmentServiceClient();
  const result = await service
    .from("collective_commitment_keys")
    .select("commitment_id,wrapped_key_ciphertext,wrapped_key_iv,wrapped_key_tag")
    .eq("commitment_id", commitmentId)
    .maybeSingle();

  if (result.error) throw new Error(result.error.message);
  return result.data as KeyRow | null;
}

function unwrapKeyRow(row: KeyRow) {
  return unwrapCommitmentDataKey(row.commitment_id, {
    ciphertextBase64: row.wrapped_key_ciphertext,
    ivBase64: row.wrapped_key_iv,
    tagBase64: row.wrapped_key_tag,
  });
}

export async function getCollectiveIdentityCredential(profileId: string) {
  assertCollectiveCommitmentsReady();
  const service = createCollectiveCommitmentServiceClient();
  const { data, error } = await service
    .from("collective_identity_credentials")
    .select(
      "id,profile_id,credential_version,status,verified_real_name,verified_affiliation,human_uniqueness_ref_hash,provider,verification_method,assurance_tier,duplicate_check_result,manual_review_status,verified_at,expires_at,created_at,updated_at",
    )
    .eq("profile_id", profileId)
    .order("credential_version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapCredential(data as CredentialRow) : null;
}

export async function listCollectiveCommitments(): Promise<CollectiveCommitmentSummary[]> {
  assertCollectiveCommitmentsReady();
  const service = createCollectiveCommitmentServiceClient();
  const { data, error } = await service
    .from("collective_commitments")
    .select(
      "id,creator_id,title,proposition_type,proposition_text,requirements_text,eligibility_rule,threshold_count,deadline_at,risk_class,risk_dimensions,status,terms_hash,created_at,activated_at,expired_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as CommitmentRow[];
  const creatorNames = await loadCreatorNames(rows.map((row) => row.creator_id));

  const [privateResult, publicResult] = await Promise.all([
    service.from("collective_commitment_private_signatures").select("commitment_id"),
    service.from("collective_commitment_public_signers").select("commitment_id"),
  ]);
  if (privateResult.error) throw new Error(privateResult.error.message);
  if (publicResult.error) throw new Error(publicResult.error.message);

  const counts = new Map<string, number>();
  for (const row of [...(privateResult.data ?? []), ...(publicResult.data ?? [])]) {
    const id = String(row.commitment_id);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return rows.map((row) =>
    mapSummary(
      row,
      creatorNames.get(row.creator_id) ?? "Verified creator",
      counts.get(row.id) ?? 0,
    ),
  );
}

export async function getCollectiveCommitmentDetail(
  commitmentId: string,
  viewerProfileId?: string | null,
): Promise<CollectiveCommitmentDetail | null> {
  assertCollectiveCommitmentsReady();
  const service = createCollectiveCommitmentServiceClient();
  const { data, error } = await service
    .from("collective_commitments")
    .select(
      "id,creator_id,title,proposition_type,proposition_text,requirements_text,eligibility_rule,threshold_count,deadline_at,risk_class,risk_dimensions,status,terms_hash,created_at,activated_at,expired_at",
    )
    .eq("id", commitmentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const row = data as CommitmentRow;
  const [creatorNames, privateCountResult, publicResult, receiptResult] = await Promise.all([
    loadCreatorNames([row.creator_id]),
    service
      .from("collective_commitment_private_signatures")
      .select("id", { count: "exact", head: true })
      .eq("commitment_id", commitmentId),
    service
      .from("collective_commitment_public_signers")
      .select(
        "id,commitment_id,ordinal,verified_real_name,verified_affiliation,signed_at,revealed_at,identity_commitment",
      )
      .eq("commitment_id", commitmentId)
      .order("ordinal", { ascending: true }),
    service
      .from("collective_commitment_receipts")
      .select(
        "id,commitment_id,outcome,terms_hash,signer_manifest_hash,signer_count,receipt_hash,created_at",
      )
      .eq("commitment_id", commitmentId)
      .maybeSingle(),
  ]);

  if (privateCountResult.error) throw new Error(privateCountResult.error.message);
  if (publicResult.error) throw new Error(publicResult.error.message);
  if (receiptResult.error) throw new Error(receiptResult.error.message);

  const publicSigners = (publicResult.data ?? []).map((signer) =>
    mapPublicSigner(signer as PublicSignerRow),
  );
  const qualifyingSignerCount =
    row.status === "active" ? publicSigners.length : (privateCountResult.count ?? 0);

  let viewerHasSigned = false;
  let viewerCanSign = false;
  if (viewerProfileId && (row.status === "open" || row.status === "activating")) {
    const keyRow = await loadKeyRow(commitmentId);
    if (keyRow) {
      const dataKey = unwrapKeyRow(keyRow);
      const accountToken = createAccountToken(dataKey, viewerProfileId);
      const ownSignatureResult = await service
        .from("collective_commitment_private_signatures")
        .select("id")
        .eq("commitment_id", commitmentId)
        .eq("account_token", accountToken)
        .maybeSingle();
      if (ownSignatureResult.error) throw new Error(ownSignatureResult.error.message);
      viewerHasSigned = Boolean(ownSignatureResult.data);

      if (row.status === "open" && new Date(row.deadline_at).getTime() > Date.now()) {
        const credentialResult = await service
          .from("collective_identity_credentials")
          .select(
            "id,profile_id,credential_version,status,verified_real_name,verified_affiliation,human_uniqueness_ref_hash,provider,verification_method,assurance_tier,duplicate_check_result,manual_review_status,verified_at,expires_at,created_at,updated_at",
          )
          .eq("profile_id", viewerProfileId)
          .order("credential_version", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (credentialResult.error) throw new Error(credentialResult.error.message);
        viewerCanSign = Boolean(
          credentialResult.data && credentialIsCurrent(credentialResult.data as CredentialRow),
        );
      }
    }
  }

  return {
    ...mapSummary(
      row,
      creatorNames.get(row.creator_id) ?? "Verified creator",
      qualifyingSignerCount,
    ),
    publicSigners,
    receipt: receiptResult.data ? mapReceipt(receiptResult.data as ReceiptRow) : null,
    viewerHasSigned,
    viewerCanSign,
  };
}

export async function createCollectiveCommitment(input: {
  creatorId: string;
  title: string;
  propositionType: CollectivePropositionType;
  propositionText: string;
  requirementsText: string;
  eligibilityRule: string;
  thresholdCount: number;
  deadlineAt: string;
  riskClass: "standard" | "high";
  riskDimensions: CollectiveRiskDimension[];
}) {
  assertCollectiveCommitmentsReady();

  const deadline = new Date(input.deadlineAt);
  if (!Number.isFinite(deadline.getTime())) throw new Error("Enter a valid deadline.");
  const minimumDeadline = Date.now() + getCollectiveCommitmentMinimumDeadlineMinutes() * 60_000;
  if (deadline.getTime() < minimumDeadline) {
    throw new Error(
      `The deadline must be at least ${getCollectiveCommitmentMinimumDeadlineMinutes()} minutes from now.`,
    );
  }

  const id = randomUUID();
  const terms: FrozenCollectiveCommitmentTerms = {
    title: input.title,
    propositionType: input.propositionType,
    propositionText: input.propositionText,
    requirementsText: input.requirementsText,
    eligibilityRule: input.eligibilityRule,
    thresholdCount: input.thresholdCount,
    deadlineAt: deadline.toISOString(),
    riskClass: input.riskClass,
    riskDimensions: input.riskDimensions,
  };
  const termsHash = sha256Hex(canonicalizeFrozenTerms(terms));
  const wrapped = wrapCommitmentDataKey(id, generateCommitmentDataKey());
  const service = createCollectiveCommitmentServiceClient();
  const { data, error } = await service.rpc("create_collective_commitment_v1", {
    p_id: id,
    p_creator_id: input.creatorId,
    p_title: input.title.trim(),
    p_proposition_type: input.propositionType,
    p_proposition_text: input.propositionText.trim(),
    p_requirements_text: input.requirementsText.trim(),
    p_eligibility_rule: input.eligibilityRule.trim(),
    p_threshold_count: input.thresholdCount,
    p_deadline_at: deadline.toISOString(),
    p_risk_class: input.riskClass,
    p_risk_dimensions: input.riskDimensions,
    p_terms_hash: termsHash,
    p_wrapped_key_ciphertext: wrapped.ciphertextBase64,
    p_wrapped_key_iv: wrapped.ivBase64,
    p_wrapped_key_tag: wrapped.tagBase64,
  });
  requireData(data, error, "Could not create the collective commitment.");
  return { id, termsHash };
}

async function activateCollectiveCommitment(commitmentId: string, activationToken: string) {
  const service = createCollectiveCommitmentServiceClient();
  const keyRow = await loadKeyRow(commitmentId);
  if (!keyRow) throw new Error("The commitment key is unavailable for activation.");
  const dataKey = unwrapKeyRow(keyRow);

  const signatureResult = await service
    .from("collective_commitment_private_signatures")
    .select(
      "id,commitment_id,identity_commitment,reveal_nonce,encrypted_identity_payload,payload_iv,payload_tag,signed_at",
    )
    .eq("commitment_id", commitmentId)
    .order("signed_at", { ascending: true })
    .order("id", { ascending: true });
  if (signatureResult.error) throw new Error(signatureResult.error.message);
  const signatures = (signatureResult.data ?? []) as PrivateSignatureRow[];

  const decrypted = signatures.map((signature) => ({
    signature,
    payload: decryptSignaturePayload<SignaturePayload>(commitmentId, dataKey, {
      ciphertextBase64: signature.encrypted_identity_payload,
      ivBase64: signature.payload_iv,
      tagBase64: signature.payload_tag,
    }),
  }));

  const credentialIds = [...new Set(decrypted.map(({ payload }) => payload.credentialId))];
  const credentialResult = await service
    .from("collective_identity_credentials")
    .select(
      "id,profile_id,credential_version,status,verified_real_name,verified_affiliation,human_uniqueness_ref_hash,provider,verification_method,assurance_tier,duplicate_check_result,manual_review_status,verified_at,expires_at,created_at,updated_at",
    )
    .in("id", credentialIds);
  if (credentialResult.error) throw new Error(credentialResult.error.message);
  const credentials = new Map(
    (credentialResult.data ?? []).map((row) => [String(row.id), row as CredentialRow]),
  );

  const invalidSignatureIds: string[] = [];
  const manifest = decrypted.flatMap(({ signature, payload }) => {
    const credential = credentials.get(payload.credentialId);
    const current =
      credential &&
      credentialIsCurrent(credential) &&
      credential.profile_id === payload.profileId &&
      credential.credential_version === payload.credentialVersion &&
      credential.verified_real_name === payload.verifiedRealName &&
      (payload.verifiedAffiliation === null ||
        credential.verified_affiliation === payload.verifiedAffiliation) &&
      credential.verified_at === payload.credentialVerifiedAt &&
      credential.expires_at === payload.credentialExpiresAt &&
      signature.reveal_nonce === payload.revealNonce &&
      signature.identity_commitment === payload.identityCommitment;

    if (!current) {
      invalidSignatureIds.push(signature.id);
      return [];
    }

    return [
      {
        signatureId: signature.id,
        verifiedRealName: payload.verifiedRealName,
        verifiedAffiliation: payload.verifiedAffiliation,
        revealNonce: payload.revealNonce,
        identityCommitment: payload.identityCommitment,
      },
    ];
  });

  if (invalidSignatureIds.length) {
    const releaseResult = await service.rpc("release_collective_commitment_activation_v1", {
      p_commitment_id: commitmentId,
      p_activation_token: activationToken,
      p_invalid_signature_ids: invalidSignatureIds,
    });
    if (releaseResult.error) throw new Error(releaseResult.error.message);
    return {
      activated: false,
      message:
        "The threshold was reached, but one or more identity credentials became stale. No identities were published.",
    };
  }

  const activationResult = await service.rpc("activate_collective_commitment_v1", {
    p_commitment_id: commitmentId,
    p_activation_token: activationToken,
    p_manifest: manifest,
    p_mac_key_hex: deriveRevealMacKey(dataKey).toString("hex"),
  });
  if (activationResult.error) throw new Error(activationResult.error.message);

  return {
    activated: true,
    message: `Threshold reached. ${manifest.length} verified identities were published atomically.`,
  };
}

export async function signCollectiveCommitment(input: {
  commitmentId: string;
  profileId: string;
  publishAffiliation: boolean;
}) {
  assertCollectiveCommitmentsReady();
  const service = createCollectiveCommitmentServiceClient();

  const credentialResult = await service
    .from("collective_identity_credentials")
    .select(
      "id,profile_id,credential_version,status,verified_real_name,verified_affiliation,human_uniqueness_ref_hash,provider,verification_method,assurance_tier,duplicate_check_result,manual_review_status,verified_at,expires_at,created_at,updated_at",
    )
    .eq("profile_id", input.profileId)
    .order("credential_version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (credentialResult.error) throw new Error(credentialResult.error.message);
  if (!credentialResult.data) throw new Error("Identity verification is required before signing.");
  const credential = credentialResult.data as CredentialRow;
  if (!credentialIsCurrent(credential)) {
    throw new Error("Your identity credential is missing, stale, revoked, or not cleared for uniqueness.");
  }
  if (!credential.verified_at) throw new Error("Your identity credential has no verification time.");

  const commitmentResult = await service
    .from("collective_commitments")
    .select("id,status,deadline_at")
    .eq("id", input.commitmentId)
    .maybeSingle();
  if (commitmentResult.error) throw new Error(commitmentResult.error.message);
  if (!commitmentResult.data) throw new Error("Collective commitment not found.");
  if (commitmentResult.data.status !== "open") {
    throw new Error("This collective commitment is no longer accepting signatures.");
  }
  if (new Date(commitmentResult.data.deadline_at).getTime() <= Date.now()) {
    throw new Error("This collective commitment has reached its deadline.");
  }

  const keyRow = await loadKeyRow(input.commitmentId);
  if (!keyRow) throw new Error("The private signing key is unavailable.");
  const dataKey = unwrapKeyRow(keyRow);
  const revealNonce = createRevealNonce();
  const verifiedAffiliation =
    input.publishAffiliation && credential.verified_affiliation.trim()
      ? credential.verified_affiliation.trim()
      : null;
  const identityCommitment = createIdentityCommitment(dataKey, {
    verifiedRealName: credential.verified_real_name,
    verifiedAffiliation,
    revealNonce,
  });
  const signedAt = new Date().toISOString();
  const payload: SignaturePayload = {
    profileId: input.profileId,
    credentialId: credential.id,
    credentialVersion: credential.credential_version,
    verifiedRealName: credential.verified_real_name,
    verifiedAffiliation,
    credentialVerifiedAt: credential.verified_at,
    credentialExpiresAt: credential.expires_at,
    revealNonce,
    identityCommitment,
  };
  const encrypted = encryptSignaturePayload(input.commitmentId, dataKey, payload);

  const addResult = await service.rpc("add_collective_commitment_signature_v1", {
    p_commitment_id: input.commitmentId,
    p_account_token: createAccountToken(dataKey, input.profileId),
    p_human_token: createHumanToken(dataKey, credential.human_uniqueness_ref_hash),
    p_identity_commitment: identityCommitment,
    p_reveal_nonce: revealNonce,
    p_encrypted_identity_payload: encrypted.ciphertextBase64,
    p_payload_iv: encrypted.ivBase64,
    p_payload_tag: encrypted.tagBase64,
    p_signed_at: signedAt,
  });

  if (addResult.error) {
    if (addResult.error.message.includes("collective_commitment_duplicate_human")) {
      throw new Error("A verified human represented by another account has already signed this commitment.");
    }
    if (addResult.error.message.includes("collective_commitment_duplicate_account")) {
      throw new Error("This account has already signed the commitment.");
    }
    throw new Error(addResult.error.message);
  }

  const result = addResult.data as {
    signatureId: string;
    status: "open" | "activating";
    qualifyingSignerCount: number;
    activationToken: string | null;
  };

  if (result.activationToken) {
    return activateCollectiveCommitment(input.commitmentId, result.activationToken);
  }

  return {
    activated: false,
    message: `Signature recorded privately. ${result.qualifyingSignerCount} verified signer${result.qualifyingSignerCount === 1 ? "" : "s"} currently count.`,
  };
}

export async function withdrawCollectiveCommitmentSignature(input: {
  commitmentId: string;
  profileId: string;
}) {
  assertCollectiveCommitmentsReady();
  const keyRow = await loadKeyRow(input.commitmentId);
  if (!keyRow) throw new Error("This commitment no longer has a private-signature key.");
  const accountToken = createAccountToken(unwrapKeyRow(keyRow), input.profileId);
  const service = createCollectiveCommitmentServiceClient();
  const { data, error } = await service.rpc("withdraw_collective_commitment_signature_v1", {
    p_commitment_id: input.commitmentId,
    p_account_token: accountToken,
  });
  if (error) throw new Error(error.message);
  const result = data as { withdrawn: boolean; qualifyingSignerCount: number };
  if (!result.withdrawn) throw new Error("No withdrawable signature was found for this account.");
  return `Signature withdrawn. ${result.qualifyingSignerCount} verified signer${result.qualifyingSignerCount === 1 ? "" : "s"} remain.`;
}

export async function expireDueCollectiveCommitments() {
  assertCollectiveCommitmentsReady();
  const service = createCollectiveCommitmentServiceClient();
  const { data, error } = await service.rpc("expire_collective_commitments_v1");
  if (error) throw new Error(error.message);
  return data as { expiredCommitmentIds: string[]; expiredCount: number };
}

export const collectiveCommitmentCryptoForTesting = {
  canonicalRevealString,
  hmacSha256Hex,
};
