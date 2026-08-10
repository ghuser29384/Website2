(function replaceLegacyTradeAndCreateEntries() {
  "use strict";

  if (window.__MT_CREATE_ROUTE_REPLACEMENT__) return;
  window.__MT_CREATE_ROUTE_REPLACEMENT__ = true;

  const CREATE_HREF = "/trades/new";
  const CREATE_TRIGGER_SELECTOR = [
    '[data-page="trade"]',
    '[data-trade="build"]',
    '[data-trade="match"]',
    '[data-action="create"]',
    '[data-action="make-offer"]',
    '[data-action="publish"]',
    '[data-action="repeat"]',
  ].join(",");
  const DEALROOM_TRIGGER_SELECTOR = '[data-action="dealroom"], [data-trade="dealroom"]';

  let allowDealroomHashOnce = false;

  function openCreate() {
    window.location.assign(CREATE_HREF);
  }

  function replaceLegacyTradeHash() {
    if (window.location.hash !== "#trade") return;
    if (allowDealroomHashOnce) {
      allowDealroomHashOnce = false;
      return;
    }

    window.location.replace(CREATE_HREF);
  }

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      if (target.closest(DEALROOM_TRIGGER_SELECTOR)) {
        allowDealroomHashOnce = true;
        return;
      }

      if (!target.closest(CREATE_TRIGGER_SELECTOR)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      openCreate();
    },
    true,
  );

  window.addEventListener("hashchange", replaceLegacyTradeHash);
  replaceLegacyTradeHash();
})();
