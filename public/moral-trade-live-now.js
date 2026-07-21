(function personalizeLiveNow() {
  "use strict";

  if (window.__MT_LIVE_NOW_ACTIVE__) return;
  window.__MT_LIVE_NOW_ACTIVE__ = true;

  const allowedStates = new Set([
    "no_matches",
    "profile_incomplete",
    "ready",
    "signed_out",
    "unavailable",
  ]);
  const profilePriorityHref =
    "/profile/priorities?returnTo=%2Fmoral-trade-live.html%23now";
  const bootstrap =
    window.__MT_LIVE_NOW_BOOTSTRAP__ &&
    typeof window.__MT_LIVE_NOW_BOOTSTRAP__ === "object"
      ? window.__MT_LIVE_NOW_BOOTSTRAP__
      : {};

  function string(value, maximum) {
    return typeof value === "string" ? value.trim().slice(0, maximum) : "";
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function uniqueStrings(values, maximumItems) {
    const seen = new Set();
    const result = [];

    (Array.isArray(values) ? values : []).forEach((value) => {
      const cleaned = string(value, 120);
      const key = cleaned.toLowerCase();
      if (!cleaned || seen.has(key) || result.length >= maximumItems) return;
      seen.add(key);
      result.push(cleaned);
    });

    return result;
  }

  function normalizeRecommendation(value) {
    if (!value || typeof value !== "object") return null;

    const id = string(value.id, 80);
    const offeredCause = string(value.offeredCause, 120);
    const requestedCause = string(value.requestedCause, 120);
    if (!id || !offeredCause || !requestedCause) return null;

    return {
      id,
      ownerAlias: string(value.ownerAlias, 100) || "Participant",
      mode: string(value.mode, 20),
      offeredCause,
      requestedCause,
      offerAction: string(value.offerAction, 320),
      requestAction: string(value.requestAction, 320),
      verification: string(value.verification, 320),
      duration: string(value.duration, 160),
      matchCause: string(value.matchCause, 120),
      reason: string(value.reason, 180),
    };
  }

  function normalizeChange(value) {
    if (!value || typeof value !== "object") return null;
    const cause = string(value.cause, 120);
    const count = Number(value.count);
    if (!cause || !Number.isFinite(count) || count < 1) return null;

    return {
      cause,
      count: Math.floor(count),
      label: string(value.label, 180) || `${cause} · ${Math.floor(count)} changed`,
    };
  }

  const profileValue =
    bootstrap.profile && typeof bootstrap.profile === "object" ? bootstrap.profile : {};
  const model = {
    authenticated: bootstrap.authenticated === true,
    generatedAt: string(bootstrap.generatedAt, 40),
    matchingOfferCount: Math.max(0, Math.floor(Number(bootstrap.matchingOfferCount) || 0)),
    profile: {
      causes: uniqueStrings(profileValue.causes, 12),
      openToPayment:
        typeof profileValue.openToPayment === "boolean" ? profileValue.openToPayment : null,
      openToPledges:
        typeof profileValue.openToPledges === "boolean" ? profileValue.openToPledges : null,
      signalSources: uniqueStrings(profileValue.signalSources, 4),
    },
    recentChanges: (Array.isArray(bootstrap.recentChanges) ? bootstrap.recentChanges : [])
      .map(normalizeChange)
      .filter(Boolean)
      .slice(0, 3),
    recommendations: (Array.isArray(bootstrap.recommendations)
      ? bootstrap.recommendations
      : [])
      .map(normalizeRecommendation)
      .filter(Boolean)
      .slice(0, 12),
    status: allowedStates.has(bootstrap.status) ? bootstrap.status : "unavailable",
  };

  if (model.status === "ready" && !model.recommendations.length) {
    model.status = "unavailable";
  }

  function offerHref(recommendation) {
    return `/offers/${encodeURIComponent(recommendation.id)}`;
  }

  function browseHref(cause) {
    const query = new URLSearchParams({ view: "live", sort: "match" });
    if (cause) query.set("cause", cause);
    return `/offers?${query.toString()}`;
  }

  function modeLabel(mode) {
    if (mode === "offset") return "Donation offset";
    if (mode === "payment") return "Paid action";
    if (mode === "pledge") return "Pledge swap";
    return "Moral trade";
  }

  function settingLabel(value) {
    if (value === true) return "Open";
    if (value === false) return "Not open";
    return "Not specified";
  }

  function formatRefreshTime(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Updated for this visit";

    return `Updated ${new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date)}`;
  }

  function recommendationCard(recommendation) {
    const rows = [
      ["Participant", recommendation.ownerAlias],
      ["They offer", recommendation.offerAction || recommendation.offeredCause],
      ["They ask", recommendation.requestAction || recommendation.requestedCause],
      ["Evidence", recommendation.verification || "Review the proposal for evidence terms"],
    ];

    return `<article class="story" data-mt-live-now-recommendation="${escapeHtml(
      recommendation.id,
    )}">
      <div class="eyebrow blue">${escapeHtml(
        recommendation.reason || `Matches ${recommendation.matchCause}`,
      )}</div>
      <h3>${escapeHtml(recommendation.offeredCause)} ↔ ${escapeHtml(
        recommendation.requestedCause,
      )}</h3>
      <p>${escapeHtml(modeLabel(recommendation.mode))}${
        recommendation.duration ? ` · ${escapeHtml(recommendation.duration)}` : ""
      }</p>
      <div class="term-table">${rows
        .map(
          ([label, value]) =>
            `<div><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></div>`,
        )
        .join("")}</div>
      <a class="btn small" style="margin-top:14px" href="${escapeHtml(
        offerHref(recommendation),
      )}">Review proposal →</a>
    </article>`;
  }

  function sidePanel(title, items, footer) {
    const rows = items.length
      ? items
          .map(
            (item) =>
              `<div class="side-row"><i class="dot info"></i><div>${escapeHtml(item)}</div></div>`,
          )
          .join("")
      : '<div class="side-row"><i class="dot"></i><div>None yet</div></div>';

    return `<section class="panel side-card"><h4>${escapeHtml(title)}</h4>${rows}${
      footer || ""
    }</section>`;
  }

  function emptyStateContent() {
    if (model.status === "signed_out") {
      return {
        eyebrow: "Personal suggestions are private",
        title: "Sign in to see suggestions based on your profile.",
        copy: "This page does not guess your priorities or substitute demo recommendations.",
        facts: ["No profile loaded", "No recommendations shown"],
        primaryHref: "/login?returnTo=%2F",
        primaryLabel: "Sign in →",
        secondaryHref: "/offers?view=live",
        secondaryLabel: "Browse all live proposals →",
      };
    }

    if (model.status === "profile_incomplete") {
      return {
        eyebrow: "Profile needs priorities",
        title: "Add your priorities to personalize Now.",
        copy: "Suggestions begin only after you choose at least one cause area or save a cause search.",
        facts: ["Signed in", "No cause priorities saved"],
        primaryHref: profilePriorityHref,
        primaryLabel: "Complete profile →",
        secondaryHref: "/offers?view=live",
        secondaryLabel: "Browse without personalization →",
      };
    }

    if (model.status === "no_matches") {
      const causeSummary = model.profile.causes.slice(0, 3).join(", ");
      return {
        eyebrow: "Profile checked against live inventory",
        title: "No open proposal currently matches your profile.",
        copy: causeSummary
          ? `We checked the live directory against ${causeSummary}. No filler suggestions were added.`
          : "No filler suggestions were added.",
        facts: [
          `${model.profile.causes.length} profile ${
            model.profile.causes.length === 1 ? "priority" : "priorities"
          } checked`,
          "0 matching live proposals",
        ],
        primaryHref: browseHref(""),
        primaryLabel: "Browse all proposals →",
        secondaryHref: "/dashboard#wish-profile",
        secondaryLabel: "Adjust profile →",
      };
    }

    return {
      eyebrow: "Personal suggestions unavailable",
      title: "Your recommendation feed could not load.",
      copy: "No generic or fabricated suggestions are shown while profile matching is unavailable.",
      facts: ["Profile data not displayed", "No fallback claims"],
      primaryHref: "/moral-trade-live.html#now",
      primaryLabel: "Try again →",
      secondaryHref: "/offers?view=live",
      secondaryLabel: "Browse all live proposals →",
    };
  }

  function renderEmptyState() {
    const content = emptyStateContent();

    return `<div class="focus-layout" data-mt-live-now="profile-driven" data-mt-live-now-state="${escapeHtml(
      model.status,
    )}"><main>
      <section class="panel black urgent">
        <div><div class="eyebrow orange">${escapeHtml(content.eyebrow)}</div><h2>${escapeHtml(
          content.title,
        )}</h2><p class="muted">${escapeHtml(content.copy)}</p></div>
        <div class="terms">${content.facts
          .map(
            (fact, index) =>
              `<div><span class="eyebrow">${index === 0 ? "Profile state" : "Feed state"}</span><strong>${escapeHtml(
                fact,
              )}</strong></div>`,
          )
          .join("")}</div>
        <div class="stack"><a class="btn primary" href="${escapeHtml(
          content.primaryHref,
        )}">${escapeHtml(content.primaryLabel)}</a><a class="btn ghost" href="${escapeHtml(
          content.secondaryHref,
        )}">${escapeHtml(content.secondaryLabel)}</a></div>
      </section>
      <section class="panel attention">
        <div class="iconbox bluebg">◎</div>
        <div class="lead"><div class="eyebrow blue">How matching works</div><h3>Your profile is the filter.</h3></div>
        <div><b>Cause overlap selects candidates.</b><p class="muted" style="font-size:11px">Recency and complete terms break ties; they never replace a profile match.</p></div>
        <a class="btn" href="${escapeHtml(profilePriorityHref)}">Review profile →</a>
      </section>
    </main><aside class="stack">
      ${sidePanel("Profile basis", model.profile.causes, "")}
      ${sidePanel("Feed rule", ["No guessed priorities", "No demo records", "Live proposals only"], "")}
    </aside></div>`;
  }

  function renderReadyState() {
    const best = model.recommendations[0];
    if (!best) return renderEmptyState();

    const recentCount = model.recentChanges.reduce((total, change) => total + change.count, 0);
    const prioritySummary = model.profile.causes.slice(0, 3).join(", ");
    const cards = model.recommendations.slice(0, 3).map(recommendationCard).join("");
    const changeItems = model.recentChanges.length
      ? model.recentChanges.map((change) => change.label)
      : ["No matching proposal changed in the last 24 hours"];

    return `<div class="focus-layout" data-mt-live-now="profile-driven" data-mt-live-now-state="ready"><main>
      <section class="panel black urgent">
        <div><div class="eyebrow orange">Based on your profile</div><h2>${escapeHtml(
          String(model.matchingOfferCount),
        )} live ${model.matchingOfferCount === 1 ? "proposal matches" : "proposals match"}.</h2><p class="muted">Matched to ${escapeHtml(
          prioritySummary,
        )}. ${escapeHtml(formatRefreshTime(model.generatedAt))}.</p></div>
        <div class="terms"><div><span class="eyebrow">Best current match</span><strong>${escapeHtml(
          best.offeredCause,
        )} ↔ ${escapeHtml(best.requestedCause)}</strong></div><div><span class="eyebrow">Why it appears</span><strong>${escapeHtml(
          best.reason,
        )}</strong></div></div>
        <div class="stack"><a class="btn primary" href="${escapeHtml(
          offerHref(best),
        )}">Review best match →</a><a class="btn ghost" href="/dashboard#wish-profile">Adjust profile →</a></div>
      </section>
      <section class="panel attention" style="background:linear-gradient(90deg,rgba(184,217,44,.12),rgba(251,250,246,.9))">
        <div class="iconbox limebg">↗</div><div class="lead"><div class="eyebrow lime">Best current match</div><h3>${escapeHtml(
          best.offeredCause,
        )} ↔ ${escapeHtml(best.requestedCause)}</h3></div>
        <div><b>${escapeHtml(best.offerAction || best.offeredCause)}</b><p class="muted" style="font-size:11px">Asks: ${escapeHtml(
          best.requestAction || best.requestedCause,
        )}</p></div>
        <a class="btn" href="${escapeHtml(offerHref(best))}">Open proposal →</a>
      </section>
      <section class="panel attention">
        <div class="iconbox bluebg">◎</div><div class="lead"><div class="eyebrow blue">Profile-matched changes</div><h3>${recentCount} ${
          recentCount === 1 ? "proposal changed" : "proposals changed"
        } in 24 hours.</h3></div>
        <div><b>${escapeHtml(
          model.recentChanges[0]?.label || "Your matched inventory is current.",
        )}</b><p class="muted" style="font-size:11px">Counts include only live proposals that match a saved profile cause.</p></div>
        <a class="btn" href="${escapeHtml(browseHref(best.matchCause))}">View matches →</a>
      </section>
      <section class="panel brief" aria-label="Profile-based recommendations">${cards}</section>
      <div class="metric-grid stats"><div><strong>${model.matchingOfferCount}</strong><small>matching live proposals</small></div><div><strong>${model.profile.causes.length}</strong><small>profile priorities used</small></div><div><strong>${recentCount}</strong><small>matched changes in 24h</small></div><div><strong>${model.profile.signalSources.length}</strong><small>profile signal sources</small></div></div>
    </main><aside class="stack">
      ${sidePanel("Profile basis", model.profile.causes, '<a class="btn ghost small" href="/dashboard#wish-profile">Edit priorities →</a>')}
      ${sidePanel("Today’s matched changes", changeItems, `<a class="btn ghost small" href="${escapeHtml(
        browseHref(best.matchCause),
      )}">Review matching proposals →</a>`)}
      ${sidePanel(
        "Participation settings",
        [
          `Payment: ${settingLabel(model.profile.openToPayment)}`,
          `Pledges: ${settingLabel(model.profile.openToPledges)}`,
        ],
        '<a class="btn ghost small" href="/dashboard#wish-profile">Review settings →</a>',
      )}
      ${sidePanel(
        "Why these appear",
        ["Cause overlap with your profile", "Open participant proposals only", "Recency and complete terms break ties"],
        "",
      )}
    </aside></div>`;
  }

  window.nowFocus = function renderProfileDrivenNow() {
    return model.status === "ready" ? renderReadyState() : renderEmptyState();
  };

  if (typeof window.render === "function") {
    window.render();
  }

  document.documentElement.setAttribute("data-mt-live-now-ready", model.status);
  window.dispatchEvent(new CustomEvent("mt:live-now-ready", { detail: { status: model.status } }));
})();
