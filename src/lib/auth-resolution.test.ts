import assert from "node:assert/strict";
import { setImmediate as waitForImmediate } from "node:timers/promises";
import test from "node:test";

import {
  AuthApiError,
  AuthInvalidJwtError,
  AuthRetryableFetchError,
  type JwtPayload,
  type Session,
  type User,
} from "@supabase/supabase-js";

import {
  AUTH_RESOLUTION_RETRY_BACKOFF_MS,
  AUTH_RESOLUTION_TIMEOUT_MS,
  resolveAuthenticatedUser,
} from "./auth-resolution";

const FIXED_NOW_MS = Date.parse("2026-08-13T16:00:00.000Z");
const ISSUER = "https://project-ref.supabase.co/auth/v1";
const AUDIENCE = "authenticated";
const USER_ID = "00000000-0000-4000-8000-000000000630";
const OTHER_USER_ID = "00000000-0000-4000-8000-000000000631";
const SESSION_ID = "00000000-0000-4000-8000-000000000632";

const PRIVATE_SENTINELS = {
  accessToken: "access-token-must-never-be-logged",
  refreshToken: "refresh-token-must-never-be-logged",
  cookie: "sb-project-auth-token=private-cookie-value",
  email: "issue-630-private@example.invalid",
  profile: "private-profile-value",
  userId: USER_ID,
};

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: USER_ID,
    aud: AUDIENCE,
    role: "authenticated",
    email: PRIVATE_SENTINELS.email,
    app_metadata: {
      provider: "email",
      providers: ["email"],
    },
    user_metadata: {
      display_name: PRIVATE_SENTINELS.profile,
    },
    created_at: "2026-08-13T15:00:00.000Z",
    confirmed_at: "2026-08-13T15:00:01.000Z",
    email_confirmed_at: "2026-08-13T15:00:01.000Z",
    last_sign_in_at: "2026-08-13T15:59:59.000Z",
    updated_at: "2026-08-13T15:59:59.000Z",
    identities: [],
    is_anonymous: false,
    ...overrides,
  };
}

function makeSession(user = makeUser()): Session {
  return {
    access_token: PRIVATE_SENTINELS.accessToken,
    refresh_token: PRIVATE_SENTINELS.refreshToken,
    expires_in: 3_600,
    expires_at: Math.floor(FIXED_NOW_MS / 1_000) + 3_600,
    token_type: "bearer",
    user,
  };
}

function makeClaims(overrides: Record<string, unknown> = {}): JwtPayload {
  return {
    iss: ISSUER,
    sub: USER_ID,
    aud: AUDIENCE,
    exp: Math.floor(FIXED_NOW_MS / 1_000) + 3_600,
    iat: Math.floor(FIXED_NOW_MS / 1_000) - 60,
    role: "authenticated",
    aal: "aal1",
    session_id: SESSION_ID,
    email: PRIVATE_SENTINELS.email,
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: { display_name: PRIVATE_SENTINELS.profile },
    ...overrides,
  } as JwtPayload;
}

type TimerHandle = ReturnType<typeof setTimeout>;

function createManualRuntime(startMs = FIXED_NOW_MS) {
  let nowMs = startMs;
  let nextHandle = 1;
  let scheduledCount = 0;
  const timers = new Map<
    TimerHandle,
    { callback: () => void; dueAt: number; order: number }
  >();

  const runtime = {
    now: () => nowMs,
    setTimeout: (callback: () => void, delayMs: number) => {
      const order = nextHandle++;
      const handle = order as unknown as TimerHandle;
      scheduledCount += 1;
      timers.set(handle, {
        callback,
        dueAt: nowMs + Math.max(0, delayMs),
        order,
      });
      return handle;
    },
    clearTimeout: (handle: TimerHandle) => {
      timers.delete(handle);
    },
  };

  const advance = (milliseconds: number) => {
    nowMs += milliseconds;

    while (true) {
      const next = [...timers.entries()]
        .filter(([, timer]) => timer.dueAt <= nowMs)
        .sort(([, left], [, right]) => left.dueAt - right.dueAt || left.order - right.order)[0];

      if (!next) return;

      const [handle, timer] = next;
      timers.delete(handle);
      timer.callback();
    }
  };

  return {
    activeTimerCount: () => timers.size,
    advance,
    runtime,
    scheduledTimerCount: () => scheduledCount,
  };
}

async function flushMicrotasks() {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
  }
}

