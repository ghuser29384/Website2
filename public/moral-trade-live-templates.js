(function installTradeTemplateNavigation() {
  "use strict";

  if (window.__MT_TRADE_TEMPLATE_NAVIGATION__) return;
  window.__MT_TRADE_TEMPLATE_NAVIGATION__ = true;

  const libraryHref = "/offers?view=templates";
  const templateEntryLabels = new Set(["templates", "new trade"]);
  const overflowLabels = new Set(["...", "…"]);

  function normalizeLabel(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase()
      .replace(/^\+\s*/, "");
  }

  function isTemplatesControl(element) {
    return (
      element instanceof HTMLElement &&
      element.matches("button, a") &&
      (element.hasAttribute("data-mt-template-library") ||
        templateEntryLabels.has(normalizeLabel(element.textContent)) ||
        templateEntryLabels.has(normalizeLabel(element.getAttribute("aria-label"))))
    );
  }

  function isOverflowControl(element) {
    return (
      element instanceof HTMLElement &&
      element.matches("button, a") &&
      overflowLabels.has(normalizeLabel(element.textContent))
    );
  }

  function removeAdjacentOverflowControl(templateControl) {
    const controlGroup = templateControl.parentElement;
    if (!controlGroup) return;

    Array.from(controlGroup.children).forEach((candidate) => {
      if (candidate === templateControl) return;

      if (isOverflowControl(candidate)) {
        candidate.remove();
        return;
      }

      if (!(candidate instanceof HTMLElement)) return;
      const nestedControls = Array.from(candidate.querySelectorAll("button, a"));
      if (nestedControls.length === 1 && isOverflowControl(nestedControls[0])) {
        candidate.remove();
      }
    });
  }

  function prepareControls(root) {
    const scope = root instanceof Element || root instanceof Document ? root : document;
    scope.querySelectorAll("button, a").forEach((control) => {
      if (!isTemplatesControl(control)) return;
      const isNewTrade =
        normalizeLabel(control.textContent) === "new trade" ||
        normalizeLabel(control.getAttribute("aria-label")) === "new trade";

      if (!control.hasAttribute("aria-label")) {
        control.setAttribute(
          "aria-label",
          isNewTrade ? "Start a new trade from a template" : "Open trade template library",
        );
      }
      control.setAttribute("title", "Choose a template and open a prefilled editable draft");
      control.setAttribute("data-mt-template-library", "true");
      if (control instanceof HTMLAnchorElement) control.href = libraryHref;
      removeAdjacentOverflowControl(control);
    });
  }

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      const control = target instanceof Element ? target.closest("button, a") : null;
      if (!isTemplatesControl(control)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign(libraryHref);
    },
    true,
  );

  const observer = new MutationObserver((records) => {
    for (const record of records) {
      record.addedNodes.forEach((node) => {
        if (node instanceof Element) prepareControls(node);
      });
    }
  });

  prepareControls(document);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.__MT_TRADE_TEMPLATES_API__ = Object.freeze({
    libraryHref,
    normalizeLabel,
  });
})();
