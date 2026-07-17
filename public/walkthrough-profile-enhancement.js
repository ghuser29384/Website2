(function enhanceMoralTradeWalkthrough() {
  "use strict";

  if (window.__MT_WALKTHROUGH_PROFILE_ENHANCED__) return;
  window.__MT_WALKTHROUGH_PROFILE_ENHANCED__ = true;

  const STORAGE_KEY = "mt_walkthrough_profile_draft";
  const COOKIE_NAME = "mt_walkthrough_profile_draft";
  const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
  const causeAreaMap = {
    "Wild animal suffering": "Animal welfare",
    "Factory farming": "Animal welfare",
    "Global health": "Public health",
    Climate: "Climate",
    "Existential risk": "Existential risk",
    "Future flourishing": "Future flourishing",
    "S-risks": "Future flourishing",
    "Global poverty": "Global poverty",
    "Concentration of power": "Cause prioritization",
    "Priorities research": "Cause prioritization",
    "Biological risks": "Existential risk",
    "AI safety": "Existential risk",
    "Space governance": "Future flourishing",
    "Building altruism": "Community service"
  };

  const session = {
    cause: null,
    offerType: null,
    match: null,
    draft: null
  };

  function clean(value, maxLength) {
    return String(value || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength || 160);
  }

  function readStoredDraft() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && parsed.source === "walkthrough" ? parsed : null;
    } catch (error) {
      console.warn("Moral Trade could not read the starter profile draft.", error);
      return null;
    }
  }

  function clearDraft() {
    session.draft = null;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Moral Trade could not clear the previous starter profile draft.", error);
    }
  }

  function captureMatch(control) {
    const selectedCard =
      document.querySelector('.match-card[aria-pressed="true"]') ||
      (control && control.closest ? control.closest(".match-card") : null);
    if (!selectedCard) return null;

    const exchangeValues = selectedCard.querySelectorAll(".match-exchange strong");
    const name = clean(selectedCard.querySelector(".match-name")?.textContent, 80);
    if (!name) return null;

    return {
      name,
      get: clean(exchangeValues[0]?.textContent),
      give: clean(exchangeValues[1]?.textContent)
    };
  }

  function buildDraft() {
    const stored = readStoredDraft();
    const originalCause =
      clean(session.cause, 80) || clean(stored?.originalCause, 80) || "Cause prioritization";
    const causeArea = causeAreaMap[originalCause] || "Cause prioritization";
    const match = session.match || stored;
    const offerType = clean(session.offerType, 40) || clean(stored?.offerType, 40) || "Money";

    if (!match || !clean(match.name || match.matchName, 80)) return null;

    const draft = {
      version: 1,
      source: "walkthrough",
      originalCause,
      causeArea,
      offerType,
      matchName: clean(match.name || match.matchName, 80),
      matchGet: clean(match.get || match.matchGet),
      matchGive: clean(match.give || match.matchGive),
      participantKind: "individual",
      primaryGoal: "find_counterparty",
      firstAction: "create_broad_preview",
      createdAt: new Date().toISOString()
    };

    const query = new URLSearchParams({
      source: "walkthrough",
      cause_area: draft.causeArea,
      walkthrough_cause: draft.originalCause,
      offer_type: draft.offerType,
      match_name: draft.matchName,
      match_get: draft.matchGet,
      match_give: draft.matchGive
    });
    draft.onboardingPath = `/onboarding?${query.toString()}`;
    return draft;
  }

  function persistDraft() {
    const draft = buildDraft();
    if (!draft) return null;

    session.draft = draft;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch (error) {
      console.warn("Moral Trade could not save the starter profile in local storage.", error);
    }

    try {
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `${COOKIE_NAME}=${encodeURIComponent(JSON.stringify(draft))}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
    } catch (error) {
      console.warn("Moral Trade could not save the starter profile cookie.", error);
    }

    return draft;
  }

  function appendTag(container, text) {
    const tag = document.createElement("span");
    tag.textContent = text;
    container.appendChild(tag);
  }

  function renderProfilePrompt() {
    const successCopy = document.querySelector(".match-scene .success-copy");
    const finalHeading = successCopy?.querySelector(".scene-title");
    if (!successCopy || !finalHeading?.textContent?.includes("The market starts")) return;
    if (successCopy.querySelector(".mt-profile-draft")) return;

    const draft = session.draft || persistDraft();
    if (!draft) return;

    successCopy.querySelector(".conversion-deck")?.remove();

    const card = document.createElement("section");
    card.className = "mt-profile-draft";
    card.setAttribute("aria-labelledby", "mt-profile-draft-title");
    card.dataset.walkthroughProfile = "created";

    const copy = document.createElement("div");
    copy.className = "mt-profile-draft-copy";

    const kicker = document.createElement("span");
    kicker.className = "mt-profile-draft-kicker";
    kicker.textContent = "Starter profile created";

    const heading = document.createElement("h2");
    heading.id = "mt-profile-draft-title";
    heading.textContent = "Finish the missing details and create your account.";

    const description = document.createElement("p");
    description.textContent =
      "We added your cause, offer type, and this illustrative match. Nothing is public until you review and save it.";

    const tags = document.createElement("div");
    tags.className = "mt-profile-draft-tags";
    tags.setAttribute("aria-label", "Starter profile contents");
    appendTag(tags, draft.causeArea);
    appendTag(tags, draft.offerType);
    appendTag(tags, `${draft.matchName} match`);

    copy.append(kicker, heading, description, tags);

    const action = document.createElement("a");
    action.className = "mt-profile-draft-action";
    action.href = draft.onboardingPath;
    action.innerHTML = "<span>Complete profile</span><span aria-hidden=\"true\">→</span>";

    card.append(copy, action);
    successCopy.appendChild(card);
    action.focus({ preventScroll: true });
  }

  function keepWelcomeCaption() {
    const firstTab = document.querySelector('.concept-tab[data-index="0"][aria-selected="true"]');
    const captionTitle = document.querySelector("#concept-caption strong");
    if (firstTab && captionTitle && captionTitle.textContent !== "Welcome to Moral Trade") {
      captionTitle.textContent = "Welcome to Moral Trade";
    }
  }

  document.addEventListener("click", function handleWalkthroughClick(event) {
    const control = event.target.closest?.("[data-action]");
    if (!control) return;

    const action = control.dataset.action;
    if (action === "choose-cause") {
      session.cause = clean(control.dataset.value, 80);
      clearDraft();
    }

    if (action === "choose-offer") {
      session.offerType = clean(control.dataset.value, 40);
      session.match = null;
      clearDraft();
    }

    if (action === "choose-match") {
      session.match = captureMatch(control);
      clearDraft();
    }

    if (action === "open-match") {
      if (!session.match) session.match = captureMatch(control);
      persistDraft();
      window.setTimeout(renderProfilePrompt, 0);
    }
  });

  const observer = new MutationObserver(function handleWalkthroughRender() {
    keepWelcomeCaption();
    if (document.querySelector(".match-scene .success-copy")) renderProfilePrompt();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  keepWelcomeCaption();
})();
