import { createClient } from "@/lib/supabase/server";

export type BackgroundAuthenticatorLevel = "aal1" | "aal2" | null;
export type BackgroundAccessTokenWindowStatus = "recommended" | "long" | "unknown";

export const BACKGROUND_SESSION_REVIEW_CONTROL_VERSION =
  "background-session-review-v1";
export const BACKGROUND_RECOMMENDED_ACCESS_TOKEN_MAX_AGE_SECONDS = 60 * 60;

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
  session: BackgroundSessionSecuritySummary;
  statusLabel: string;
  statusTone: "secure" | "warning" | "error";
  unverifiedTotpCount: number;
  verifiedTotpCount: number;
}

export interface BackgroundSessionSecuritySummary {
  accessTokenAgeSeconds: number | null;
  accessTokenExpiresInSeconds: number | null;
  accessTokenLifetimeSeconds: number | null;
  accessTokenWindowStatus: BackgroundAccessTokenWindowStatus;
  currentAal: string | null;
  error: string | null;
  expiresAt: string | null;
  issuedAt: string | null;
  recommendedMaxAgeSeconds: number;
  reviewLabel: string;
  revocationSupported: boolean;
  sessionIdSuffix: string | null;
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

interface RawSessionClaims {
  aal?: string;
  exp?: number;
  iat?: number;
  session_id?: string;
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
  session,
}: {
  currentLevel: BackgroundAuthenticatorLevel;
  error?: string | null;
  factors: RawMfaFactor[];
  nextLevel: BackgroundAuthenticatorLevel;
  session?: BackgroundSessionSecuritySummary;
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
      session: session ?? summarizeBackgroundSessionSecurity({ error }),
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
      session: session ?? summarizeBackgroundSessionSecurity({}),
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
      session: session ?? summarizeBackgroundSessionSecurity({}),
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
    session: session ?? summarizeBackgroundSessionSecurity({}),
    statusLabel: "MFA not enrolled",
    statusTone: "warning",
    unverifiedTotpCount,
    verifiedTotpCount,
  };
}

export function summarizeBackgroundSessionSecurity({
  claims = null,
  error = null,
  now = new Date(),
}: {
  claims?: RawSessionClaims | null;
  error?: string | null;
  now?: Date;
}): BackgroundSessionSecuritySummary {
  const issuedAt =
    typeof claims?.iat === "number" ? new Date(claims.iat * 1000) : null;
  const expiresAt =
    typeof claims?.exp === "number" ? new Date(claims.exp * 1000) : null;
  const accessTokenLifetimeSeconds =
    typeof claims?.iat === "number" && typeof claims?.exp === "number"
      ? Math.max(0, claims.exp - claims.iat)
      : null;
  const accessTokenAgeSeconds = issuedAt
    ? Math.max(0, Math.floor((now.getTime() - issuedAt.getTime()) / 1000))
    : null;
  const accessTokenExpiresInSeconds = expiresAt
    ? Math.floor((expiresAt.getTime() - now.getTime()) / 1000)
    : null;
  const accessTokenWindowStatus =
    accessTokenLifetimeSeconds === null
      ? "unknown"
      : accessTokenLifetimeSeconds <= BACKGROUND_RECOMMENDED_ACCESS_TOKEN_MAX_AGE_SECONDS
        ? "recommended"
        : "long";
  const sessionIdSuffix = claims?.session_id
    ? claims.session_id.replace(/-/g, "").slice(-8)
    : null;

  return {
    accessTokenAgeSeconds,
    accessTokenExpiresInSeconds,
    accessTokenLifetimeSeconds,
    accessTokenWindowStatus,
    currentAal: claims?.aal ?? null,
    error,
    expiresAt: expiresAt?.toISOString() ?? null,
    issuedAt: issuedAt?.toISOString() ?? null,
    recommendedMaxAgeSeconds: BACKGROUND_RECOMMENDED_ACCESS_TOKEN_MAX_AGE_SECONDS,
    reviewLabel:
      accessTokenWindowStatus === "long"
        ? "Access-token window is longer than the one-hour background-networking recommendation."
        : accessTokenWindowStatus === "recommended"
          ? "Access-token window is within the background-networking recommendation."
          : "Session token window could not be read from the current JWT claims.",
    revocationSupported: true,
    sessionIdSuffix,
  };
}

export async function loadBackgroundAccountSecuritySummary() {
  const supabase = await createClient();
  const [factorsResult, assuranceResult, claimsResult] = await Promise.all([
    supabase.auth.mfa.listFactors(),
    supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    supabase.auth.getClaims(),
  ]);
  const factors = factorsResult.data?.all ?? [];
  const currentLevel = assuranceResult.data?.currentLevel ?? null;
  const nextLevel = assuranceResult.data?.nextLevel ?? null;
  const error =
    factorsResult.error?.message ??
    assuranceResult.error?.message ??
    claimsResult.error?.message ??
    null;
  const session = summarizeBackgroundSessionSecurity({
    claims: claimsResult.data?.claims ?? null,
    error: claimsResult.error?.message ?? null,
  });

  return summarizeBackgroundMfaFactors({
    currentLevel,
    error,
    factors,
    nextLevel,
    session,
  });
}
