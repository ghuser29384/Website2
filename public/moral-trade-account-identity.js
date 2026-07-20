(function installMoralTradeAccountIdentity() {
  "use strict";

  if (window.__MT_ACCOUNT_IDENTITY__) return;
  window.__MT_ACCOUNT_IDENTITY__ = true;

  const ENDPOINT = "/api/live-account";
  const ROOT_SELECTOR = '.topbar,[role="banner"],header';
  const LEGACY_INITIALS = "AJ";
  const LEGACY_DISPLAY_NAME = "Alex Johnson";
  const LEGACY_FIRST_NAME = "Alex";
  const hasBootstrap = Object.prototype.hasOwnProperty.call(
    window,
    "__MT_LIVE_ACCOUNT_BOOTSTRAP__",
  );

  let identity = normalizeIdentity(
    hasBootstrap ? window.__MT_LIVE_ACCOUNT_BOOTSTRAP__ : { authenticated: false },
  );
  let scheduled = false;

  function stringOrNull(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  function normalizeIdentity(payload) {
    const source = payload && typeof payload === "object" ? payload : {};
    const account = source.account && typeof source.account === "object" ? source.account : {};

    return {
      authenticated: source.authenticated === true,
      displayName: stringOrNull(account.displayName),
      firstName: stringOrNull(account.firstName),
      initials: stringOrNull(account.initials),
    };
  }

  function compactText(element) {
    return String(element.textContent || "")
      .replace(/\s+/g, "")
      .trim();
  }

  function isCompactIdentity(element) {
    return /^(?:[\p{L}\p{N}]{1,3}|•)$/u.test(compactText(element));
  }

  function resolveAvatarTarget(candidate) {
    const descendants = Array.from(candidate.querySelectorAll("span,strong,div"))
      .filter((element) => isCompactIdentity(element))
      .sort((left, right) => left.childElementCount - right.childElementCount);

    return descendants[0] || (isCompactIdentity(candidate) ? candidate : null);
  }

  function findAvatarCandidates() {
    const candidates = new Set([
      ...document.querySelectorAll('[data-mt-account-avatar="true"]'),
      ...document.querySelectorAll('[data-mt-live-account-avatar="true"]'),
    ]);
    const explicitSelector = [
      'button[class*="avatar" i]',
      'a[class*="avatar" i]',
      '[class*="account" i] [class*="avatar" i]',
      '[class*="profile" i] [class*="avatar" i]',
      'button[class*="profile" i]',
      'a[class*="profile" i]',
      'button[aria-label*="account" i]',
      'a[aria-label*="account" i]',
      'button[aria-label*="profile" i]',
      'a[aria-label*="profile" i]',
    ].join(",");

    document.querySelectorAll(ROOT_SELECTOR).forEach((root) => {
      root.querySelectorAll(explicitSelector).forEach((candidate) => {
        const target = resolveAvatarTarget(candidate);
        if (target) candidates.add(target);
      });

      root.querySelectorAll("button,a,span,strong,div").forEach((candidate) => {
        if (compactText(candidate) !== LEGACY_INITIALS) return;
        const nestedLegacyInitials = Array.from(
          candidate.querySelectorAll("button,a,span,strong,div"),
        ).some((descendant) => compactText(descendant) === LEGACY_INITIALS);
        if (!nestedLegacyInitials) candidates.add(candidate);
      });
    });

    return Array.from(candidates).filter((candidate) => candidate.isConnected);
  }

  function patchAvatarCandidates() {
    const label = identity.authenticated
      ? identity.displayName
        ? `${identity.displayName} account`
        : "Your account"
      : "Account";
    const visibleValue = identity.authenticated && identity.initials ? identity.initials : "•";

    for (const avatar of findAvatarCandidates()) {
      if (avatar.textContent !== visibleValue) avatar.textContent = visibleValue;
      avatar.setAttribute("data-mt-account-avatar", "true");
      avatar.setAttribute("data-mt-live-account-avatar", "true");
      avatar.setAttribute("aria-label", label);
      avatar.setAttribute("title", label);

      const control = avatar.closest("button,a");
      if (control && control !== avatar) {
        control.setAttribute("aria-label", label);
        control.setAttribute("title", label);
      }
    }
  }

  function isAccountSurface(element) {
    return Boolean(
      element.closest(
        '.topbar,[role="banner"],[role="dialog"],[class*="account" i],[class*="profile" i]',
      ),
    );
  }

  function patchLegacyDisplayNames() {
    const replacement =
      identity.authenticated && identity.displayName ? identity.displayName : "Account";

    document.querySelectorAll("h1,h2,h3,p,span,strong,small,div").forEach((element) => {
      if (element.childElementCount > 0 || !isAccountSurface(element)) return;
      if (String(element.textContent || "").trim() === LEGACY_DISPLAY_NAME) {
        element.textContent = replacement;
        element.setAttribute("data-mt-account-name", "true");
      }
    });
  }

  function patchLegacyGreetings() {
    const greetingPattern = /^Good (morning|afternoon|evening), Alex\.$/;
    document.querySelectorAll("header p,header span,.head .date span.muted").forEach((element) => {
      const current = String(element.textContent || "").trim();
      const match = current.match(greetingPattern);
      if (!match) return;

      const suffix = identity.authenticated && identity.firstName ? `, ${identity.firstName}.` : ".";
      element.textContent = `Good ${match[1]}${suffix}`;
      element.setAttribute("data-mt-account-greeting", "true");
    });
  }

  function patchAll() {
    patchAvatarCandidates();
    patchLegacyDisplayNames();
    patchLegacyGreetings();
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
  observer.observe(document.documentElement, { childList: true, subtree: true });

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
        identity = normalizeIdentity(payload);
        schedulePatch();
      });
  }
})();
