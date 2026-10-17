/** Limit concurrent section loaders per request, not across users or sessions. */
export const DASHBOARD_LOAD_CONCURRENCY = 6;

export async function runDashboardLoaders(
  loaders: ReadonlyArray<() => Promise<void>>,
  concurrency = DASHBOARD_LOAD_CONCURRENCY,
): Promise<void> {
  if (!Number.isSafeInteger(concurrency) || concurrency < 1) {
    throw new RangeError("Dashboard loader concurrency must be a positive safe integer.");
  }

  let nextIndex = 0;
  let failed = false;
  let firstError: unknown;

  async function worker() {
    while (nextIndex < loaders.length) {
      const load = loaders[nextIndex++];
      try {
        await load();
      } catch (error) {
        // Normal section failures are handled by their existing callers. Drain
        // the queue before propagating an unexpected failure; never hide it.
        if (!failed) firstError = error;
        failed = true;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, loaders.length) }, () => worker()),
  );
  if (failed) throw firstError;
}
