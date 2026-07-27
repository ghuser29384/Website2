import "server-only";

import { createHash, randomBytes } from "node:crypto";

import {
  assertCollectiveCommitmentsReady,
  getCollectiveCommitmentMinimumDeadlineMinutes,
} from "@/lib/collective-commitments/config";
import {
  canonicalRevealString,
  createAccountToken,
  createHumanToken,
  createIdentityCommitment,
  createManifestMac,
  createRevealNonce,
  decryptSignaturePayload,
  deriveRevealMacKey,
  encryptSignaturePayload,
  hmacSha256Hex,
  unwrapCommitmentDataKey,
  wrapCommitmentDataKey,
} from "@/lib/collective-commitments/crypto";
import { createCollectiveCommitmentServiceClient } from "@/lib/collective-commitments/service-client";
import {
  collectiveCredentialIsCurrent,
  type CollectiveCommitmentDetail,
  type CollectiveCommitmentSummary,
  type CollectiveIdentityCredential,
  type CollectivePrivateSignaturePayload,
  type CollectivePropositionType,
  type CollectiveRiskClass,
  type CollectiveRiskDimension,
} from "@/lib/collective-commitments/types";

function iso(value: unknown) {
  return typeof value === "string" ? value : new Date(String(value)).toISOString();
}