function disabledOptions(
  clock: ReturnType<typeof createManualRuntime>,
  overrides: Record<string, unknown> = {},
) {
  return {
    claimsPolicy: {
      mode: "disabled" as const,
      reason: "active_session_required" as const,
    },
    runtime: clock.runtime,
    reporter: () => {},
    ...overrides,
  };
}

function enabledOptions(
  clock: ReturnType<typeof createManualRuntime>,
  overrides: Record<string, unknown> = {},
) {
  return {
    claimsPolicy: {
      mode: "enabled" as const,
      issuer: ISSUER,
      audience: AUDIENCE,
      activeAsymmetricSignerProven: true as const,
    },
    runtime: clock.runtime,
    reporter: () => {},
    ...overrides,
  };
}

test("auth resolution keeps one eight-second deadline and one small bounded retry", () => {
  assert.equal(AUTH_RESOLUTION_TIMEOUT_MS, 8_000);
  assert.equal(AUTH_RESOLUTION_RETRY_BACKOFF_MS, 100);
});

test("verified claims with a matching realistic session return a verified principal", async () => {
  const clock = createManualRuntime();
  const forgedSessionEmail = "forged-cookie-session@example.invalid";
  const forgedSessionMetadata = "forged-cookie-session-metadata";
  const session = makeSession(
    makeUser({
      email: forgedSessionEmail,
      user_metadata: { display_name: forgedSessionMetadata },
    }),
  );
  let remoteCalls = 0;

  const result = await resolveAuthenticatedUser<User>(
    {
      getClaims: async () => ({ data: { claims: makeClaims() }, error: null }),
      getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => {
        remoteCalls += 1;
        return { data: { user: makeUser() }, error: null };
      },
    },
    enabledOptions(clock),
  );

  assert.equal(result.ok, true);
  assert.equal(result.outcome, "verified_local_claims");
  assert.equal(result.user, null);
  assert.equal(result.principal?.id, USER_ID);
  const serializedPrincipal = JSON.stringify(result.principal);
  assert.equal(serializedPrincipal.includes(forgedSessionEmail), false);
  assert.equal(serializedPrincipal.includes(forgedSessionMetadata), false);
  assert.equal(result.attempts, 0);
  assert.equal(result.timedOut, false);
  assert.equal(result.fallbackUsed, false);
  assert.equal(result.claimsDisposition, "verified");
  assert.equal(remoteCalls, 0);
  assert.equal(clock.activeTimerCount(), 0);
});

test("verified claims without a subject fail closed before reading a session", async () => {
  const clock = createManualRuntime();
  let sessionCalls = 0;
  let remoteCalls = 0;

  const result = await resolveAuthenticatedUser<User>(
    {
      getClaims: async () => ({
        data: { claims: makeClaims({ sub: undefined }) },
        error: null,
      }),
      getSession: async () => {
        sessionCalls += 1;
        return { data: { session: makeSession() }, error: null };
      },
      getUser: async () => {
        remoteCalls += 1;
        return { data: { user: makeUser() }, error: null };
      },
    },
    enabledOptions(clock),
  );

  assert.equal(result.ok, false);
  assert.equal(result.outcome, "missing_claims_subject");
  assert.equal(result.claimsDisposition, "invalid");
  assert.equal(sessionCalls, 0);
  assert.equal(remoteCalls, 0);
});

test("an invalid claims signature is definitive and is never remotely retried", async () => {
  const clock = createManualRuntime();
  let remoteCalls = 0;

  const result = await resolveAuthenticatedUser<User>(
    {
      getClaims: async () => ({
        data: { claims: null },
        error: new AuthInvalidJwtError("signature invalid"),
      }),
      getSession: async () => ({ data: { session: makeSession() }, error: null }),
      getUser: async () => {
        remoteCalls += 1;
        return { data: { user: makeUser() }, error: null };
      },
    },
    enabledOptions(clock),
  );

  assert.equal(result.ok, false);
  assert.equal(result.outcome, "definitive_invalid_or_expired_identity");
  assert.equal(result.claimsDisposition, "invalid");
  assert.equal(remoteCalls, 0);
});

