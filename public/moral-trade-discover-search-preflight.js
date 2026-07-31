(() => {
  "use strict";

  if (window.__moralTradeDiscoverSearchPreflightLoaded) return;
  window.__moralTradeDiscoverSearchPreflightLoaded = true;

  const nativeFetch = window.fetch.bind(window);
  const nativePushState = history.pushState.bind(history);
  const nativeReplaceState = history.replaceState.bind(history);
  const SUPPORTED_DOMAINS = new Set(["offers", "pools", "people"]);
  const SUPPORTED_SORTS = new Set([
    "best-fit",
    "newest",
    "deadline",
    "lowest-cost",
    "strongest-evidence",
  ]);

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function preferredElements(selector) {
    const elements = [...document.querySelectorAll(selector)];
    const visible = elements.filter(
      (element) =>
        element instanceof HTMLElement && element.getClientRects().length > 0,
    );
    return visible.length ? visible : elements;
  }

  function checkedValues(filter) {
    return unique(
      preferredElements(`input[data-filter="${filter}"]`)
        .filter(
          (element) => element instanceof HTMLInputElement && element.checked,
        )
        .map((element) => element.value.trim()),
    );
  }

  function firstControlValue(filter) {
    const control = preferredElements(`[data-filter="${filter}"]`).find(
      (element) =>
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement,
    );
    return control?.value ?? "";
  }

  function numericControlValue(filter) {
    const value = Number(firstControlValue(filter));
    return Number.isFinite(value) ? value : null;
  }

  function selectedDomain() {
    const tab = preferredElements(
      '[data-action="set-domain"][data-domain][aria-selected="true"]',
    ).find((element) => element instanceof HTMLElement);
    const domain = tab?.dataset.domain ?? "";
    return SUPPORTED_DOMAINS.has(domain) ? domain : null;
  }

  function selectedSort() {
    const raw = firstControlValue("sort");
    const mapped =
      raw === "lowest-burden"
        ? "lowest-cost"
        : raw === "deadline-risk"
          ? "deadline"
          : raw === "reliability"
            ? "strongest-evidence"
            : raw === "recently-verified"
              ? "newest"
              : raw;
    return SUPPORTED_SORTS.has(mapped) ? mapped : null;
  }

  function manualFiltersFromDom(existing) {
    const maximum = numericControlValue("max");
    const minimumReturn = numericControlValue("min-return");
    const verifiedOnly = preferredElements(
      'input[data-filter="verified"]',
    ).some(
      (element) => element instanceof HTMLInputElement && element.checked,
    );

    return {
      ...(existing && typeof existing === "object" ? existing : {}),
      causes: checkedValues("cause"),
      verifiedOnly,
      maximumOfferAmountCents:
        maximum !== null && maximum >= 0 && maximum < 250
          ? Math.round(maximum * 100)
          : null,
      minimumReturnAmountCents:
        minimumReturn !== null && minimumReturn > 0
          ? Math.round(minimumReturn * 100)
          : null,
      offerTypes: checkedValues("offer-type"),
      returnTypes: checkedValues("return-type"),
      recipient: firstControlValue("recipient").trim(),
      evidence: firstControlValue("evidence").trim(),
      flexibilities: checkedValues("flexibility"),
      deadlineBefore: firstControlValue("deadline") || null,
    };
  }

  function requestUrl(input) {
    try {
      if (typeof input === "string" || input instanceof URL) {
        return new URL(input, location.origin);
      }
      if (input instanceof Request) return new URL(input.url);
    } catch {
      return null;
    }
    return null;
  }

  function augmentSearchRequest(input, init) {
    const url = requestUrl(input);
    if (
      url?.pathname !== "/api/discover/search" ||
      typeof init?.body !== "string"
    ) {
      return init;
    }

    try {
      const payload = JSON.parse(init.body);
      if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
        return init;
      }
      const domain = selectedDomain();
      const sort = selectedSort();
      return {
        ...init,
        body: JSON.stringify({
          ...payload,
          ...(domain ? { domain } : {}),
          ...(sort ? { sort } : {}),
          manual: manualFiltersFromDom(payload.manual),
        }),
      };
    } catch {
      return init;
    }
  }

  function setOrDelete(params, key, value) {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }

  function augmentHistoryUrl(url) {
    if (url === null || url === undefined) return url;
    try {
      const parsed = new URL(String(url), location.href);
      if (parsed.origin !== location.origin || parsed.pathname !== "/discover") {
        return url;
      }
      const manual = manualFiltersFromDom({});
      const domain = selectedDomain();
      const sort = selectedSort();
      if (domain) parsed.searchParams.set("domain", domain);
      if (sort && sort !== "best-fit") parsed.searchParams.set("sort", sort);
      else parsed.searchParams.delete("sort");
      setOrDelete(
        parsed.searchParams,
        "causeFilter",
        manual.causes.length ? manual.causes.join(",") : null,
      );
      setOrDelete(
        parsed.searchParams,
        "verified",
        manual.verifiedOnly ? "1" : null,
      );
      setOrDelete(
        parsed.searchParams,
        "max",
        manual.maximumOfferAmountCents === null
          ? null
          : manual.maximumOfferAmountCents / 100,
      );
      setOrDelete(
        parsed.searchParams,
        "minReturn",
        manual.minimumReturnAmountCents === null
          ? null
          : manual.minimumReturnAmountCents / 100,
      );
      setOrDelete(
        parsed.searchParams,
        "offerType",
        manual.offerTypes.length ? manual.offerTypes.join(",") : null,
      );
      setOrDelete(
        parsed.searchParams,
        "returnType",
        manual.returnTypes.length ? manual.returnTypes.join(",") : null,
      );
      setOrDelete(parsed.searchParams, "recipient", manual.recipient || null);
      setOrDelete(parsed.searchParams, "evidence", manual.evidence || null);
      setOrDelete(
        parsed.searchParams,
        "flexibility",
        manual.flexibilities.length ? manual.flexibilities.join(",") : null,
      );
      setOrDelete(
        parsed.searchParams,
        "deadline",
        manual.deadlineBefore || null,
      );
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    } catch {
      return url;
    }
  }

  function augmentHistoryState(value) {
    if (!value || typeof value !== "object" || !value.discoverLiveSearch) {
      return value;
    }
    const domain = selectedDomain();
    const sort = selectedSort();
    return {
      ...value,
      discoverLiveSearch: {
        ...value.discoverLiveSearch,
        ...(domain ? { domain } : {}),
        ...(sort ? { sort } : {}),
        manual: manualFiltersFromDom(value.discoverLiveSearch.manual),
      },
    };
  }

  window.fetch = (input, init) =>
    nativeFetch(input, augmentSearchRequest(input, init));
  history.pushState = (value, unused, url) =>
    nativePushState(
      augmentHistoryState(value),
      unused,
      augmentHistoryUrl(url),
    );
  history.replaceState = (value, unused, url) =>
    nativeReplaceState(
      augmentHistoryState(value),
      unused,
      augmentHistoryUrl(url),
    );
})();
