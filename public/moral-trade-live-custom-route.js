/* global document, nowPlan, render, state, toast, window */

(function enableCustomRouteWorkbench() {
  "use strict";

  if (window.__MT_CUSTOM_ROUTE_WORKBENCH__) return;
  const accountingApi = window.__MT_ROUTE_RESOURCES_API__;
  if (!accountingApi || typeof nowPlan !== "function" || typeof render !== "function") return;
  window.__MT_CUSTOM_ROUTE_WORKBENCH__ = true;

  const MECHANISMS = Object.freeze({
    trade: { label: "Direct trade", short: "Direct", tone: "blue", symbol: "→" },
    pool: { label: "Threshold pool", short: "Pool", tone: "green", symbol: "◇" },
    redirect: { label: "Donation redirect", short: "Redirect", tone: "orange", symbol: "⇄" },
    action: { label: "Personal action", short: "Personal", tone: "purple", symbol: "○" },
    coalition: { label: "Coalition", short: "Coalition", tone: "charcoal", symbol: "◎" },
  });

  const ACTIONS = Object.freeze([
    {
      id: "redirect",
      title: "Redirect $20 of political donations",
      mechanism: "redirect",
      redirectPrincipal: 20,
      cost: 0,
      minutes: 5,
      actions: 1,
      conditional: false,
      effect: "Authorize the redirect only if its stated donation trigger occurs.",
    },
    {
      id: "review",
      title: "Fund a verified research review",
      mechanism: "trade",
      cost: 20,
      minutes: 45,
      actions: 1,
      conditional: false,
      effect: "Add a $20 charge for a verified review after final confirmation.",
    },
    {
      id: "pool",
      title: "Join cage-free transition pool",
      mechanism: "pool",
      cost: 15,
      minutes: 2,
      actions: 1,
      conditional: true,
      effect: "Add a $15 maximum pledge, charged only if the threshold is reached.",
    },
    {
      id: "diet",
      title: "Commit to a 30-day diet shift",
      mechanism: "action",
      cost: 0,
      minutes: 5,
      actions: 1,
      conditional: false,
      effect: "Add one private 30-day personal commitment.",
    },
    {
      id: "invite",
      title: "Invite one counterparty",
      mechanism: "coalition",
      cost: 0,
      minutes: 5,
      actions: 1,
      conditional: true,
      effect: "Prepare one invitation; it is not sent from this workbench.",
    },
    {
      id: "transport",
      title: "Fund transport improvement",
      mechanism: "trade",
      cost: 25,
      minutes: 35,
      actions: 1,
      conditional: false,
      effect: "Add a $25 charge for a verified transport improvement.",
    },
    {
      id: "track",
      title: "Track and reflect weekly",
      mechanism: "action",
      cost: 0,
      minutes: 15,
      actions: 1,
      conditional: false,
      effect: "Add a private weekly reflection reminder.",
    },
    {
      id: "align",
      title: "Align on a shared action",
      mechanism: "coalition",
      cost: 0,
      minutes: 25,
      actions: 1,
      conditional: true,
      effect: "Prepare a shared planning request for invited participants.",
    },
    {
      id: "policy",
      title: "Support policy implementation",
      mechanism: "trade",
      cost: 25,
      minutes: 50,
      actions: 1,
      conditional: false,
      effect: "Add a $25 charge for a verified policy milestone.",
    },
  ]);

  const ui = {
    open: false,
    reviewOpen: false,
    confirmedEffects: new Set(),
  };

  const originalNowPlan = nowPlan;
  const formatMoney = accountingApi.formatMoney;
  const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim().toLowerCase();
  const periodLabel = (period) => period === "week" ? "This week" : "This month";
  const meterWidth = (used, limit) => `${Math.min(100, limit ? used / limit * 100 : used ? 100 : 0)}%`;

  function currentModel() {
    const snapshot = accountingApi.getSnapshot();
    const period = snapshot.activePeriod;
    const periodState = snapshot.periods[period];
    const selected = ACTIONS.filter((item) => periodState.selectedIds.includes(item.id));
    const totals = accountingApi.buildRouteTotals(selected, snapshot);
    return { snapshot, period, periodState, selected, totals };
  }

  function mechanismMark(mechanism, compact = false) {
    const details = MECHANISMS[mechanism];
    return `<span class="mt-cr-mark is-${details.tone}${compact ? " is-compact" : ""}"><span aria-hidden="true">${details.symbol}</span>${compact ? "" : `<span>${details.short}</span>`}</span>`;
  }

  function addedMoneyForItem(item, totals) {
    if (item.id === "redirect") return totals.redirect.addedMoney;
    return item.cost;
  }

  function actionMeta(item, totals) {
    if (item.id === "redirect") {
      return `${totals.redirect.moneyLabel} · ${item.minutes} min setup · ${item.actions} added action`;
    }
    const conditional = item.conditional ? " · conditional maximum" : "";
    return `$${formatMoney(item.cost)} added money · ${item.minutes} min · ${item.actions} action${conditional}`;
  }

  function renderReservoir({ key, label, used, limit, unit, maximum, step }) {
    const isOver = used > limit;
    const displayedUsed = key === "money" ? `$${formatMoney(used)}` : `${used}${unit}`;
    const displayedLimit = key === "money" ? `$${formatMoney(limit)}` : `${limit}${unit}`;
    return `<div class="mt-cr-reservoir" data-mt-cr-meter="${key}">
      <div class="mt-cr-vessel"><div class="mt-cr-fill is-${key}${isOver ? " is-over" : ""}" style="height:${meterWidth(used, limit)}"></div><strong>${displayedUsed}</strong></div>
      <div class="mt-cr-reservoir-copy">
        <span class="eyebrow">${label}</span>
        <div class="mt-cr-range-head"><label for="mt-cr-limit-${key}">Available</label><output>${displayedLimit}</output></div>
        <input id="mt-cr-limit-${key}" data-mt-cr-input="limit" data-resource="${key}" type="range" min="${key === "money" ? 0 : key === "minutes" ? 5 : 1}" max="${maximum}" step="${step}" value="${limit}">
        <p>${key === "money" ? "Only marginal money counts; conditional pledges count at maximum exposure." : key === "minutes" ? "Only additional active time counts; waiting time is excluded." : "Only additional commitments created by this route count."}</p>
      </div>
    </div>`;
  }

  function renderLedger(model) {
    const { period, periodState, totals } = model;
    const declaration = periodState.declaration;
    const redirect = totals.redirect;
    const redirectSelected = totals.redirectSelected;

    return `<section class="mt-cr-ledger" aria-labelledby="mt-cr-ledger-title">
      <div class="mt-cr-ledger-head">
        <div><span class="eyebrow orange">BASELINE FLOW · KEPT SEPARATE</span><h3 id="mt-cr-ledger-title">Planned-donation ledger</h3><p>A donation you would make anyway is not an added resource. Confirm that baseline for this exact period; top-ups, fees, setup time, and extra actions still count.</p></div>
        <div class="mt-cr-periods" role="group" aria-label="Budget period">
          ${["week", "month"].map((item) => `<button type="button" data-mt-cr-action="period" data-period="${item}" aria-pressed="${period === item}" class="${period === item ? "is-active" : ""}">${periodLabel(item)}</button>`).join("")}
        </div>
      </div>
      <div class="mt-cr-ledger-grid">
        <div class="mt-cr-baseline-declaration">
          <span class="eyebrow">WAS THIS $20 ALREADY PLANNED?</span>
          <div class="mt-cr-declaration-options" role="group" aria-label="Planned donation baseline">
            ${[
              ["all", "All"],
              ["part", "Part"],
              ["none", "None"],
            ].map(([status, label]) => `<button type="button" data-mt-cr-action="declaration" data-status="${status}" aria-pressed="${declaration.status === status}" class="${declaration.status === status ? "is-active" : ""}">${label}</button>`).join("")}
          </div>
          ${declaration.status === "part" ? `<label class="mt-cr-part-input"><span>Amount already planned in ${periodLabel(period).toLowerCase()}</span><span>$ <input data-mt-cr-input="baseline-part" aria-label="Amount already planned ${periodLabel(period).toLowerCase()}" type="number" min="0" max="20" step="1" value="${declaration.amount}"></span></label>` : ""}
          <p class="mt-cr-declaration-note ${declaration.status === "unconfirmed" ? "is-warning" : ""}">${redirect.declarationLabel}. ${declaration.status === "unconfirmed" ? "The full principal remains inside the added-money ceiling until you choose All, Part, or None." : "This declaration applies only to the period shown."}</p>
          <small class="mono">${totals.periodKey}</small>
        </div>
        <dl class="mt-cr-ledger-facts">
          <div><dt>Proposed redirect</dt><dd>$${formatMoney(redirect.totalRedirected)}</dd></div>
          <div><dt>Confirmed baseline used</dt><dd>$${formatMoney(redirect.confirmedBaseline)}</dd></div>
          <div><dt>Unmatched principal</dt><dd>$${formatMoney(redirect.unmatchedPrincipal)}</dd></div>
          <div><dt>Added-money result</dt><dd>$${formatMoney(redirectSelected ? redirect.addedMoney : 0)}</dd></div>
        </dl>
        <div class="mt-cr-adjustments">
          <label><span>Optional top-up</span><span>$ <input data-mt-cr-input="top-up" aria-label="Additional donation top-up" type="number" min="0" max="500" step="1" value="${periodState.topUp}"></span><small>Always added money</small></label>
          <label><span>Incremental fee</span><span>$ <input data-mt-cr-input="fee" aria-label="Incremental fee" type="number" min="0" max="100" step="0.25" value="${periodState.fee}"></span><small>Always added money</small></label>
        </div>
      </div>
      <div class="mt-cr-ledger-result ${redirect.confirmed ? "is-confirmed" : "is-unconfirmed"}" aria-live="polite"><strong>${redirectSelected ? redirect.moneyLabel : "Redirect not selected"}</strong><span>${redirectSelected ? redirect.unmatchedLabel : "No planned-donation principal is being used by this draft."}</span></div>
    </section>`;
  }

  function renderLane(mechanism, model) {
    const details = MECHANISMS[mechanism];
    const options = ACTIONS.filter((item) => item.mechanism === mechanism).slice(0, 2);
    return `<section class="mt-cr-lane tone-${details.tone}">
      <header>${mechanismMark(mechanism)}<span>${options.length} option${options.length === 1 ? "" : "s"}</span></header>
      <div class="mt-cr-lane-actions">${options.map((item) => {
        const selected = model.periodState.selectedIds.includes(item.id);
        return `<button type="button" data-mt-cr-action="toggle-item" data-item-id="${item.id}" aria-pressed="${selected}" class="mt-cr-lane-action${selected ? " is-selected" : ""}">
          <span class="mt-cr-selection" aria-hidden="true">${selected ? "✓" : "+"}</span>
          <strong>${item.title}</strong>
          <small>${actionMeta(item, model.totals)}</small>
        </button>`;
      }).join("")}</div>
    </section>`;
  }

  function reviewEffects(model) {
    const effects = model.selected.map((item) => ({
      id: item.id,
      title: item.title,
      mechanism: item.mechanism,
      detail: item.id === "redirect"
        ? `Only unmatched donation principal is counted here; any top-up and fee are itemized separately. ${item.effect} Five setup minutes and one added action remain in the budget.`
        : item.effect,
      money: item.id === "redirect"
        ? `$${formatMoney(model.totals.redirect.redirectPrincipal)} principal · $${formatMoney(model.totals.redirect.unmatchedPrincipal)} added principal`
        : `$${formatMoney(item.cost)} ${item.conditional ? "conditional maximum" : item.cost ? "charge" : "added money"}`,
    }));
    if (model.totals.redirectSelected && model.periodState.topUp > 0) {
      effects.push({
        id: "redirect-top-up",
        title: "Additional donation top-up",
        mechanism: "redirect",
        detail: "This amount was not part of the prior donation plan and remains inside the added-money ceiling.",
        money: `$${formatMoney(model.periodState.topUp)} added money`,
      });
    }
    if (model.totals.redirectSelected && model.periodState.fee > 0) {
      effects.push({
        id: "redirect-fee",
        title: "Incremental processing fee",
        mechanism: "redirect",
        detail: "This incremental fee remains inside the added-money ceiling.",
        money: `$${formatMoney(model.periodState.fee)} added money`,
      });
    }
    return effects;
  }

  function renderReview(model) {
    if (!ui.reviewOpen) return "";
    const effects = reviewEffects(model);
    const allConfirmed = effects.length > 0 && effects.every((effect) => ui.confirmedEffects.has(effect.id));
    return `<div class="mt-cr-modal-backdrop" data-mt-cr-modal="true" role="presentation">
      <section class="mt-cr-review" role="dialog" aria-modal="true" aria-labelledby="mt-cr-review-title">
        <button class="mt-cr-review-close" type="button" data-mt-cr-action="close-review" aria-label="Close final review">×</button>
        <span class="eyebrow blue">FINAL REVIEW · ITEMIZED EFFECTS</span>
        <h2 id="mt-cr-review-title">Review what this route would add.</h2>
        <p>The planned-donation principal remains visible as baseline flow. It is excluded from the added-resource ceiling only to the extent you confirmed it for ${periodLabel(model.period).toLowerCase()}.</p>
        <div class="mt-cr-effect-list">${effects.map((effect, index) => `<label class="mt-cr-effect">
          <input type="checkbox" data-mt-cr-input="effect" data-effect-id="${effect.id}" ${ui.confirmedEffects.has(effect.id) ? "checked" : ""}>
          <span class="mt-cr-custom-check" aria-hidden="true">✓</span>
          <span class="mt-cr-effect-number">${String(index + 1).padStart(2, "0")}</span>
          <span class="mt-cr-effect-copy">${mechanismMark(effect.mechanism)}<strong>${effect.title}</strong><small>${effect.detail}</small></span>
          <span class="mt-cr-effect-money">${effect.money}</span>
        </label>`).join("")}</div>
        <div class="mt-cr-review-totals">
          <div><span>Planned donation used</span><strong>$${formatMoney(model.totals.plannedDonation)}</strong></div>
          <div><span>Added-money maximum</span><strong>$${formatMoney(model.totals.added.money)}</strong></div>
          <div><span>Added active time</span><strong>${model.totals.added.minutes} min</strong></div>
          <div><span>Added actions</span><strong>${model.totals.added.actions}</strong></div>
        </div>
        <footer><p>Route-review preview only. Confirming here does not charge, pledge, invite, or create a durable commitment.</p><button class="btn" type="button" data-mt-cr-action="close-review">Keep editing</button><button class="btn primary" type="button" data-mt-cr-action="confirm-review" ${allConfirmed ? "" : "disabled"}>Confirm review</button></footer>
      </section>
    </div>`;
  }

  function customRouteView() {
    const model = currentModel();
    const { periodState, selected, totals } = model;
    const anyOver = Object.values(totals.over).some(Boolean);

    return `<section class="mt-cr-page" data-mt-custom-route="resource-mix" data-period="${model.period}">
      <header class="mt-cr-header">
        <div><span class="eyebrow blue">CUSTOM ROUTE · RESOURCE MIX WORKBENCH</span><h2>Build with only what is additional.</h2><p>Keep planned donations visible as baseline flow, then budget only the extra money, active time, and actions this route creates.</p></div>
        <button class="btn" type="button" data-mt-cr-action="back">← Back to routes</button>
      </header>
      <div class="mt-cr-workbench panel">
        ${renderLedger(model)}
        <section class="mt-cr-added-resources" aria-labelledby="mt-cr-added-title">
          <div class="mt-cr-section-heading"><div><span class="eyebrow blue">ADDED RESOURCES</span><h3 id="mt-cr-added-title">What this route adds to your ${model.period}.</h3></div><p>Baseline principal is not mixed into these meters after confirmation.</p></div>
          <div class="mt-cr-reservoirs">
            ${renderReservoir({ key: "money", label: "ADDED-MONEY CEILING", used: totals.added.money, limit: totals.limits.money, unit: "", maximum: 120, step: 5 })}
            ${renderReservoir({ key: "minutes", label: "ACTIVE-TIME CEILING", used: totals.added.minutes, limit: totals.limits.minutes, unit: "m", maximum: 180, step: 5 })}
            ${renderReservoir({ key: "actions", label: "ADDED-ACTION CEILING", used: totals.added.actions, limit: totals.limits.actions, unit: "", maximum: 12, step: 1 })}
          </div>
        </section>
        <section class="mt-cr-mechanisms" aria-label="Mechanism options">${Object.keys(MECHANISMS).map((mechanism) => renderLane(mechanism, model)).join("")}</section>
        <footer class="mt-cr-footer">
          <div class="mt-cr-assembled"><span class="eyebrow">ASSEMBLED ROUTE · ${selected.length} STEP${selected.length === 1 ? "" : "S"}</span><div class="mt-cr-route-strip">${selected.length ? selected.map((item, index) => `<div class="tone-${MECHANISMS[item.mechanism].tone}"><span>${index + 1}</span><p>${item.title}</p><small>${item.id === "redirect" ? totals.redirect.moneyLabel : `$${formatMoney(addedMoneyForItem(item, totals))} added`}</small></div>`).join("") : `<p class="mt-cr-empty">Select actions above or fit a route automatically.</p>`}</div></div>
          <div class="mt-cr-actions">${anyOver ? `<p class="mt-cr-over" role="alert">This draft exceeds ${Object.entries(totals.over).filter(([, value]) => value).map(([key]) => key === "minutes" ? "time" : key).join(" and ")} ceiling${Object.values(totals.over).filter(Boolean).length > 1 ? "s" : ""}.</p>` : ""}<button class="btn ghost" type="button" data-mt-cr-action="reset">Reset ${model.period}</button><button class="btn" type="button" data-mt-cr-action="clear">Clear</button><button class="btn" type="button" data-mt-cr-action="fit">Fit automatically</button><button class="btn primary" type="button" data-mt-cr-action="review" ${selected.length === 0 || anyOver ? "disabled" : ""}>Review mix</button></div>
        </footer>
      </div>
      ${renderReview(model)}
    </section>`;
  }

  window.nowPlan = function enhancedNowPlan() {
    if (ui.open) return customRouteView();
    return originalNowPlan().replace(
      '<button class="btn">Custom route</button>',
      '<button class="btn" type="button" data-mt-cr-action="open">Custom route</button>',
    );
  };

  function updateCurrentPeriod(patch) {
    const snapshot = accountingApi.getSnapshot();
    accountingApi.updatePeriod(snapshot.activePeriod, patch);
    ui.reviewOpen = false;
    ui.confirmedEffects.clear();
    render();
  }

  function toggleItem(itemId) {
    const snapshot = accountingApi.getSnapshot();
    const period = snapshot.activePeriod;
    const current = snapshot.periods[period].selectedIds;
    const selectedIds = current.includes(itemId)
      ? current.filter((id) => id !== itemId)
      : [...current, itemId];
    updateCurrentPeriod({ selectedIds });
  }

  function fitAutomatically() {
    const snapshot = accountingApi.getSnapshot();
    const period = snapshot.activePeriod;
    const priority = ["redirect", "pool", "invite", "diet", "review", "align", "transport", "policy"];
    const selectedIds = [];
    for (const id of priority) {
      const candidateIds = [...selectedIds, id];
      const candidateItems = ACTIONS.filter((item) => candidateIds.includes(item.id));
      const candidate = accountingApi.buildRouteTotals(candidateItems, {
        ...snapshot,
        periods: {
          ...snapshot.periods,
          [period]: { ...snapshot.periods[period], selectedIds: candidateIds },
        },
      });
      if (!Object.values(candidate.over).some(Boolean)) selectedIds.push(id);
      if (selectedIds.length === 4) break;
    }
    updateCurrentPeriod({ selectedIds });
    if (typeof toast === "function") toast(`Built a ${period} route inside the added-resource ceilings.`);
  }

  document.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    const action = button.dataset.mtCrAction;
    if (!action && normalizeText(button.textContent) !== "custom route") return;

    if (action === "open" || (!action && normalizeText(button.textContent) === "custom route")) {
      ui.open = true;
      ui.reviewOpen = false;
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (action === "back") {
      ui.open = false;
      ui.reviewOpen = false;
      render();
      return;
    }
    if (action === "period") {
      accountingApi.setActivePeriod(button.dataset.period);
      ui.reviewOpen = false;
      ui.confirmedEffects.clear();
      render();
      return;
    }
    if (action === "declaration") {
      const model = currentModel();
      const status = button.dataset.status;
      const amount = status === "all"
        ? model.totals.redirect.redirectPrincipal
        : status === "part"
          ? Math.min(10, model.totals.redirect.redirectPrincipal)
          : 0;
      updateCurrentPeriod({ declaration: { status, amount } });
      return;
    }
    if (action === "toggle-item") {
      toggleItem(button.dataset.itemId);
      return;
    }
    if (action === "clear") {
      updateCurrentPeriod({ selectedIds: [] });
      return;
    }
    if (action === "fit") {
      fitAutomatically();
      return;
    }
    if (action === "reset") {
      const period = accountingApi.getSnapshot().activePeriod;
      accountingApi.resetPeriod(period);
      ui.reviewOpen = false;
      ui.confirmedEffects.clear();
      render();
      if (typeof toast === "function") toast(`${periodLabel(period)} route resources reset.`);
      return;
    }
    if (action === "review") {
      ui.reviewOpen = true;
      ui.confirmedEffects.clear();
      render();
      return;
    }
    if (action === "close-review") {
      ui.reviewOpen = false;
      ui.confirmedEffects.clear();
      render();
      return;
    }
    if (action === "confirm-review") {
      const effects = reviewEffects(currentModel());
      if (!effects.every((effect) => ui.confirmedEffects.has(effect.id))) return;
      ui.reviewOpen = false;
      ui.confirmedEffects.clear();
      render();
      if (typeof toast === "function") toast("Route reviewed — nothing was charged, pledged, or sent.");
    }
  });

  function handleResourceInput(event, commitNumericFields) {
    const input = event.target.closest("[data-mt-cr-input]");
    if (!input) return;
    const kind = input.dataset.mtCrInput;
    const isImmediate = kind === "limit" || kind === "effect";
    if (commitNumericFields === isImmediate) return;
    const value = Number(input.value);
    const snapshot = accountingApi.getSnapshot();
    const period = snapshot.activePeriod;

    if (kind === "baseline-part") {
      accountingApi.updatePeriod(period, { declaration: { status: "part", amount: value } });
    } else if (kind === "top-up") {
      accountingApi.updatePeriod(period, { topUp: value });
    } else if (kind === "fee") {
      accountingApi.updatePeriod(period, { fee: value });
    } else if (kind === "limit") {
      accountingApi.updatePeriod(period, { limits: { [input.dataset.resource]: value } });
    } else if (kind === "effect") {
      if (input.checked) ui.confirmedEffects.add(input.dataset.effectId);
      else ui.confirmedEffects.delete(input.dataset.effectId);
    }
    render();
  }

  document.addEventListener("input", (event) => handleResourceInput(event, false));
  document.addEventListener("change", (event) => handleResourceInput(event, true));

  if (state.now === "plan") render();
})();
