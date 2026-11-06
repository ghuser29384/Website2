const app = document.querySelector("#app");
const title = document.querySelector("#page-title");
const subtitle = document.querySelector("#page-subtitle");
const syncButton = document.querySelector("#sync-button");
const providerStatus = document.querySelector("#provider-status");

const state = {
  dashboard: null,
  candidates: [],
  settings: null,
};

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  const type = response.headers.get("content-type") || "";
  return type.includes("application/json") ? response.json() : response.text();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function percent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function statusTag(status) {
  const normalized = String(status || "NEW");
  const cls = normalized.includes("SUBMITTED") || normalized === "REVIEWED" ? "ok" : normalized === "NO_NOTE" || normalized.includes("HELD") ? "warn" : "";
  return `<span class="tag ${cls}">${escapeHtml(normalized)}</span>`;
}

function jsonBlock(value, fallback = "Not available yet.") {
  if (value === undefined || value === null || (typeof value === "object" && !Object.keys(value).length)) {
    return `<div class="codebox">${escapeHtml(fallback)}</div>`;
  }
  return `<div class="codebox">${escapeHtml(JSON.stringify(value, null, 2))}</div>`;
}

function setHeader(pageTitle, pageSubtitle) {
  title.textContent = pageTitle;
  subtitle.textContent = pageSubtitle;
  document.querySelectorAll("[data-route]").forEach((link) => {
    const route = link.getAttribute("data-route");
    const active = route === "/" ? location.pathname === "/" : location.pathname.startsWith(route);
    link.classList.toggle("active", active);
  });
}

async function refreshShell() {
  const settings = await api("/api/settings");
  state.settings = settings;
  providerStatus.textContent = `${settings.llm_provider} LLM / ${settings.search_provider} search`;
}

async function refreshCandidates() {
  const result = await api("/api/candidates");
  state.candidates = result.candidates;
  return state.candidates;
}

async function syncFixtures() {
  syncButton.disabled = true;
  syncButton.textContent = "Syncing";
  try {
    await api("/api/x/sync-eligible-posts", { method: "POST", body: { test_mode: true, max_results: 20 } });
    await refreshCandidates();
    await navigate(location.pathname, true);
  } finally {
    syncButton.disabled = false;
    syncButton.textContent = "Sync fixtures";
  }
}

syncButton.addEventListener("click", syncFixtures);

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[data-route], a[data-spa]");
  if (!link) return;
  event.preventDefault();
  navigate(link.getAttribute("href"));
});

window.addEventListener("popstate", () => navigate(location.pathname, true));

async function navigate(path, replace = false) {
  if (!replace) history.pushState({}, "", path);
  if (!state.settings) await refreshShell();
  if (path === "/") return renderDashboard();
  if (path === "/candidates") return renderCandidates();
  if (path.startsWith("/candidates/")) return renderCandidateDetail(path.split("/").pop());
  if (path === "/admission") return renderAdmission();
  if (path === "/writing-limit") return renderWritingLimit();
  if (path === "/evals") return renderEvals();
  if (path === "/settings") return renderSettings();
  return renderDashboard();
}

async function renderDashboard() {
  setHeader("Dashboard", "Queue, readiness, writing-limit, cost, and regression status.");
  state.dashboard = await api("/api/dashboard");
  const queue = state.dashboard.queue_summary;
  app.innerHTML = `
    <div class="grid three">
      <section class="panel stat">
        <h3>Eligible queue</h3>
        <div class="stat-value">${queue.total}</div>
        <p class="muted">${Object.entries(queue.by_status).map(([key, value]) => `${escapeHtml(key)} ${value}`).join(" / ") || "No posts synced"}</p>
      </section>
      <section class="panel stat">
        <h3>Admission ready</h3>
        <div class="stat-value">${state.dashboard.admission.eligible_boolean ? "Yes" : "No"}</div>
        <p class="muted">Rolling ${state.dashboard.admission.window_size}-note score window.</p>
      </section>
      <section class="panel stat">
        <h3>Cost status</h3>
        <div class="stat-value">$${state.dashboard.costs.daily_total_usd.toFixed(3)}</div>
        <p class="muted">Daily fixture estimate of $${state.dashboard.costs.daily_budget_usd}.</p>
      </section>
    </div>
    <div class="grid two" style="margin-top:16px">
      <section class="panel stack">
        <div class="row"><h2>Regression alerts</h2>${state.dashboard.regression_alerts.length ? '<span class="tag warn">review</span>' : '<span class="tag ok">clear</span>'}</div>
        <div class="stack">${state.dashboard.regression_alerts.map((item) => `<div class="codebox">${escapeHtml(item)}</div>`).join("") || '<p class="muted">No current fixture alerts.</p>'}</div>
      </section>
      <section class="panel stack">
        <div class="row"><h2>Track B status</h2><span class="tag ok">test_mode=true</span></div>
        <p>Submissions remain blocked until exact draft text passes internal critique, X evaluate_note, operator approval, cost guard, policy scope, bot identity, governance checks, and readiness checks.</p>
        <div class="codebox">${escapeHtml(state.dashboard.policy_scope.policy_text)}</div>
        <div class="codebox">Bot disclosure: ${escapeHtml(state.dashboard.bot_identity.profile_disclosure)}\nResponsible party: ${escapeHtml(state.dashboard.bot_identity.responsible_party || "not configured")}</div>
        <div class="codebox">Emergency stop: ${state.dashboard.governance.emergency_stop.external_writes_blocked ? "ACTIVE" : "clear"}\nMethodology: ${escapeHtml(state.dashboard.governance.methodology.methodology_version)}</div>
        <button class="button secondary" onclick="navigate('/candidates')">Open eligible queue</button>
      </section>
    </div>
  `;
}

