(function installLiveAccountData() {
  "use strict";

  if (window.__MT_LIVE_ACCOUNT_DATA__) return;
  window.__MT_LIVE_ACCOUNT_DATA__ = true;

  const ENDPOINT = "/api/live-account";
  const TEXT_SELECTOR = "h1,h2,h3,h4,p,span,strong,small,button,a,div";
  const hasBootstrap = Object.prototype.hasOwnProperty.call(
    window,
    "__MT_LIVE_ACCOUNT_BOOTSTRAP__",
  );

  let account = normalizePayload(
    hasBootstrap ? window.__MT_LIVE_ACCOUNT_BOOTSTRAP__ : { authenticated: false },
  );
  let applying = false;
  let scheduled = false;

  function stringOrNull(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  function booleanOrNull(value) {
    return typeof value === "boolean" ? value : null;
  }

  function normalizePayload(payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    const details = source.account && typeof source.account === "object" ? source.account : {};
    const paymentAccount =
      details.paymentAccount && typeof details.paymentAccount === "object"
        ? details.paymentAccount
        : {};
    const notifications =
      details.notifications && typeof details.notifications === "object"
        ? details.notifications
        : {};
    const publicTrustProfile =
      details.publicTrustProfile && typeof details.publicTrustProfile === "object"
        ? details.publicTrustProfile
        : {};
    const standardTerms =
      details.standardTerms && typeof details.standardTerms === "object"
        ? details.standardTerms
        : {};

    return {
      authenticated: source.authenticated === true,
      completedCommitments:
        Number.isInteger(details.completedCommitments) && details.completedCommitments >= 0
          ? details.completedCommitments
          : null,
      currency: stringOrNull(details.currency),
      defaultPrivacy: stringOrNull(details.defaultPrivacy),
      displayName: stringOrNull(details.displayName),
      disputeResolution: stringOrNull(details.disputeResolution),
      firstName: stringOrNull(details.firstName),
      initials: stringOrNull(details.initials),
      memberSince: stringOrNull(details.memberSince),
      monthlySafeCap: stringOrNull(details.monthlySafeCap),
      notifications: {
        enabled: booleanOrNull(notifications.enabled),
        label: stringOrNull(notifications.label),
      },
      paymentAccount: {
        configured: paymentAccount.configured === true,
        label: stringOrNull(paymentAccount.label),
      },
      publicTrustProfile: {
        enabled: booleanOrNull(publicTrustProfile.enabled),
        label: stringOrNull(publicTrustProfile.label),
      },
      standardTerms: {
        href: stringOrNull(standardTerms.href) || "/terms",
        label: stringOrNull(standardTerms.label) || "Current site terms",
      },
    };
  }

  function normalizeText(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function findExact(root, label) {
    const target = normalizeText(label);
    return (
      Array.from(root.querySelectorAll(TEXT_SELECTOR))
        .filter((element) => normalizeText(element.textContent) === target)
        .sort((left, right) => {
          if (left.childElementCount !== right.childElementCount) {
            return left.childElementCount - right.childElementCount;
          }
          return String(left.textContent || "").length - String(right.textContent || "").length;
        })[0] || null
    );
  }

  function localGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }

  function patchGreeting() {
    const greeting = document.querySelector(".head .date span.muted");
    if (!greeting) return;

    const suffix = account.authenticated && account.firstName ? `, ${account.firstName}.` : ".";
    const nextGreeting = `${localGreeting()}${suffix}`;
    if (greeting.textContent !== nextGreeting) greeting.textContent = nextGreeting;
    greeting.setAttribute("data-mt-live-account-greeting", "true");
  }

  function patchAvatar() {
    let avatar = document.querySelector('[data-mt-live-account-avatar="true"]');

    if (!avatar) {
      const topbar =
        document.querySelector(".topbar") ||
        document.querySelector('[role="banner"]') ||
        document.querySelector("header");
      if (!topbar) return;

      const namedCandidate = topbar.querySelector(
        'button[class*="avatar" i],a[class*="avatar" i],button[class*="profile" i],a[class*="profile" i],button[aria-label*="account" i],a[aria-label*="account" i],button[aria-label*="profile" i],a[aria-label*="profile" i]',
      );
      const compactCandidates = Array.from(topbar.querySelectorAll("button,a")).filter((element) =>
        /^[A-Z]{1,3}$/.test(String(element.textContent || "").trim()),
      );
      avatar = namedCandidate || compactCandidates.at(-1) || null;
      if (!avatar) return;
      avatar.setAttribute("data-mt-live-account-avatar", "true");
    }

    const label = account.authenticated
      ? account.displayName
        ? `${account.displayName} account`
        : "Your account"
      : "Account";
    const visibleValue = account.authenticated && account.initials ? account.initials : "•";

    if (avatar.textContent !== visibleValue) avatar.textContent = visibleValue;
    avatar.setAttribute("aria-label", label);
    avatar.setAttribute("title", label);
  }

  function findAccountPanel() {
    const existing = document.querySelector('[data-mt-live-account-panel="true"]');
    if (existing) return existing;

    const marker = findExact(document, "Account & controls");
    if (!marker) return null;

    let current = marker.parentElement;
    while (current && current !== document.body) {
      const text = normalizeText(current.textContent);
      if (
        text.includes("currency") &&
        text.includes("monthly safe cap") &&
        text.includes("standard terms") &&
        text.includes("sign out")
      ) {
        current.setAttribute("data-mt-live-account-panel", "true");
        marker.setAttribute("data-mt-live-account-marker", "true");
        return current;
      }
      current = current.parentElement;
    }

    return null;
  }

  function findNameHeading(panel) {
    const existing = panel.querySelector('[data-mt-live-account-name="true"]');
    if (existing) return existing;

    const marker =
      panel.querySelector('[data-mt-live-account-marker="true"]') ||
      findExact(panel, "Account & controls");
    const headings = Array.from(panel.querySelectorAll("h1,h2"));
    const heading = marker
      ? headings.find((element) =>
          Boolean(marker.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING),
        )
      : headings[0];

    if (heading) heading.setAttribute("data-mt-live-account-name", "true");
    return heading || null;
  }

  function findSummary(panel) {
    const existing = panel.querySelector('[data-mt-live-account-summary="true"]');
    if (existing) return existing;

    const candidate = Array.from(panel.querySelectorAll("p,span,div"))
      .filter((element) => normalizeText(element.textContent).startsWith("member since"))
      .sort((left, right) => left.childElementCount - right.childElementCount)[0];

    if (candidate) candidate.setAttribute("data-mt-live-account-summary", "true");
    return candidate || null;
  }

  function memberSummary() {
    if (!account.authenticated) {
      return "Sign in to view account details.";
    }

    const parts = [];
    if (account.memberSince) {
      const date = new Date(account.memberSince);
      if (!Number.isNaN(date.getTime())) {
        const label = new Intl.DateTimeFormat("en-US", {
          month: "short",
          year: "numeric",
        }).format(date);
        parts.push(`Member since ${label}`);
      }
    }

    if (account.completedCommitments !== null) {
      const suffix = account.completedCommitments === 1 ? "commitment" : "commitments";
      parts.push(`${account.completedCommitments} completed ${suffix}`);
    }

    return parts.length ? parts.join(" · ") : "Account details are not configured.";
  }

  function findRow(panel, key, label) {
    const existing = panel.querySelector(`[data-mt-live-account-row="${key}"]`);
    if (existing) return existing;

    const labelElement = findExact(panel, label);
    if (!labelElement) return null;

    let current = labelElement.parentElement;
    while (current && current !== panel) {
      if (current.querySelector("button,a")) {
        current.setAttribute("data-mt-live-account-row", key);
        labelElement.setAttribute("data-mt-live-account-label", "true");
        return current;
      }
      current = current.parentElement;
    }

    const fallback = labelElement.parentElement;
    if (fallback) {
      fallback.setAttribute("data-mt-live-account-row", key);
      labelElement.setAttribute("data-mt-live-account-label", "true");
    }
    return fallback;
  }

  function findDetail(row) {
    const existing = row.querySelector('[data-mt-live-account-detail="true"]');
    if (existing) return existing;

    const label = row.querySelector('[data-mt-live-account-label="true"]');
    const candidates = Array.from(row.querySelectorAll("p,small,span,div")).filter((element) => {
      if (element === label || element.childElementCount > 0) return false;
      if (element.closest("button,a")) return false;
      if (!normalizeText(element.textContent)) return false;
      if (!label) return true;
      return Boolean(label.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    const detail = candidates[0] || null;
    if (detail) detail.setAttribute("data-mt-live-account-detail", "true");
    return detail;
  }

  function configureAction(row, key, state) {
    const action = row.querySelector("button,a");
    if (!action) return;

    if (key === "terms") {
      action.textContent = "View";
      action.removeAttribute("disabled");
      action.removeAttribute("aria-disabled");
      if (action instanceof HTMLAnchorElement) {
        action.href = account.standardTerms.href;
      } else if (action.getAttribute("data-mt-live-account-terms-bound") !== "true") {
        action.setAttribute("data-mt-live-account-terms-bound", "true");
        action.addEventListener("click", (event) => {
          event.preventDefault();
          window.location.assign(account.standardTerms.href);
        });
      }
      return;
    }

    let actionLabel = "Status";
    if (key === "safe-cap" && !account.monthlySafeCap) actionLabel = "Unavailable";
    if (key === "notifications" && state !== null) actionLabel = state ? "On" : "Off";
    if (key === "public-trust" && state !== null) actionLabel = state ? "On" : "Off";

    action.textContent = actionLabel;
    action.setAttribute("aria-disabled", "true");
    action.setAttribute("title", "This value is read-only in the current interface.");
    if (action instanceof HTMLButtonElement) action.disabled = true;
    if (state !== null) action.setAttribute("aria-pressed", String(state));
  }

  function patchRow(panel, definition) {
    const row = findRow(panel, definition.key, definition.findLabel);
    if (!row) return;

    const label = row.querySelector('[data-mt-live-account-label="true"]');
    if (label && label.textContent !== definition.label) label.textContent = definition.label;

    const detail = findDetail(row);
    if (detail && detail.textContent !== definition.detail) detail.textContent = definition.detail;

    configureAction(row, definition.key, definition.state ?? null);
  }

  function signedInValue(value, missing = "Not configured") {
    return account.authenticated ? value || missing : "Sign in to view";
  }

  function patchPanel() {
    const panel = findAccountPanel();
    if (!panel) return;

    const name = findNameHeading(panel);
    const nextName = account.authenticated ? account.displayName || "Account" : "Account";
    if (name && name.textContent !== nextName) name.textContent = nextName;

    const summary = findSummary(panel);
    const nextSummary = memberSummary();
    if (summary && summary.textContent !== nextSummary) summary.textContent = nextSummary;

    const rows = [
      {
        key: "currency",
        findLabel: "Currency",
        label: "Currency",
        detail: signedInValue(account.currency),
      },
      {
        key: "safe-cap",
        findLabel: "Monthly safe cap",
        label: "Monthly safe cap",
        detail: signedInValue(account.monthlySafeCap),
      },
      {
        key: "payment-account",
        findLabel: "Escrow account",
        label: "Payment account",
        detail: signedInValue(account.paymentAccount.label),
      },
      {
        key: "notifications",
        findLabel: "Notifications",
        label: "Notifications",
        detail: signedInValue(account.notifications.label),
        state: account.authenticated ? account.notifications.enabled : null,
      },
      {
        key: "public-trust",
        findLabel: "Public trust profile",
        label: "Public trust profile",
        detail: signedInValue(account.publicTrustProfile.label),
        state: account.authenticated ? account.publicTrustProfile.enabled : null,
      },
      {
        key: "privacy",
        findLabel: "Default privacy",
        label: "Default privacy",
        detail: signedInValue(account.defaultPrivacy),
      },
      {
        key: "dispute",
        findLabel: "Dispute resolution",
        label: "Dispute resolution",
        detail: signedInValue(account.disputeResolution, "No default resolver selected"),
      },
      {
        key: "terms",
        findLabel: "Standard terms",
        label: "Standard terms",
        detail: account.standardTerms.label,
      },
    ];

    rows.forEach((definition) => patchRow(panel, definition));
  }

  function patchAll() {
    if (applying) return;
    applying = true;
    try {
      patchAvatar();
      patchGreeting();
      patchPanel();
    } finally {
      applying = false;
    }
  }

  function schedulePatch() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      patchAll();
    });
  }

  const observer = new MutationObserver(schedulePatch);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("pageshow", schedulePatch);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") schedulePatch();
  });

  schedulePatch();

  if (!hasBootstrap) {
    fetch(ENDPOINT, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    })
      .then((response) => (response.ok ? response.json() : { authenticated: false }))
      .catch(() => ({ authenticated: false }))
      .then((payload) => {
        account = normalizePayload(payload);
        schedulePatch();
      });
  }
})();
