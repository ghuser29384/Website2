const MORAL_TRADE_HOSTS = new Set(["moraltrade.org", "www.moraltrade.org"]);

function parseUrl(value) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function isExpectedFirstTimeStandardsAbort(record, flow) {
  if (flow !== "first-time-desktop") return false;
  if (record?.errorText !== "net::ERR_ABORTED") return false;
  if (record?.method !== "GET" || record?.resourceType !== "fetch") return false;
  if (record?.isNavigationRequest !== false) return false;

  const requestUrl = parseUrl(record.url);
  const refererUrl = parseUrl(record.headers?.referer);
  if (!requestUrl || !refererUrl) return false;
  if (!MORAL_TRADE_HOSTS.has(requestUrl.hostname)) return false;
  if (!MORAL_TRADE_HOSTS.has(refererUrl.hostname)) return false;
  if (requestUrl.origin !== refererUrl.origin) return false;

  return (
    requestUrl.pathname === "/moral-trade-input-standards.json" &&
    requestUrl.search === "" &&
    refererUrl.pathname === "/complete-profile"
  );
}
