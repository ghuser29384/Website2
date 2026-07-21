(function installTradeTemplateNavigation() {
  "use strict";

  if (window.__MT_TRADE_TEMPLATE_NAVIGATION__) return;
  window.__MT_TRADE_TEMPLATE_NAVIGATION__ = true;

  const libraryHref = "/offers?view=templates";

  function normalizeLabel(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isTemplatesControl(element) {
    return (
      element instanceof HTMLElement &&
      element.matches("button, a") &&
      normalizeLabel(element.textContent) === "templates"
    );
  }

  function prepareControls(root) {
    const scope = root instanceof Element || root instanceof Document ? root : document;
    scope.querySelectorAll("button, a").forEach((control) => {
      if (!isTemplatesControl(control)) return;
      control.setAttribute("aria-label", "Open trade template library");
      control.setAttribute("title", "Choose a template and open a prefilled editable draft");
      control.setAttribute("data-mt-template-library", "true");
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