test("verified but expired claims fail closed without trusting the session", async () => {
  const clock = createManualRuntime();
  let sessionCalls = 0;
  let remoteCalls = 0;

  const result = await resolveAuthenticatedUser<User>(
    {
      getClaims: async () => ({
        data: {
          claims: makeClaims({ exp: Math.floor(FIXED_NOW_MS / 1_000) - 1 }),
        },
        error: null,
      }),
      getSession: async () => {
        sessionCalls += 1;
        return { data: { session: makeSession() }, error: null };
      },
      getUser: async () => {
        remoteCalls += 1;
        return { data: { user: makeUser() }, error: null };
      },
    },
    enabledOptions(clock),
  );

  assert.equal(result.ok, false);
  assert.equal(result.outcome, "definitive_invalid_or_expired_identity");
  assert.equal(result.claimsDisposition, "invalid");
  assert.equal(sessionCalls, 0);
  assert.equal(remoteCalls, 0);
});

test("a verified claims/session user-ID mismatch fails closed", async () => {
  const clock = createManualRuntime();
  let remoteCalls = 0;

  const result = await resolveAuthenticatedUser<User>(
    {
      getClaims: async () => ({ data: { claims: makeClaims() }, error: null }),
      getSession: async () => ({
        data: { session: makeSession(makeUser({ id: OTHER_USER_ID })) },
        error: null,
      }),
      getUser: async () => {
        remoteCalls += 1;
        return { data: { user: makeUser() }, error: null };
      },
    },
    enabledOptions(clock),
  );

  assert.equal(result.ok, false);
  assert.equal(result.outcome, "claims_session_mismatch");
  assert.equal(result.claimsDisposition, "mismatch");
  assert.equal(remoteCalls, 0);
});

test("an unavailable claims operation falls back to verified remote getUser", async () => {
  const clock = createManualRuntime();
  let remoteCalls = 0;

  const result = await resolveAuthenticatedUser<User>(
    {
      getUser: async () => {
        remoteCalls += 1;
        return { data: { user: makeUser() }, error: null };
      },
    },
    enabledOptions(clock),
  );

  assert.equal(result.ok, true);
  assert.equal(result.outcome, "verified_remote_get_user");
  assert.equal(result.attempts, 1);
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.claimsDisposition, "unavailable");
  assert.equal(remoteCalls, 1);
});

test("a retryable getClaims failure falls back to remote verification", async () => {
  const clock = createManualRuntime();
  let remoteCalls = 0;

  const result = await resolveAuthenticatedUser<User>(
    {
      getClaims: async () => ({
        data: { claims: null },
        error: new AuthRetryableFetchError("temporary JWKS fetch failure", 503),
      }),
      getSession: async () => ({ data: { session: makeSession() }, error: null }),
      getUser: async () => {
        remoteCalls += 1;
        return { data: { user: makeUser() }, error: null };
      },
    },
    enabledOptions(clock),
  );

  assert.equal(result.ok, true);
  assert.equal(result.outcome, "verified_remote_get_user");
  assert.equal(result.attempts, 1);
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.claimsDisposition, "retryable_failure");
  assert.equal(remoteCalls, 1);
});

test("remote getUser first-attempt success has no retry latency", async () => {
  const clock = createManualRuntime();
  let remoteCalls = 0;

  const result = await resolveAuthenticatedUser<User>(
    {
      getUser: async () => {
        remoteCalls += 1;
        return { data: { user: makeUser() }, error: null };
      },
    },
    disabledOptions(clock),
  );

  assert.equal(result.ok, true);
  assert.equal(result.outcome, "verified_remote_get_user");
  assert.equal(result.attempts, 1);
  assert.equal(result.fallbackUsed, false);
  assert.equal(remoteCalls, 1);
  assert.equal(clock.scheduledTimerCount(), 1, "only the total deadline timer is scheduled");
  assert.equal(clock.activeTimerCount(), 0);
});

test("one retryable remote failure backs off once and then succeeds", async () => {
  const clock = createManualRuntime();
  let remoteCalls = 0;

  const resolution = resolveAuthenticatedUser<User>(
    {
      getUser: async () => {
        remoteCalls += 1;
        if (remoteCalls === 1) {
          return {
            data: { user: null },
            error: new AuthRetryableFetchError("temporary upstream timeout", 0),
          };
        }
        return { data: { user: makeUser() }, error: null };
      },
    },
    disabledOptions(clock),
  );

  await flushMicrotasks();
  assert.equal(remoteCalls, 1);
  clock.advance(AUTH_RESOLUTION_RETRY_BACKOFF_MS - 1);
  await flushMicrotasks();
  assert.equal(remoteCalls, 1);
  clock.advance(1);
  await flushMicrotasks();

  const result = await resolution;
  assert.equal(result.ok, true);
  assert.equal(result.outcome, "verified_remote_get_user_after_retry");
  assert.equal(result.attempts, 2);
  assert.equal(result.fallbackUsed, true);
  assert.equal(remoteCalls, 2);
  assert.equal(clock.activeTimerCount(), 0);
});

