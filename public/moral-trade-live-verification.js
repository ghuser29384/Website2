(function connectCompleteVerificationPage() {
  "use strict";

  if (window.__MT_COMPLETE_VERIFICATION_BRIDGE__) return;
  window.__MT_COMPLETE_VERIFICATION_BRIDGE__ = true;

  const STATE_KEY = "moraltrade.verification.wild-animal-research.v1";
  const DESTINATION = "/complete-verification.html?record=wild-animal-research&from=calendar";
  const TARGET_LABELS = new Set(["complete verification", "view verification"]);
  let scheduled = false;

  function normalizeLabel(element) {
    return String(element?.textContent || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function readVerificationState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STATE_KEY) || "null");
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  }

  function isVerificationControl(element) {
    if (!(element instanceof Element)) return false;
    if (element.getAttribute("data-mt-complete-verification") === "true") return true;
    return TARGET_LABELS.has(normalizeLabel(element));
  }

  function openVerification(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    window.location.assign(DESTINATION);
  }

  function prepareControl(control, completed) {
    control.setAttribute("data-mt-complete-verification", "true");
    control.setAttribute("aria-label", completed ? "View verification record" : "Complete verification");
    control.setAttribute("title", completed ? "View the provisional verification record" : "Open the verification workflow");

    if (control instanceof HTMLAnchorElement) {
      control.href = DESTINATION;
    } else if (control instanceof HTMLButtonElement) {
      control.type = "button";
    }

    if (completed && normalizeLabel(control) !== "view verification") {
      control.textContent = "View verification";
    }

    if (control.getAttribute("data-mt-verification-listener") !== "true") {
      control.setAttribute("data-mt-verification-listener", "true");
      control.addEventListener("click", openVerification, true);
    }
  }

  function patchStatusCopy(completed) {
    if (!completed) return;
    const controls = [...document.querySelectorAll('[data-mt-complete-verification="true"]')];
    for (const control of controls) {
      const container = control.closest("section, article, [class*='card' i], [class*='detail' i]");
      if (!container) continue;
      const dueCopy = [...container.querySelectorAll("div, p, span")].find((element) => {
        const label = normalizeLabel(element);
        return label === "due today" || label.includes("verification · due today");
      });
      if (dueCopy && dueCopy.getAttribute("data-mt-verification-status-copy") !== "true") {
        dueCopy.setAttribute("data-mt-verification-status-copy", "true");
        dueCopy.textContent = "Provisional result recorded";
      }
    }
  }

  function patchControls() {
    const completed = Boolean(readVerificationState()?.completed);
    const candidates = [...document.querySelectorAll("button, a, [role='button']")];
    let patched = false;

    for (const control of candidates) {
      if (!isVerificationControl(control)) continue;
      prepareControl(control, completed);
      patched = true;
    }

    patchStatusCopy(completed);
    return patched;
  }

  function schedulePatch() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      patchControls();
    });
  }

  document.addEventListener(
    "click",
    (event) => {
      const control = event.target.closest?.("button, a, [role='button']");
      if (isVerificationControl(control)) openVerification(event);
    },
    true,
  );

  patchControls();

  const observer = new MutationObserver(schedulePatch);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  window.addEventListener("pageshow", schedulePatch);
  window.addEventListener("storage", (event) => {
    if (event.key === STATE_KEY) schedulePatch();
  });
})();
