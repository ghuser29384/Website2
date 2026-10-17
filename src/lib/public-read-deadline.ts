/** Bound optional public reads so an upstream stall cannot hide the page shell.
 * Callers must render an unavailable state, never treat a timeout as zero data.
 */
export async function readPublicData<T>(
  request: PromiseLike<T>,
  timeoutMs = 4_000,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error("Public data could not be loaded in time. Please try again.")), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
