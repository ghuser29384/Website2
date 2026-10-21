// Native disclosure works before scripts load; add keyboard dismissal and focus exit.
(() => {
  for (const menu of document.querySelectorAll(".header-more")) {
    menu.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        menu.open = false;
        menu.querySelector("summary")?.focus();
      }
    });
    menu.addEventListener("focusout", (event) => {
      if (!menu.contains(event.relatedTarget)) menu.open = false;
    });
  }
})();
