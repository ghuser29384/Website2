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
  const allowedOpportunityTypes = new Set([
    "offer",
    "donation_redirect",
    "donation_pool",
  ]);
  const bootstrap =
    window.__MT_LIVE_NOW_BOOTSTRAP__ &&
    typeof window.__MT_LIVE_NOW_BOOTSTRAP__ === "object"
      ? window.__MT_LIVE_NOW_BOOTSTRAP__
      : {};

  function string(value, maximum) {
    return typeof value === "string" ? value.trim().slice(0, maximum) : "";
  }

  function number(value, fallback, minimum, maximum) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(maximum, Math.max(minimum, parsed));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function safePath(value, fallback) {
    const path = string(value, 500);
    return path.startsWith("/") && !path.startsWith("//") ? path : fallback;
  }

  function uniqueStrings(values, maximumItems) {
    const seen = new Set();
    const result = [];

    (Array.isArray(values) ? values : []).forEach((value) => {
      const cleaned = string(value, 160);
      const key = cleaned.toLowerCase();
      if (!cleaned || seen.has(key) || result.length >= maximumItems) return;
      seen.add(key);
      result.push(cleaned);
    });

    return result;
  }

  function normalizeWeightedCause(value) {
    if (!value || typeof value !== "object") return null;
    const cause = string(value.cause, 120);
    if (!cause) return null;
    return {
      cause,
      weight: number(value.weight, 0, 0, 100),
      source: string(value.source, 40),
      rank: Number.isInteger(Number(value.rank)) ? Number(value.rank) : null,
    };
  }

  function normalizeRecommendation(value) {
    if (!value || typeof value !== "object") return null;

    const id = string(value.id, 160);
    const offeredCause = string(value.offeredCause, 120);
    const requestedCause = string(value.requestedCause, 120);
    if (!id || !offeredCause || !requestedCause) return null;
    const metadata =
      value.metadata && typeof value.metadata === "object" && !Array.isArray(value.metadata)
        ? value.metadata
        : {};
    const origin =
      metadata.origin === "platform_generated" ? "platform_generated" : "published";
    const opportunityType = allowedOpportunityTypes.has(value.opportunityType)
      ? value.opportunityType
      : value.mode === "offset"
        ? "donation_redirect"
        : "offer";
    const defaultHref =
      opportunityType === "donation_pool"
        ? `/donation-offsets?pool=${encodeURIComponent(id)}`
        : `/offers/${encodeURIComponent(id)}`;

    return {
      id,
      origin,
      opportunityType,
      href: safePath(value.href, defaultHref),
      ctaLabel: string(value.ctaLabel, 80) || "Review proposal",
      sourceLabel: string(value.sourceLabel, 80) || "Moral trade",
      ownerAlias: string(value.ownerAlias, 100) || "Participant",
      mode: string(value.mode, 20),
      offeredCause,
      requestedCause,
      offerAction: string(value.offerAction, 420),
      requestAction: string(value.requestAction, 420),
      verification: string(value.verification, 320),
      duration: string(value.duration, 160),
      summary: string(value.summary, 320),
      benefitCauses: uniqueStrings(value.benefitCauses, 12),
      actionCauses: uniqueStrings(value.actionCauses, 12),
      actionKey: string(value.actionKey, 120),
      actionLabel: string(value.actionLabel, 160) || "Requested action",
      matchCause: string(value.matchCause, 120),
      actionCauseMatch: string(value.actionCauseMatch, 120),
      reason: string(value.reason, 240),
      reasonDetails: uniqueStrings(value.reasonDetails, 6),
      difficulty: number(value.difficulty, 2.75, 1, 5),
      difficultyLabel: string(value.difficultyLabel, 20) || "Moderate",
      willingness: number(value.willingness, 50, 0, 100),
      actionFitLabel: string(value.actionFitLabel, 40) || "Possible fit",
      learnedActionSignalCount: Math.max(
        0,
        Math.floor(number(value.learnedActionSignalCount, 0, 0, 100000)),
      ),
      assuranceMinimumCents: Math.max(
        0,
        Math.floor(number(metadata.assuranceMinimumCents, 0, 0, 100000000000)),
      ),
      offsetRatio: number(metadata.offsetRatio, 1, 0, 100000),
      saved: value.saved === true,
      updatedAt: string(value.updatedAt, 40),
    };
  }

  function normalizeOwnedOpportunity(value) {
    if (!value || typeof value !== "object") return null;

    const id = string(value.id, 160);
    const offeredCause = string(value.offeredCause, 120);
    const requestedCause = string(value.requestedCause, 120);
    if (!id || !offeredCause || !requestedCause) return null;
    const opportunityType = allowedOpportunityTypes.has(value.opportunityType)
      ? value.opportunityType
      : "offer";

    return {
      id,
      opportunityType,
      href: safePath(value.href, "/trades/" + encodeURIComponent(id) + "/manage"),
      ctaLabel: string(value.ctaLabel, 80) || "Manage & invite",
      sourceLabel: string(value.sourceLabel, 80) || "Your live offer",
      ownerAlias: string(value.ownerAlias, 100) || "You",
      offeredCause,
      requestedCause,
      offerAction: string(value.offerAction, 420),
      requestAction: string(value.requestAction, 420),
      verification: string(value.verification, 320),
      duration: string(value.duration, 160),
      summary: string(value.summary, 320),
      updatedAt: string(value.updatedAt, 40),
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
    matchingOpportunityCount: Math.max(
      0,
      Math.floor(
        Number(bootstrap.matchingOpportunityCount ?? bootstrap.matchingOfferCount) || 0,
      ),
    ),
    profile: {
      causes: uniqueStrings(profileValue.causes, 24),
      weightedCauses: (Array.isArray(profileValue.weightedCauses)
        ? profileValue.weightedCauses
        : []
      )
        .map(normalizeWeightedCause)
        .filter(Boolean)
        .slice(0, 24),
      openToPayment:
        typeof profileValue.openToPayment === "boolean" ? profileValue.openToPayment : null,
      openToPledges:
        typeof profileValue.openToPledges === "boolean" ? profileValue.openToPledges : null,
      signalSources: uniqueStrings(profileValue.signalSources, 8),
      learningEnabled: profileValue.learningEnabled !== false,
      explorationPercent: Math.round(number(profileValue.explorationPercent, 12, 0, 30)),
      browsingSignalCount: Math.max(
        0,
        Math.floor(number(profileValue.browsingSignalCount, 0, 0, 100000)),
      ),
      actionFeedbackCount: Math.max(
        0,
        Math.floor(number(profileValue.actionFeedbackCount, 0, 0, 100000)),
      ),
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
    ownedOpportunities: (Array.isArray(bootstrap.ownedOpportunities)
      ? bootstrap.ownedOpportunities
      : [])
      .map(normalizeOwnedOpportunity)
      .filter(Boolean)
      .slice(0, 6),
    ownedOpportunityCount: Math.max(
      0,
      Math.floor(Number(bootstrap.ownedOpportunityCount) || 0),
    ),
    status: allowedStates.has(bootstrap.status) ? bootstrap.status : "unavailable",
  };

  model.suggestedOpportunityCount = model.recommendations.filter(
    (recommendation) => recommendation.origin === "platform_generated",
  ).length;
  model.feedOpportunityCount = model.recommendations.length;

  if (model.status === "ready" && !model.recommendations.length) {
    model.status = "unavailable";
  }

  function browseHref(cause) {
    const query = new URLSearchParams({ view: "live", sort: "match" });
    if (cause) query.set("cause", cause);
    return `/offers?${query.toString()}`;
  }

  function sourceLabel(source) {
    if (source === "explicit_priority") return "explicit priority";
    if (source === "profile_priority") return "profile priority";
    if (source === "saved_search") return "saved search";
    if (source === "browsing") return "recent browsing";
    return "profile signal";
  }

  function formatRefreshTime(value) {
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Updated for this visit";

    return `Updated ${new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(date)}`;
  }

  function whyList(recommendation) {
    const details = recommendation.reasonDetails.length
      ? recommendation.reasonDetails
      : [recommendation.reason || `Matches ${recommendation.matchCause}`];
    return details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("");
  }

  function opportunityVisual(type, generated) {
    if (generated) {
      return {
        key: "suggested",
        label: "Potential trade",
        symbol: "◇",
        fromLabel: "You might offer",
        toLabel: "Could advance",
        connector: "↔",
      };
    }
    if (type === "donation_redirect") {
      return {
        key: "redirect",
        label: "Redirect",
        symbol: "↗",
        fromLabel: "You offer",
        toLabel: "Redirect advances",
        connector: "→",
      };
    }
    if (type === "donation_pool") {
      return {
        key: "public-goods",
        label: "Public Goods",
        symbol: "◎",
        fromLabel: "Your contribution",
        toLabel: "Group target",
        connector: "+",
      };
    }
    return {
      key: "action",
      label: "Action",
      symbol: "↔",
      fromLabel: "You offer",
      toLabel: "Trade advances",
      connector: "→",
    };
  }

  function fitLevel(label) {
    if (label === "Strong fit") return 3;
    if (label === "Possible fit") return 2;
    return 1;
  }

  function fitMeter(recommendation) {
    const level = fitLevel(recommendation.actionFitLabel);
    return `<span class="mt-feed-fit" aria-label="${escapeHtml(
      recommendation.actionFitLabel,
    )}"><span class="${level >= 1 ? "is-on" : ""}"></span><span class="${
      level >= 2 ? "is-on" : ""
    }"></span><span class="${level >= 3 ? "is-on" : ""}"></span></span>`;
  }

  function formatCurrencyFromCents(value) {
    if (!value) return "";
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: value % 100 === 0 ? 0 : 2,
    }).format(value / 100);
  }

  function recommendationCard(recommendation, rank) {
    const visual = opportunityVisual(
      recommendation.opportunityType,
      recommendation.origin === "platform_generated",
    );
    const requestedAction = recommendation.requestAction || recommendation.requestedCause;
    const unlockedOutcome = recommendation.offerAction || recommendation.offeredCause;
    const savedLabel = recommendation.saved ? "Saved" : "Save";
    const threshold = formatCurrencyFromCents(recommendation.assuranceMinimumCents);
    const publicGoodsNote =
      recommendation.opportunityType === "donation_pool"
        ? threshold
          ? `<p class="mt-feed-threshold-note">Your contribution helps the group reach the ${escapeHtml(
              threshold,
            )} threshold.</p>`
          : '<p class="mt-feed-threshold-note">Your contribution joins the group route.</p>'
        : "";
    const visibleSignals = [
      `<span class="mt-feed-signal is-fit">${escapeHtml(
        recommendation.actionFitLabel,
      )}</span>`,
      `<span class="mt-feed-signal">${escapeHtml(
        recommendation.difficultyLabel,
      )} effort</span>`,
      threshold
        ? `<span class="mt-feed-signal">${escapeHtml(threshold)} threshold</span>`
        : "",
    ]
      .filter(Boolean)
      .join("");
    const detailRows = [
      recommendation.summary
        ? `<div><dt>About</dt><dd>${escapeHtml(recommendation.summary)}</dd></div>`
        : "",
      recommendation.duration
        ? `<div><dt>Timing</dt><dd>${escapeHtml(recommendation.duration)}</dd></div>`
        : "",
      recommendation.verification
        ? `<div><dt>Evidence</dt><dd>${escapeHtml(recommendation.verification)}</dd></div>`
        : "",
    ]
      .filter(Boolean)
      .join("");

    return `<article class="story mt-feed-card mt-feed-card--${visual.key}" data-mt-live-now-recommendation="${escapeHtml(
      recommendation.id,
    )}" data-opportunity-type="${escapeHtml(
      recommendation.opportunityType,
    )}" data-generated="${
      recommendation.origin === "platform_generated" ? "true" : "false"
    }" data-opportunity-id="${escapeHtml(recommendation.id)}" data-rank="${rank}">
      <div class="mt-feed-type-rail" aria-hidden="true"><span>${escapeHtml(
        visual.symbol,
      )}</span></div>
      <div class="mt-feed-card-main">
        <div class="mt-feed-card-head">
          <span class="mt-feed-type-label"><i aria-hidden="true">${escapeHtml(
            visual.symbol,
          )}</i>${escapeHtml(visual.label)}</span>
          <span class="mt-feed-owner-line">${escapeHtml(
            recommendation.ownerAlias,
          )} · ${escapeHtml(
            recommendation.reason || `Matches ${recommendation.matchCause}`,
          )}</span>
          <button class="mt-feed-bookmark${
            recommendation.saved ? " is-active" : ""
          }" type="button" data-action="save" aria-pressed="${
            recommendation.saved ? "true" : "false"
          }" aria-label="${
            recommendation.saved ? "Remove saved opportunity" : "Save opportunity"
          }" title="${escapeHtml(savedLabel)}">${recommendation.saved ? "★" : "☆"}</button>
        </div>
        <h3>${escapeHtml(recommendation.offeredCause)}</h3>
        <div class="mt-feed-mechanism" aria-label="${escapeHtml(
          `${visual.label}: ${requestedAction} for ${unlockedOutcome}`,
        )}">
          <div class="mt-feed-mechanism-node"><span>${escapeHtml(
            visual.fromLabel,
          )}</span><b>${escapeHtml(requestedAction)}</b></div>
          <div class="mt-feed-mechanism-arrow" aria-hidden="true">${escapeHtml(
            visual.connector,
          )}</div>
          <div class="mt-feed-mechanism-node is-outcome"><span>${escapeHtml(
            visual.toLabel,
          )}</span><b>${escapeHtml(unlockedOutcome)}</b></div>
        </div>
        ${publicGoodsNote}
        <div class="mt-feed-signal-row">${visibleSignals}</div>
        <details class="mt-feed-details">
          <summary>Why this match <span aria-hidden="true">＋</span></summary>
          <div class="mt-feed-details-grid">
            <div class="mt-feed-why"><strong>Why it fits</strong><ul>${whyList(
              recommendation,
            )}</ul></div>
            ${
              detailRows
                ? `<dl class="mt-feed-terms">${detailRows}</dl>`
                : '<p class="mt-feed-detail-empty">Open the opportunity to review its full terms.</p>'
            }
          </div>
        </details>
      </div>
      <div class="mt-feed-actions">
        <a class="btn primary" href="${escapeHtml(
          recommendation.href,
        )}" data-action="open">${escapeHtml(recommendation.ctaLabel)} →</a>
        <span class="mt-feed-fit-label">${fitMeter(recommendation)}${escapeHtml(
          recommendation.actionFitLabel,
        )}</span>
        <details class="mt-feed-overflow">
          <summary aria-label="Tune this recommendation">•••</summary>
          <div>
            <strong>Help the feed learn</strong>
            <button class="mt-feed-feedback" type="button" data-action="easy" aria-pressed="false">Easy for me</button>
            <button class="mt-feed-feedback" type="button" data-action="hard" aria-pressed="false">Hard for me</button>
            <button class="mt-feed-feedback is-muted" type="button" data-action="not_for_me">Less like this</button>
          </div>
        </details>
      </div>
    </article>`;
  }

  function ownedOpportunityCard(opportunity) {
    const visual = opportunityVisual(opportunity.opportunityType);
    const detailRows = [
      opportunity.summary
        ? '<div><dt>About</dt><dd>' + escapeHtml(opportunity.summary) + '</dd></div>'
        : "",
      opportunity.duration
        ? '<div><dt>Timing</dt><dd>' + escapeHtml(opportunity.duration) + '</dd></div>'
        : "",
      opportunity.verification
        ? '<div><dt>Evidence</dt><dd>' + escapeHtml(opportunity.verification) + '</dd></div>'
        : "",
    ]
      .filter(Boolean)
      .join("");

    return [
      '<article class="story mt-owned-card mt-feed-card--',
      visual.key,
      '" data-owned-opportunity-id="',
      escapeHtml(opportunity.id),
      '"><div class="mt-feed-type-rail" aria-hidden="true"><span>',
      escapeHtml(visual.symbol),
      '</span></div><div class="mt-feed-card-main"><div class="mt-feed-card-head">',
      '<span class="mt-feed-type-label"><i aria-hidden="true">',
      escapeHtml(visual.symbol),
      "</i>",
      escapeHtml(visual.label),
      '</span><span class="mt-feed-owner-line">Your listing · ',
      escapeHtml(opportunity.sourceLabel),
      '</span><span class="mt-owned-status">Live</span></div><h3>',
      escapeHtml(opportunity.offeredCause),
      '</h3><div class="mt-feed-mechanism"><div class="mt-feed-mechanism-node"><span>You offer</span><b>',
      escapeHtml(opportunity.offerAction || opportunity.offeredCause),
      '</b></div><div class="mt-feed-mechanism-arrow" aria-hidden="true">→</div>',
      '<div class="mt-feed-mechanism-node is-outcome"><span>You seek</span><b>',
      escapeHtml(opportunity.requestAction || opportunity.requestedCause),
      '</b></div></div><div class="mt-feed-signal-row"><span class="mt-feed-signal">Shown here as your own listing, not as a match</span></div>',
      detailRows
        ? '<details class="mt-feed-details"><summary>Listing details <span aria-hidden="true">＋</span></summary><div class="mt-feed-details-grid"><dl class="mt-feed-terms">' +
            detailRows +
            "</dl></div></details>"
        : "",
      '</div><div class="mt-feed-actions mt-owned-actions"><a class="btn primary" href="',
      escapeHtml(opportunity.href),
      '">',
      escapeHtml(opportunity.ctaLabel),
      ' →</a><a class="mt-feed-feedback" href="/offers/',
      escapeHtml(encodeURIComponent(opportunity.id)),
      '">View public listing</a></div></article>',
    ].join('');
  }

  function renderOwnedOpportunities() {
    if (!model.ownedOpportunities.length) return '';

    return [
      '<section class="mt-owned-feed" aria-label="Your live listings">',
      '<div class="mt-owned-feed-heading"><div><div class="eyebrow blue">Your live routes</div>',
      '<h3>Manage or invite people.</h3></div>',
      '<a class="btn ghost small" href="/dashboard#my-trades">View all your listings →</a></div>',
      '<div class="mt-owned-feed-cards">',
      model.ownedOpportunities.map(ownedOpportunityCard).join(''),
      '</div></section>',
    ].join('');
  }

  function sidePanel(title, items, footer) {
    const rows = items.length
      ? items
          .map(
            (item) =>
              `<div class="side-row"><i class="dot info"></i><div>${escapeHtml(
                item,
              )}</div></div>`,
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
        title: "Sign in to see a feed based on your moral priorities.",
        copy: "This page does not guess your priorities or substitute demo recommendations.",
        facts: ["No profile loaded", "No recommendations shown"],
        primaryHref:
          window.location.pathname === "/feed"
            ? "/login?returnTo=%2Ffeed"
            : "/login?returnTo=%2F",
        primaryLabel: "Sign in →",
        secondaryHref: "/offers?view=live",
        secondaryLabel: "Browse all live proposals →",
      };
    }

    if (model.status === "profile_incomplete") {
      return {
        eyebrow: "Profile needs priorities",
        title: "Set your moral priorities to personalize the feed.",
        copy:
          "Rank cause areas, set the trade formats you are open to, and the platform will begin learning which actions are realistic for you.",
        facts: ["Signed in", "No cause priorities saved"],
        primaryHref: "/complete-profile",
        primaryLabel: "Set priorities →",
        secondaryHref: "/offers?view=live",
        secondaryLabel: "Browse without personalization →",
      };
    }

    if (model.status === "no_matches") {
      const causeSummary = model.profile.causes.slice(0, 3).join(", ");
      const ownListingsCopy = model.ownedOpportunities.length
        ? " Your own live routes remain available below for sharing and invitations."
        : "";
      return {
        eyebrow: "Profile checked against live inventory",
        title: "No open opportunity currently matches your profile.",
        copy: causeSummary
          ? `We checked other participants' proposals and donation redirects against ${causeSummary}. No filler suggestions were added.` +
            ownListingsCopy
          : "No filler suggestions were added." + ownListingsCopy,
        facts: [
          `${model.profile.causes.length} profile ${
            model.profile.causes.length === 1 ? "priority" : "priorities"
          } checked`,
          "0 matching live opportunities",
        ],
        primaryHref: browseHref(""),
        primaryLabel: "Browse all opportunities →",
        secondaryHref: "/complete-profile",
        secondaryLabel: "Adjust priorities →",
      };
    }

    return {
      eyebrow: "Personal suggestions unavailable",
      title: "Your recommendation feed could not load.",
      copy:
        "No generic or fabricated suggestions are shown while profile matching is unavailable.",
      facts: ["Profile data not displayed", "No fallback claims"],
      primaryHref: "/moral-trade-live.html#now",
      primaryLabel: "Try again →",
      secondaryHref: "/offers?view=live",
      secondaryLabel: "Browse all live proposals →",
    };
  }

  function renderEmptyState() {
    const content = emptyStateContent();

    return `<div class="focus-layout" data-mt-live-now="adaptive" data-mt-live-now-state="${escapeHtml(
      model.status,
    )}"><main>
      <section class="panel black urgent">
        <div><div class="eyebrow orange">${escapeHtml(
          content.eyebrow,
        )}</div><h2>${escapeHtml(content.title)}</h2><p class="muted">${escapeHtml(
          content.copy,
        )}</p></div>
        <div class="terms">${content.facts
          .map(
            (fact, index) =>
              `<div><span class="eyebrow">${
                index === 0 ? "Profile state" : "Feed state"
              }</span><strong>${escapeHtml(fact)}</strong></div>`,
          )
          .join("")}</div>
        <div class="stack"><a class="btn primary" href="${escapeHtml(
          content.primaryHref,
        )}">${escapeHtml(content.primaryLabel)}</a><a class="btn ghost" href="${escapeHtml(
          content.secondaryHref,
        )}">${escapeHtml(content.secondaryLabel)}</a></div>
      </section>
      ${renderOwnedOpportunities()}
      <section class="panel attention">
        <div class="iconbox bluebg">◎</div>
        <div class="lead"><div class="eyebrow blue">How matching works</div><h3>Your priorities select the benefit. Your action model estimates the burden.</h3></div>
        <div><b>Explicit preferences outrank inferred signals.</b><p class="muted" style="font-size:11px">Browsing can refine the feed only when learning is on. Easy/hard feedback corrects action estimates directly.</p></div>
        <a class="btn" href="/complete-profile">Review profile →</a>
      </section>
    </main><aside class="stack">
      ${sidePanel("Profile basis", model.profile.causes, "")}
      ${sidePanel(
        "Feed rule",
        ["No guessed priorities", "No demo records", "No invented counterparties"],
        "",
      )}
    </aside></div>`;
  }

  function weightedPriorityChips() {
    const causes = model.profile.weightedCauses.length
      ? model.profile.weightedCauses.slice(0, 6)
      : model.profile.causes.slice(0, 6).map((cause, index) => ({
          cause,
          weight: Math.max(40, 85 - index * 8),
          source: "profile_priority",
          rank: index + 1,
        }));
    return causes
      .map(
        (cause) =>
          `<span class="mt-feed-priority"><b>${
            cause.rank ? `#${escapeHtml(cause.rank)}` : "Learned"
          }</b> ${escapeHtml(cause.cause)} · ${escapeHtml(
            sourceLabel(cause.source),
          )}</span>`,
      )
      .join("");
  }

  function opportunityTypeLegend() {
    const counts = new Map([
      ["suggested", 0],
      ["offer", 0],
      ["donation_redirect", 0],
      ["donation_pool", 0],
    ]);
    model.recommendations.forEach((recommendation) => {
      const key =
        recommendation.origin === "platform_generated"
          ? "suggested"
          : recommendation.opportunityType;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()]
      .filter(([, count]) => count > 0)
      .map(([type, count]) => {
        const visual =
          type === "suggested"
            ? opportunityVisual("offer", true)
            : opportunityVisual(type, false);
        return `<span class="mt-feed-legend-item mt-feed-legend-item--${escapeHtml(
          visual.key,
        )}"><i aria-hidden="true">${escapeHtml(visual.symbol)}</i>${escapeHtml(
          visual.label,
        )}<b>${count}</b></span>`;
      })
      .join("");
  }

  function feedCompositionLabel() {
    const parts = [];
    if (model.matchingOpportunityCount > 0) {
      parts.push(
        `${model.matchingOpportunityCount} live ${
          model.matchingOpportunityCount === 1 ? "opportunity" : "opportunities"
        }`,
      );
    }
    if (model.suggestedOpportunityCount > 0) {
      parts.push(
        `${model.suggestedOpportunityCount} generated ${
          model.suggestedOpportunityCount === 1 ? "possibility" : "possibilities"
        }`,
      );
    }
    return parts.join(" · ") || "No opportunity inventory";
  }

  function renderReadyState() {
    const cards = model.recommendations
      .map((recommendation, index) => recommendationCard(recommendation, index + 1))
      .join("");

    return `<div class="focus-layout mt-feed-layout" data-mt-live-now="adaptive" data-mt-live-now-state="ready"><main class="mt-feed-main">
      <section class="mt-feed-toolbar" aria-label="Personalized feed controls">
        <div class="mt-feed-toolbar-title"><div class="eyebrow blue">For you</div><h2>Opportunities for you <span>${escapeHtml(
          String(model.feedOpportunityCount),
        )}</span></h2><p>${escapeHtml(formatRefreshTime(model.generatedAt))} · ${escapeHtml(
          feedCompositionLabel(),
        )}</p></div>
        <div class="mt-feed-legend" aria-label="Opportunity types in this feed">${opportunityTypeLegend()}</div>
        <details class="mt-feed-settings">
          <summary aria-label="Open feed settings">Tune feed <span aria-hidden="true">⚙</span></summary>
          <div class="mt-feed-settings-popover">
            <div><strong>Your priorities</strong><div class="mt-feed-priority-row" aria-label="Priority signals used">${weightedPriorityChips()}</div></div>
            <div class="mt-feed-header-controls"><button class="mt-feed-control" type="button" data-feed-control="learning" aria-pressed="${
              model.profile.learningEnabled ? "true" : "false"
            }">Learn from browsing: ${
              model.profile.learningEnabled ? "on" : "off"
            }</button><button class="mt-feed-control" type="button" data-feed-control="clear">Clear learned signals</button></div>
            <p class="mt-feed-privacy-note">The feed stores typed in-product signals, not raw browsing URLs or page content.</p>
            <div class="mt-feed-settings-links"><a href="/complete-profile">Edit priorities</a><a href="/dashboard#wish-profile">Participation settings</a></div>
          </div>
        </details>
      </section>
      <section class="mt-social-feed" aria-label="Personalized moral opportunities">${cards}</section>
      ${renderOwnedOpportunities()}
    </main><div class="mt-feed-toast" role="status" aria-live="polite"></div></div>`;
  }

  function feedbackId(prefix) {
    const random =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    return `${prefix}:${random}`.slice(0, 160);
  }

  function postFeedback(payload) {
    if (typeof fetch !== "function") return Promise.resolve(null);
    return fetch("/api/live-now/feedback", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then((response) => {
        if (!response.ok) return null;
        return response.json().catch(() => ({ accepted: true }));
      })
      .catch(() => null);
  }

  function feedbackEventAccepted(result) {
    return Boolean(result && Number(result.acceptedEventCount) >= 1);
  }

  function showToast(root, message) {
    const toast = root.querySelector(".mt-feed-toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("is-visible");
    const priorTimer = Number(toast.dataset.timer || 0);
    if (priorTimer && typeof clearTimeout === "function") clearTimeout(priorTimer);
    if (typeof setTimeout !== "function") return;
    const timer = setTimeout(() => toast.classList.remove("is-visible"), 2200);
    toast.dataset.timer = String(timer);
  }

  function eventForCard(card, eventType) {
    return {
      opportunityType: card.dataset.opportunityType,
      opportunityId: card.dataset.opportunityId,
      eventType,
      idempotencyKey: feedbackId(eventType),
      metadata: {
        surface: "home_feed",
        rank: Number(card.dataset.rank || 0),
      },
    };
  }

  function setPreferencePending(card, pending) {
    card
      .querySelectorAll(
        '[data-action="save"],[data-action="easy"],[data-action="hard"],[data-action="not_for_me"]',
      )
      .forEach((control) => {
        if (pending) control.setAttribute("disabled", "disabled");
        else control.removeAttribute("disabled");
      });
    card.classList.toggle("is-pending", pending);
  }

  function setSaveState(control, saved) {
    control.setAttribute("aria-pressed", saved ? "true" : "false");
    control.setAttribute(
      "aria-label",
      saved ? "Remove saved opportunity" : "Save opportunity",
    );
    control.setAttribute("title", saved ? "Saved" : "Save");
    control.classList.toggle("is-active", saved);
    control.textContent = saved ? "★" : "☆";
  }

  function syncReviewedBatchState(root) {
    const feed = root.querySelector(".mt-social-feed");
    if (!feed) return;
    const existing = feed.querySelector(".mt-feed-empty-inline");
    const visibleCards = feed.querySelectorAll(".mt-feed-card:not([hidden])");
    if (visibleCards.length) {
      if (existing) existing.remove();
      return;
    }
    if (!existing) {
      feed.insertAdjacentHTML(
        "beforeend",
        '<section class="panel mt-feed-empty-inline"><h3>You have reviewed this batch.</h3><p class="muted">Refresh later or adjust your priorities to see a different set.</p></section>',
      );
    }
  }

  function bindFeedInteractions() {
    if (!document || typeof document.querySelector !== "function") return;
    const root = document.querySelector('[data-mt-live-now="adaptive"]');
    if (!root || root.dataset.bound === "true") return;
    root.dataset.bound = "true";

    root.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target.closest("[data-action]") : null;
      if (!target) return;
      const card = target.closest("[data-opportunity-id]");
      if (!card) return;
      const action = target.getAttribute("data-action");
      if (!action) return;

      if (action === "open") {
        if (model.profile.learningEnabled) {
          void postFeedback({ events: [eventForCard(card, "open")] });
        }
        return;
      }

      if (action === "save") {
        const saved = target.getAttribute("aria-pressed") === "true";
        setSaveState(target, !saved);
        setPreferencePending(card, true);
        void postFeedback({
          events: [eventForCard(card, saved ? "unsave" : "save")],
        }).then((result) => {
          setPreferencePending(card, false);
          if (!feedbackEventAccepted(result)) {
            setSaveState(target, saved);
            showToast(root, "Could not save that change. Your feed was not updated.");
            return;
          }
          showToast(
            root,
            saved ? "Removed from saved signals." : "Saved. The feed will learn from this.",
          );
        });
        return;
      }

      if (action === "easy" || action === "hard") {
        const controls = [
          ...card.querySelectorAll('[data-action="easy"],[data-action="hard"]'),
        ];
        const priorState = controls.map((button) => ({
          button,
          pressed: button.getAttribute("aria-pressed") === "true",
          active: button.classList.contains("is-active"),
        }));
        controls.forEach((button) => {
          const active = button === target;
          button.classList.toggle("is-active", active);
          button.setAttribute("aria-pressed", active ? "true" : "false");
        });
        setPreferencePending(card, true);
        void postFeedback({ events: [eventForCard(card, action)] }).then((result) => {
          setPreferencePending(card, false);
          if (!feedbackEventAccepted(result)) {
            priorState.forEach(({ button, pressed, active }) => {
              button.setAttribute("aria-pressed", pressed ? "true" : "false");
              button.classList.toggle("is-active", active);
            });
            showToast(root, "Could not save that rating. Your feed was not updated.");
            return;
          }
          showToast(
            root,
            action === "easy"
              ? "Recorded as easy for you. Similar actions may rank higher."
              : "Recorded as hard for you. The burden model has been corrected.",
          );
        });
        return;
      }

      if (action === "not_for_me") {
        card.hidden = true;
        syncReviewedBatchState(root);
        setPreferencePending(card, true);
        void postFeedback({ events: [eventForCard(card, "not_for_me")] }).then(
          (result) => {
            setPreferencePending(card, false);
            if (!feedbackEventAccepted(result)) {
              card.hidden = false;
              syncReviewedBatchState(root);
              showToast(root, "Could not hide that opportunity. Your feed was not updated.");
              return;
            }
            showToast(root, "Removed. Similar opportunities will rank lower.");
          }
        );
      }
    });

    root.addEventListener("click", (event) => {
      const control =
        event.target instanceof Element ? event.target.closest("[data-feed-control]") : null;
      if (!control) return;
      const action = control.getAttribute("data-feed-control");

      if (action === "learning") {
        const wasEnabled = control.getAttribute("aria-pressed") === "true";
        const enabled = control.getAttribute("aria-pressed") !== "true";
        control.setAttribute("aria-pressed", enabled ? "true" : "false");
        control.textContent = `Learn from browsing: ${enabled ? "on" : "off"}`;
        model.profile.learningEnabled = enabled;
        control.setAttribute("disabled", "disabled");
        void postFeedback({ learningEnabled: enabled }).then((result) => {
          control.removeAttribute("disabled");
          if (!result) {
            control.setAttribute("aria-pressed", wasEnabled ? "true" : "false");
            control.textContent = `Learn from browsing: ${wasEnabled ? "on" : "off"}`;
            model.profile.learningEnabled = wasEnabled;
            showToast(root, "Could not change learning. Your feed was not updated.");
            return;
          }
          showToast(
            root,
            enabled
              ? "Browsing learning is on. Only typed in-product signals are stored."
              : "Browsing learning is paused. Explicit feedback still applies.",
          );
        });
      }

      if (action === "clear") {
        control.setAttribute("disabled", "disabled");
        if (typeof fetch !== "function") return;
        void fetch("/api/live-now/feedback", {
          method: "DELETE",
          credentials: "same-origin",
          headers: { Accept: "application/json" },
        })
          .then((response) => {
            if (!response.ok) throw new Error("clear");
            showToast(root, "Learned browsing and action signals cleared.");
            if (typeof location !== "undefined" && typeof location.reload === "function") {
              setTimeout(() => location.reload(), 450);
            }
          })
          .catch(() => {
            control.removeAttribute("disabled");
            showToast(root, "Learned signals could not be cleared.");
          });
      }
    });
  }

  window.nowFocus = function renderAdaptiveNow() {
    return model.status === "ready" ? renderReadyState() : renderEmptyState();
  };

  if (typeof window.render === "function") {
    window.render();
  }

  if (typeof setTimeout === "function") {
    setTimeout(bindFeedInteractions, 0);
  } else {
    bindFeedInteractions();
  }

  document.documentElement.setAttribute("data-mt-live-now-ready", model.status);
  window.dispatchEvent(
    new CustomEvent("mt:live-now-ready", { detail: { status: model.status } }),
  );
})();
