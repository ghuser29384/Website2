(function enhanceParetoLearningDiagnostics() {
  "use strict";

  if (window.__MT_PARETO_LEARNING_DIAGNOSTICS_ACTIVE__) return;
  window.__MT_PARETO_LEARNING_DIAGNOSTICS_ACTIVE__ = true;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function bootstrap() {
    const value = window.__MT_LIVE_NOW_BOOTSTRAP__;
    return value && typeof value === "object" ? value : {};
  }

  function modeCopy(data) {
    if (data.mode === "active") {
      return {
        label: "Active learned model",
        detail: "A learned ranking layer may reorder candidates, but the interface does not treat its internal scores as verified acceptance, completion, additionality, safety, or impact.",
      };
    }
    if (data.mode === "shadow") {
      return {
        label: "Shadow learning",
        detail: "A candidate ranking model is being evaluated without turning its internal outcome scores into user-facing factual claims.",
      };
    }
    return {
      label: "Cold-start heuristic",
      detail: "Transparent relevance heuristics are used while outcome evidence accumulates; their internal scores are not presented as outcome probabilities.",
    };
  }

  function markup(data) {
    const copy = modeCopy(data);
    const experiment = data.experiment && typeof data.experiment === "object" ? data.experiment : {};
    const receipt = data.exposureWriteStatus === "written"
      ? "Exposure receipt recorded"
      : data.exposureWriteStatus === "failed"
        ? "Exposure receipt unavailable"
        : "No exposure receipt needed";
    const experimentLabel = experiment.enabled
      ? "5% non-Direct causal holdout enabled"
      : experiment.stoppedByGuardrail
        ? "Causal holdout stopped by guardrail"
        : "Causal holdout disabled";
    return `<aside class="mt-learning-diagnostics" aria-label="Recommendation-ranking status">
      <p><strong>Why these results</strong> Relevance and your opted-in preferences help order opportunities; concrete terms, evidence, and counterparty responses remain primary.</p>
      <details>
        <summary>Recommendation system details</summary>
        <div><span>Recommendation ranking</span><strong>${escapeHtml(copy.label)}</strong><p>${escapeHtml(copy.detail)}</p></div>
        <dl>
          <div><dt>Role</dt><dd>Ranking aid under separate evidence and safety review</dd></div>
          <div><dt>Experiment</dt><dd>${escapeHtml(experimentLabel)}</dd></div>
          <div><dt>Audit</dt><dd>${escapeHtml(receipt)}</dd></div>
          <div><dt>Privacy</dt><dd>No raw private profile prose or sensitive demographic features</dd></div>
        </dl>
      </details>
    </aside>`;
  }

  function decorateCards() {
    const recommendations = Array.isArray(bootstrap().recommendations)
      ? bootstrap().recommendations
      : [];
    const byKey = new Map();
    recommendations.forEach((recommendation) => {
      if (!recommendation || typeof recommendation !== "object") return;
      const type = typeof recommendation.opportunityType === "string"
        ? recommendation.opportunityType
        : "offer";
      const id = typeof recommendation.id === "string" ? recommendation.id : "";
      if (id) byKey.set(`${type}:${id}`, recommendation);
    });
    document.querySelectorAll(".mt-feed-card[data-opportunity-id]").forEach((card) => {
      const id = card.getAttribute("data-opportunity-id") || "";
      const type = card.getAttribute("data-opportunity-type") || "offer";
      const recommendation = byKey.get(`${type}:${id}`);
      if (!recommendation || card.querySelector(".mt-pareto-note")) return;
      const model = recommendation.recommendationModel;
      const prediction = recommendation.paretoPrediction;
      if (!model || typeof model !== "object" || !prediction || typeof prediction !== "object") return;
      const details = card.querySelector(".mt-feed-details-grid");
      if (!details) return;
      const note = document.createElement("p");
      note.className = "mt-pareto-note";
      note.textContent =
        model.mode === "active"
          ? "Learned ranking layer active. Numerical outcome probabilities are not shown here; review the concrete terms, evidence, and counterparty response before relying on a recommendation."
          : "Heuristic/shadow ranking layer active. Its internal scores are ranking aids, not estimates of acceptance, completion, additionality, safety, or moral value.";
      details.appendChild(note);
    });
  }

  function enhance() {
    const data = bootstrap().learningDiagnostics;
    if (!data || typeof data !== "object") return;
    const root = document.querySelector('[data-mt-live-now="adaptive"]');
    if (!root) return;
    const signature = `${String(data.requestId || "")}:${String(data.mode || "")}`;
    if (root.getAttribute("data-pareto-learning") === signature) return;
    const existing = root.querySelector(".mt-learning-diagnostics");
    if (!existing) {
      const funnel = root.querySelector(".mt-feed-diagnostics");
      const empty = root.querySelector(".mt-feed-empty-diagnostics");
      const anchor = funnel || empty || root.querySelector(".panel.black.urgent");
      if (anchor) anchor.insertAdjacentHTML("afterend", markup(data));
    }
    decorateCards();
    root.setAttribute("data-pareto-learning", signature);
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(() => {
      scheduled = false;
      enhance();
    });
  }

  window.addEventListener("mt:live-now-ready", schedule);
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", schedule, { once: true });
  }
  new MutationObserver(schedule).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  schedule();
})();