test("two retryable remote failures stop after the bounded second attempt", async () => {
  const clock = createManualRuntime();
  let remoteCalls = 0;

  const resolution = resolveAuthenticatedUser<User>(
    {
      getUser: async () => {
        remoteCalls += 1;
        return {
          data: { user: null },
          error: new AuthRetryableFetchError("temporary upstream timeout", 0),
        };
      },
    },
    disabledOptions(clock),
  );

  await flushMicrotasks();
  clock.advance(AUTH_RESOLUTION_RETRY_BACKOFF_MS);
  await flushMicrotasks();

  const result = await resolution;
  assert.equal(result.ok, false);
  assert.equal(result.outcome, "retryable_network_failure");
  assert.equal(result.attempts, 2);
  assert.equal(result.fallbackUsed, true);
  assert.equal(remoteCalls, 2);
  assert.equal(clock.activeTimerCount(), 0);
});

test("one total wall-clock deadline bounds a hanging remote attempt", async () => {
  const clock = createManualRuntime();
  let remoteCalls = 0;

  const resolution = resolveAuthenticatedUser<User>(
    {
      getUser: () => {
        remoteCalls += 1;
        return new Promise(() => {});
      },
    },
    disabledOptions(clock, { timeoutMs: 275 }),
  );

  await flushMicrotasks();
  clock.advance(274);
  await flushMicrotasks();
  assert.equal(remoteCalls, 1);
  clock.advance(1);
  await flushMicrotasks();

  const result = await resolution;
  assert.equal(result.ok, false);
  assert.equal(result.outcome, "hard_timeout");
  assert.equal(result.timedOut, true);
  assert.equal(result.attempts, 1);
  assert.equal(remoteCalls, 1);
  assert.equal(clock.activeTimerCount(), 0);
});

test("the total deadline also bounds retry backoff and prevents a late second attempt", async () => {
  const clock = createManualRuntime();
  let remoteCalls = 0;

  const resolution = resolveAuthenticatedUser<User>(
    {
      getUser: async () => {
        remoteCalls += 1;
        return {
          data: { user: null },
          error: new AuthRetryableFetchError("temporary upstream timeout", 0),
        };
      },
    },
    disabledOptions(clock, { timeoutMs: 50, retryBackoffMs: 100 }),
  );

  await flushMicrotasks();
  assert.equal(remoteCalls, 1);
  clock.advance(50);
  await flushMicrotasks();

  const result = await resolution;
  assert.equal(result.ok, false);
  assert.equal(result.outcome, "hard_timeout");
  assert.equal(result.attempts, 1);
  assert.equal(remoteCalls, 1);
  assert.equal(clock.activeTimerCount(), 0);
});

test("a definitive invalid-token getUser result is not retried", async () => {
  const clock = createManualRuntime();
  let remoteCalls = 0;

  const result = await resolveAuthenticatedUser<User>(
    {
      getUser: async () => {
        remoteCalls += 1;
        return {
          data: { user: null },
          error: new AuthApiError("invalid JWT", 401, "bad_jwt"),
        };
      },
    },
    disabledOptions(clock),
  );

  assert.equal(result.ok, false);
  assert.equal(result.outcome, "definitive_invalid_or_expired_identity");
  assert.equal(result.attempts, 1);
  assert.equal(result.timedOut, false);
  assert.equal(remoteCalls, 1);
  assert.equal(clock.scheduledTimerCount(), 1);
});

test("a definitive expired-token getUser result is not retried", async () => {
  const clock = createManualRuntime();
  let remoteCalls = 0;

  const result = await resolveAuthenticatedUser<User>(
    {
      getUser: async () => {
        remoteCalls += 1;
        return {
          data: { user: null },
          error: new AuthApiError("JWT expired", 403, "jwt_expired"),
        };
      },
    },
    disabledOptions(clock),
  );

  assert.equal(result.ok, false);
  assert.equal(result.outcome, "definitive_invalid_or_expired_identity");
  assert.equal(result.attempts, 1);
  assert.equal(remoteCalls, 1);
});

