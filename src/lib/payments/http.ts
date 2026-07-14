export function assertSameOriginPaymentPost(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const fetchSite = request.headers.get("sec-fetch-site");

  if (origin && origin !== requestOrigin) {
    throw new Error("Cross-origin payment actions are not permitted.");
  }

  if (!origin && referer) {
    try {
      if (new URL(referer).origin !== requestOrigin) {
        throw new Error("Cross-origin payment actions are not permitted.");
      }
    } catch {
      throw new Error("The payment action referer is invalid.");
    }
  }

  if (fetchSite && !["same-origin", "none"].includes(fetchSite)) {
    throw new Error("Cross-site payment actions are not permitted.");
  }
}

export function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function paymentErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "The payment action could not be completed.";
}