function jsonHash(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function humanizeCount(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function credentialIsCurrent(row: Record<string, unknown> | null) {
  if (!row) return false;
  return collectiveCredentialIsCurrent({
    status: String(row.status),
    duplicateCheckResult: String(row.duplicate_check_result),
    manualReviewStatus: String(row.manual_review_status),
    expiresAt: String(row.expires_at),
  });
}

function mapCredential(row: Record<string, unknown>): CollectiveIdentityCredential {
  return {
    id: String(row.id),
    profileId: String(row.profile_id),
    credentialVersion: Number(row.credential_version),
    status: String(row.status) as CollectiveIdentityCredential["status"],
    verifiedRealName: String(row.verified_real_name),
    verifiedAffiliation: row.verified_affiliation ? String(row.verified_affiliation) : null,
    provider: String(row.provider),
    verificationMethod: String(row.verification_method),
    assuranceTier: String(row.assurance_tier),
    duplicateCheckResult: String(row.duplicate_check_result),
    manualReviewStatus: String(row.manual_review_status),
    verifiedAt: iso(row.verified_at),
    expiresAt: iso(row.expires_at),
  };
}

function mapSummary(row: Record<string, unknown>): CollectiveCommitmentSummary {
  return {
    id: String(row.id),
    creatorId: String(row.creator_id),
    creatorDisplayName: String(row.creator_display_name ?? "Moral Trade member"),
    title: String(row.title),
    propositionType: String(row.proposition_type) as CollectivePropositionType,
    propositionText: String(row.proposition_text),
    requirementsText: String(row.requirements_text),
    eligibilityRule: String(row.eligibility_rule),
    thresholdCount: Number(row.threshold_count),
    deadlineAt: iso(row.deadline_at),
    riskClass: String(row.risk_class) as CollectiveRiskClass,
    riskDimensions: Array.isArray(row.risk_dimensions)
      ? row.risk_dimensions.map(String) as CollectiveRiskDimension[]
      : [],
    status: String(row.status) as CollectiveCommitmentSummary["status"],
    termsHash: String(row.terms_hash),
    qualifyingSignerCount: Number(row.qualifying_signer_count ?? 0),
    createdAt: iso(row.created_at),
    activatedAt: row.activated_at ? iso(row.activated_at) : null,
    expiredAt: row.expired_at ? iso(row.expired_at) : null,
  };
}

export async function getCollectiveIdentityCredential(profileId: string) {
  assertCollectiveCommitmentsReady();
  const service = createCollectiveCommitmentServiceClient();
  const { data, error } = await service
    .from("collective_identity_credentials")
    .select("*")
    .eq("profile_id", profileId)
    .order("credential_version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapCredential(data as Record<string, unknown>) : null;
}

export async function listCollectiveCommitments(): Promise<CollectiveCommitmentSummary[]> {
  assertCollectiveCommitmentsReady();
  const service = createCollectiveCommitmentServiceClient();
  const { data, error } = await service
    .from("collective_commitments")
    .select("*, profiles!collective_commitments_creator_id_fkey(display_name)")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => {
    const raw = row as Record<string, unknown> & { profiles?: { display_name?: string } | null };
    return mapSummary({ ...raw, creator_display_name: raw.profiles?.display_name });
  });
}

export async function getCollectiveCommitmentDetail(
  commitmentId: string,
  viewerProfileId?: string,
): Promise<CollectiveCommitmentDetail | null> {
  assertCollectiveCommitmentsReady();
  const service = createCollectiveCommitmentServiceClient();
  const { data: commitmentRow, error } = await service
    .from("collective_commitments")
    .select("*, profiles!collective_commitments_creator_id_fkey(display_name)")
    .eq("id", commitmentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!commitmentRow) return null;

  const row = commitmentRow as Record<string, unknown> & { profiles?: { display_name?: string } | null };
  const summary = mapSummary({ ...row, creator_display_name: row.profiles?.display_name });

  const [signersResult, receiptResult, keyResult] = await Promise.all([
    service
      .from("collective_commitment_public_signers")
      .select("id,ordinal,verified_real_name,verified_affiliation,published_at")
      .eq("commitment_id", commitmentId)
      .order("ordinal", { ascending: true }),
    service
      .from("collective_commitment_receipts")
      .select("id,outcome,terms_hash,signer_count,signer_manifest_hash,created_at")
      .eq("commitment_id", commitmentId)
      .maybeSingle(),
    service
      .from("collective_commitment_keys")
      .select("commitment_id,wrapped_key_ciphertext,wrapped_key_iv,wrapped_key_tag")
      .eq("commitment_id", commitmentId)
      .maybeSingle(),
  ]);
  if (signersResult.error) throw new Error(signersResult.error.message);
  if (receiptResult.error) throw new Error(receiptResult.error.message);
  if (keyResult.error) throw new Error(keyResult.error.message);

  let viewerHasSigned = false;
  if (viewerProfileId && keyResult.data && summary.status === "open") {
    const dataKey = unwrapCommitmentDataKey(commitmentId, {
      ciphertextBase64: String(keyResult.data.wrapped_key_ciphertext),
      ivBase64: String(keyResult.data.wrapped_key_iv),
      tagBase64: String(keyResult.data.wrapped_key_tag),
    });
    const accountToken = createAccountToken(dataKey, viewerProfileId);
    const { count, error: signatureError } = await service
      .from("collective_commitment_private_signatures")
      .select("id", { head: true, count: "exact" })
      .eq("commitment_id", commitmentId)
      .eq("account_token", accountToken);
    if (signatureError) throw new Error(signatureError.message);
    viewerHasSigned = (count ?? 0) > 0;
  }

  const credential = viewerProfileId
    ? await getCollectiveIdentityCredential(viewerProfileId)
    : null;

  return {
    ...summary,
    viewerCanSign: Boolean(credential && collectiveCredentialIsCurrent(credential)),
    viewerHasSigned,
    publicSigners: (signersResult.data ?? []).map((signer) => ({
      id: String(signer.id),
      ordinal: Number(signer.ordinal),
      verifiedRealName: String(signer.verified_real_name),
      verifiedAffiliation: signer.verified_affiliation ? String(signer.verified_affiliation) : null,
      publishedAt: iso(signer.published_at),
    })),
    receipt: receiptResult.data
      ? {
          id: String(receiptResult.data.id),
          outcome: String(receiptResult.data.outcome) as "active" | "expired",
          termsHash: String(receiptResult.data.terms_hash),
          signerCount: Number(receiptResult.data.signer_count),
          signerManifestHash: receiptResult.data.signer_manifest_hash
            ? String(receiptResult.data.signer_manifest_hash)
            : null,
          createdAt: iso(receiptResult.data.created_at),
        }
      : null,
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
  riskClass: CollectiveRiskClass;
  riskDimensions: CollectiveRiskDimension[];
}) {
  assertCollectiveCommitmentsReady();
  const deadlineAt = new Date(input.deadlineAt);
  if (!Number.isFinite(deadlineAt.getTime())) throw new Error("Enter a valid deadline.");
  const minimumDeadline = Date.now() + getCollectiveCommitmentMinimumDeadlineMinutes() * 60_000;
  if (deadlineAt.getTime() < minimumDeadline) {
    throw new Error(
      `The deadline must be at least ${getCollectiveCommitmentMinimumDeadlineMinutes()} minutes from now.`,
    );
  }

  const id = crypto.randomUUID();
  const termsHash = jsonHash({
    id,
    title: input.title,
    propositionType: input.propositionType,
    propositionText: input.propositionText,
    requirementsText: input.requirementsText,
    eligibilityRule: input.eligibilityRule,
    thresholdCount: input.thresholdCount,
    deadlineAt: deadlineAt.toISOString(),
    riskClass: input.riskClass,
    riskDimensions: input.riskDimensions,
  });
  const dataKey = randomBytes(32);
  const wrapped = wrapCommitmentDataKey(id, dataKey);
  const service = createCollectiveCommitmentServiceClient();
  const { data, error } = await service.rpc("create_collective_commitment_v1", {
    p_id: id,
    p_creator_id: input.creatorId,
    p_title: input.title,
    p_proposition_type: input.propositionType,
    p_proposition_text: input.propositionText,
    p_requirements_text: input.requirementsText,
    p_eligibility_rule: input.eligibilityRule,
    p_threshold_count: input.thresholdCount,
    p_deadline_at: deadlineAt.toISOString(),
    p_risk_class: input.riskClass,
    p_risk_dimensions: input.riskDimensions,
    p_terms_hash: termsHash,
    p_wrapped_key_ciphertext: wrapped.ciphertextBase64,
    p_wrapped_key_iv: wrapped.ivBase64,
    p_wrapped_key_tag: wrapped.tagBase64,
  });
  if (error) throw new Error(error.message);
  return data as { id: string; termsHash: string; status: "open" };
}

async function loadKeyRow(commitmentId: string) {
  const service = createCollectiveCommitmentServiceClient();
  const { data, error } = await service
    .from("collective_commitment_keys")
    .select("commitment_id,wrapped_key_ciphertext,wrapped_key_iv,wrapped_key_tag")
    .eq("commitment_id", commitmentId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

function unwrapKeyRow(row: Record<string, unknown>) {
  return unwrapCommitmentDataKey(String(row.commitment_id), {
    ciphertextBase64: String(row.wrapped_key_ciphertext),
    ivBase64: String(row.wrapped_key_iv),
    tagBase64: String(row.wrapped_key_tag),
  });
}

async function loadCredentialRow(profileId: string) {
  const service = createCollectiveCommitmentServiceClient();
  const { data, error } = await service
    .from("collective_identity_credentials")
    .select("*")
    .eq("profile_id", profileId)
    .order("credential_version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown> | null;
}

async function loadPrivateSignatures(commitmentId: string) {
  const service = createCollectiveCommitmentServiceClient();
  const { data, error } = await service
    .from("collective_commitment_private_signatures")
    .select("id,identity_commitment,reveal_nonce,encrypted_identity_payload,payload_iv,payload_tag,signed_at")
    .eq("commitment_id", commitmentId)
    .order("signed_at", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
}

async function activateCollectiveCommitment(commitmentId: string, activationToken: string) {
  const keyRow = await loadKeyRow(commitmentId);
  if (!keyRow) {
    throw new Error("The activation key is unavailable; no identities were published.");
  }
  const dataKey = unwrapKeyRow(keyRow);
  const signatures = await loadPrivateSignatures(commitmentId);
  const invalidSignatureIds: string[] = [];
  const manifest: Array<{
    signatureId: string;
    verifiedRealName: string;
    verifiedAffiliation: string | null;
    revealNonce: string;
    identityCommitment: string;
    manifestMac: string;
  }> = [];

  for (const signature of signatures) {
    let payload: CollectivePrivateSignaturePayload;
    try {
      payload = decryptSignaturePayload(commitmentId, dataKey, {
        ciphertextBase64: String(signature.encrypted_identity_payload),
        ivBase64: String(signature.payload_iv),
        tagBase64: String(signature.payload_tag),
      });
    } catch {
      invalidSignatureIds.push(String(signature.id));
      continue;
    }

    const credential = await loadCredentialRow(payload.profileId);
    if (
      !credentialIsCurrent(credential) ||
      Number(credential?.credential_version) !== payload.credentialVersion ||
      String(credential?.verified_at) !== payload.credentialVerifiedAt ||
      String(credential?.expires_at) !== payload.credentialExpiresAt ||
      String(credential?.verified_real_name) !== payload.verifiedRealName ||
      (credential?.verified_affiliation ? String(credential.verified_affiliation) : null) !==
        payload.verifiedAffiliation
    ) {
      invalidSignatureIds.push(String(signature.id));
      continue;
    }

    const verifiedAffiliation = payload.publishAffiliation
      ? payload.verifiedAffiliation
      : null;
    const canonical = canonicalRevealString({
      verifiedRealName: payload.verifiedRealName,
      verifiedAffiliation,
      revealNonce: payload.revealNonce,
    });
    const identityCommitment = hmacSha256Hex(deriveRevealMacKey(dataKey), canonical);
    if (
      identityCommitment !== String(signature.identity_commitment) ||
      payload.identityCommitment !== String(signature.identity_commitment) ||
      payload.revealNonce !== String(signature.reveal_nonce)
    ) {
      invalidSignatureIds.push(String(signature.id));
      continue;
    }

    manifest.push({
      signatureId: String(signature.id),
      verifiedRealName: payload.verifiedRealName,
      verifiedAffiliation,
      revealNonce: payload.revealNonce,
      identityCommitment,
      manifestMac: createManifestMac(dataKey, {
        signatureId: String(signature.id),
        identityCommitment,
        verifiedRealName: payload.verifiedRealName,
        verifiedAffiliation,
        revealNonce: payload.revealNonce,
      }),
    });
  }

  if (invalidSignatureIds.length) {
    const service = createCollectiveCommitmentServiceClient();
    const { error } = await service.rpc("release_collective_commitment_activation_v1", {
      p_commitment_id: commitmentId,
      p_activation_token: activationToken,
      p_invalid_signature_ids: invalidSignatureIds,
      p_reason: "credential_stale_or_payload_invalid",
    });
    if (error) throw new Error(error.message);
    return {
      activated: false,
      message: "One or more identity credentials became stale. No identities were published.",
    };
  }

  const service = createCollectiveCommitmentServiceClient();
  const macKeyHex = deriveRevealMacKey(dataKey).toString("hex");
  const { data, error } = await service.rpc("activate_collective_commitment_v1", {
    p_commitment_id: commitmentId,
    p_activation_token: activationToken,
    p_manifest: manifest,
    p_mac_key_hex: macKeyHex,
  });
  if (error) {
    const release = await service.rpc("release_collective_commitment_activation_v1", {
      p_commitment_id: commitmentId,
      p_activation_token: activationToken,
      p_invalid_signature_ids: [],
      p_reason: "activation_manifest_rejected",
    });
    if (release.error) {
      throw new Error(`Activation failed and release also failed: ${error.message}; ${release.error.message}`);
    }
    throw new Error(`Activation failed safely; no identities were published. ${error.message}`);
  }

  return {
    activated: true,
    message: `Threshold reached. ${humanizeCount(Number((data as { signerCount: number }).signerCount), "verified identity", "verified identities")} were published atomically.`,
  };
}

export async function signCollectiveCommitment(input: {
  commitmentId: string;
  profileId: string;
  publishAffiliation: boolean;
}) {
  assertCollectiveCommitmentsReady();
  const [keyRow, credential] = await Promise.all([
    loadKeyRow(input.commitmentId),
    loadCredentialRow(input.profileId),
  ]);
  if (!keyRow) throw new Error("This commitment is no longer accepting private signatures.");
  if (!credentialIsCurrent(credential)) {
    throw new Error("A current, operator-approved identity credential is required before signing.");
  }

  const dataKey = unwrapKeyRow(keyRow);
  const signedAt = new Date().toISOString();
  const revealNonce = createRevealNonce();
  const verifiedAffiliation = input.publishAffiliation && credential?.verified_affiliation
    ? String(credential.verified_affiliation)
    : null;
  const identityCommitment = createIdentityCommitment(dataKey, {
    verifiedRealName: String(credential?.verified_real_name),
    verifiedAffiliation,
    revealNonce,
  });
  const payload: CollectivePrivateSignaturePayload = {
    profileId: input.profileId,
    credentialId: String(credential?.id),
    credentialVersion: Number(credential?.credential_version),
    verifiedRealName: String(credential?.verified_real_name),
    verifiedAffiliation: credential?.verified_affiliation
      ? String(credential.verified_affiliation)
      : null,
    publishAffiliation: input.publishAffiliation,
    credentialVerifiedAt: String(credential?.verified_at),
    credentialExpiresAt: String(credential?.expires_at),
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
    message: `Signature recorded privately. ${humanizeCount(result.qualifyingSignerCount, "verified signer")} ${result.qualifyingSignerCount === 1 ? "currently counts" : "currently count"}.`,
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
  return `Signature withdrawn. ${humanizeCount(result.qualifyingSignerCount, "verified signer")} ${result.qualifyingSignerCount === 1 ? "remains" : "remain"}.`;
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
