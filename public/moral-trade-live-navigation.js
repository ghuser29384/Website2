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

  function normalizeLabel(element) {
    return String(element.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function findFeedControl(nav) {
    return Array.from(nav.querySelectorAll("a, button")).find((candidate) => {
      const label = normalizeLabel(candidate);
      return label === "now" || label === "feed";
    });
  }

  function removeLegacyControls(nav) {
    for (const control of nav.querySelectorAll("a, button")) {
      const href = control.getAttribute("href") || "";
      if (
        normalizeLabel(control) === "controls" ||
        control.hasAttribute("data-mt-controls-link") ||
        href === "/trade-controls"
      ) {
        control.remove();
      }
    }
  }

  function prepareFeedControl(control) {
    control.textContent = "Feed";
    control.setAttribute("aria-label", "Open personalized feed");
    control.setAttribute("data-mt-feed-link", "true");

    if (control instanceof HTMLAnchorElement) {
      control.href = "/feed";
    }
  }

  function openDiscover(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign("/discover");
  }

  function openEvidence(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign("/evidence");
  }

  function prepareDiscoverControl(control) {
    control.setAttribute("data-mt-discover-link", "true");
    control.removeAttribute("aria-current");
    control.removeAttribute("data-page");
    control.removeAttribute("data-action");
    control.removeAttribute("data-view");
    control.classList.remove("active");

    if (control instanceof HTMLAnchorElement) {
      control.href = "/discover";
    } else if (control instanceof HTMLButtonElement) {
      control.type = "button";
    }

    control.addEventListener("click", openDiscover, true);
  }

  function prepareEvidenceControl(control) {
    control.setAttribute("data-mt-evidence-link", "true");
    control.setAttribute("aria-label", "Open Evidence");
    control.removeAttribute("aria-current");
    control.removeAttribute("data-page");
    control.removeAttribute("data-action");
    control.removeAttribute("data-view");
    control.classList.remove("active");

    if (control instanceof HTMLAnchorElement) {
      control.href = "/evidence";
    } else if (control instanceof HTMLButtonElement) {
      control.type = "button";
    }

    control.addEventListener("click", openEvidence, true);
  }

  function createDiscoverControl(nav, template) {
    const tagName = template instanceof HTMLAnchorElement ? "a" : "button";
    const control = document.createElement(tagName);
    control.className = template.className;
    control.textContent = "Discover";
    control.setAttribute("aria-label", "Open Discover");
    prepareDiscoverControl(control);

    const feedControl = findFeedControl(nav);

    if (feedControl?.nextSibling) {
      nav.insertBefore(control, feedControl.nextSibling);
    } else if (feedControl) {
      nav.appendChild(control);
    } else {
      nav.insertBefore(control, nav.firstChild);
    }

    return control;
  }

  function createEvidenceControl(nav, template, commitmentsControl) {
    const tagName = template instanceof HTMLAnchorElement ? "a" : "button";
    const control = document.createElement(tagName);
    control.className = template.className;
    control.textContent = "Evidence";
    prepareEvidenceControl(control);

    if (commitmentsControl?.nextSibling) {
      nav.insertBefore(control, commitmentsControl.nextSibling);
    } else {
      nav.appendChild(control);
    }
  }

  function patchNavigation() {
    const navs = [...new Set(navSelectors.flatMap((selector) => [...document.querySelectorAll(selector)]))];
    let patched = false;

    for (const nav of navs) {
      removeLegacyControls(nav);

      const existingFeedControl = findFeedControl(nav);
      if (existingFeedControl && !existingFeedControl.hasAttribute("data-mt-feed-link")) {
        prepareFeedControl(existingFeedControl);
      }

      const controls = [...nav.querySelectorAll("a, button")];
      let discoverControl = controls.find((control) => normalizeLabel(control) === "discover");

      if (discoverControl) {
        if (!discoverControl.hasAttribute("data-mt-discover-link")) {
          prepareDiscoverControl(discoverControl);
        }
      } else {
        const template = findFeedControl(nav) || controls[0];
        if (!template) continue;

        discoverControl = createDiscoverControl(nav, template);
      }

      const finalControls = [...nav.querySelectorAll("a, button")];
      const evidenceControl = finalControls.find(
        (control) => normalizeLabel(control) === "evidence",
      );

      if (evidenceControl) {
        if (!evidenceControl.hasAttribute("data-mt-evidence-link")) {
          prepareEvidenceControl(evidenceControl);
        }
      } else {
        const commitmentsControl = finalControls.find((control) => {
          const label = normalizeLabel(control);
          return label === "commitments" || label === "activity";
        });
        const template = commitmentsControl || findFeedControl(nav) || finalControls[0];
        if (template) createEvidenceControl(nav, template, commitmentsControl);
      }

      patched = true;
    }

    return patched;
  }

  if (!patchNavigation()) {
    const observer = new MutationObserver(() => {
      if (patchNavigation()) observer.disconnect();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }
})();
