#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

PATH = Path(".github/scripts/pr158-two-account-browser-qa.mjs")
MOBILE_PUBLIC_START = "  const mobilePublic = await makeSession(browser, {"
MOBILE_RESPONDER_START = "  const mobileResponder = await makeSession(browser, {"
DIAGNOSTICS_START = "  const allDiagnostics = report.diagnostics;"
DIAGNOSTICS_END = '  report.outcome = "pass";'


def replace_block(source: str, start: str, end: str, replacement: str, label: str) -> str:
    starts = [index for index in range(len(source)) if source.startswith(start, index)]
    if len(starts) != 1:
        raise RuntimeError(f"Expected one {label} start marker; found {len(starts)}.")
    start_index = starts[0]
    end_index = source.find(end, start_index + len(start))
    if end_index < 0:
        raise RuntimeError(f"Missing {label} end marker.")
    return source[:start_index] + replacement + source[end_index:]


def main() -> None:
    source = PATH.read_text(encoding="utf-8")

    # The full 390×844 workflow already exercises the live public marketplace before
    # matching the deterministic offer. The legacy embedded mobile-public check runs
    # after activation, when that offer is correctly no longer public, so it is redundant
    # and semantically stale.
    source = replace_block(
        source,
        MOBILE_PUBLIC_START,
        MOBILE_RESPONDER_START,
        "",
        "post-activation redundant mobile-public block",
    )

    diagnostics = r'''  const allDiagnostics = report.diagnostics;
  await recordCheck("application-origin browser diagnostics", async () => {
    const knownDiagnostics = [];
    const unexpectedDiagnostics = [];
    const knownPrefetch404Paths = new Set(["/", "/discover", "/feed", "/offers"]);

    for (const item of allDiagnostics) {
      const hasStripeBypassCors = item.consoleErrors.some((error) =>
        error.includes("m.stripe.com/6") && error.includes("x-vercel-protection-bypass"),
      );

      for (const error of item.consoleErrors) {
        const isKnown =
          error === "Failed to load resource: the server responded with a status of 404 ()" ||
          error.startsWith("Framing 'https://js.stripe.com/' violates the following report-only") ||
          (error.includes("m.stripe.com/6") && error.includes("x-vercel-protection-bypass")) ||
          (error === "Failed to load resource: net::ERR_FAILED" && hasStripeBypassCors);
        (isKnown ? knownDiagnostics : unexpectedDiagnostics).push(
          `${item.label} console: ${error}`,
        );
      }

      for (const error of item.pageErrors) {
        unexpectedDiagnostics.push(`${item.label} pageerror: ${error}`);
      }

      for (const error of item.failedRequests) {
        const isNavigationCancellation =
          error.failure === "net::ERR_ABORTED" &&
          ["fetch", "ping"].includes(error.resourceType);
        (isNavigationCancellation ? knownDiagnostics : unexpectedDiagnostics).push(
          `${item.label} request: ${JSON.stringify(error)}`,
        );
      }

      for (const error of item.badResponses) {
        let pathname = "";
        try {
          pathname = new URL(error.url).pathname;
        } catch {
          // An invalid application URL is unexpected below.
        }
        const isKnownRscPrefetch404 =
          error.status === 404 &&
          error.resourceType === "fetch" &&
          knownPrefetch404Paths.has(pathname);
        (isKnownRscPrefetch404 ? knownDiagnostics : unexpectedDiagnostics).push(
          `${item.label} response: ${JSON.stringify(error)}`,
        );
      }
    }

    report.knownDiagnostics = knownDiagnostics;
    expect(unexpectedDiagnostics, unexpectedDiagnostics.join("\n")).toEqual([]);
    return `No unexpected application-origin browser errors were observed. Retained ${knownDiagnostics.length} raw navigation-prefetch, report-only Stripe, and test-bypass diagnostics for review.`;
  });

'''
    source = replace_block(
        source,
        DIAGNOSTICS_START,
        DIAGNOSTICS_END,
        diagnostics,
        "browser diagnostics block",
    )

    if MOBILE_PUBLIC_START in source:
        raise RuntimeError("The redundant post-activation mobile-public block remains.")
    if source.count('recordCheck("application-origin browser diagnostics"') != 1:
        raise RuntimeError("The classified diagnostics check was not installed exactly once.")
    if "knownPrefetch404Paths" not in source or "unexpectedDiagnostics" not in source:
        raise RuntimeError("The diagnostics classification markers are missing.")

    PATH.write_text(source, encoding="utf-8")
    print(
        "Removed the redundant post-activation mobile-public check and retained raw known diagnostics while failing on unexpected browser errors."
    )


if __name__ == "__main__":
    main()
