export const AUTH_RESOLUTION_TIMEOUT_MS = 8_000;

interface AuthResolutionError {
  message: string;
}

interface AuthUserResult<TUser> {
  data: { user: TUser | null };
  error: AuthResolutionError | null;
}

export type AuthResolutionResult<TUser> = AuthUserResult<TUser> & {
  timedOut: boolean;
};

export async function resolveAuthUserWithDeadline<TUser>(
  request: Promise<AuthUserResult<TUser>>,
  timeoutMs = AUTH_RESOLUTION_TIMEOUT_MS,
): Promise<AuthResolutionResult<TUser>> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      request.then((result) => ({
        ...result,
        timedOut: false,
      })),
      new Promise<AuthResolutionResult<TUser>>((resolve) => {
        timeout = setTimeout(
          () =>
            resolve({
              data: { user: null },
              error: { message: "Timed out resolving authenticated user." },
              timedOut: true,
            }),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}
