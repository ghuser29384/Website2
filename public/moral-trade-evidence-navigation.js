(function () {
  "use strict";
  if (window.__MT_PUBLIC_EVIDENCE_NAV__) return;
  window.__MT_PUBLIC_EVIDENCE_NAV__ = true;
  let available = false;
  let pending = false;
  const rendered = new Map();
  function render() {
    for (const [template, nodes] of rendered) {
      if (available && template.isConnected) continue;
      for (const node of nodes) node.remove();
      rendered.delete(template);
    }
    if (!available) return;
    for (const template of document.querySelectorAll("template[data-mt-evidence-navigation]")) {
      if (rendered.has(template)) continue;
      const content = template.content.cloneNode(true);
      const nodes = [...content.childNodes];
      rendered.set(template, nodes);
      template.after(content);
    }
  }
  async function refresh() {
    if (document.visibilityState === "hidden") { available = false; render(); return; }
    if (pending) return;
    pending = true;
    try {
      const response = await fetch("/api/navigation/evidence", {
        credentials: "omit", cache: "no-store", signal: AbortSignal.timeout(5000),
      });
      const data = response.ok ? await response.json() : null;
      available = document.visibilityState !== "hidden" && data?.available === true;
    } catch { available = false; }
    finally { pending = false; render(); }
  }
  let queued = false;
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; render(); });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("focus", refresh);
  window.addEventListener("pageshow", refresh);
  document.addEventListener("visibilitychange", refresh);
  setInterval(refresh, 60000);
  refresh();
})();
