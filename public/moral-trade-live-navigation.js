(function exposeDiscoverNavigation() {
  "use strict";

  if (window.__MT_DISCOVER_NAVIGATION_BRIDGE__) return;
  window.__MT_DISCOVER_NAVIGATION_BRIDGE__ = true;

  // Mirrored by src/lib/site-navigation.ts and the no-JavaScript Discover header.
  // A contract test keeps labels, order and destinations identical.
  const primaryNavigation = [
    {
      "href": "/discover",
      "label": "Discover"
    },
    {
      "href": "/feed",
      "label": "Feed"
    },
    {
      "label": "Activity",
      "summary": "Manage the trades you are involved in.",
      "items": [
        {
          "href": "/dashboard",
          "label": "Dashboard",
          "description": "Overview of your trades and account activity."
        },
        {
          "href": "/commitments",
          "label": "Commitments",
          "description": "Track agreements and what happens next."
        },
        {
          "href": "/messages",
          "label": "Messages",
          "description": "Continue private conversations."
        },
        {
          "href": "/saved-offers",
          "label": "Saved offers",
          "description": "Return to offers you saved."
        },
        {
          "href": "/invite",
          "label": "Invite someone",
          "description": "Invite a counterparty to a trade."
        }
      ]
    },
    {
      "label": "Profile",
      "summary": "Manage your profile and private priorities.",
      "items": [
        {
          "href": "/profile",
          "label": "Your profile",
          "description": "Review your profile and account information."
        },
        {
          "href": "/profile/priorities",
          "label": "Adjust priorities · 100 Sparks",
          "description": "Choose how to allocate your private priorities."
        },
        {
          "href": "/dashboard#data-portability",
          "label": "Profile data",
          "description": "Export or import account data."
        }
      ]
    },
    {
      "label": "Help",
      "summary": "Understand the process and review safeguards.",
      "items": [
        {
          "href": "/walkthrough",
          "label": "How it works",
          "description": "Take the optional walkthrough."
        },
        {
          "href": "/evidence",
          "label": "Public evidence",
          "description": "Review published evidence."
        },
        {
          "href": "/safety",
          "label": "Safety",
          "description": "Read the safety and anti-threat rules."
        },
        {
          "href": "/contact",
          "label": "Contact",
          "description": "Get help with the site."
        }
      ]
    }
  ];

  // Never rewrite a React-owned navigation tree or a page's local tab bar.
  const navSelector = ".topbar:not(.mt-site-topbar) > nav, .app-header > .top-nav";

  function createLink(item, extraClass = "") {
    const link = document.createElement("a");
    link.className = ["mt-nav-link", extraClass].filter(Boolean).join(" ");
    link.href = item.href;
    link.textContent = item.label;
    if (item.description) link.title = item.description;
    if (item.href === "/feed") link.setAttribute("data-mt-feed-link", "true");
    if (item.href === "/discover") link.setAttribute("data-mt-discover-link", "true");
    if (item.href === "/walkthrough") link.setAttribute("data-mt-optional-tour", "true");
    if (item.href === "/evidence") link.setAttribute("data-mt-evidence-link", "true");
    return link;
  }

  function buildNavigation(nav) {
    const fragment = document.createDocumentFragment();
    for (const item of primaryNavigation) {
      if (item.href) {
        fragment.appendChild(createLink(item));
        continue;
      }
      const group = document.createElement("details");
      group.className = "mt-nav-group";
      group.setAttribute("name", "mt-primary-navigation");
      const trigger = document.createElement("summary");
      trigger.textContent = item.label;
      const panel = document.createElement("div");
      panel.className = "mt-nav-panel";
      const description = document.createElement("p");
      description.className = "mt-nav-description";
      description.textContent = item.summary;
      panel.appendChild(description);
      for (const route of item.items) panel.appendChild(createLink(route));
      group.append(trigger, panel);
      fragment.appendChild(group);
    }
    fragment.appendChild(createLink({ href: "/trades/new", label: "Create trade" }, "mt-nav-create"));
    nav.replaceChildren(fragment);
    nav.dataset.mtTaskNavigation = "true";
  }

  function markCurrentPage(nav) {
    const aliases = {
      "/": "/feed",
      "/moral-trade-live.html": "/feed",
      "/moral-trade-discover.html": "/discover",
    };
    const pathname = aliases[window.location.pathname] || window.location.pathname;
    const links = [...nav.querySelectorAll("a[href]")];
    const current = links
      .filter((link) => {
        const href = link.getAttribute("href");
        return !href.includes("#") && (pathname === href || pathname.startsWith(`${href}/`));
      })
      .sort((a, b) => b.getAttribute("href").length - a.getAttribute("href").length)[0];
    for (const link of links) {
      link.removeAttribute("aria-current");
      link.classList.remove("active");
    }
    for (const group of nav.querySelectorAll("details")) {
      group.classList.toggle("is-active", Boolean(current && group.contains(current)));
    }
    if (current) current.setAttribute("aria-current", "page");
  }

  function bindNavigation(nav) {
    if (nav.dataset.mtNavigationBound) return;
    nav.dataset.mtNavigationBound = "true";
    nav.addEventListener("keydown", (event) => {
      if (event.key !== "Escape" || !(event.target instanceof Element)) return;
      const group = event.target.closest("details[open]");
      if (!group || !nav.contains(group)) return;
      event.preventDefault();
      event.stopPropagation();
      group.open = false;
      group.querySelector("summary")?.focus();
    });
    for (const group of nav.querySelectorAll("details")) {
      group.addEventListener("toggle", () => {
        if (!group.open) return;
        for (const other of nav.querySelectorAll("details[open]")) {
          if (other !== group) other.open = false;
        }
      });
      group.addEventListener("focusout", (event) => {
        if (!group.contains(event.relatedTarget)) group.open = false;
      });
    }
    // Native anchors retain browser Back, open-in-new-tab and modifier behavior.
    // In particular, no capture-phase navigation interception is needed.
  }

  function patchNavigation() {
    const navs = [...document.querySelectorAll(navSelector)];
    for (const nav of navs) {
      if (!nav.dataset.mtTaskNavigation) buildNavigation(nav);
      nav.classList.add("mt-task-nav");
      nav.setAttribute("aria-label", "Primary navigation");
      markCurrentPage(nav);
      bindNavigation(nav);
    }
    if (navs.length && !document.querySelector('link[href="/moral-trade-site-navigation.css"]')) {
      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "/moral-trade-site-navigation.css";
      document.head.appendChild(stylesheet);
    }
    return navs.length > 0;
  }

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Node)) return;
    for (const nav of document.querySelectorAll(navSelector)) {
      for (const group of nav.querySelectorAll("details[open]")) {
        if (!group.contains(event.target)) group.open = false;
      }
    }
  });

  function normalizeLiveLandmarks() {
    const appMain = document.querySelector("main#app");
    if (!appMain) return;
    for (const nestedMain of appMain.querySelectorAll('[data-mt-live-now="adaptive"] > main')) {
      const replacement = document.createElement("div");
      for (const attribute of [...nestedMain.attributes]) {
        replacement.setAttribute(attribute.name, attribute.value);
      }
      replacement.dataset.mtNestedMainNormalized = "true";
      replacement.style.minWidth = "0px";
      while (nestedMain.firstChild) replacement.appendChild(nestedMain.firstChild);
      nestedMain.replaceWith(replacement);
    }
    let heading = document.getElementById("mt-live-document-heading");
    if (!heading) {
      heading = document.createElement("h1");
      heading.id = "mt-live-document-heading";
      heading.dataset.mtDocumentHeading = "true";
      heading.textContent = "Your best match right now";
      Object.assign(heading.style, {
        border: "0", clip: "rect(0 0 0 0)", clipPath: "inset(50%)",
        height: "1px", margin: "-1px", overflow: "hidden", padding: "0",
        position: "absolute", whiteSpace: "nowrap", width: "1px",
      });
    }
    if (appMain.firstElementChild !== heading) appMain.prepend(heading);
  }

  let observingMain = false;
  function observeLiveMain() {
    const appMain = document.querySelector("main#app");
    if (!appMain || observingMain) return;
    observingMain = true;
    normalizeLiveLandmarks();
    let queued = false;
    const observer = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        normalizeLiveLandmarks();
      });
    });
    observer.observe(appMain, { childList: true, subtree: true });
  }

  observeLiveMain();
  if (!patchNavigation()) {
    const observer = new MutationObserver(() => {
      observeLiveMain();
      if (patchNavigation()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
