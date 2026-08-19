import {
  isAuthError,
  isAuthRetryableFetchError,
  type JwtPayload,
  type Session,
  type User,
} from "@supabase/supabase-js";

export const AUTH_RESOLUTION_TIMEOUT_MS = 8_000;
export const AUTH_RESOLUTION_RETRY_BACKOFF_MS = 100;

type TimerHandle = ReturnType<typeof setTimeout>;

type AuthClaimsResult = {
  data: { claims: JwtPayload | null } | null;
  error: unknown | null;
};

type AuthSessionResult = {
  data: { session: Session | null };
  error: unknown | null;
};

type AuthUserResult<TUser extends User> = {
  data: { user: TUser | null };
  error: unknown | null;
};

export interface AuthResolutionOperations<TUser extends User = User> {
  getClaims?: () => Promise<AuthClaimsResult>;
  getSession?: () => Promise<AuthSessionResult>;
  getUser: () => Promise<AuthUserResult<TUser>>;
}

export type AuthClaimsPolicy =
  | {
      mode: "disabled";
      reason: "active_session_required" | "full_user_required" | "active_signer_unverified";
    }
  | {
      mode: "enabled";
      issuer: string;
      audience: string;
      activeAsymmetricSignerProven: true;
    };

export interface AuthResolutionRuntime {
  now: () => number;
  setTimeout: (callback: () => void, delayMs: number) => TimerHandle;
  clearTimeout: (timer: TimerHandle) => void;
}

export type AuthResolutionOutcome =
  | "verified_local_claims"
  | "verified_remote_get_user"
  | "verified_remote_get_user_after_retry"
  | "missing_claims_subject"
  | "definitive_invalid_or_expired_identity"
  | "claims_session_mismatch"
  | "retryable_network_failure"
  | "hard_timeout"
  | "unexpected_error"
  | "missing_identity";

export type AuthResolutionStrategy =
  | "local_claims"
  | "remote_get_user"
  | "claims_then_remote_get_user";

export type AuthClaimsDisposition =
  | "disabled"
  | "verified"
  | "invalid"
  | "mismatch"
  | "unavailable"
  | "retryable_failure";

export type AuthResolutionDurationBucket =
  | "under_50ms"
  | "50_to_249ms"
  | "250_to_999ms"
  | "1_to_2_9s"
  | "3_to_7_9s"
  | "8s_or_more";

/**
 * Identity fields copied only from a cryptographically verified JWT. Cookie-backed
 * session.user data is deliberately never copied into this principal.
 */
export interface VerifiedAuthPrincipal {
  id: string;
  aud: string;
  email?: string;
  phone?: string;
  role?: string;
  appMetadata: Record<string, unknown>;
  userMetadata: Record<string, unknown>;
  isAnonymous?: boolean;
}

interface AuthResolutionMetadata {
  outcome: AuthResolutionOutcome;
  strategy: AuthResolutionStrategy;
  attempts: number;
  durationMs: number;
  durationBucket: AuthResolutionDurationBucket;
  timedOut: boolean;
  fallbackUsed: boolean;
  claimsDisposition: AuthClaimsDisposition;
}

export type AuthResolutionResult<TUser extends User = User> =
  | (AuthResolutionMetadata & {
      ok: true;
      outcome: "verified_local_claims";
      principal: VerifiedAuthPrincipal;
      user: null;
    })
  | (AuthResolutionMetadata & {
      ok: true;
      outcome: "verified_remote_get_user" | "verified_remote_get_user_after_retry";
      principal: VerifiedAuthPrincipal;
      user: TUser;
    })
  | (AuthResolutionMetadata & {
      ok: false;
      principal: null;
      user: null;
    });

export type AuthResolutionEvent = Omit<AuthResolutionMetadata, "durationMs"> & {
  event: "auth_resolution";
};

export interface AuthResolutionOptions {
  claimsPolicy?: AuthClaimsPolicy;
  timeoutMs?: number;
  retryBackoffMs?: number;
  runtime?: Partial<AuthResolutionRuntime>;
  reporter?: (event: AuthResolutionEvent) => void;
}

const DEADLINE_EXCEEDED = Symbol("auth-resolution-deadline-exceeded");

type Settled<T> =
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; reason: unknown };

function settle<T>(promise: Promise<T>): Promise<Settled<T>> {
  return promise.then(
    (value) => ({ status: "fulfilled", value }),
    (reason) => ({ status: "rejected", reason }),
  );
}

