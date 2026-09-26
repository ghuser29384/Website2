(function exposeDiscoverNavigation() {
  "use strict";

  if (window.__MT_DISCOVER_NAVIGATION_BRIDGE__) return;
  window.__MT_DISCOVER_NAVIGATION_BRIDGE__ = true;

  const navSelectors = [
    ".topbar nav",
    ".app-header .top-nav",
    "header nav[aria-label]",
    'nav[aria-label="Primary"]',
    'nav[aria-label="Primary navigation"]',
  ];

  function createDocumentHeading() {
    const heading = document.createElement("h1");
    heading.id = "mt-live-document-heading";
    heading.dataset.mtDocumentHeading = "true";
    heading.textContent = "Your best match right now";
    Object.assign(heading.style, {
      border: "0",
      clip: "rect(0 0 0 0)",
      clipPath: "inset(50%)",
      height: "1px",
      margin: "-1px",
      overflow: "hidden",
      padding: "0",
      position: "absolute",
      whiteSpace: "nowrap",
      width: "1px",
    });
    return heading;
  }

  function ensureDocumentHeading() {
    let heading = document.getElementById("mt-live-document-heading");
    if (!heading) heading = createDocumentHeading();

    const appMain = document.querySelector("main#app");
    if (appMain) {
      if (heading.parentElement !== appMain || appMain.firstElementChild !== heading) {
        appMain.prepend(heading);
      }
      return true;
    }

    if (!heading.isConnected && document.body) document.body.prepend(heading);
    return false;
  }

  function normalizeLiveNowMain() {
    const appMain = document.querySelector("main#app");
    if (!appMain) return false;

    const nestedMains = [
      ...appMain.querySelectorAll('[data-mt-live-now="adaptive"] > main'),
    ];

    for (const nestedMain of nestedMains) {
      const replacement = document.createElement("div");
      for (const attribute of [...nestedMain.attributes]) {
        replacement.setAttribute(attribute.name, attribute.value);
      }
      replacement.dataset.mtNestedMainNormalized = "true";
      replacement.style.minWidth = "0px";

      while (nestedMain.firstChild) {
        replacement.appendChild(nestedMain.firstChild);
      }
      nestedMain.replaceWith(replacement);
    }

    return nestedMains.length > 0;
  }

  function normalizeLiveLandmarks() {
    normalizeLiveNowMain();
    ensureDocumentHeading();
  }

  function patchNavigation() {
    const navs = [...new Set(navSelectors.flatMap((selector) => [...document.querySelectorAll(selector)]))];
    let patched = false;
    for (const nav of navs) {
      // React owns native headers; never replace a hydrated component's children.
      if (nav.closest(".mt-site-topbar")) continue;
      const header = nav.closest("header");
      if (!header) continue;
      if (nav.dataset.mtPrimaryLinks === "true") { patched = true; continue; }
      const links = [
        ["/feed", "Home", "data-mt-feed-link"],
        ["/discover", "Trades", "data-mt-discover-link"],
        ["/commitments", "Commitments", ""],
        ["/profile", "Profile", ""],
      ];
      const fragment = document.createDocumentFragment();
      const path = window.location.pathname;
      for (const [href, label, marker] of links) {
        const link = document.createElement("a");
        link.href = href;
        link.textContent = label;
        if (marker) link.setAttribute(marker, "true");
        if (path === href || (href === "/feed" && path === "/")) link.setAttribute("aria-current", "page");
        fragment.appendChild(link);
      }
      nav.replaceChildren(fragment);
      nav.setAttribute("aria-label", "Primary navigation");
      nav.dataset.mtPrimaryLinks = "true";
      header.classList.add("mt-refined-header");
      const brand = header.querySelector("a.brand");
      if (brand) brand.setAttribute("href", "/");
      const actions = header.querySelector(".top-actions");
      if (actions && !actions.querySelector(".header-more")) {
        const more = document.createElement("details");
        more.className = "header-more";
        const trigger = document.createElement("summary");
        trigger.className = "text-btn";
        trigger.textContent = "More";
        const panel = document.createElement("div");
        panel.className = "header-more-links";
        for (const [href, label] of [
          ["/dashboard", "Dashboard"], ["/trades/new", "Create a trade"],
          ["/messages", "Messages"], ["/cart", "Saved offers"],
          ["/invite", "Invite someone"], ["/walkthrough", "How it works"], ["/safety", "Safety"],
        ]) {
          const link = document.createElement("a");
          link.href = href;
          link.textContent = label;
          panel.appendChild(link);
        }
        more.append(trigger, panel);
        more.addEventListener("keydown", (event) => {
          if (event.key === "Escape") { more.open = false; trigger.focus(); }
        });
        more.addEventListener("focusout", (event) => {
          if (!more.contains(event.relatedTarget)) more.open = false;
        });
        actions.prepend(more);
        // This is an entry link, not an authentication assertion or a new signup flow.
        const start = document.createElement("a");
        start.className = "header-start";
        start.href = "/start";
        start.textContent = "Get Started";
        actions.appendChild(start);
      }
      patched = true;
    }
    return patched;
  }

  let landmarkNormalizationQueued = false;
  const landmarkObserver = new MutationObserver(() => {
    if (landmarkNormalizationQueued) return;
    landmarkNormalizationQueued = true;
    queueMicrotask(() => {
      landmarkNormalizationQueued = false;
      normalizeLiveLandmarks();
    });
  });

  normalizeLiveLandmarks();
  landmarkObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  if (!patchNavigation()) {
    const navigationObserver = new MutationObserver(() => {
      if (patchNavigation()) navigationObserver.disconnect();
    });

    navigationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
})();
