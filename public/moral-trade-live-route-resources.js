(function installRouteResourceAccounting() {
  "use strict";

  const REDIRECT_PRINCIPAL = 20;
  const PERIODS = Object.freeze(["week", "month"]);
  const DEFAULT_SELECTED_IDS = Object.freeze(["redirect", "pool", "invite"]);
  const DEFAULT_PERIODS = Object.freeze({
    week: Object.freeze({
      limits: Object.freeze({ money: 30, minutes: 60, actions: 4 }),
      declaration: Object.freeze({ status: "unconfirmed", amount: 0 }),
      topUp: 0,
      fee: 0,
      selectedIds: DEFAULT_SELECTED_IDS,
    }),
    month: Object.freeze({
      limits: Object.freeze({ money: 80, minutes: 120, actions: 8 }),
      declaration: Object.freeze({ status: "unconfirmed", amount: 0 }),
      topUp: 0,
      fee: 0,
      selectedIds: DEFAULT_SELECTED_IDS,
    }),
  });

  const DECLARATION_STATUSES = new Set(["unconfirmed", "all", "part", "none"]);
  const subscribers = new Set();

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));
  const money = (value) => Math.round((Number(value) || 0) * 100) / 100;
  const formatMoney = (value) => {
    const normalized = money(value);
    return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(2);
  };

  function periodKey(period, nowValue) {
    const now = nowValue ? new Date(nowValue) : new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    if (period === "month") return `month:${year}-${month}`;

    const utcDay = new Date(Date.UTC(year, now.getMonth(), now.getDate()));
    const day = utcDay.getUTCDay() || 7;
    utcDay.setUTCDate(utcDay.getUTCDate() + 4 - day);
    const isoYear = utcDay.getUTCFullYear();
    const yearStart = new Date(Date.UTC(isoYear, 0, 1));
    const week = Math.ceil((((utcDay - yearStart) / 86_400_000) + 1) / 7);
    return `week:${isoYear}-W${String(week).padStart(2, "0")}`;
  }

  function normalizeDeclaration(value) {
    const candidate = value && typeof value === "object" ? value : {};
    const status = DECLARATION_STATUSES.has(candidate.status)
      ? candidate.status
      : "unconfirmed";
    const numericAmount = Number(candidate.amount);
    let amount = money(clamp(Number.isFinite(numericAmount) ? numericAmount : 0, 0, 500));

    if (status === "all" && amount === 0) amount = REDIRECT_PRINCIPAL;
    if (status === "none" || status === "unconfirmed") amount = 0;

    return { status, amount };
  }

  function normalizeLimits(value, period) {
    const defaults = DEFAULT_PERIODS[period].limits;
    const candidate = value && typeof value === "object" ? value : {};
    const numericMoney = Number(candidate.money);
    const numericMinutes = Number(candidate.minutes);
    const numericActions = Number(candidate.actions);

    return {
      money: Math.round(clamp(Number.isFinite(numericMoney) ? numericMoney : defaults.money, 0, 500)),
      minutes: Math.round(clamp(Number.isFinite(numericMinutes) ? numericMinutes : defaults.minutes, 5, 600)),
      actions: Math.round(clamp(Number.isFinite(numericActions) ? numericActions : defaults.actions, 1, 30)),
    };
  }

  function normalizeSelectedIds(value) {
    if (!Array.isArray(value)) return [...DEFAULT_SELECTED_IDS];
    return [...new Set(value.filter((item) => typeof item === "string"))];
  }

  function normalizePeriodDetails(value, period) {
    const candidate = value && typeof value === "object" ? value : {};
    const numericTopUp = Number(candidate.topUp);
    const numericFee = Number(candidate.fee);

    return {
      limits: normalizeLimits(candidate.limits, period),
      declaration: normalizeDeclaration(candidate.declaration),
      topUp: money(clamp(Number.isFinite(numericTopUp) ? numericTopUp : 0, 0, 500)),
      fee: money(clamp(Number.isFinite(numericFee) ? numericFee : 0, 0, 100)),
      selectedIds: normalizeSelectedIds(candidate.selectedIds),
    };
  }

  function normalizePeriod(value, period, nowValue) {
    const key = periodKey(period, nowValue);
    const candidate = value && typeof value === "object" && value.periodKey === key
      ? value
      : {};
    return {
      periodKey: key,
      ...normalizePeriodDetails(candidate, period),
    };
  }

  function normalizeState(value, nowValue) {
    const candidate = value && typeof value === "object" ? value : {};
    const periods = candidate.periods && typeof candidate.periods === "object"
      ? candidate.periods
      : {};

    return {
      version: 1,
      activePeriod: PERIODS.includes(candidate.activePeriod) ? candidate.activePeriod : "month",
      periods: {
        week: normalizePeriod(periods.week, "week", nowValue),
        month: normalizePeriod(periods.month, "month", nowValue),
      },
    };
  }

  function buildRedirectAccounting(value, period = "month", principal = REDIRECT_PRINCIPAL) {
    const normalizedPeriod = PERIODS.includes(period) ? period : "month";
    const details = normalizePeriodDetails(value, normalizedPeriod);
    const declaration = details.declaration;
    const confirmed = declaration.status !== "unconfirmed";
    const numericPrincipal = Number(principal);
    const redirectPrincipal = money(Math.max(0, Number.isFinite(numericPrincipal) ? numericPrincipal : 0));
    const declaredBaseline = confirmed ? declaration.amount : 0;
    const confirmedBaseline = money(Math.min(redirectPrincipal, declaredBaseline));
    const unmatchedPrincipal = money(redirectPrincipal - confirmedBaseline);
    const totalRedirected = money(redirectPrincipal + details.topUp);
    const addedMoney = money(unmatchedPrincipal + details.topUp + details.fee);
    const periodLabel = normalizedPeriod === "week" ? "week" : "month";
    const moneyLabel = confirmed
      ? `$${formatMoney(totalRedirected)} redirected · $${formatMoney(addedMoney)} added money`
      : `$${formatMoney(totalRedirected)} redirected · $${formatMoney(addedMoney)} counted until baseline confirmed`;

    let declarationLabel = `Not confirmed for this ${periodLabel}`;
    if (declaration.status === "all") {
      declarationLabel = `All $${formatMoney(declaredBaseline)} assessed was already planned`;
    }
    if (declaration.status === "part") {
      declarationLabel = `$${formatMoney(confirmedBaseline)} of $${formatMoney(redirectPrincipal)} was already planned`;
    }
    if (declaration.status === "none") {
      declarationLabel = `None of the $${formatMoney(redirectPrincipal)} was already planned`;
    }

    let unmatchedLabel = `$${formatMoney(unmatchedPrincipal)} awaiting baseline confirmation`;
    if (confirmed && unmatchedPrincipal === 0) unmatchedLabel = "$0 unmatched";
    if (confirmed && unmatchedPrincipal > 0) {
      unmatchedLabel = `$${formatMoney(unmatchedPrincipal)} unmatched and counted as added money`;
    }

    return {
      period: normalizedPeriod,
      confirmed,
      status: declaration.status,
      redirectPrincipal,
      declaredBaseline,
      confirmedBaseline,
      unusedDeclaredBaseline: money(Math.max(0, declaredBaseline - confirmedBaseline)),
      unmatchedPrincipal,
      topUp: details.topUp,
      fee: details.fee,
      totalRedirected,
      addedMoney,
      setupMinutes: 5,
      setupActions: 1,
      moneyLabel,
      declarationLabel,
      unmatchedLabel,
    };
  }

  function buildRouteTotals(items, value, nowValue) {
    const normalized = normalizeState(value, nowValue);
    const period = normalized.activePeriod;
    const periodState = normalized.periods[period];
    const selected = Array.isArray(items) ? items : [];
    const redirectPrincipal = money(selected.reduce((sum, item) => {
      if (!item) return sum;
      if (Number(item.redirectPrincipal) > 0) return sum + Number(item.redirectPrincipal);
      return item.id === "redirect" ? sum + REDIRECT_PRINCIPAL : sum;
    }, 0));
    const redirectSelected = redirectPrincipal > 0;
    const redirect = buildRedirectAccounting(periodState, period, redirectPrincipal);
    const totals = selected.reduce(
      (sum, item) => {
        if (!item || Number(item.redirectPrincipal) > 0 || item.id === "redirect") return sum;
        return {
          money: money(sum.money + (Number(item.cost) || 0)),
          minutes: sum.minutes + Math.max(0, Number(item.minutes) || 0),
          actions: sum.actions + Math.max(0, Number(item.actions) || 0),
        };
      },
      { money: 0, minutes: 0, actions: 0 },
    );
    const otherAddedMoney = totals.money;

    if (redirectSelected) {
      totals.money = money(totals.money + redirect.addedMoney);
      totals.minutes += redirect.setupMinutes;
      totals.actions += redirect.setupActions;
    }

    return {
      period,
      periodKey: periodState.periodKey,
      limits: { ...periodState.limits },
      selectedCount: selected.length,
      redirectSelected,
      redirect,
      added: totals,
      cashOutlay: money(
        otherAddedMoney + (redirectSelected
          ? redirect.redirectPrincipal + redirect.topUp + redirect.fee
          : 0),
      ),
      baselineFlow: {
        declared: redirectSelected ? redirect.declaredBaseline : 0,
        excluded: redirectSelected ? redirect.confirmedBaseline : 0,
        unused: redirectSelected ? redirect.unusedDeclaredBaseline : 0,
        unmatched: redirectSelected ? redirect.unmatchedPrincipal : 0,
      },
      plannedDonation: redirectSelected ? redirect.confirmedBaseline : 0,
      redirected: redirectSelected ? redirect.totalRedirected : 0,
      over: {
        money: totals.money > periodState.limits.money,
        minutes: totals.minutes > periodState.limits.minutes,
        actions: totals.actions > periodState.limits.actions,
      },
    };
  }

  // Baseline declarations are private, account-specific financial context. Keep
  // the draft in memory so a different account on the same browser can never
  // inherit a prior user's declaration, limits, or route selections.
  let currentState = normalizeState(null);

  function rollToCurrentPeriods() {
    const normalized = normalizeState(currentState);
    if (JSON.stringify(normalized) !== JSON.stringify(currentState)) currentState = normalized;
  }

  function notify() {
    const snapshot = clone(currentState);
    subscribers.forEach((subscriber) => subscriber(snapshot));
  }

  function replaceState(value) {
    currentState = normalizeState(value);
    notify();
    return clone(currentState);
  }

  function updatePeriod(period, patch) {
    rollToCurrentPeriods();
    const normalizedPeriod = PERIODS.includes(period) ? period : currentState.activePeriod;
    const current = currentState.periods[normalizedPeriod];
    const nextPatch = patch && typeof patch === "object" ? patch : {};
    const next = {
      ...current,
      ...nextPatch,
      limits: nextPatch.limits ? { ...current.limits, ...nextPatch.limits } : current.limits,
      declaration: nextPatch.declaration
        ? { ...current.declaration, ...nextPatch.declaration }
        : current.declaration,
    };

    return replaceState({
      ...currentState,
      periods: {
        ...currentState.periods,
        [normalizedPeriod]: next,
      },
    });
  }

  function setActivePeriod(period) {
    rollToCurrentPeriods();
    if (!PERIODS.includes(period)) return clone(currentState);
    return replaceState({ ...currentState, activePeriod: period });
  }

  function resetPeriod(period) {
    rollToCurrentPeriods();
    const normalizedPeriod = PERIODS.includes(period) ? period : currentState.activePeriod;
    return replaceState({
      ...currentState,
      periods: {
        ...currentState.periods,
        [normalizedPeriod]: normalizePeriod(null, normalizedPeriod),
      },
    });
  }

  function subscribe(subscriber) {
    if (typeof subscriber !== "function") return () => {};
    subscribers.add(subscriber);
    return () => subscribers.delete(subscriber);
  }

  window.__MT_ROUTE_RESOURCES_API__ = {
    redirectPrincipal: REDIRECT_PRINCIPAL,
    periods: [...PERIODS],
    periodKey,
    defaultState: (nowValue) => normalizeState(null, nowValue),
    normalizeState,
    buildRedirectAccounting,
    buildRouteTotals,
    formatMoney,
    getSnapshot: () => {
      rollToCurrentPeriods();
      return clone(currentState);
    },
    replaceState,
    updatePeriod,
    setActivePeriod,
    resetPeriod,
    subscribe,
  };
})();
