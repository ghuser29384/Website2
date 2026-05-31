import type { BackgroundAccountSecuritySummary } from "@/lib/background-account-security";

export const ADMIN_MFA_REQUIRED_MESSAGE =
  "Admin access requires an active authenticator MFA session before operator queues or review actions can be used.";

export type AdminOperatorAccessReason =
  | "allowed"
  | "admin_email_required"
  | "admin_email_not_allowed"
  | "mfa_status_unavailable"
  | "mfa_factor_required"
  | "mfa_step_up_required";

export interface AdminOperatorAccessDecision {
  allowed: boolean;
  message: string;
  reason: AdminOperatorAccessReason;
}

export function getAdminEmails() {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined) {
  if (!email) {
    return false;
  }

  return getAdminEmails().includes(email.trim().toLowerCase());
}

export function evaluateAdminOperatorAccess({
  adminEmails = getAdminEmails(),
  email,
  mfaSummary,
}: {
  adminEmails?: string[];
  email: string | null | undefined;
  mfaSummary: BackgroundAccountSecuritySummary | null;
}): AdminOperatorAccessDecision {
  const normalizedEmail = email?.trim().toLowerCase();
  const normalizedAdminEmails = new Set(
    adminEmails.map((entry) => entry.trim().toLowerCase()).filter(Boolean),
  );

  if (!normalizedEmail) {
    return {
      allowed: false,
      message: "Sign in with an admin email before using operator routes.",
      reason: "admin_email_required",
    };
  }

  if (!normalizedAdminEmails.has(normalizedEmail)) {
    return {
      allowed: false,
      message: "Admin access requires an email listed in ADMIN_EMAILS.",
      reason: "admin_email_not_allowed",
    };
  }

  if (!mfaSummary || mfaSummary.error) {
    return {
      allowed: false,
      message:
        "Admin MFA status could not be verified. Re-authenticate, then verify an authenticator factor before using operator routes.",
      reason: "mfa_status_unavailable",
    };
  }

  if (mfaSummary.verifiedTotpCount < 1) {
    return {
      allowed: false,
      message:
        "Admin access requires at least one verified authenticator app factor. Set it up from the dashboard account-security panel.",
      reason: "mfa_factor_required",
    };
  }

  if (mfaSummary.currentLevel !== "aal2") {
    return {
      allowed: false,
      message: ADMIN_MFA_REQUIRED_MESSAGE,
      reason: "mfa_step_up_required",
    };
  }

  return {
    allowed: true,
    message: "Admin access verified with an active MFA session.",
    reason: "allowed",
  };
}
