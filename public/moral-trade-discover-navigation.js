(function connectDiscoverNavigation() {
  "use strict";

  if (window.__MT_DISCOVER_PRODUCT_NAVIGATION__) return;
  window.__MT_DISCOVER_PRODUCT_NAVIGATION__ = true;

  const routeByLabel = new Map([
    ["now", "/"],
    ["discover", "/discover"],
    ["offer", "/trades/new"],
    ["create", "/trades/new"],
    ["activity", "/commitments"],
    ["commitments", "/commitments"],
    ["evidence", "/evidence"],
  ]);

  function normalizeLabel(element) {
    return String(element.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function routeTo(path) {
    return function handleProductRoute(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign(path);
    };
  }

  function patchControl(control, path, label) {
    control.setAttribute("data-mt-product-route", path);
    control.removeAttribute("data-page");
    control.removeAttribute("data-action");
    control.removeAttribute("data-view");

    if (control instanceof HTMLAnchorElement) {
      control.href = path;
    } else if (control instanceof HTMLButtonElement) {
      control.type = "button";
    }

    if (label === "discover") {
      control.classList.add("active");
      control.setAttribute("aria-current", "page");
      return;
    }

    control.classList.remove("active");
    control.removeAttribute("aria-current");
    control.addEventListener("click", routeTo(path), true);
  }

  function patchNavigation() {
    const navs = [
      ...document.querySelectorAll(
        '.app-header .top-nav, .topbar nav, header nav[aria-label], nav[aria-label="Primary navigation"]',
      ),
    ];
    let patched = false;

    for (const nav of navs) {
      for (const control of nav.querySelectorAll("a, button")) {
        const label = normalizeLabel(control);
        const path = routeByLabel.get(label);
        if (!path || control.getAttribute("data-mt-product-route") === path) continue;

        patchControl(control, path, label);
        patched = true;
      }

      const controls = [...nav.querySelectorAll("a, button")];
      const evidenceControl = controls.find((control) => normalizeLabel(control) === "evidence");

      if (!evidenceControl) {
        const commitmentsControl = controls.find((control) => {
          const label = normalizeLabel(control);
          return label === "activity" || label === "commitments";
        });
        const template = commitmentsControl || controls.at(-1);

        if (template) {
          const tagName = template instanceof HTMLAnchorElement ? "a" : "button";
          const control = document.createElement(tagName);
          control.className = template.className;
          control.textContent = "Evidence";

          if (commitmentsControl?.nextSibling) {
            nav.insertBefore(control, commitmentsControl.nextSibling);
          } else {
            nav.appendChild(control);
          }

          patchControl(control, "/evidence", "evidence");
          patched = true;
        }
      }
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
