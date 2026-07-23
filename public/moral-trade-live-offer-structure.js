(function installLiveOfferStructure() {
  "use strict";

  if (window.__MT_LIVE_OFFER_STRUCTURE__) return;
  window.__MT_LIVE_OFFER_STRUCTURE__ = true;

  const OFFER_TYPES = [
    {
      key: "money",
      icon: "$",
      label: "Money",
      description: "A bounded payment or donation.",
    },
    {
      key: "behavior",
      icon: "⇄",
      label: "Behavior or commitment",
      description: "A concrete action or ongoing commitment.",
    },
    {
      key: "service",
      icon: "⚗",
      label: "Help or service",
      description: "Useful work, assistance, or expert service.",
    },
  ];

  const TERM_TYPES = [
    { icon: "♡", label: "Donation redirect" },
    { icon: "↗", label: "Threshold" },
    { icon: "□", label: "Deadline" },
    { icon: "◈", label: "Verification" },
  ];

  let scheduled = false;
  let applying = false;

  function normalize(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function groupLabel(text) {
    const label = document.createElement("div");
    label.className = "mt-offer-group-label";
    label.textContent = text;
    return label;
  }

  function ingredient({ description = "", icon, key = "", label }, offerType = false) {
    const control = document.createElement("div");
    control.className = "ingredient mt-offer-ingredient";
    control.draggable = true;
    control.dataset.ingredient = label;
    control.setAttribute("role", "button");
    control.setAttribute("tabindex", "0");
    control.setAttribute("aria-label", description ? `${label}. ${description}` : label);
    control.title = description || `Add ${label}`;

    if (offerType) {
      control.dataset.mtOfferType = key;
    }

    const iconElement = document.createElement("b");
    iconElement.setAttribute("aria-hidden", "true");
    iconElement.textContent = icon;

    const labelElement = document.createElement("span");
    labelElement.className = "mt-offer-ingredient-label";
    labelElement.textContent = label;

    const handle = document.createElement("span");
    handle.className = "mt-offer-ingredient-handle";
    handle.setAttribute("aria-hidden", "true");
    handle.textContent = "⋮⋮";

    control.append(iconElement, labelElement, handle);
    return control;
  }

  function patchPalette() {
    const panel = document.querySelector(".compose-grid .ingredients");
    if (!panel || panel.dataset.mtOfferStructure === "true") return false;

    const dropzone = panel.querySelector("#ingredientDrop");
    const legacyIngredients = Array.from(panel.querySelectorAll(".ingredient"));
    if (!dropzone || !legacyIngredients.length) return false;

    applying = true;
    legacyIngredients.forEach((control) => control.remove());

    const fragment = document.createDocumentFragment();
    fragment.appendChild(groupLabel("Offer type"));
    OFFER_TYPES.forEach((definition) => fragment.appendChild(ingredient(definition, true)));
    fragment.appendChild(groupLabel("Conditions and safeguards"));
    TERM_TYPES.forEach((definition) => fragment.appendChild(ingredient(definition)));
    panel.insertBefore(fragment, dropzone);

    dropzone.textContent = "Drop an offer type or term to add";
    dropzone.setAttribute("aria-label", "Drop an offer type, condition, or safeguard to add it");
    panel.dataset.mtOfferStructure = "true";
    applying = false;
    return true;
  }

  function editable(value, context, options = {}) {
    const contextAttribute = context ? ` data-mt-autocomplete-context="${context}"` : "";
    const disabledAttribute = options.autocomplete === false ? ' data-mt-autocomplete-disabled="true"' : "";
    return `<span class="token mt-offer-token${options.className ? ` ${options.className}` : ""}" contenteditable="true" spellcheck="true"${contextAttribute}${disabledAttribute}>${value}</span>`;
  }

  function attribute(label, value, context, options = {}) {
    return `<div class="mt-offer-attribute"><span class="mt-offer-attribute-label">${label}</span>${editable(
      value,
      context,
      { ...options, className: "mt-offer-attribute-value" },
    )}</div>`;
  }

  function attributeGrid(values) {
    return `<div class="mt-offer-attributes" aria-label="Offer details">${values.join("")}</div>`;
  }

  function moneyTemplate() {
    return `<div class="mt-offer-primary">I will provide ${editable("$80.00", "", {
      autocomplete: false,
    })} to ${editable("a person, project, or cause", "priorities")}.</div>${attributeGrid([
      attribute("Estimated time", "5 minutes", "commitments"),
      attribute("Relevant skills", "None required", "commitments"),
      attribute("Deliverable or completion condition", "Payment or donation confirmed", "commitments"),
      attribute("Verification method", "Receipt or provider confirmation", "evidence"),
    ])}`;
  }

  function behaviorTemplate() {
    return `<div class="mt-offer-primary">I will ${editable(
      "describe the behavior or commitment",
      "commitments",
    )}.</div>${attributeGrid([
      attribute("Estimated time", "State the duration, frequency, or number of actions", "commitments"),
      attribute("Relevant skills", "None required, or name any relevant capability", "commitments"),
      attribute("Deliverable or completion condition", "Define exactly what counts as complete", "commitments"),
      attribute("Verification method", "Attestation, receipt, activity log, or reviewer", "evidence"),
    ])}`;
  }

  function serviceTemplate() {
    return `<div class="mt-offer-primary">I will provide ${editable(
      "describe the help or service",
      "commitments",
    )}.</div>${attributeGrid([
      attribute("Estimated time", "For example, 2 hours", "commitments"),
      attribute("Relevant skills", "For example, research, tutoring, design, or review", "commitments"),
      attribute("Deliverable or completion condition", "Name the output and acceptance condition", "commitments"),
      attribute("Verification method", "Recipient acceptance or independent review", "evidence"),
    ])}`;
  }

  function templateFor(label) {
    const normalized = normalize(label);
    if (normalized === "money") return moneyTemplate();
    if (normalized === "behavior or commitment") return behaviorTemplate();
    if (normalized === "help or service") return serviceTemplate();
    return null;
  }

  function patchClauses() {
    let patched = false;

    document.querySelectorAll(".compose-grid .clause").forEach((clause) => {
      if (!(clause instanceof HTMLElement) || clause.dataset.mtOfferStructure === "true") return;

      const label = clause.querySelector(".clause-label")?.textContent || "";
      const template = templateFor(label);
      if (!template) return;

      const sentence = clause.querySelector(".sentence");
      if (!(sentence instanceof HTMLElement)) return;

      sentence.innerHTML = template;
      clause.dataset.mtOfferStructure = "true";
      sentence.setAttribute("data-mt-offer-details", normalize(label).replace(/[^a-z0-9]+/g, "-"));
      patched = true;
    });

    return patched;
  }

  function apply() {
    if (applying) return;
    applying = true;
    patchPalette();
    patchClauses();
    applying = false;
  }

  function scheduleApply() {
    if (scheduled || applying) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      apply();
    });
  }

  function addOfferType(label) {
    if (typeof window.addClause === "function") {
      window.addClause(label);
      scheduleApply();
      return;
    }

    const fallback = document.createElement("button");
    fallback.hidden = true;
    fallback.dataset.ingredient = label;
    document.body.appendChild(fallback);
    fallback.click();
    fallback.remove();
    scheduleApply();
  }

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target;
      const control = target instanceof Element ? target.closest("[data-mt-offer-type]") : null;
      if (!(control instanceof HTMLElement)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      addOfferType(control.dataset.ingredient || control.textContent || "");
    },
    true,
  );

  document.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      const target = event.target;
      const control = target instanceof Element ? target.closest(".mt-offer-ingredient") : null;
      if (!(control instanceof HTMLElement)) return;

      event.preventDefault();
      control.click();
    },
    true,
  );

  document.addEventListener(
    "dragstart",
    (event) => {
      const target = event.target;
      const control = target instanceof Element ? target.closest(".mt-offer-ingredient") : null;
      if (!(control instanceof HTMLElement) || !event.dataTransfer) return;
      event.dataTransfer.setData("ingredient", control.dataset.ingredient || "");
      event.dataTransfer.effectAllowed = "copy";
    },
    true,
  );

  const observer = new MutationObserver(() => scheduleApply());

  function start() {
    apply();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }

  window.MoralTradeLiveOfferStructure = Object.freeze({
    offerTypes: OFFER_TYPES.map(({ key, label }) => ({ key, label })),
    patch: apply,
  });
})();
