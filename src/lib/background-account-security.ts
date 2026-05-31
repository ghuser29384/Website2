import { createClient } from "@/lib/supabase/server";

export type BackgroundAuthenticatorLevel = "aal1" | "aal2" | null;

export interface BackgroundMfaFactorSummary {
  createdAt: string;
  factorType: string;
  friendlyName: string;
  id: string;
  lastChallengedAt: string | null;
  status: "verified" | "unverified" | string;
  updatedAt: string;
}

export interface BackgroundAccountSecuritySummary {
  currentLevel: BackgroundAuthenticatorLevel;
  error: string | null;
  factors: BackgroundMfaFactorSummary[];
  needsStepUp: boolean;
  nextLevel: BackgroundAuthenticatorLevel;
  statusLabel: string;
  statusTone: "secure" | "warning" | "error";
  unverifiedTotpCount: number;
  verifiedTotpCount: number;
}

export interface BackgroundMfaActionState {
  error?: string;
  factorId?: string;
  message?: string;
  qrCode?: string;
  secret?: string;
  status: "idle" | "enrolled" | "verified" | "removed" | "error";
}

interface RawMfaFactor {
  created_at?: string;
  factor_type?: string;
  friendly_name?: string;
  id?: string;
  last_challenged_at?: string;
  status?: string;
  updated_at?: string;
}

function normalizeMfaFactor(factor: RawMfaFactor): BackgroundMfaFactorSummary | null {
  if (!factor.id) {
    return null;
  }

  return {
    createdAt: factor.created_at ?? "",
    factorType: factor.factor_type ?? "unknown",
    friendlyName: factor.friendly_name?.trim() || "Authenticator app",
    id: factor.id,
    lastChallengedAt: factor.last_challenged_at ?? null,
    status: factor.status ?? "unverified",
    updatedAt: factor.updated_at ?? "",
  };
}

export function normalizeBackgroundTotpCode(value: string) {
  const code = value.replaceAll(/\s|-/g, "");

  if (!/^\d{6}$/.test(code)) {
    return {
      code: "",
      error: "Enter the 6-digit authenticator code.",
    };
  }

  return { code, error: null };
}

export function summarizeBackgroundMfaFactors({
  currentLevel,
  error = null,
  factors,
  nextLevel,
}: {
  currentLevel: BackgroundAuthenticatorLevel;
  error?: string | null;
  factors: RawMfaFactor[];
  nextLevel: BackgroundAuthenticatorLevel;
}): BackgroundAccountSecuritySummary {
  const normalizedFactors = factors
    .map(normalizeMfaFactor)
    .filter((factor): factor is BackgroundMfaFactorSummary => Boolean(factor));
  const verifiedTotpCount = normalizedFactors.filter(
    (factor) => factor.factorType === "totp" && factor.status === "verified",
  ).length;
  const unverifiedTotpCount = normalizedFactors.filter(
    (factor) => factor.factorType === "totp" && factor.status !== "verified",
  ).length;
  const needsStepUp = verifiedTotpCount > 0 && nextLevel === "aal2" && currentLevel !== "aal2";

  if (error) {
    return {
      currentLevel,
      error,
      factors: normalizedFactors,
      needsStepUp,
      nextLevel,
      statusLabel: "MFA status unavailable",
      statusTone: "error",
      unverifiedTotpCount,
      verifiedTotpCount,
    };
  }

  if (verifiedTotpCount > 0 && currentLevel === "aal2") {
    return {
      currentLevel,
      error: null,
      factors: normalizedFactors,
      needsStepUp: false,
      nextLevel,
      statusLabel: "MFA active for this session",
      statusTone: "secure",
      unverifiedTotpCount,
      verifiedTotpCount,
    };
  }

  if (verifiedTotpCount > 0) {
    return {
      currentLevel,
      error: null,
      factors: normalizedFactors,
      needsStepUp,
      nextLevel,
      statusLabel: "MFA enrolled; session needs verification",
      statusTone: "warning",
      unverifiedTotpCount,
      verifiedTotpCount,
    };
  }

  return {
    currentLevel,
    error: null,
    factors: normalizedFactors,
    needsStepUp: false,
    nextLevel,
    statusLabel: "MFA not enrolled",
    statusTone: "warning",
    unverifiedTotpCount,
    verifiedTotpCount,
  };
}

export async function loadBackgroundAccountSecuritySummary() {
  const supabase = await createClient();
  const [factorsResult, assuranceResult] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
  ]);
  const factors = factorsResult.data?.all ?? [];
  const currentLevel = assuranceResult.data?.currentLevel ?? null;
  const nextLevel = assuranceResult.data?.nextLevel ?? null;
  const error = factorsResult.error?.message ?? assuranceResult.error?.message ?? null;

  return summarizeBackgroundMfaFactors({
    currentLevel,
    error,
    factors,
    nextLevel,
  });
}
