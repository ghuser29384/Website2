/* global baseSuggestions, causeSpecificSuggestions, requestKindMeta */
"use strict";

(() => {
  const byId = (id) => document.getElementById(id);
  const unique = (values) => [...new Set(values)];

  function patchSuggestionCatalog() {
    if (
      typeof baseSuggestions === "undefined"
      || typeof causeSpecificSuggestions === "undefined"
      || typeof requestKindMeta === "undefined"
    ) {
      return;
    }

    baseSuggestions.commitment = [
      "Read a short introduction to {cause}",
      "Spend one focused hour learning about {cause}",
      "Share one credible resource about {cause}",
      "Attend one event about {cause}",
      "Make one small habit change that supports {cause}",
      "Write down one concrete way to contribute to {cause}",
      "Talk with one person who works on {cause}"
    ];

    baseSuggestions.skill = [
      "Give one hour of skilled help to a project working on {cause}",
      "Review a document related to {cause}",
      "Make an introduction to someone working on {cause}",
      "Help recruit one volunteer for a {cause} project",
      "Design or edit outreach material for a {cause} project",
      "Build a simple tool for a {cause} project",
      "Help research one question about {cause}"
    ];

    baseSuggestions.fund = [
      "Donate $50 to an organization working on {cause}",
      "Contribute $25 to a project working on {cause}",
      "Fund one specific expense for a {cause} project",
      "Fund one month of software or hosting for a {cause} project",
      "Match another person's donation to a {cause} organization up to $50",
      "Support a grantmaking fund focused on {cause}"
    ];

    const additions = {
      "Existential risk": {
        commitment: [
          "Read a 30-minute introduction to existential risk",
          "Spend one focused hour learning about a specific existential risk",
          "Attend one event on reducing existential risk"
        ],
        skill: [
          "Review a research or policy document about existential risk",
          "Help an existential-risk project recruit one contributor",
          "Build a small tool for a project reducing existential risk"
        ],
        fund: [
          "Donate $50 to a project reducing existential risk",
          "Fund one research or policy expense related to existential risk"
        ]
      },
      "Future flourishing": {
        commitment: [
          "Read one introduction to long-term flourishing",
          "Spend one focused hour studying how the future could go well"
        ],
        skill: [
          "Review a research summary about future flourishing",
          "Help a future-flourishing project explain its work"
        ],
        fund: [
          "Donate $50 to a project working on future flourishing",
          "Fund one research expense about improving the long-term future"
        ]
      },
      "S-risks": {
        commitment: [
          "Read a 30-minute introduction to suffering risks",
          "Spend one focused hour learning about preventing severe future suffering"
        ],
        skill: [
          "Review a research document about suffering risks",
          "Help an s-risk project improve its research communication"
        ],
        fund: [
          "Donate $50 to research on reducing suffering risks",
          "Fund one concrete s-risk research expense"
        ]
      },
      "Concentration of power": {
        commitment: [
          "Read one evidence-based resource about concentration of power",
          "Spend one hour comparing institutional checks on concentrated power"
        ],
        skill: [
          "Review a governance proposal about concentration of power",
          "Research one institutional safeguard against concentrated power"
        ],
        fund: [
          "Donate $50 to a project improving accountable governance",
          "Fund one research expense on checks against concentrated power"
        ]
      },
      "Priorities research": {
        commitment: [
          "Read one priorities-research report",
          "Spend one focused hour comparing two cause priorities"
        ],
        skill: [
          "Review a priorities-research document",
          "Help analyze one question about how resources should be allocated"
        ],
        fund: [
          "Donate $50 to a priorities-research project",
          "Fund one concrete priorities-research expense"
        ]
      },
      "Biological risks": {
        commitment: [
          "Read one introduction to biological risk reduction",
          "Spend one focused hour learning about biosecurity"
        ],
        skill: [
          "Review a biosecurity research or policy document",
          "Help a biological-risk project improve its operations or outreach"
        ],
        fund: [
          "Donate $50 to a project reducing biological risks",
          "Fund one biosecurity research or policy expense"
        ]
      },
      "Space governance": {
        commitment: [
          "Read one introduction to space governance",
          "Spend one focused hour learning about a space-governance problem"
        ],
        skill: [
          "Review a space-governance research or policy document",
          "Research one institutional question about governing space activity"
        ],
        fund: [
          "Donate $50 to a space-governance project",
          "Fund one space-governance research expense"
        ]
      }
    };

    Object.entries(additions).forEach(([cause, addition]) => {
      const existing = causeSpecificSuggestions[cause] || {};
      causeSpecificSuggestions[cause] = {
        commitment: unique([...(addition.commitment || []), ...(existing.commitment || [])]),
        skill: unique([...(addition.skill || []), ...(existing.skill || [])]),
        fund: unique([...(addition.fund || []), ...(existing.fund || [])])
      };
    });

    requestKindMeta.commitment.placeholder = "e.g. Spend one focused hour learning about this cause";
    requestKindMeta.skill.placeholder = "e.g. Review a document related to this cause";
    requestKindMeta.fund.placeholder = "e.g. Fund one concrete expense for this cause";
  }

  function syncOtherCauseSubmit() {
    const input = byId("otherCauseInput");
    const submit = document.querySelector(".other-cause-submit");
    if (!(input instanceof HTMLInputElement) || !(submit instanceof HTMLButtonElement)) return;
    submit.disabled = input.value.trim().length === 0;
  }

  function syncCausePressed() {
    document.querySelectorAll(".cause-choice").forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        button.classList.contains("selected") ? "true" : "false"
      );
    });
  }

  function syncRequestCardExamples() {
    const selectedCause = byId("requestCause")?.textContent?.trim();
    const cause = selectedCause && selectedCause !== "—"
      ? selectedCause
      : "the selected cause";
    const examples = {
      commitment: `Examples: read one introduction; spend one focused hour learning about ${cause}.`,
      skill: `Examples: review a relevant document; give one hour of skilled help to a project working on ${cause}.`,
      fund: `Examples: donate to a relevant organization; fund one concrete expense related to ${cause}.`
    };

    Object.entries(examples).forEach(([kind, copy]) => {
      const example = document.querySelector(`[data-request-kind="${kind}"] .request-example`);
      if (example) example.textContent = copy;
    });
  }

  function syncProgressLabels() {
    const progress = byId("progress");
    if (!progress) return;
    const bars = [...progress.querySelectorAll("span")];
    const directPool = Boolean(bars[3]?.hidden);
    const labels = directPool
      ? ["Cause", "Pool", "Review", ""]
      : ["Cause", "Request", "Offer", "Review"];

    progress.setAttribute("role", "list");
    bars.forEach((bar, index) => {
      const label = labels[index] || `Step ${index + 1}`;
      bar.dataset.stepLabel = label;
      bar.dataset.stepNumber = String(index + 1);
      bar.setAttribute("role", "listitem");
      bar.setAttribute("aria-label", `${index + 1}. ${label}`);
      if (bar.classList.contains("active")) bar.setAttribute("aria-current", "step");
      else bar.removeAttribute("aria-current");
    });
  }

  function positionSuggestions() {
    const input = byId("requestActionInput");
    const list = byId("actionSuggestions");
    if (!(input instanceof HTMLInputElement) || !(list instanceof HTMLElement)) return;

    if (!list.classList.contains("open") || window.innerWidth <= 600) {
      list.removeAttribute("data-placement");
      list.style.removeProperty("max-height");
      return;
    }

    const inputRect = input.getBoundingClientRect();
    const headerBottom = document.querySelector(".topbar")?.getBoundingClientRect().bottom || 0;
    const viewportGap = 16;
    const below = Math.max(0, window.innerHeight - inputRect.bottom - viewportGap);
    const above = Math.max(0, inputRect.top - Math.max(0, headerBottom) - viewportGap);
    const placeAbove = below < 160 && above > below;
    const available = placeAbove ? above : below;

    list.dataset.placement = placeAbove ? "above" : "below";
    list.style.maxHeight = `${Math.max(1, Math.min(276, Math.floor(available)))}px`;
  }

  let preserveTopUntil = 0;

  function markProgrammaticRequestFocus(event) {
    if (!(event.target instanceof Element)) return;
    if (!event.target.closest(".request-choice, .fund-mode-choice, .dac-path-choice")) return;
    preserveTopUntil = performance.now() + 600;
  }

  function restoreRequestTop() {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }

  function restoreRequestTopWhenVisible() {
    const requestScreen = byId("screenRequest");
    if (!(requestScreen instanceof HTMLElement)) return;
    if (requestScreen.hidden || !requestScreen.classList.contains("active")) return;
    window.requestAnimationFrame(restoreRequestTop);
    window.setTimeout(restoreRequestTop, 0);
  }

  patchSuggestionCatalog();
  syncOtherCauseSubmit();
  syncCausePressed();
  syncRequestCardExamples();
  syncProgressLabels();
  positionSuggestions();

  byId("otherCauseInput")?.addEventListener("input", syncOtherCauseSubmit);

  const requestScreen = byId("screenRequest");
  if (requestScreen) {
    new MutationObserver(restoreRequestTopWhenVisible).observe(requestScreen, {
      attributes: true,
      attributeFilter: ["class", "hidden"]
    });
    restoreRequestTopWhenVisible();
  }

  document.addEventListener("click", markProgrammaticRequestFocus, true);
  document.addEventListener("focusin", (event) => {
    if (event.target !== byId("requestActionInput")) return;
    if (performance.now() <= preserveTopUntil && window.innerWidth > 900) {
      preserveTopUntil = 0;
      window.requestAnimationFrame(restoreRequestTop);
      window.setTimeout(restoreRequestTop, 0);
    } else {
      preserveTopUntil = 0;
    }
    window.requestAnimationFrame(positionSuggestions);
  });
  document.addEventListener("input", (event) => {
    if (event.target === byId("requestActionInput")) {
      window.requestAnimationFrame(positionSuggestions);
    }
  });

  window.addEventListener("resize", positionSuggestions, { passive: true });
  window.addEventListener("scroll", positionSuggestions, { passive: true });

  const suggestionList = byId("actionSuggestions");
  if (suggestionList) {
    new MutationObserver(() => window.requestAnimationFrame(positionSuggestions)).observe(
      suggestionList,
      { attributes: true, attributeFilter: ["class"], childList: true }
    );
  }

  const causeGrid = byId("causeGrid");
  if (causeGrid) {
    new MutationObserver(syncCausePressed).observe(causeGrid, {
      attributes: true,
      attributeFilter: ["class"],
      childList: true,
      subtree: true
    });
  }

  const requestCause = byId("requestCause");
  if (requestCause) {
    new MutationObserver(syncRequestCardExamples).observe(requestCause, {
      childList: true,
      characterData: true,
      subtree: true
    });
  }

  const progress = byId("progress");
  if (progress) {
    new MutationObserver(syncProgressLabels).observe(progress, {
      attributes: true,
      attributeFilter: ["class", "hidden"],
      childList: true,
      subtree: true
    });
  }
})();
