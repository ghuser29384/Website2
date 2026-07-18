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

  function openDiscover(event) {
    event.preventDefault();
    event.stopPropagation();
    window.location.assign("/discover");
  }

  function prepareControl(control) {
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

  function createDiscoverControl(nav, template) {
    const tagName = template instanceof HTMLAnchorElement ? "a" : "button";
    const control = document.createElement(tagName);
    control.className = template.className;
    control.textContent = "Discover";
    control.setAttribute("aria-label", "Open Discover");
    prepareControl(control);

    const nowControl = Array.from(nav.querySelectorAll("a, button")).find(
      (candidate) => normalizeLabel(candidate) === "now",
    );

    if (nowControl?.nextSibling) {
      nav.insertBefore(control, nowControl.nextSibling);
    } else if (nowControl) {
      nav.appendChild(control);
    } else {
      nav.insertBefore(control, nav.firstChild);
    }
  }

  function patchNavigation() {
    const navs = [...new Set(navSelectors.flatMap((selector) => [...document.querySelectorAll(selector)]))];
    let patched = false;

    for (const nav of navs) {
      const controls = [...nav.querySelectorAll("a, button")];
      const discoverControl = controls.find((control) => normalizeLabel(control) === "discover");

      if (discoverControl) {
        if (!discoverControl.hasAttribute("data-mt-discover-link")) {
          prepareControl(discoverControl);
        }
        patched = true;
        continue;
      }

      const template = controls.find((control) => normalizeLabel(control) === "now") || controls[0];
      if (!template) continue;

      createDiscoverControl(nav, template);
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
