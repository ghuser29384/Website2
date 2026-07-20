(() => {
  "use strict";

  const API_NAME = "MoralTradeDiscoverLocalTime";
  const MONITOR_KEY = "__moralTradeDiscoverLocalTimeMonitor";
  const DATE_CHANGE_EVENT = "moral-trade:local-date-change";
  const TODAY_SELECTOR = "[data-mt-discover-local-today]";
  const DAY_MS = 86_400_000;

  const fixedTodaySource = "const today = new Date('2026-07-17T12:00:00-07:00');";
  const parseDatePhraseSource = `function parseDatePhrase(text) {
  const iso = text.match(/(?:before|by)\\s+(20\\d{2}-\\d{2}-\\d{2})/i);
  if (iso) return iso[1];
  const named = text.match(/(?:before|by)\\s+(january|february|march|april|may|june|july|august|september|october|november|december)\\s+(\\d{1,2})/i);
  if (!named) return '';
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const month = String(months.indexOf(named[1].toLowerCase()) + 1).padStart(2, '0');
  return \`2026-\${month}-\${String(Number(named[2])).padStart(2, '0')}\`;
}`;
  const daysUntilSource = `function daysUntil(date) {
  return Math.max(0, Math.ceil((new Date(\`\${date}T23:59:59\`) - today) / 86400000));
}`;
  const todayMarkupSource = '<div class="today-block">TODAY<b>July 17, 2026</b></div>';
  const renderSubscriptionSource = `store.subscribe(render);
store.syncCurrentUrl();`;

  function parseCalendarDate(value) {
    if (typeof value !== "string") return null;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const candidate = new Date(Date.UTC(year, month - 1, day));
    if (
      candidate.getUTCFullYear() !== year ||
      candidate.getUTCMonth() !== month - 1 ||
      candidate.getUTCDate() !== day
    ) {
      return null;
    }
    return { year, month, day };
  }

  function calendarDateFromInstant(value = new Date()) {
    const instant = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(instant.getTime())) return "";
    const year = String(instant.getFullYear()).padStart(4, "0");
    const month = String(instant.getMonth() + 1).padStart(2, "0");
    const day = String(instant.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function resolveCalendarDate(value) {
    if (typeof value === "string" && parseCalendarDate(value)) return value;
    return calendarDateFromInstant(value);
  }

  function calendarDayNumber(value) {
    const parts = parseCalendarDate(value);
    if (!parts) return null;
    return Math.floor(Date.UTC(parts.year, parts.month - 1, parts.day) / DAY_MS);
  }

  function todayISO(now = new Date()) {
    return calendarDateFromInstant(now);
  }

  function formatCalendarDate(value, options = { month: "long", day: "numeric", year: "numeric" }) {
    const parts = parseCalendarDate(value);
    if (!parts) return "";
    const instant = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12));
    return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(instant);
  }

  function formatToday(now = new Date()) {
    return formatCalendarDate(resolveCalendarDate(now));
  }

  function daysUntil(value, now = new Date()) {
    const targetDay = calendarDayNumber(value);
    const currentDay = calendarDayNumber(resolveCalendarDate(now));
    if (targetDay === null || currentDay === null) return 0;
    return Math.max(0, targetDay - currentDay);
  }

  function parseDatePhrase(text, now = new Date()) {
    if (typeof text !== "string") return "";

    const iso = text.match(/(?:before|by)\s+(20\d{2}-\d{2}-\d{2})/i);
    if (iso) return parseCalendarDate(iso[1]) ? iso[1] : "";

    const named = text.match(
      /(?:before|by)\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i,
    );
    if (!named) return "";

    const months = [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ];
    const month = months.indexOf(named[1].toLowerCase()) + 1;
    const day = Number(named[2]);
    const currentDate = resolveCalendarDate(now);
    const currentParts = parseCalendarDate(currentDate);
    const currentDay = calendarDayNumber(currentDate);
    if (!month || !currentParts || currentDay === null) return "";

    for (let year = currentParts.year; year <= currentParts.year + 8; year += 1) {
      const candidate = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const candidateDay = calendarDayNumber(candidate);
      if (candidateDay !== null && candidateDay >= currentDay) return candidate;
    }
    return "";
  }

  function replaceExactly(source, before, after, label) {
    const firstIndex = source.indexOf(before);
    if (firstIndex === -1) throw new Error(`Discover local-time transform could not find ${label}`);
    if (source.indexOf(before, firstIndex + before.length) !== -1) {
      throw new Error(`Discover local-time transform found multiple ${label} fragments`);
    }
    return `${source.slice(0, firstIndex)}${after}${source.slice(firstIndex + before.length)}`;
  }

  function transformSource(source) {
    if (typeof source !== "string" || !source) {
      throw new TypeError("Discover local-time transform requires a non-empty source string");
    }

    let localized = replaceExactly(
      source,
      fixedTodaySource,
      `const discoverLocalTime = window.${API_NAME};
if (!discoverLocalTime) throw new Error('Discover local-time runtime is unavailable');`,
      "fixed today declaration",
    );
    localized = replaceExactly(
      localized,
      parseDatePhraseSource,
      `function parseDatePhrase(text) {
  return discoverLocalTime.parseDatePhrase(text);
}`,
      "hard-coded date parser",
    );
    localized = replaceExactly(
      localized,
      daysUntilSource,
      `function daysUntil(date) {
  return discoverLocalTime.daysUntil(date);
}`,
      "fixed-clock deadline arithmetic",
    );
    localized = replaceExactly(
      localized,
      todayMarkupSource,
      '<div class="today-block">TODAY<b><time data-mt-discover-local-today datetime="${discoverLocalTime.todayISO()}">${discoverLocalTime.formatToday()}</time></b></div>',
      "hard-coded today heading",
    );
    localized = replaceExactly(
      localized,
      renderSubscriptionSource,
      `store.subscribe(render);
window.addEventListener('${DATE_CHANGE_EVENT}', () => {
  const state = store.getState();
  render(state, state);
});
store.syncCurrentUrl();`,
      "Discover render subscription",
    );
    return localized;
  }

  function refreshTodayElements(root = document) {
    const currentDate = todayISO();
    const currentLabel = formatCalendarDate(currentDate);
    root.querySelectorAll?.(TODAY_SELECTOR).forEach((element) => {
      if (element.getAttribute("datetime") !== currentDate) element.setAttribute("datetime", currentDate);
      if (element.textContent !== currentLabel) element.textContent = currentLabel;
    });
  }

  function stopMonitoring() {
    window[MONITOR_KEY]?.cleanup?.();
    delete window[MONITOR_KEY];
  }

  function startMonitoring() {
    stopMonitoring();
    let observedDate = todayISO();

    const checkForDateChange = () => {
      const currentDate = todayISO();
      refreshTodayElements();
      if (!currentDate || currentDate === observedDate) return;
      const previousDate = observedDate;
      observedDate = currentDate;
      window.dispatchEvent(
        new window.CustomEvent(DATE_CHANGE_EVENT, {
          detail: { currentDate, previousDate },
        }),
      );
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "hidden") checkForDateChange();
    };

    window.addEventListener("focus", checkForDateChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    const interval = window.setInterval(checkForDateChange, 60_000);
    const observer = typeof window.MutationObserver === "function"
      ? new window.MutationObserver(() => refreshTodayElements())
      : null;
    if (observer && document.documentElement) {
      observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    window[MONITOR_KEY] = {
      cleanup() {
        window.removeEventListener("focus", checkForDateChange);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.clearInterval(interval);
        observer?.disconnect();
      },
    };
    refreshTodayElements();
  }

  window[API_NAME]?.stopMonitoring?.();
  window[API_NAME] = Object.freeze({
    calendarDateFromInstant,
    daysUntil,
    formatCalendarDate,
    formatToday,
    parseDatePhrase,
    startMonitoring,
    stopMonitoring,
    todayISO,
    transformSource,
  });
  startMonitoring();
})();