function durationBucket(durationMs: number): AuthResolutionDurationBucket {
  if (durationMs < 50) return "under_50ms";
  if (durationMs < 250) return "50_to_249ms";
  if (durationMs < 1_000) return "250_to_999ms";
  if (durationMs < 3_000) return "1_to_2_9s";
  if (durationMs < 8_000) return "3_to_7_9s";
  return "8s_or_more";
}

function safeRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return { ...(value as Record<string, unknown>) };
}

function normalizedAudience(audience: unknown): string[] {
  if (typeof audience === "string") return [audience];
  if (!Array.isArray(audience)) return [];
  return audience.filter((value): value is string => typeof value === "string");
}

function principalFromClaims(
  claims: JwtPayload,
  policy: Extract<AuthClaimsPolicy, { mode: "enabled" }>,
  nowEpochSeconds: number,
): VerifiedAuthPrincipal | null {
  const subject = typeof claims.sub === "string" ? claims.sub.trim() : "";
  const issuer = typeof claims.iss === "string" ? claims.iss : "";
  const expiresAt = typeof claims.exp === "number" ? claims.exp : 0;
  const audiences = normalizedAudience(claims.aud);

  if (
    !subject ||
    issuer !== policy.issuer ||
    !audiences.includes(policy.audience) ||
    expiresAt <= nowEpochSeconds
  ) {
    return null;
  }

  return {
    id: subject,
    aud: policy.audience,
    ...(typeof claims.email === "string" ? { email: claims.email } : {}),
    ...(typeof claims.phone === "string" ? { phone: claims.phone } : {}),
    ...(typeof claims.role === "string" ? { role: claims.role } : {}),
    appMetadata: safeRecord(claims.app_metadata),
    userMetadata: safeRecord(claims.user_metadata),
    ...(typeof claims.is_anonymous === "boolean"
      ? { isAnonymous: claims.is_anonymous }
      : {}),
  };
}

function principalFromUser(user: User): VerifiedAuthPrincipal {
  return {
    id: user.id,
    aud: user.aud,
    ...(user.email ? { email: user.email } : {}),
    ...(user.phone ? { phone: user.phone } : {}),
    ...(user.role ? { role: user.role } : {}),
    appMetadata: safeRecord(user.app_metadata),
    userMetadata: safeRecord(user.user_metadata),
    ...(typeof user.is_anonymous === "boolean" ? { isAnonymous: user.is_anonymous } : {}),
  };
}

function isClaimsExpiryCompatibilityError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message === "JWT has expired" || error.message === "Missing exp claim")
  );
}

function isRetryableVerificationError(error: unknown) {
  return (
    isAuthRetryableFetchError(error) ||
    (isAuthError(error) && error.status === 408)
  );
}

function isDefinitiveAuthError(error: unknown) {
  if (!isAuthError(error) || isRetryableVerificationError(error)) return false;
  if (error.name === "AuthInvalidJwtError" || error.name === "AuthSessionMissingError") {
    return true;
  }
  const status = error.status;
  return typeof status === "number" && status >= 400 && status < 500 && status !== 429;
}

function defaultReporter(event: AuthResolutionEvent) {
  const method =
    event.outcome === "hard_timeout" ||
    event.outcome === "retryable_network_failure" ||
    event.outcome === "unexpected_error"
      ? console.warn
      : console.info;
  method.call(console, "[supabase] Auth resolution", event);
}

