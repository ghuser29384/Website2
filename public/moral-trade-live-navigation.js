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

  function findFeedControl(nav) {
    return Array.from(nav.querySelectorAll("a, button")).find((candidate) => {
      const label = normalizeLabel(candidate);
      return label === "now" || label === "feed";
    });
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

  function openControls(event) {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.location.assign("/trade-controls");
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

  function prepareControlsControl(control) {
    control.setAttribute("data-mt-controls-link", "true");
    control.removeAttribute("aria-current");
    control.removeAttribute("data-page");
    control.removeAttribute("data-action");
    control.removeAttribute("data-view");
    control.classList.remove("active");

    if (control instanceof HTMLAnchorElement) {
      control.href = "/trade-controls";
    } else if (control instanceof HTMLButtonElement) {
      control.type = "button";
    }

    control.addEventListener("click", openControls, true);
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

  function createControlsControl(nav, template, discoverControl) {
    const tagName = template instanceof HTMLAnchorElement ? "a" : "button";
    const control = document.createElement(tagName);
    control.className = template.className;
    control.textContent = "Controls";
    control.setAttribute("aria-label", "Open Trade controls");
    prepareControlsControl(control);

    if (discoverControl?.nextSibling) {
      nav.insertBefore(control, discoverControl.nextSibling);
    } else if (discoverControl) {
      nav.appendChild(control);
    } else {
      nav.appendChild(control);
    }
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
    const navs = [
      ...new Set(
        navSelectors.flatMap((selector) => [...document.querySelectorAll(selector)]),
      ),
    ];
    let patched = false;

    for (const nav of navs) {
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

      const updatedControls = [...nav.querySelectorAll("a, button")];
      const controlsControl = updatedControls.find(
        (control) => normalizeLabel(control) === "controls",
      );

      if (controlsControl) {
        if (!controlsControl.hasAttribute("data-mt-controls-link")) {
          prepareControlsControl(controlsControl);
        }
      } else {
        const template = findFeedControl(nav) || updatedControls[0];
        if (template) createControlsControl(nav, template, discoverControl);
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
