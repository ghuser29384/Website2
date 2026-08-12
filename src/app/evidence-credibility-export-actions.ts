"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireViewer } from "@/lib/app-data";
import { createClient } from "@/lib/supabase/server";

const EXPORT_ROUTE = "/admin/evidence-calibration/exports";
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const UTC_MINUTE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function withMessage(path: string, key: "error" | "message", message: string) {
  const target = new URL(path, "https://www.moraltrade.org");
  target.searchParams.set(key, message);
  return `${target.pathname}${target.search}`;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function parseUtcCutoff(value: string) {
  if (!UTC_MINUTE_PATTERN.test(value)) {
    throw new Error("Choose a valid UTC cutoff minute.");
  }
  const cutoff = new Date(`${value}:00.000Z`);
  if (!Number.isFinite(cutoff.getTime()) || cutoff.getTime() > Date.now()) {
    throw new Error("The UTC cutoff must be valid and must not be in the future.");
  }
  return cutoff;
}

function sourceKey(planHash: string, cutoff: Date) {
  return `admin-export:${planHash}:${cutoff.toISOString()}`;
}

export async function createEvidenceCredibilityCalibrationExportAction(
  formData: FormData,
) {
  await requireViewer(EXPORT_ROUTE);
  const analysisPlanVersion = read(formData, "analysis_plan_version");
  const analysisPlanHash = read(formData, "analysis_plan_hash").toLowerCase();
  const cutoffInput = read(formData, "source_cutoff_at");

  try {
    if (!analysisPlanVersion || analysisPlanVersion.length > 200) {
      throw new Error("Enter the frozen analysis-plan version.");
    }
    if (!SHA256_PATTERN.test(analysisPlanHash)) {
      throw new Error(
        "Analysis-plan hash must be exactly 64 lowercase hexadecimal characters.",
      );
    }
    const cutoff = parseUtcCutoff(cutoffInput);
    const supabase = await createClient();
    const { data, error } = await (supabase as any).rpc(
      "create_evidence_credibility_calibration_export_v1",
      {
        p_analysis_plan_hash: analysisPlanHash,
        p_analysis_plan_version: analysisPlanVersion,
        p_pseudonymization_secret: randomBytes(32).toString("hex"),
        p_source_cutoff_at: cutoff.toISOString(),
        p_source_key: sourceKey(analysisPlanHash, cutoff),
      },
    );
    if (error) throw new Error(error.message);

    const result = (data ?? {}) as Record<string, unknown>;
    const rowCount = Number(result.rowCount ?? 0);
    const status = String(result.status ?? "created");
    revalidatePath(EXPORT_ROUTE);
    redirect(
      withMessage(
        EXPORT_ROUTE,
        "message",
        `${status === "replayed" ? "Reused" : "Created"} immutable calibration export with ${rowCount} observation${rowCount === 1 ? "" : "s"}.`,
      ),
    );
  } catch (error) {
    redirect(
      withMessage(
        EXPORT_ROUTE,
        "error",
        errorMessage(error, "The calibration export could not be created."),
      ),
    );
  }
}
