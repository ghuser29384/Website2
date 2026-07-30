(() => {
  "use strict";

  const STORAGE_KEY = "moral-trade-create-safeguards-v1";
  const GENERIC_NO_TRADE_BASELINE =
    "If no proposal is accepted, neither party incurs an obligation.";
  const byId = (id) => document.getElementById(id);
  const fields = {
    affectedPartyPlan: byId("createAffectedPartyPlan"),
    affectedPartyStatus: byId("createAffectedPartyStatus"),
    baselineConfirmed: byId("createBaselineConfirmed"),
    individualCapacity: byId("createIndividualCapacity"),
    noManufacturedLeverage: byId("createNoManufacturedLeverage"),
    noTradeBaseline: byId("createNoTradeBaseline"),
  };
  const planField = byId("createAffectedPartyPlanField");
  const errorBox = byId("createSafeguardsError");
  const publishButton = byId("publishOffer");

  if (
    !Object.values(fields).every(Boolean) ||
    !planField ||
    !errorBox ||
    !publishButton
  ) {
    return;
  }

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function currentSearch() {
    try {
      return window.top?.location.search || window.location.search;
    } catch {
      return window.location.search;
    }
  }

  function shouldRestore() {
    return new URLSearchParams(currentSearch()).get("resume") === "create";
  }

  function readSafeguards() {
    return {
      noTradeBaseline: fields.noTradeBaseline.value.trim(),
      baselineConfirmed: fields.baselineConfirmed.checked,
      noManufacturedLeverage: fields.noManufacturedLeverage.checked,
      affectedPartyStatus: fields.affectedPartyStatus.value,
      affectedPartyPlan:
        fields.affectedPartyStatus.value === "review_required"
          ? fields.affectedPartyPlan.value.trim()
          : "",
      capacity: fields.individualCapacity.checked ? "individual" : "",
    };
  }

  function writeSafeguards(value) {
    if (!value || typeof value !== "object") return;
    fields.noTradeBaseline.value = String(value.noTradeBaseline || "");
    fields.baselineConfirmed.checked = value.baselineConfirmed === true;
    fields.noManufacturedLeverage.checked = value.noManufacturedLeverage === true;
    fields.affectedPartyStatus.value = String(value.affectedPartyStatus || "");
    fields.affectedPartyPlan.value = String(value.affectedPartyPlan || "");
    fields.individualCapacity.checked = value.capacity === "individual";
    updateAffectedPartyPlan();
  }

  function saveSafeguards() {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(readSafeguards()));
    } catch {}
  }

  function restoreSafeguards() {
    if (!shouldRestore()) return;
    try {
      writeSafeguards(JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null"));
    } catch {}
  }

  function clearSafeguards() {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
    writeSafeguards({});
    errorBox.textContent = "";
    document
      .querySelectorAll(".create-safeguards-invalid")
      .forEach((element) => element.classList.remove("create-safeguards-invalid"));
  }

  function updateAffectedPartyPlan() {
    const required = fields.affectedPartyStatus.value === "review_required";
    planField.hidden = !required;
    fields.affectedPartyPlan.required = required;
    if (!required) fields.affectedPartyPlan.value = "";
  }

  function markInvalid(element, message) {
    element.closest("label")?.classList.add("create-safeguards-invalid");
    errorBox.textContent = message;
    element.focus();
    element.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function clearInvalidState() {
    errorBox.textContent = "";
    document
      .querySelectorAll(".create-safeguards-invalid")
      .forEach((element) => element.classList.remove("create-safeguards-invalid"));
  }

  function validateSafeguards() {
    clearInvalidState();
    const value = readSafeguards();

    if (value.noTradeBaseline.length < 20) {
      markInvalid(
        fields.noTradeBaseline,
        "Describe the specific no-deal baseline in at least 20 characters.",
      );
      return false;
    }
    if (
      normalizeText(value.noTradeBaseline) ===
      normalizeText(GENERIC_NO_TRADE_BASELINE)
    ) {
      markInvalid(
        fields.noTradeBaseline,
        "Describe the specific default, not only the absence of an agreement.",
      );
      return false;
    }
    if (!value.baselineConfirmed) {
      markInvalid(
        fields.baselineConfirmed,
        "Confirm that the stated no-deal baseline is genuine.",
      );
      return false;
    }
    if (!value.noManufacturedLeverage) {
      markInvalid(
        fields.noManufacturedLeverage,
        "Confirm that no harm or costly baseline was manufactured or escalated for leverage.",
      );
      return false;
    }
    if (!value.affectedPartyStatus) {
      markInvalid(
        fields.affectedPartyStatus,
        "State whether someone outside the proposal could bear a material cost.",
      );
      return false;
    }
    if (
      value.affectedPartyStatus === "review_required" &&
      value.affectedPartyPlan.length < 20
    ) {
      markInvalid(
        fields.affectedPartyPlan,
        "Describe the possible impact, standing, and remedy or review path in at least 20 characters.",
      );
      return false;
    }
    if (value.capacity !== "individual") {
      markInvalid(
        fields.individualCapacity,
        "This Create flow is individual-only. Confirm individual capacity or use the institutional authority workflow when it is available.",
      );
      return false;
    }

    saveSafeguards();
    return true;
  }

  const originalBuildPayload = window.buildCreateSubmissionPayload;
  if (typeof originalBuildPayload === "function") {
    window.buildCreateSubmissionPayload = function buildCreateSubmissionPayloadWithSafeguards() {
      return {
        ...originalBuildPayload(),
        safeguards: readSafeguards(),
      };
    };
  } else {
    errorBox.textContent =
      "The Create safeguard contract could not attach to this interface. Reload before submitting.";
    publishButton.disabled = true;
  }

  const originalRenderSubmittedReceipt = window.renderSubmittedReceipt;
  if (typeof originalRenderSubmittedReceipt === "function") {
    window.renderSubmittedReceipt = function renderSubmittedReceiptWithSafeguardCleanup(
      submission,
    ) {
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {}
      return originalRenderSubmittedReceipt(submission);
    };
  }

  fields.affectedPartyStatus.addEventListener("change", () => {
    updateAffectedPartyPlan();
    saveSafeguards();
  });
  Object.values(fields).forEach((field) => {
    field.addEventListener("input", () => {
      field.closest("label")?.classList.remove("create-safeguards-invalid");
      errorBox.textContent = "";
      saveSafeguards();
    });
    field.addEventListener("change", saveSafeguards);
  });

  publishButton.addEventListener(
    "click",
    (event) => {
      if (validateSafeguards()) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true,
  );

  byId("startOver")?.addEventListener("click", clearSafeguards);
  byId("makeAnotherOffer")?.addEventListener("click", clearSafeguards);

  updateAffectedPartyPlan();
  restoreSafeguards();
})();