test("an explicit HTTP request-timeout result is retryable and can recover", async () => {
  const clock = createManualRuntime();
  let remoteCalls = 0;

  const resolution = resolveAuthenticatedUser<User>(
    {
      getUser: async () => {
        remoteCalls += 1;
        return remoteCalls === 1
          ? {
              data: { user: null },
              error: new AuthApiError("upstream request timeout", 408, "request_timeout"),
            }
          : { data: { user: makeUser() }, error: null };
      },
    },
    disabledOptions(clock),
  );

  await flushMicrotasks();
  clock.advance(AUTH_RESOLUTION_RETRY_BACKOFF_MS);
  await flushMicrotasks();

  const result = await resolution;
  assert.equal(result.ok, true);
  assert.equal(result.outcome, "verified_remote_get_user_after_retry");
  assert.equal(result.attempts, 2);
  assert.equal(remoteCalls, 2);
});

test("an unexpected thrown rejection is contained and fails closed", async () => {
  const clock = createManualRuntime();
  const result = await resolveAuthenticatedUser<User>(
    {
      getUser: async () => {
        throw new Error("unexpected transport implementation failure");
      },
    },
    disabledOptions(clock),
  );

  assert.equal(result.ok, false);
  assert.equal(result.outcome, "unexpected_error");
  assert.equal(result.attempts, 1);
  assert.equal(result.timedOut, false);
  assert.equal(clock.activeTimerCount(), 0);
});

test("deadline timers are cleared after an ordinary settled result", async () => {
  const clock = createManualRuntime();

  const result = await resolveAuthenticatedUser<User>(
    {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    disabledOptions(clock),
  );

  assert.equal(result.ok, false);
  assert.equal(result.outcome, "missing_identity");
  assert.equal(clock.scheduledTimerCount(), 1);
  assert.equal(clock.activeTimerCount(), 0);
});

test("a late rejection after the deadline is observed and never becomes unhandled", async () => {
  const clock = createManualRuntime();
  let rejectLate: ((reason: Error) => void) | undefined;
  const lateRequest = new Promise<{
    data: { user: User | null };
    error: null;
  }>((_resolve, reject) => {
    rejectLate = reject;
  });
  const unhandled: unknown[] = [];
  const onUnhandled = (reason: unknown) => unhandled.push(reason);
  process.on("unhandledRejection", onUnhandled);

  try {
    const resolution = resolveAuthenticatedUser<User>(
      { getUser: () => lateRequest },
      disabledOptions(clock, { timeoutMs: 25 }),
    );

    await flushMicrotasks();
    clock.advance(25);
    await flushMicrotasks();
    const result = await resolution;

    assert.equal(result.outcome, "hard_timeout");
    assert.equal(clock.activeTimerCount(), 0);

    assert.ok(rejectLate);
    rejectLate(new Error("late private transport rejection"));
    await waitForImmediate();
    assert.deepEqual(unhandled, []);
  } finally {
    process.removeListener("unhandledRejection", onUnhandled);
  }
});

test("structured instrumentation contains no token, cookie, claims, email, profile, or user ID", async () => {
  const clock = createManualRuntime();
  const events: unknown[] = [];

  const result = await resolveAuthenticatedUser<User>(
    {
      getUser: async () => ({
        data: { user: null },
        error: new AuthApiError(
          `invalid ${PRIVATE_SENTINELS.accessToken} ${PRIVATE_SENTINELS.cookie} ${PRIVATE_SENTINELS.email} ${PRIVATE_SENTINELS.profile} ${PRIVATE_SENTINELS.userId}`,
          401,
          "bad_jwt",
        ),
      }),
    },
    disabledOptions(clock, { reporter: (event: unknown) => events.push(event) }),
  );

  assert.equal(result.outcome, "definitive_invalid_or_expired_identity");
  assert.equal(events.length, 1);
  const serialized = JSON.stringify(events);

  for (const sentinel of Object.values(PRIVATE_SENTINELS)) {
    assert.equal(serialized.includes(sentinel), false, `telemetry leaked ${sentinel}`);
  }

  for (const forbiddenField of [
    "access_token",
    "refresh_token",
    "cookie",
    "claims",
    "email",
    "profile",
    "userId",
    "user_id",
  ]) {
    assert.equal(serialized.includes(`\"${forbiddenField}\"`), false);
  }
});

test("a throwing instrumentation reporter cannot change the fail-closed auth result", async () => {
  const clock = createManualRuntime();

  const result = await resolveAuthenticatedUser<User>(
    {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    disabledOptions(clock, {
      reporter: () => {
        throw new Error("telemetry transport unavailable");
      },
    }),
  );

  assert.equal(result.ok, false);
  assert.equal(result.outcome, "missing_identity");
  assert.equal(clock.activeTimerCount(), 0);
});
