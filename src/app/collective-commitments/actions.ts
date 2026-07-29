"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getViewer } from "@/lib/app-data";
import {
  createCollectiveCommitment,
  getCollectiveCommitmentDetail,
  signCollectiveCommitment,
  withdrawCollectiveCommitmentSignature,
} from "@/lib/collective-commitments/service";
import type { CollectiveCommitmentActionState } from "@/lib/collective-commitments/action-state";
import {
  getCollectiveRiskProfile,
  isCollectivePropositionType,
  type CollectiveRiskDimension,
} from "@/lib/collective-commitments/types";

function textField(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function checked(formData: FormData, key: string) {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) {
    throw new Error("Sign in before creating or joining a collective commitment.");
  }
  return viewer;
}

function validateText(value: string, label: string, minimum: number, maximum: number) {
  if (value.length < minimum || value.length > maximum) {
    throw new Error(`${label} must contain between ${minimum} and ${maximum} characters.`);
  }
}

export async function createCollectiveCommitmentAction(
  _previousState: CollectiveCommitmentActionState,
  formData: FormData,
): Promise<CollectiveCommitmentActionState> {
  let commitmentId = "";

  try {
    const viewer = await requireViewer();
    const propositionType = textField(formData, "proposition_type");
    if (!isCollectivePropositionType(propositionType)) {
      throw new Error("Choose a supported proposition type.");
    }

    const title = textField(formData, "title");
    const propositionText = textField(formData, "proposition_text");
    const requirementsText = textField(formData, "requirements_text");
    const eligibilityRule = textField(formData, "eligibility_rule");
    const thresholdCount = Number.parseInt(textField(formData, "threshold_count"), 10);
    const deadlineAt = textField(formData, "deadline_at");
    const selectedDimensions = formData
      .getAll("risk_dimensions")
      .map((value) => String(value)) as CollectiveRiskDimension[];

    validateText(title, "Title", 3, 160);
    validateText(propositionText, "Proposition", 10, 12_000);
    validateText(requirementsText, "Requirements", 3, 6_000);
    validateText(eligibilityRule, "Eligibility rule", 3, 4_000);
    if (!Number.isInteger(thresholdCount) || thresholdCount < 2 || thresholdCount > 1_000_000) {
      throw new Error("The verified-signer threshold must be between 2 and 1,000,000.");
    }
    if (!checked(formData, "publication_acknowledgment")) {
      throw new Error("Confirm that qualifying signers' verified real names will be published together at the threshold.");
    }

    const risk = getCollectiveRiskProfile(propositionType, selectedDimensions);
    if (risk.riskClass === "high" && !checked(formData, "high_risk_acknowledgment")) {
      throw new Error("Accept the high-risk proposition acknowledgment before publishing.");
    }

    const result = await createCollectiveCommitment({
      creatorId: viewer.profile.id,
      title,
      propositionType,
      propositionText,
      requirementsText,
      eligibilityRule,
      thresholdCount,
      deadlineAt,
      riskClass: risk.riskClass,
      riskDimensions: risk.riskDimensions,
    });
    commitmentId = result.id;
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not create the collective commitment.",
    };
  }

  revalidatePath("/collective-commitments");
  redirect(`/collective-commitments/${commitmentId}`);
}

export async function signCollectiveCommitmentAction(
  _previousState: CollectiveCommitmentActionState,
  formData: FormData,
): Promise<CollectiveCommitmentActionState> {
  const commitmentId = textField(formData, "commitment_id");

  try {
    const viewer = await requireViewer();
    if (!checked(formData, "terms_acknowledgment")) {
      throw new Error("Confirm that you accept the exact frozen proposition and requirements.");
    }
    if (!checked(formData, "identity_publication_acknowledgment")) {
      throw new Error("Confirm that your verified real name will be public if the threshold is reached.");
    }

    const detail = await getCollectiveCommitmentDetail(commitmentId, viewer.profile.id);
    if (!detail) throw new Error("Collective commitment not found.");
    if (detail.riskClass === "high" && !checked(formData, "high_risk_acknowledgment")) {
      throw new Error("Accept the high-risk participation acknowledgment before signing.");
    }

    await signCollectiveCommitment({
      commitmentId,
      profileId: viewer.profile.id,
      publishAffiliation: checked(formData, "publish_affiliation"),
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not record the private signature.",
      commitmentId,
    };
  }

  revalidatePath("/collective-commitments");
  revalidatePath(`/collective-commitments/${commitmentId}`);
  redirect(`/collective-commitments/${commitmentId}?mutation=signature-recorded`);
}

export async function withdrawCollectiveCommitmentAction(
  _previousState: CollectiveCommitmentActionState,
  formData: FormData,
): Promise<CollectiveCommitmentActionState> {
  const commitmentId = textField(formData, "commitment_id");

  try {
    const viewer = await requireViewer();
    await withdrawCollectiveCommitmentSignature({
      commitmentId,
      profileId: viewer.profile.id,
    });
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Could not withdraw the private signature.",
      commitmentId,
    };
  }

  revalidatePath("/collective-commitments");
  revalidatePath(`/collective-commitments/${commitmentId}`);
  redirect(`/collective-commitments/${commitmentId}?mutation=signature-withdrawn`);
}