export async function resolveAuthenticatedUser<TUser extends User = User>(
  operations: AuthResolutionOperations<TUser>,
  options: AuthResolutionOptions = {},
): Promise<AuthResolutionResult<TUser>> {
  const timeoutMs = options.timeoutMs ?? AUTH_RESOLUTION_TIMEOUT_MS;
  const retryBackoffMs = options.retryBackoffMs ?? AUTH_RESOLUTION_RETRY_BACKOFF_MS;
  const claimsPolicy = options.claimsPolicy ?? {
    mode: "disabled" as const,
    reason: "active_session_required" as const,
  };
  const runtime: AuthResolutionRuntime = {
    now: options.runtime?.now ?? (() => Date.now()),
    setTimeout:
      options.runtime?.setTimeout ?? ((callback, delayMs) => setTimeout(callback, delayMs)),
    clearTimeout: options.runtime?.clearTimeout ?? ((timer) => clearTimeout(timer)),
  };
  const report = options.reporter ?? defaultReporter;
  const startedAt = runtime.now();
  let deadlineTimer: TimerHandle | undefined;
  let attempts = 0;
  let fallbackUsed = false;
  let claimsDisposition: AuthClaimsDisposition =
    claimsPolicy.mode === "enabled" ? "unavailable" : "disabled";
  let strategy: AuthResolutionStrategy =
    claimsPolicy.mode === "enabled" ? "local_claims" : "remote_get_user";
  let reported = false;

  const deadline = new Promise<typeof DEADLINE_EXCEEDED>((resolve) => {
    deadlineTimer = runtime.setTimeout(
      () => resolve(DEADLINE_EXCEEDED),
      Math.max(0, timeoutMs),
    );
  });

  const finish = (
    result:
      | {
          ok: true;
          outcome: "verified_local_claims";
          principal: VerifiedAuthPrincipal;
          user: null;
        }
      | {
          ok: true;
          outcome: "verified_remote_get_user" | "verified_remote_get_user_after_retry";
          principal: VerifiedAuthPrincipal;
          user: TUser;
        }
      | {
          ok: false;
          outcome: Exclude<
            AuthResolutionOutcome,
            | "verified_local_claims"
            | "verified_remote_get_user"
            | "verified_remote_get_user_after_retry"
          >;
          principal: null;
          user: null;
        },
  ): AuthResolutionResult<TUser> => {
    const durationMs = Math.max(0, runtime.now() - startedAt);
    const complete = {
      ...result,
      strategy,
      attempts,
      durationMs,
      durationBucket: durationBucket(durationMs),
      timedOut: result.outcome === "hard_timeout",
      fallbackUsed,
      claimsDisposition,
    } as AuthResolutionResult<TUser>;

    if (!reported) {
      reported = true;
      try {
        report({
          event: "auth_resolution",
          outcome: complete.outcome,
          strategy: complete.strategy,
          attempts: complete.attempts,
          durationBucket: complete.durationBucket,
          timedOut: complete.timedOut,
          fallbackUsed: complete.fallbackUsed,
          claimsDisposition: complete.claimsDisposition,
        });
      } catch {
        // Telemetry must never change an authentication decision.
      }
    }

    return complete;
  };

  const invoke = async <T>(operation: () => Promise<T>) => {
    // Attaching both handlers immediately ensures a rejection arriving after the
    // deadline is consumed instead of becoming an unhandled rejection.
    const operationResult = settle(Promise.resolve().then(operation));
    return await Promise.race([operationResult, deadline]);
  };

  const waitForRetry = async () => {
    let retryTimer: TimerHandle | undefined;
    const backoff = new Promise<true>((resolve) => {
      retryTimer = runtime.setTimeout(() => resolve(true), Math.max(0, retryBackoffMs));
    });
    try {
      return await Promise.race([backoff, deadline]);
    } finally {
      if (retryTimer !== undefined) runtime.clearTimeout(retryTimer);
    }
  };

  try {
    if (claimsPolicy.mode === "enabled") {
      if (!operations.getClaims || !operations.getSession) {
        claimsDisposition = "unavailable";
        fallbackUsed = true;
      } else {
        const claimsResult = await invoke(operations.getClaims);
        if (claimsResult === DEADLINE_EXCEEDED) {
          return finish({
            ok: false,
            outcome: "hard_timeout",
            principal: null,
            user: null,
          });
        }

        if (claimsResult.status === "rejected") {
          const error = claimsResult.reason;
          if (isClaimsExpiryCompatibilityError(error) || isDefinitiveAuthError(error)) {
            claimsDisposition = "invalid";
            return finish({
              ok: false,
              outcome: "definitive_invalid_or_expired_identity",
              principal: null,
              user: null,
            });
          }
          if (isRetryableVerificationError(error)) {
            claimsDisposition = "retryable_failure";
            fallbackUsed = true;
          } else {
            return finish({
              ok: false,
              outcome: "unexpected_error",
              principal: null,
              user: null,
            });
          }
        } else {
          const { data, error } = claimsResult.value;
          if (error) {
            if (isClaimsExpiryCompatibilityError(error) || isDefinitiveAuthError(error)) {
              claimsDisposition = "invalid";
              return finish({
                ok: false,
                outcome: "definitive_invalid_or_expired_identity",
                principal: null,
                user: null,
              });
            }
            if (isRetryableVerificationError(error)) {
              claimsDisposition = "retryable_failure";
              fallbackUsed = true;
            } else {
              return finish({
                ok: false,
                outcome: "unexpected_error",
                principal: null,
                user: null,
              });
            }
          } else if (!data?.claims) {
            claimsDisposition = "unavailable";
            fallbackUsed = true;
          } else {
            const rawSubject = data.claims.sub;
            if (typeof rawSubject !== "string" || !rawSubject.trim()) {
              claimsDisposition = "invalid";
              return finish({
                ok: false,
                outcome: "missing_claims_subject",
                principal: null,
                user: null,
              });
            }

            const principal = principalFromClaims(
              data.claims,
              claimsPolicy,
              Math.floor(runtime.now() / 1_000),
            );
            if (!principal) {
              claimsDisposition = "invalid";
              return finish({
                ok: false,
                outcome: "definitive_invalid_or_expired_identity",
                principal: null,
                user: null,
              });
            }

            const sessionResult = await invoke(operations.getSession);
            if (sessionResult === DEADLINE_EXCEEDED) {
              return finish({
                ok: false,
                outcome: "hard_timeout",
                principal: null,
                user: null,
              });
            }
            if (sessionResult.status === "rejected") {
              const error = sessionResult.reason;
              if (isRetryableVerificationError(error)) {
                claimsDisposition = "retryable_failure";
                fallbackUsed = true;
              } else if (isDefinitiveAuthError(error)) {
                claimsDisposition = "invalid";
                return finish({
                  ok: false,
                  outcome: "definitive_invalid_or_expired_identity",
                  principal: null,
                  user: null,
                });
              } else {
                return finish({
                  ok: false,
                  outcome: "unexpected_error",
                  principal: null,
                  user: null,
                });
              }
            } else if (sessionResult.value.error) {
              const error = sessionResult.value.error;
              if (isRetryableVerificationError(error)) {
                claimsDisposition = "retryable_failure";
                fallbackUsed = true;
              } else if (isDefinitiveAuthError(error)) {
                claimsDisposition = "invalid";
                return finish({
                  ok: false,
                  outcome: "definitive_invalid_or_expired_identity",
                  principal: null,
                  user: null,
                });
              } else {
                return finish({
                  ok: false,
                  outcome: "unexpected_error",
                  principal: null,
                  user: null,
                });
              }
            } else {
              const session = sessionResult.value.data.session;
              if (!session) {
                claimsDisposition = "invalid";
                return finish({
                  ok: false,
                  outcome: "definitive_invalid_or_expired_identity",
                  principal: null,
                  user: null,
                });
              }
              if (session.user.id !== principal.id) {
                claimsDisposition = "mismatch";
                return finish({
                  ok: false,
                  outcome: "claims_session_mismatch",
                  principal: null,
                  user: null,
                });
              }

              claimsDisposition = "verified";
              return finish({
                ok: true,
                outcome: "verified_local_claims",
                principal,
                user: null,
              });
            }
          }
        }
      }
      strategy = "claims_then_remote_get_user";
    }

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      attempts = attempt;
      const userResult = await invoke(operations.getUser);
      if (userResult === DEADLINE_EXCEEDED) {
        return finish({
          ok: false,
          outcome: "hard_timeout",
          principal: null,
          user: null,
        });
      }

      let retryable = false;
      if (userResult.status === "rejected") {
        const error = userResult.reason;
        if (isRetryableVerificationError(error)) retryable = true;
        else {
          return finish({
            ok: false,
            outcome: isDefinitiveAuthError(error)
              ? "definitive_invalid_or_expired_identity"
              : "unexpected_error",
            principal: null,
            user: null,
          });
        }
      } else {
        const { data, error } = userResult.value;
        if (!error && data.user) {
          return finish({
            ok: true,
            outcome:
              attempt === 1
                ? "verified_remote_get_user"
                : "verified_remote_get_user_after_retry",
            principal: principalFromUser(data.user),
            user: data.user,
          });
        }
        if (!error) {
          return finish({
            ok: false,
            outcome: "missing_identity",
            principal: null,
            user: null,
          });
        }
        if (isRetryableVerificationError(error)) retryable = true;
        else {
          return finish({
            ok: false,
            outcome: isDefinitiveAuthError(error)
              ? "definitive_invalid_or_expired_identity"
              : "unexpected_error",
            principal: null,
            user: null,
          });
        }
      }

      if (retryable && attempt === 2) {
        return finish({
          ok: false,
          outcome: "retryable_network_failure",
          principal: null,
          user: null,
        });
      }

      fallbackUsed = true;
      const retryWait = await waitForRetry();
      if (retryWait === DEADLINE_EXCEEDED) {
        return finish({
          ok: false,
          outcome: "hard_timeout",
          principal: null,
          user: null,
        });
      }
    }

    return finish({
      ok: false,
      outcome: "unexpected_error",
      principal: null,
      user: null,
    });
  } catch {
    return finish({
      ok: false,
      outcome: "unexpected_error",
      principal: null,
      user: null,
    });
  } finally {
    if (deadlineTimer !== undefined) runtime.clearTimeout(deadlineTimer);
  }
}
