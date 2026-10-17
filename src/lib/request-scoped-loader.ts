/** Share work only for the same server Request, never between visitors. */
export function createRequestScopedLoader<T>(load: () => Promise<T>) {
  const pending = new WeakMap<Request, Promise<T>>();
  return (request: Request): Promise<T> => {
    let result = pending.get(request);
    if (!result) {
      result = Promise.resolve().then(load);
      pending.set(request, result);
    }
    return result;
  };
}
