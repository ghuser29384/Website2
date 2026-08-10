(function connectDiscoverNavigation() {
  "use strict";

  if (window.__MT_DISCOVER_PRODUCT_NAVIGATION__) return;
  window.__MT_DISCOVER_PRODUCT_NAVIGATION__ = true;

  const STYLE_ID = "mt-discover-home-alignment";
  const STYLE_HREF = "/moral-trade-discover-home-alignment.css?v=20260810";
  const MOBILE_STYLE_ID = "mt-discover-home-mobile-command";
  const NAV_ITEMS = [
    { label: "Feed", path: "/feed" },
    { label: "Discover", path: "/discover", active: true },
    { label: "Controls", path: "/trade-controls" },
    { label: "Trade", path: "/trades/new" },
    { label: "Commitments", path: "/commitments" },
    { label: "Evidence", path: "/evidence" },
  ];

  let scheduled = false;

  function ensureStyles() {
    let stylesheet = document.getElementById(STYLE_ID);
    if (!stylesheet) {
      stylesheet = document.createElement("link");
      stylesheet.id = STYLE_ID;
      stylesheet.rel = "stylesheet";
      stylesheet.href = STYLE_HREF;
      document.head.append(stylesheet);
    }

    if (!document.getElementById(MOBILE_STYLE_ID)) {
      const mobileStyle = document.createElement("style");
      mobileStyle.id = MOBILE_STYLE_ID;
      mobileStyle.textContent = `
        @media (max-width: 760px) {
          .command-trigger {
            flex: 0 0 38px;
            width: 38px;
            padding: 0;
            font-size: 0;
          }
          .command-trigger::before {
            font-size: 17px;
          }
        }
      `;
      document.head.append(mobileStyle);
    }

    return stylesheet;
  }

  function routeTo(path) {
    return function handleProductRoute(event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.location.assign(path);
    };
  }

  function canonicalNav(nav) {
    if (!nav) return;
    const current = [...nav.querySelectorAll("a, button")];
    const template = current[0];
    if (!template) return;

    const fragment = document.createDocumentFragment();
    for (const item of NAV_ITEMS) {
      const control = document.createElement("a");
      control.className = template.className;
      control.textContent = item.label;
      control.href = item.path;
      control.dataset.mtProductRoute = item.path;
      if (item.active) {
        control.classList.add("active");
        control.setAttribute("aria-current", "page");
      } else {
        control.classList.remove("active");
        control.removeAttribute("aria-current");
        control.addEventListener("click", routeTo(item.path), true);
      }
      fragment.append(control);
    }
    nav.replaceChildren(fragment);
    nav.dataset.mtCanonicalNavigation = "true";
  }

  function openCommand(event) {
    event.preventDefault();
    const input = document.getElementById("command-input");
    const main = document.querySelector(".discover-main");
    if (main?.classList.contains("command-collapsed")) {
      main.classList.remove("command-collapsed");
    }
    input?.scrollIntoView({ block: "center", behavior: "smooth" });
    window.requestAnimationFrame(() => input?.focus({ preventScroll: true }));
  }

  function patchAccount(account) {
    if (!account) return;
    let command = account.querySelector(".command-trigger");
    if (!command) {
      command = document.createElement("button");
      command.type = "button";
      command.className = "command-trigger";
      command.textContent = "Command";
      command.setAttribute("aria-label", "Focus Discover command");
      command.addEventListener("click", openCommand);
      account.prepend(command);
    }

    const avatar = account.querySelector(".avatar");
    if (avatar) {
      avatar.href = "/profile";
      avatar.setAttribute("aria-label", avatar.getAttribute("aria-label") || "Open account profile");
    }
    account.dataset.mtCanonicalAccount = "true";
  }

  function patch() {
    ensureStyles();
    const nav = document.querySelector(".app-header .top-nav");
    if (nav && nav.dataset.mtCanonicalNavigation !== "true") canonicalNav(nav);
    patchAccount(document.querySelector(".app-header .account"));
  }

  function schedulePatch() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(() => {
      scheduled = false;
      patch();
    });
  }

  ensureStyles();
  schedulePatch();
  const observer = new MutationObserver(schedulePatch);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("pageshow", schedulePatch);
})();
