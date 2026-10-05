/** Bound the whole read so a stalled dependency reaches the Messages retry UI. */
export const MESSAGES_LOAD_TIMEOUT_MS = 15_000;

export async function withMessagesDeadline<T>(
  load: () => Promise<T>,
  timeoutMs = MESSAGES_LOAD_TIMEOUT_MS,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Messages loading timed out")), timeoutMs);
  });

  try {
    // Keep redirects, authorization failures, and other errors intact. A
    // failed read must never become a fabricated empty inbox or missing thread.
    return await Promise.race([Promise.resolve().then(load), deadline]);
  } finally {
    clearTimeout(timer);
  }
}
