/* global state, render, toast */

(function enablePlanResourcesReset() {
  "use strict";

  if (window.__MT_PLAN_RESOURCES_RESET__) return;
  window.__MT_PLAN_RESOURCES_RESET__ = true;

  if (typeof state === "undefined" || !state.alloc || typeof render !== "function") return;

  const cloneAllocations = (allocations) => JSON.parse(JSON.stringify(allocations));
  const defaultAllocations = cloneAllocations(state.alloc);

  function normalizeLabel(element) {
    return String(element.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function resetPlanResources(event) {
    event.preventDefault();
    state.alloc = cloneAllocations(defaultAllocations);
    render();

    if (typeof toast === "function") {
      toast("Plan resources reset to defaults.");
    }
  }

  function patchResetButton() {
    const panel = document.querySelector(".plan-control");
    if (!panel) return false;

    const resetButton = Array.from(panel.querySelectorAll("button")).find(
      (button) => normalizeLabel(button).replace(/^↻\s*/, "") === "reset",
    );
    if (!resetButton) return false;
    if (resetButton.getAttribute("data-mt-plan-reset") === "true") return true;

    resetButton.type = "button";
    resetButton.setAttribute("data-mt-plan-reset", "true");
    resetButton.setAttribute("aria-label", "Reset plan resources to defaults");
    resetButton.addEventListener("click", resetPlanResources);
    return true;
  }

  patchResetButton();

  const observer = new MutationObserver(patchResetButton);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
