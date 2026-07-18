(function installInlineItineraryEditor() {
  "use strict";

  if (window.__MT_INLINE_ITINERARY_EDITOR__) return;
  window.__MT_INLINE_ITINERARY_EDITOR__ = true;

  const STORAGE_KEY = "mt_live_itinerary_v1";
  const STORAGE_VERSION = 1;
  const STYLE_ID = "mt-inline-itinerary-editor-styles";
  const OWNED_CLASS = "mt-itinerary-owned";
  const EDITOR_CLASS = "mt-itinerary-editing";
  const READY_ATTRIBUTE = "data-mt-itinerary-ready";
  const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });
  const MONEY_FORMATTER = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  });

  const seedSteps = [
    {
      id: "step-1",
      title: "Redirect $20 of political donations",
      amount: 20,
      date: "2026-07-20",
      proof: "Donation receipt or confirmation that the amount was redirected.",
    },
    {
      id: "step-2",
      title: "Fund a verified research review",
      amount: 20,
      date: "2026-07-31",
      proof: "Public review link plus reviewer confirmation.",
    },
    {
      id: "step-3",
      title: "Invite one counterparty",
      amount: 0,
      date: "2026-07-31",
      proof: "A dated invitation and a logged response or no-response status.",
    },
  ];

  const originalCards = new WeakMap();
  let activeCard = null;
  let savedSteps = clone(seedSteps);
  let draftSteps = clone(seedSteps);
  let hasPersistedPlan = false;
  let editing = false;
  let dirty = false;
  let patchQueued = false;
  let patching = false;
  let toastTimer = 0;

  function clone(value) {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeLabel(value) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return `step-${window.crypto.randomUUID()}`;
    }
    return `step-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function parseDate(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value) {
    const date = parseDate(value);
    return date ? DATE_FORMATTER.format(date) : "No date";
  }

  function formatMoney(value) {
    const amount = Number(value);
    return `$${MONEY_FORMATTER.format(Number.isFinite(amount) ? Math.max(0, amount) : 0)}`;
  }

  function todayInputValue() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function defaultNewDate() {
    const dates = draftSteps.map((step) => step.date).filter(Boolean).sort();
    if (dates.length) return dates[dates.length - 1];
    const date = new Date();
    date.setDate(date.getDate() + 7);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function sanitizeStep(step, index) {
    const title = String(step && step.title != null ? step.title : "").slice(0, 240);
    const amount = Number(step && step.amount != null ? step.amount : 0);
    const date = String(step && step.date != null ? step.date : "").slice(0, 10);
    const proof = String(step && step.proof != null ? step.proof : "").slice(0, 500);
    return {
      id: String(step && step.id ? step.id : `step-${index + 1}`).slice(0, 120),
      title,
      amount: Number.isFinite(amount) ? Math.max(0, amount) : 0,
      date: parseDate(date) ? date : "",
      proof,
    };
  }

  function sanitizeSteps(value) {
    if (!Array.isArray(value)) return null;
    const steps = value.slice(0, 20).map(sanitizeStep);
    if (!steps.length) return [];
    const seen = new Set();
    for (const step of steps) {
      if (!step.id || seen.has(step.id)) step.id = createId();
      seen.add(step.id);
    }
    return steps;
  }

  function loadSavedPlan() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const payload = JSON.parse(raw);
      if (!payload || payload.version !== STORAGE_VERSION) return;
      const steps = sanitizeSteps(payload.steps);
      if (!steps || !steps.length) return;
      savedSteps = steps;
      draftSteps = clone(steps);
      hasPersistedPlan = true;
      exposePlan(savedSteps);
    } catch (error) {
      console.warn("Moral Trade could not restore the saved itinerary.", error);
    }
  }

  function persistSavedPlan() {
    const payload = {
      version: STORAGE_VERSION,
      savedAt: new Date().toISOString(),
      steps: savedSteps,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    hasPersistedPlan = true;
    exposePlan(savedSteps);
  }

  function exposePlan(steps) {
    const snapshot = clone(steps);
    window.__MT_ITINERARY_STEPS__ = snapshot;
    window.dispatchEvent(
      new CustomEvent("mt:itinerary-updated", {
        detail: { steps: clone(snapshot) },
      }),
    );
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const link = document.createElement("link");
    link.id = STYLE_ID;
    link.rel = "stylesheet";
    link.href = "/moral-trade-live-itinerary-editor.css";
    document.head.appendChild(link);
  }

  function icon(name) {
    const paths = {
      check: '<path d="M5 12.5 9.2 17 19 7"/>',
      chevron: '<path d="m9 18 6-6-6-6"/>',
      down: '<path d="m6 9 6 6 6-6"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      save: '<path d="M5 4h12l2 2v14H5z"/><path d="M8 4v5h8V4M8 20v-7h8v7"/>',
      trash: '<path d="M4 7h16M9 7V4h6v3M8 10v7M12 10v7M16 10v7M6 7l1 14h10l1-14"/>',
      up: '<path d="m6 15 6-6 6 6"/>',
    };
    return `<svg aria-hidden="true" focusable="false" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${paths[name] || ""}</g></svg>`;
  }

  function isExactLabel(element, label) {
    return normalizeLabel(element.textContent) === normalizeLabel(label);
  }

  function findCard() {
    const ownedCard = document.querySelector(`[${READY_ATTRIBUTE}="true"].${OWNED_CLASS}`);
    if (ownedCard) return ownedCard;

    const controls = Array.from(document.querySelectorAll("button, a")).filter((element) =>
      isExactLabel(element, "Edit"),
    );

    for (const control of controls) {
      let current = control.parentElement;
      let fallback = null;
      for (let depth = 0; current && current !== document.body && depth < 12; depth += 1) {
        const text = normalizeLabel(current.textContent);
        if (text.includes("your itinerary")) {
          const titleMatches = seedSteps.filter((step) =>
            text.includes(normalizeLabel(step.title)),
          ).length;
          if (titleMatches >= 2) return current;

          const actionLikeItems = current.querySelectorAll(
            "article, li, [class*='step' i], [class*='item' i], [class*='timeline' i]",
          ).length;
          if (actionLikeItems >= 3) fallback = current;
          else if (!fallback && text.length > 90) fallback = current;
        }
        current = current.parentElement;
      }
      if (fallback) return fallback;
    }

    return null;
  }

  function rememberOriginal(card) {
    if (originalCards.has(card)) return;
    originalCards.set(card, {
      className: card.className,
      html: card.innerHTML,
      style: card.getAttribute("style"),
    });
  }

  function restoreOriginal(card) {
    const snapshot = originalCards.get(card);
    if (!snapshot) return false;
    card.className = snapshot.className;
    if (snapshot.style == null) card.removeAttribute("style");
    else card.setAttribute("style", snapshot.style);
    card.innerHTML = snapshot.html;
    card.setAttribute(READY_ATTRIBUTE, "true");
    return true;
  }

  function renderRead(card) {
    activeCard = card;
    card.setAttribute(READY_ATTRIBUTE, "true");
    card.classList.add(OWNED_CLASS);
    card.classList.remove(EDITOR_CLASS);
    card.setAttribute("aria-label", "Your itinerary");

    const rows = savedSteps
      .map(
        (step, index) => `
          <article class="mt-itinerary-read-step" data-mt-itinerary-step-id="${escapeHtml(step.id)}">
            <div class="mt-itinerary-rail"><span class="mt-itinerary-badge">${index + 1}</span></div>
            <div class="mt-itinerary-read-copy">
              <h4>${escapeHtml(step.title || "Untitled action")}</h4>
              <p>${escapeHtml(formatMoney(step.amount))} <span aria-hidden="true">·</span> ${escapeHtml(formatDate(step.date))}</p>
            </div>
          </article>`,
      )
      .join("");

    card.innerHTML = `
      <header class="mt-itinerary-header">
        <div class="mt-itinerary-heading-group">
          <h3 class="mt-itinerary-title">Your itinerary</h3>
        </div>
        <button class="mt-itinerary-button mt-itinerary-button--edit" type="button" data-mt-itinerary-action="edit">Edit</button>
      </header>
      <div class="mt-itinerary-read-list">${rows}</div>`;
  }

  function renderEditor(card, options) {
    activeCard = card;
    card.setAttribute(READY_ATTRIBUTE, "true");
    card.classList.add(OWNED_CLASS, EDITOR_CLASS);
    card.setAttribute("aria-label", "Edit your itinerary");

    const rows = draftSteps
      .map(
        (step, index) => `
          <article class="mt-itinerary-edit-step" data-mt-itinerary-step-id="${escapeHtml(step.id)}">
            <div class="mt-itinerary-rail"><span class="mt-itinerary-badge">${index + 1}</span></div>
            <div class="mt-itinerary-edit-body">
              <div class="mt-itinerary-edit-top">
                <textarea class="mt-itinerary-title-input" rows="1" maxlength="240" data-mt-itinerary-update="${escapeHtml(step.id)}" data-mt-itinerary-field="title" aria-label="Action ${index + 1} title">${escapeHtml(step.title)}</textarea>
                <div class="mt-itinerary-row-tools" aria-label="Action ${index + 1} controls">
                  <button class="mt-itinerary-icon-button" type="button" data-mt-itinerary-action="move-up" data-mt-itinerary-id="${escapeHtml(step.id)}" aria-label="Move action ${index + 1} up" title="Move up" ${index === 0 ? "disabled" : ""}>${icon("up")}</button>
                  <button class="mt-itinerary-icon-button" type="button" data-mt-itinerary-action="move-down" data-mt-itinerary-id="${escapeHtml(step.id)}" aria-label="Move action ${index + 1} down" title="Move down" ${index === draftSteps.length - 1 ? "disabled" : ""}>${icon("down")}</button>
                  <button class="mt-itinerary-icon-button mt-itinerary-icon-button--danger" type="button" data-mt-itinerary-action="delete" data-mt-itinerary-id="${escapeHtml(step.id)}" aria-label="Delete action ${index + 1}" title="Delete action">${icon("trash")}</button>
                </div>
              </div>
              <div class="mt-itinerary-meta-grid">
                <div class="mt-itinerary-field">
                  <label for="mt-itinerary-amount-${escapeHtml(step.id)}">Amount</label>
                  <div class="mt-itinerary-money"><span aria-hidden="true">$</span><input id="mt-itinerary-amount-${escapeHtml(step.id)}" type="number" min="0" step="1" inputmode="decimal" value="${escapeHtml(step.amount)}" data-mt-itinerary-update="${escapeHtml(step.id)}" data-mt-itinerary-field="amount" aria-label="Amount for ${escapeHtml(step.title || `action ${index + 1}`)}"></div>
                </div>
                <div class="mt-itinerary-field">
                  <label for="mt-itinerary-date-${escapeHtml(step.id)}">Due date</label>
                  <input id="mt-itinerary-date-${escapeHtml(step.id)}" type="date" min="${todayInputValue()}" value="${escapeHtml(step.date)}" data-mt-itinerary-update="${escapeHtml(step.id)}" data-mt-itinerary-field="date" aria-label="Due date for ${escapeHtml(step.title || `action ${index + 1}`)}">
                </div>
              </div>
              <details class="mt-itinerary-proof">
                <summary>${icon("chevron")} Completion rule</summary>
                <div class="mt-itinerary-field">
                  <label for="mt-itinerary-proof-${escapeHtml(step.id)}">What counts as done?</label>
                  <input id="mt-itinerary-proof-${escapeHtml(step.id)}" type="text" maxlength="500" value="${escapeHtml(step.proof)}" data-mt-itinerary-update="${escapeHtml(step.id)}" data-mt-itinerary-field="proof">
                </div>
              </details>
            </div>
          </article>`,
      )
      .join("");

    const empty = `
      <div class="mt-itinerary-empty">
        <h4>No actions yet</h4>
        <p>Add the first action to rebuild the itinerary.</p>
      </div>`;

    card.innerHTML = `
      <header class="mt-itinerary-header">
        <div class="mt-itinerary-heading-group">
          <h3 class="mt-itinerary-title">Your itinerary</h3>
          <span class="mt-itinerary-save-state" data-mt-itinerary-dirty-state aria-live="polite">${dirty ? "Unsaved changes" : "All changes saved"}</span>
        </div>
        <div class="mt-itinerary-header-actions">
          <button class="mt-itinerary-button mt-itinerary-button--ghost" type="button" data-mt-itinerary-action="cancel">Cancel</button>
          <button class="mt-itinerary-button mt-itinerary-button--primary" type="button" data-mt-itinerary-action="save">${icon("save")}Save itinerary</button>
        </div>
      </header>
      <div class="mt-itinerary-editor-list">${rows || empty}</div>
      <div class="mt-itinerary-add"><button class="mt-itinerary-button mt-itinerary-button--secondary" type="button" data-mt-itinerary-action="add">${icon("plus")}Add an action</button></div>`;

    autoGrowTitles(card);
    syncDirtyState(card);

    if (options && options.focusId) {
      requestAnimationFrame(() => {
        const target = card.querySelector(
          `[data-mt-itinerary-update="${cssEscape(options.focusId)}"][data-mt-itinerary-field="title"]`,
        );
        if (target instanceof HTMLTextAreaElement) {
          target.focus();
          if (options.selectTitle) target.select();
        }
      });
    }
  }

  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
    return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
  }

  function autoGrowTitle(textarea) {
    if (!(textarea instanceof HTMLTextAreaElement)) return;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  function autoGrowTitles(card) {
    card.querySelectorAll(".mt-itinerary-title-input").forEach(autoGrowTitle);
  }

  function syncDirtyState(card) {
    const status = card.querySelector("[data-mt-itinerary-dirty-state]");
    if (status) status.textContent = dirty ? "Unsaved changes" : "All changes saved";
  }

  function markDirty() {
    if (!dirty) dirty = true;
    if (activeCard) syncDirtyState(activeCard);
  }

  function openEditor(card) {
    rememberOriginal(card);
    activeCard = card;
    draftSteps = clone(savedSteps);
    editing = true;
    dirty = false;
    renderEditor(card, {
      focusId: draftSteps[0] && draftSteps[0].id,
      selectTitle: false,
    });
  }

  function validateDraft() {
    if (!draftSteps.length) {
      showToast("Add at least one action before saving.", false);
      return null;
    }
    for (const step of draftSteps) {
      if (!String(step.title || "").trim()) {
        showToast("Every action needs a title.", false);
        focusInvalid(step.id, "title");
        return null;
      }
      if (!Number.isFinite(Number(step.amount)) || Number(step.amount) < 0) {
        showToast("Amounts must be zero or greater.", false);
        focusInvalid(step.id, "amount");
        return null;
      }
      if (!parseDate(step.date)) {
        showToast("Every action needs a due date.", false);
        focusInvalid(step.id, "date");
        return null;
      }
    }
    return sanitizeSteps(draftSteps);
  }

  function focusInvalid(id, field) {
    if (!activeCard) return;
    const input = activeCard.querySelector(
      `[data-mt-itinerary-update="${cssEscape(id)}"][data-mt-itinerary-field="${field}"]`,
    );
    if (input instanceof HTMLElement) input.focus();
  }

  function saveEditor() {
    const validated = validateDraft();
    if (!validated) return;
    savedSteps = clone(validated);
    draftSteps = clone(validated);
    persistSavedPlan();
    editing = false;
    dirty = false;
    if (activeCard) renderRead(activeCard);
    showToast("Itinerary saved.", true);
    requestAnimationFrame(() => {
      const editButton = activeCard && activeCard.querySelector('[data-mt-itinerary-action="edit"]');
      if (editButton instanceof HTMLElement) editButton.focus();
    });
  }

  function cancelEditor() {
    draftSteps = clone(savedSteps);
    editing = false;
    dirty = false;
    if (!activeCard) return;
    if (hasPersistedPlan) {
      renderRead(activeCard);
    } else if (!restoreOriginal(activeCard)) {
      renderRead(activeCard);
    }
    showToast("Changes discarded.", true);
    requestAnimationFrame(() => {
      const editButton = Array.from(activeCard.querySelectorAll("button, a")).find((element) =>
        isExactLabel(element, "Edit"),
      );
      if (editButton instanceof HTMLElement) editButton.focus();
    });
  }

  function addStep() {
    const step = {
      id: createId(),
      title: "New itinerary action",
      amount: 0,
      date: defaultNewDate(),
      proof: "Add a concrete completion rule.",
    };
    draftSteps.push(step);
    markDirty();
    if (activeCard) renderEditor(activeCard, { focusId: step.id, selectTitle: true });
  }

  function deleteStep(id) {
    const index = draftSteps.findIndex((step) => step.id === id);
    if (index < 0) return;
    draftSteps.splice(index, 1);
    markDirty();
    const focusStep = draftSteps[Math.min(index, draftSteps.length - 1)];
    if (activeCard) renderEditor(activeCard, { focusId: focusStep && focusStep.id });
    showToast("Action removed from the draft.", true);
  }

  function moveStep(id, direction) {
    const index = draftSteps.findIndex((step) => step.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= draftSteps.length) return;
    const [step] = draftSteps.splice(index, 1);
    draftSteps.splice(nextIndex, 0, step);
    markDirty();
    if (activeCard) renderEditor(activeCard, { focusId: id });
  }

  function showToast(message, positive) {
    const hostToast = typeof toast === "function"
      ? toast
      : typeof window.toast === "function"
        ? window.toast
        : null;
    if (hostToast) {
      try {
        hostToast(message);
        return;
      } catch (_) {
        // Fall through to the local status surface.
      }
    }

    let statusToast = document.querySelector(".mt-itinerary-toast");
    if (!statusToast) {
      statusToast = document.createElement("div");
      statusToast.className = "mt-itinerary-toast";
      statusToast.setAttribute("role", "status");
      statusToast.setAttribute("aria-live", "polite");
      document.body.appendChild(statusToast);
    }
    statusToast.innerHTML = `${icon(positive === false ? "chevron" : "check")}<span>${escapeHtml(message)}</span>`;
    const svg = statusToast.querySelector("svg");
    if (svg) svg.style.color = positive === false ? "#ffb3aa" : "#80e6ad";
    statusToast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => statusToast.classList.remove("is-visible"), 2600);
  }

  function updateDraftFromInput(input) {
    const id = input.getAttribute("data-mt-itinerary-update");
    const field = input.getAttribute("data-mt-itinerary-field");
    if (!id || !field) return;
    const step = draftSteps.find((candidate) => candidate.id === id);
    if (!step) return;
    if (field === "amount") {
      const amount = Number(input.value);
      step.amount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    } else {
      step[field] = input.value;
    }
    markDirty();
    if (input.classList.contains("mt-itinerary-title-input")) autoGrowTitle(input);
  }

  function cardForControl(control) {
    const owned = control.closest(`[${READY_ATTRIBUTE}="true"]`);
    if (owned) return owned;
    return findCard();
  }

  function handleClick(event) {
    const control = event.target instanceof Element
      ? event.target.closest("[data-mt-itinerary-action], button, a")
      : null;
    if (!control) return;

    let action = control.getAttribute("data-mt-itinerary-action");
    if (!action && isExactLabel(control, "Edit")) action = "edit";
    if (!action) return;

    const card = cardForControl(control);
    if (!card) return;

    event.preventDefault();
    event.stopPropagation();
    if (typeof event.stopImmediatePropagation === "function") event.stopImmediatePropagation();

    if (action === "edit") openEditor(card);
    else if (action === "cancel") cancelEditor();
    else if (action === "save") saveEditor();
    else if (action === "add") addStep();
    else if (action === "delete") deleteStep(control.getAttribute("data-mt-itinerary-id"));
    else if (action === "move-up") moveStep(control.getAttribute("data-mt-itinerary-id"), -1);
    else if (action === "move-down") moveStep(control.getAttribute("data-mt-itinerary-id"), 1);
  }

  function handleInput(event) {
    const input = event.target instanceof Element
      ? event.target.closest("[data-mt-itinerary-update][data-mt-itinerary-field]")
      : null;
    if (!(input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement)) return;
    updateDraftFromInput(input);
  }

  function handleKeydown(event) {
    if (!editing) return;
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
      event.preventDefault();
      saveEditor();
      return;
    }
    if (event.key === "Escape" && !event.defaultPrevented) {
      event.preventDefault();
      cancelEditor();
    }
  }

  function handleBeforeUnload(event) {
    if (!editing || !dirty) return;
    event.preventDefault();
    event.returnValue = "";
  }

  function patchCard() {
    if (patching) return;
    patching = true;
    try {
      installStyles();
      const card = findCard();
      if (!card) return;
      rememberOriginal(card);
      card.setAttribute(READY_ATTRIBUTE, "true");
      activeCard = card;

      if (editing) {
        if (!card.classList.contains(EDITOR_CLASS)) renderEditor(card);
      } else if (hasPersistedPlan) {
        if (!card.classList.contains(OWNED_CLASS)) renderRead(card);
      }
    } finally {
      patching = false;
    }
  }

  function schedulePatch() {
    if (patchQueued) return;
    patchQueued = true;
    requestAnimationFrame(() => {
      patchQueued = false;
      patchCard();
    });
  }

  loadSavedPlan();
  installStyles();
  document.addEventListener("click", handleClick, true);
  document.addEventListener("input", handleInput, true);
  document.addEventListener("keydown", handleKeydown, true);
  window.addEventListener("beforeunload", handleBeforeUnload);
  window.addEventListener("pageshow", schedulePatch);
  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY || editing) return;
    loadSavedPlan();
    schedulePatch();
  });

  const observer = new MutationObserver(schedulePatch);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  schedulePatch();
})();