async function renderCandidates() {
  setHeader("Candidates", "Sortable fixture queue from posts_eligible_for_notes.");
  const candidates = await refreshCandidates();
  if (!candidates.length) {
    app.innerHTML = document.querySelector("#empty-template").innerHTML;
    return;
  }
  app.innerHTML = `
    <div class="toolbar">
      <input class="filter" id="candidate-filter" placeholder="Filter by post text, status, or X ID">
      <select class="filter" id="candidate-sort">
        <option value="status">Sort by status</option>
        <option value="x_post_id">Sort by X post ID</option>
      </select>
    </div>
    <div id="candidate-table"></div>
  `;
  const filter = document.querySelector("#candidate-filter");
  const sort = document.querySelector("#candidate-sort");
  const draw = () => {
    const needle = filter.value.toLowerCase();
    const sorted = [...state.candidates].sort((a, b) => String(a[sort.value]).localeCompare(String(b[sort.value])));
    const rows = sorted
      .filter((candidate) => `${candidate.text} ${candidate.status} ${candidate.x_post_id}`.toLowerCase().includes(needle))
      .map((candidate) => `
        <tr>
          <td><a data-spa href="/candidates/${candidate.id}" class="link-button">${escapeHtml(candidate.x_post_id)}</a></td>
          <td>${escapeHtml(candidate.text)}</td>
          <td>${statusTag(candidate.status)}</td>
          <td>${escapeHtml(candidate.high_stakes?.risk_tier || "standard")}</td>
          <td>${candidate.suggested_source_links_with_counts.length}</td>
          <td>${candidate.note_request_suggestions.length}</td>
        </tr>
      `)
      .join("");
    document.querySelector("#candidate-table").innerHTML = `
      <table class="table">
        <thead><tr><th>Post ID</th><th>Post context</th><th>Status</th><th>Risk</th><th>Suggested sources</th><th>Requests</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  };
  filter.addEventListener("input", draw);
  sort.addEventListener("change", draw);
  draw();
}

async function renderCandidateDetail(candidateId) {
  const candidate = await api(`/api/candidates/${candidateId}`);
  setHeader("Candidate detail", `Exact post ID ${candidate.x_post_id}. Track B submits test_mode=true by default.`);
  const primaryDraft = candidate.drafts.find((draft) => draft.status !== "ABSTAIN") || candidate.drafts[0];
  app.innerHTML = `
    <div class="grid two">
      <section class="panel stack">
        <div class="row"><h2>Post context</h2>${statusTag(candidate.status)}</div>
        <p class="note-text">${escapeHtml(candidate.text)}</p>
        <div class="grid two">
          <div><h3>Referenced</h3><p class="muted">${candidate.referenced_posts.length}</p></div>
          <div><h3>Media</h3><p class="muted">${candidate.media_metadata.length}</p></div>
        </div>
      </section>
      <section class="panel stack">
        <h2>Workflow</h2>
        <div class="toolbar">
          <button class="button" data-action="analyze">Analyze</button>
          <button class="button" data-action="retrieve">Retrieve</button>
          <button class="button" data-action="drafts">Draft</button>
          ${primaryDraft ? `<button class="button" data-draft="${primaryDraft.id}" data-action="critique">Critique</button>
          <button class="button" data-draft="${primaryDraft.id}" data-action="evaluate">Evaluate X</button>
          <button class="button secondary" data-draft="${primaryDraft.id}" data-action="approve">Approve</button>
          <button class="button primary" data-draft="${primaryDraft.id}" data-action="submit">Submit test</button>
          <button class="button" data-draft="${primaryDraft.id}" data-action="export">Export</button>` : ""}
        </div>
        ${primaryDraft ? `<label class="consent-row"><input id="track-a-consent" type="checkbox"> I have express and informed contributor consent for Track A manual/export action.</label>` : ""}
        <div id="action-result" class="codebox">Every submit attempt shows exact note text, exact post ID, test_mode=true, gate checks, and blockers.</div>
      </section>
    </div>
    <div class="grid two" style="margin-top:16px">
      <section class="panel stack">
        <h2>Claims</h2>
        ${candidate.claims.map((claim) => `<div class="codebox"><strong>${escapeHtml(claim.status)}</strong> ${escapeHtml(claim.text)}<br><span class="muted">Checkability ${claim.checkability_score}; ${escapeHtml(claim.sourceability_hint)}</span></div>`).join("") || '<p class="muted">Run analyze to extract claims.</p>'}
      </section>
      <section class="panel stack">
        <h2>Suggested and retrieved sources</h2>
        ${candidate.sources.map((source) => `<div class="codebox"><strong>${escapeHtml(source.publisher)}</strong><br>${escapeHtml(source.title)}<br><span class="muted">${escapeHtml(source.source_type)} count ${source.suggested_count}; untrusted until audited</span></div>`).join("") || '<p class="muted">Run retrieve to ingest suggested links.</p>'}
        ${candidate.evidence_cards.map((card) => `<div class="codebox"><strong>${card.approved ? "Approved" : "Rejected"} evidence</strong><br>${escapeHtml(card.publisher)} - ${escapeHtml(card.snippet)}<br><span class="muted">source_id ${escapeHtml(card.source_id)}</span></div>`).join("")}
      </section>
    </div>
    <section class="panel stack" style="margin-top:16px">
        <h2>CommunityNotes18 governance</h2>
      <div class="governance-grid">
        <div><h3>State machine</h3>${jsonBlock(candidate.state_machine)}</div>
        <div><h3>Artifact graph</h3>${jsonBlock(candidate.artifact_graph)}</div>
        <div><h3>Crowd signals</h3>${jsonBlock(candidate.crowd_signal_filter)}</div>
        <div><h3>Claim graph</h3>${jsonBlock(candidate.atomic_claim_graph)}</div>
        <div><h3>Source policy</h3>${jsonBlock(candidate.source_authority_policy)}</div>
        <div><h3>Credential scope</h3>${jsonBlock(candidate.credential_scope)}</div>
        <div><h3>Scheduler</h3>${jsonBlock(candidate.scheduler_decision)}</div>
        <div><h3>Topic coverage</h3>${jsonBlock(candidate.topic_coverage)}</div>
        <div><h3>Audience</h3>${jsonBlock(candidate.audience_context)}</div>
        <div><h3>Media dependency</h3>${jsonBlock(candidate.media_dependency)}</div>
        <div><h3>High-stakes routing</h3>${jsonBlock(candidate.high_stakes)}</div>
        <div><h3>Abstention/redundancy</h3>${jsonBlock(candidate.abstention_guard)}</div>
        <div><h3>Freshness lifecycle</h3>${jsonBlock(candidate.freshness_lifecycle)}</div>
        <div><h3>Retention/access</h3>${jsonBlock(candidate.retention_policy)}</div>
      </div>
    </section>
    <section class="panel stack" style="margin-top:16px">
      <h2>Draft variants</h2>
      ${candidate.drafts.map(renderDraft).join("") || '<p class="muted">Run draft after approved evidence retrieval.</p>'}
    </section>
  `;
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => runCandidateAction(candidateId, button.dataset.action, button.dataset.draft));
  });
}

function renderDraft(draft) {
  return `
    <div class="panel flat stack">
      <div class="row"><h3>Draft</h3><span class="tag">${escapeHtml(draft.status)}</span><span class="tag">hash ${escapeHtml(draft.exact_text_hash.slice(0, 10))}</span></div>
      <div class="note-text">${escapeHtml(draft.text)}</div>
      <div class="source-map">
        ${Object.entries(draft.support_map_json).map(([sentence, sources]) => `<div>${escapeHtml(sentence)}<br><span class="muted">source_id: ${sources.map(escapeHtml).join(", ")}</span></div>`).join("") || '<p class="muted">No factual sentences mapped.</p>'}
      </div>
      <div class="codebox">${escapeHtml(draft.evidence_brief || "No evidence brief.")}</div>
      <div class="governance-grid compact">
        <div><h3>Format validation</h3>${jsonBlock(draft.format_validation)}</div>
        <div><h3>Contradiction review</h3>${jsonBlock(draft.adversarial_review)}</div>
        <div><h3>Prediction ledger</h3>${jsonBlock(draft.prediction_ledger)}</div>
        <div><h3>Approval record</h3>${jsonBlock(draft.approval_record)}</div>
        <div><h3>Central gate</h3>${jsonBlock(draft.central_gate_decision)}</div>
        <div><h3>Model contract</h3>${jsonBlock(draft.model_contract)}</div>
        <div><h3>Cross-perspective</h3>${jsonBlock(draft.cross_perspective)}</div>
        <div><h3>Writing opportunity</h3>${jsonBlock(draft.writing_opportunity)}</div>
        <div><h3>Evidence report</h3>${jsonBlock(draft.evidence_report)}</div>
        <div><h3>Operator feedback</h3>${jsonBlock(draft.operator_feedback)}</div>
      </div>
    </div>
  `;
}

async function runCandidateAction(candidateId, action, draftId) {
  const result = document.querySelector("#action-result");
  result.textContent = "Running...";
  try {
    let payload;
    if (action === "analyze") payload = await api(`/api/candidates/${candidateId}/analyze`, { method: "POST", body: {} });
    if (action === "retrieve") payload = await api(`/api/candidates/${candidateId}/retrieve`, { method: "POST", body: {} });
    if (action === "drafts") payload = await api(`/api/candidates/${candidateId}/drafts`, { method: "POST", body: {} });
    if (action === "critique") payload = await api(`/api/drafts/${draftId}/critique`, { method: "POST", body: {} });
    if (action === "evaluate") payload = await api(`/api/drafts/${draftId}/evaluate-x`, { method: "POST", body: {} });
    if (action === "approve") payload = await api(`/api/drafts/${draftId}/approve`, { method: "POST", body: {} });
    if (action === "submit") payload = await api(`/api/drafts/${draftId}/submit`, { method: "POST", body: { test_mode: true } });
    if (action === "export") {
      const consent = document.querySelector("#track-a-consent")?.checked;
      if (!consent) throw new Error("Track A export requires express and informed contributor consent.");
      const reason = encodeURIComponent("manual export/copy workflow");
      payload = await api(`/api/drafts/${draftId}/export?consent_ack=true&consent_actor=operator&consent_reason=${reason}`);
      try {
        await navigator.clipboard?.writeText(payload);
      } catch {
        // Clipboard permissions vary by browser context; the export text is still rendered below.
      }
    }
    result.textContent = typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
    if (action !== "export") await renderCandidateDetail(candidateId);
  } catch (error) {
    result.textContent = error.message;
  }
}

async function renderAdmission() {
  setHeader("Admission", "Rolling 50-note ClaimOpinion, UrlValidity, and HarassmentAbuse thresholds.");
  const data = await api("/api/admission");
  app.innerHTML = `
    <section class="panel stack">
      <div class="row"><h2>Readiness</h2>${data.eligible_boolean ? '<span class="tag ok">eligible</span>' : '<span class="tag warn">blocked</span>'}</div>
      <div class="meters">
        ${meter("ClaimOpinion high", data.claim_opinion_high_rate)}
        ${meter("ClaimOpinion low", data.claim_opinion_low_rate)}
        ${meter("UrlValidity high", data.url_validity_high_rate)}
        ${meter("HarassmentAbuse high", data.harassment_abuse_high_rate)}
      </div>
      <div class="codebox">${escapeHtml(JSON.stringify(data.blockers, null, 2))}</div>
    </section>
  `;
}

function meter(label, value) {
  return `<div class="meter"><div class="row"><strong>${escapeHtml(label)}</strong><span>${percent(value)}</span></div><div class="meter-track"><div class="meter-fill" style="--value:${percent(value)}"></div></div></div>`;
}

async function renderWritingLimit() {
  setHeader("Writing limit", "Raw CRH/CRNH inputs, hit-rate formulas, and feed-size eligibility.");
  const data = await api("/api/writing-limit");
  app.innerHTML = `
    <div class="grid three">
      <section class="panel stat"><h3>WL</h3><div class="stat-value">${data.wl}</div></section>
      <section class="panel stat"><h3>NH_5</h3><div class="stat-value">${data.nh_5}</div></section>
      <section class="panel stat"><h3>HR_100</h3><div class="stat-value">${percent(data.hr_100)}</div></section>
    </div>
    <section class="panel stack" style="margin-top:16px">
      <h2>Formulas and raw inputs</h2>
      <div class="codebox">${escapeHtml(JSON.stringify(data.formulas, null, 2))}</div>
      <div class="codebox">${escapeHtml(JSON.stringify(data.raw_inputs, null, 2))}</div>
      <div class="codebox">${escapeHtml(JSON.stringify(data.feed_size_eligibility, null, 2))}</div>
    </section>
  `;
}

async function renderEvals() {
  setHeader("Evals", "Offline fixture and adversarial eval runs.");
  app.innerHTML = `
    <section class="panel stack">
      <div class="row"><h2>Run eval harness</h2><button id="run-evals" class="button primary">Run evals</button></div>
      <div id="eval-result" class="codebox">No eval run yet.</div>
    </section>
  `;
  document.querySelector("#run-evals").addEventListener("click", async () => {
    const result = await api("/api/evals/run", { method: "POST", body: {} });
    document.querySelector("#eval-result").textContent = JSON.stringify(result, null, 2);
  });
}

async function renderSettings() {
  setHeader("Settings", "Thresholds, budgets, feature flags, and provider status without secrets.");
  const data = await api("/api/settings");
  const costs = await api("/api/costs");
  const governance = await api("/api/governance");
  app.innerHTML = `
    <div class="grid two">
      <section class="panel stack">
        <h2>Policy scope</h2>
        <div class="codebox">${escapeHtml(JSON.stringify(data.policy_scope, null, 2))}</div>
      </section>
      <section class="panel stack">
        <h2>Bot identity</h2>
        <div class="codebox">${escapeHtml(JSON.stringify(data.bot_identity, null, 2))}</div>
      </section>
    </div>
    <section class="panel stack" style="margin-top:16px">
      <h2>Usage reconciliation</h2>
      <div class="codebox">${escapeHtml(JSON.stringify(costs.summary, null, 2))}</div>
    </section>
    <section class="panel stack" style="margin-top:16px">
      <h2>CommunityNotes18 governance</h2>
      <div class="governance-grid">
        <div><h3>Phase</h3>${jsonBlock(governance.phase_and_complexity)}</div>
        <div><h3>Latency SLO</h3>${jsonBlock(governance.latency_slo)}</div>
        <div><h3>Promotion gate</h3>${jsonBlock(governance.online_offline_promotion)}</div>
        <div><h3>Credential scope</h3>${jsonBlock(governance.credential_scope_and_environment)}</div>
        <div><h3>Backpressure</h3>${jsonBlock(governance.rate_limit_backpressure_scheduler)}</div>
        <div><h3>Idempotency</h3>${jsonBlock(governance.external_call_idempotency_and_cost)}</div>
        <div><h3>Model gateway</h3>${jsonBlock(governance.model_gateway_and_prompt_contracts)}</div>
        <div><h3>Central gate</h3>${jsonBlock(governance.central_policy_gatekeeper)}</div>
        <div><h3>Source policy</h3>${jsonBlock(governance.source_authority_policy)}</div>
        <div><h3>Topic coverage</h3>${jsonBlock(governance.topic_coverage_and_skew)}</div>
        <div><h3>Ablations</h3>${jsonBlock(governance.baseline_comparison_and_ablation)}</div>
        <div><h3>Calibration</h3>${jsonBlock(governance.prediction_calibration_and_uncertainty)}</div>
        <div><h3>Exact approval</h3>${jsonBlock(governance.exact_submission_preview_and_approval)}</div>
        <div><h3>Claim graph</h3>${jsonBlock(governance.claim_graph_and_source_relations)}</div>
        <div><h3>Crowd signals</h3>${jsonBlock(governance.crowd_signal_robustness)}</div>
        <div><h3>Format validator</h3>${jsonBlock(governance.note_format_validator)}</div>
        <div><h3>Contradiction search</h3>${jsonBlock(governance.adversarial_contradiction_search)}</div>
        <div><h3>Methodology</h3>${jsonBlock(governance.methodology)}</div>
        <div><h3>Policy drift</h3>${jsonBlock(governance.policy_drift)}</div>
        <div><h3>Emergency stop</h3>${jsonBlock(governance.emergency_stop)}</div>
        <div><h3>Scoring replay</h3>${jsonBlock(governance.official_scoring_replay)}</div>
      </div>
    </section>
    <section class="panel stack" style="margin-top:16px">
      <h2>Public settings</h2>
      <div class="codebox">${escapeHtml(JSON.stringify(data, null, 2))}</div>
    </section>
  `;
}

refreshShell().then(() => navigate(location.pathname, true)).catch((error) => {
  app.innerHTML = `<div class="empty"><h2>Unable to load app</h2><p>${escapeHtml(error.message)}</p></div>`;
});
