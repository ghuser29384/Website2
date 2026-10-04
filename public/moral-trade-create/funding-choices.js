(() => {
  "use strict";
  const grid = document.getElementById("fundModeGrid");
  if (!grid) return;
  const revealSelection = () => {
    const selected = grid.querySelector('[aria-pressed="true"]');
    const group = selected?.closest("details");
    if (group) group.open = true;
  };
  revealSelection();
  new MutationObserver(revealSelection).observe(grid, {
    attributes: true, attributeFilter: ["aria-pressed"], subtree: true,
  });
})();
