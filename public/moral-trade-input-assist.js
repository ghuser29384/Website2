(function moralTradeInputAssistBootstrap() {
  "use strict";

  if (window.__MT_INPUT_ASSIST_STARTED__) return;
  window.__MT_INPUT_ASSIST_STARTED__ = true;

  const CATALOG_URL = "/moral-trade-input-standards.json";
  const MAX_RESULTS = 7;
  const AUTO_RESOLVE_DELAY_MS = 650;
  const AUTO_RESOLVE_MIN_CONFIDENCE = 0.88;
  const AUTO_RESOLVE_MIN_MARGIN = 0.08;
  const MAX_TOPIC_TOKENS = 8;
  const WEBSITE_PATTERN =
    /\b((?:https?:\/\/|www\.)[^\s<>"']+|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:org|com|net|io|edu|gov)(?:\/[^\s<>"']*)?)/gi;
  const TRAILING_PUNCTUATION = /[),.;:!?\]}]+$/;
  const CONTEXT_KEYS = [
    "priorities",
    "commitments",
    "evidence",
    "durations",
    "baselines",
    "exits",
    "organizations",
  ];
  const STOP_WORDS = new Set([
    "a",
    "an",
    "and",
    "at",
    "by",
    "for",
    "from",
    "in",
    "of",
    "on",
    "or",
    "the",
    "to",
    "with",
  ]);
  const TOPIC_STOP_WORDS = new Set([
    ...STOP_WORDS,
    "about",
    "agreed",
    "do",
    "fixed",
    "help",
    "i",
    "if",
    "into",
    "ll",
    "me",
    "my",
    "one",
    "please",
    "project",
    "some",
    "task",
    "that",
    "this",
    "through",
    "undertake",
    "will",
    "work",
    "would",
  ]);
  const GENERIC_TOPIC_WORDS = new Set([
    "action",
    "article",
    "brief",
    "campaign",
    "class",
    "course",
    "deliverable",
    "document",
    "feature",
    "hours",
    "lesson",
    "module",
    "output",
    "paper",
    "prototype",
    "report",
    "session",
    "shift",
    "summary",
  ]);
  const AUTO_RESOLVE_CONTEXTS = new Set([
    "priorities",
    "recipients",
    "commitments",
    "evidence",
    "durations",
    "baselines",
    "exits",
    "organizations",
  ]);

  let catalog = null;
  let activeControl = null;
  let activeResults = [];
  let activeIndex = -1;
  let suggestionPanel = null;
  let hoverCard = null;
  let correctionNotice = null;
  let correctionNoticeTimer = 0;
  let hoverTimer = 0;
  let hideTimer = 0;

  const preparedControls = new WeakSet();
  const preparedDateControls = new WeakSet();
  const preparedForms = new WeakSet();
  const websitePreviews = new WeakMap();
  const correctionTimers = new WeakMap();
  const ignoredCorrectionValues = new WeakMap();
  const ignoredCorrectionKeys = new Map();
  const composingControls = new WeakSet();

  function normalize(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function tokens(value) {
    return normalize(value)
      .split(/\s+/)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token));
  }

  function editDistance(leftValue, rightValue) {
    const left = normalize(leftValue).slice(0, 160);
    const right = normalize(rightValue).slice(0, 160);
    if (left === right) return 0;
    if (!left) return right.length;
    if (!right) return left.length;

    let previousPrevious = null;
    let previous = Array.from({ length: right.length + 1 }, (_, index) => index);

    for (let row = 1; row <= left.length; row += 1) {
      const current = new Array(right.length + 1).fill(0);
      current[0] = row;
      for (let column = 1; column <= right.length; column += 1) {
        const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
        current[column] = Math.min(
          previous[column] + 1,
          current[column - 1] + 1,
          previous[column - 1] + substitutionCost,
        );
        if (
          previousPrevious &&
          row > 1 &&
          column > 1 &&
          left[row - 1] === right[column - 2] &&
          left[row - 2] === right[column - 1]
        ) {
          current[column] = Math.min(
            current[column],
            previousPrevious[column - 2] + substitutionCost,
          );
        }
      }
      previousPrevious = previous;
      previous = current;
    }

    return previous[right.length];
  }

  function similarity(leftValue, rightValue) {
    const left = normalize(leftValue);
    const right = normalize(rightValue);
    const longest = Math.max(left.length, right.length);
    if (!longest) return 1;
    return Math.max(0, 1 - editDistance(left, right) / longest);
  }

  function candidatePhrases(suggestion) {
    return [suggestion.label, ...(Array.isArray(suggestion.aliases) ? suggestion.aliases : [])]
      .map(normalize)
      .filter(Boolean);
  }

  function contiguousPhraseSimilarity(queryValue, candidateValue) {
    const queryTokens = normalize(queryValue).split(/\s+/).filter(Boolean);
    const candidateTokens = normalize(candidateValue).split(/\s+/).filter(Boolean);
    if (!queryTokens.length || !candidateTokens.length) return 0;

    let best = similarity(queryValue, candidateValue);
    const minimumWindow = Math.max(1, candidateTokens.length - 1);
    const maximumWindow = Math.min(queryTokens.length, candidateTokens.length + 1);
    for (let width = minimumWindow; width <= maximumWindow; width += 1) {
      for (let start = 0; start + width <= queryTokens.length; start += 1) {
        best = Math.max(
          best,
          similarity(queryTokens.slice(start, start + width).join(" "), candidateValue),
        );
      }
    }
    return best;
  }

  function phraseConfidence(queryValue, candidateValue) {
    const query = normalize(queryValue);
    const candidate = normalize(candidateValue);
    if (!query || !candidate) return 0;
    if (query === candidate) return 1;

    const queryTokens = query.split(" ");
    const candidateTokens = candidate.split(" ");
    if (
      query.startsWith(candidate) &&
      queryTokens.length <= candidateTokens.length + 1 &&
      query.length - candidate.length <= Math.max(6, Math.ceil(candidate.length * 0.4))
    ) {
      return 0.94;
    }
    if (
      candidate.startsWith(query) &&
      candidate.length - query.length <= Math.max(2, Math.ceil(candidate.length * 0.16))
    ) {
      return 0.9;
    }

    const distance = editDistance(query, candidate);
    const longest = Math.max(query.length, candidate.length);
    if (distance === 1 && longest >= 5) return 0.93;
    if (distance === 2 && longest >= 12) return 0.9;
    return similarity(query, candidate);
  }

  function suggestionValue(suggestion) {
    return String(suggestion.value || suggestion.label || "").trim();
  }

  function searchableText(suggestion) {
    return normalize(
      [
        suggestion.label,
        suggestion.value,
        suggestion.description,
        ...(Array.isArray(suggestion.aliases) ? suggestion.aliases : []),
      ].join(" "),
    );
  }

  function scoreSuggestion(suggestion, query) {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return 1;

    const label = normalize(suggestion.label);
    const value = normalize(suggestion.value);
    const aliases = (suggestion.aliases || []).map(normalize);
    const haystack = searchableText(suggestion);
    const queryTokens = tokens(query);
    let score = 0;

    if (label === normalizedQuery) score += 120;
    if (label.startsWith(normalizedQuery)) score += 90;
    if (aliases.some((alias) => alias.startsWith(normalizedQuery))) score += 76;
    if (label.includes(normalizedQuery)) score += 62;
    if (value.includes(normalizedQuery)) score += 46;
    if (aliases.some((alias) => alias.includes(normalizedQuery))) score += 52;

    for (const token of queryTokens) {
      if (label.split(" ").some((word) => word.startsWith(token))) score += 24;
      if (aliases.some((alias) => alias.split(" ").some((word) => word.startsWith(token)))) {
        score += 20;
      }
      if (haystack.includes(token)) score += 8;
    }

    const fuzzyConfidence = Math.max(
      0,
      ...candidatePhrases(suggestion).map((candidate) =>
        contiguousPhraseSimilarity(normalizedQuery, candidate),
      ),
    );
    if (fuzzyConfidence >= 0.58) score += Math.round(fuzzyConfidence * 70);

    return score;
  }

  function resolveCanonicalMatch(context, query) {
    const normalizedQuery = normalize(query);
    if (
      !AUTO_RESOLVE_CONTEXTS.has(context) ||
      normalizedQuery.length < 3 ||
      normalizedQuery.length > 120
    ) {
      return null;
    }

    const canonicalEntries =
      context === "recipients"
        ? [...entriesForContext("priorities"), ...entriesForContext("organizations")]
        : entriesForContext(context);
    const ranked = canonicalEntries
      .map((suggestion, catalogIndex) => {
        const confidence = Math.max(
          0,
          ...candidatePhrases(suggestion).map((candidate) => {
            const queryTokenCount = normalizedQuery.split(" ").length;
            const candidateTokenCount = candidate.split(" ").length;
            if (queryTokenCount > candidateTokenCount + 1) return 0;
            if (candidateTokenCount > queryTokenCount + 1) return 0;
            if (
              normalizedQuery.length >
              candidate.length + Math.max(6, Math.ceil(candidate.length * 0.4))
            ) {
              return 0;
            }
            return phraseConfidence(normalizedQuery, candidate);
          }),
        );
        return { catalogIndex, confidence, suggestion };
      })
      .filter((entry) => entry.confidence >= AUTO_RESOLVE_MIN_CONFIDENCE)
      .sort(
        (left, right) =>
          right.confidence - left.confidence || left.catalogIndex - right.catalogIndex,
      );

    const best = ranked[0];
    if (!best) return null;
    const next = ranked[1];
    if (next && best.confidence - next.confidence < AUTO_RESOLVE_MIN_MARGIN) return null;

    const canonicalValue = suggestionValue(best.suggestion);
    if (!canonicalValue || normalize(canonicalValue) === normalizedQuery) return null;
    return {
      ...best.suggestion,
      canonicalValue,
      confidence: best.confidence,
    };
  }

  function commitmentIntents() {
    return catalog && Array.isArray(catalog.commitmentIntents)
      ? catalog.commitmentIntents
      : [];
  }

  function intentMatch(intent, query) {
    const normalizedQuery = normalize(query);
    const queryTokens = normalizedQuery.split(" ").filter(Boolean);
    let best = 0;
    let matchedAlias = "";

    for (const aliasValue of [intent.key, ...(intent.aliases || [])]) {
      const alias = normalize(aliasValue);
      if (!alias) continue;
      const surroundedQuery = ` ${normalizedQuery} `;
      if (surroundedQuery.includes(` ${alias} `)) {
        const exactScore = 1 + Math.min(0.08, alias.length / 500);
        if (exactScore > best) {
          best = exactScore;
          matchedAlias = alias;
        }
        continue;
      }

      const aliasTokens = alias.split(" ");
      const width = aliasTokens.length;
      for (let start = 0; start + width <= queryTokens.length; start += 1) {
        const candidate = queryTokens.slice(start, start + width).join(" ");
        const candidateSimilarity = similarity(candidate, alias);
        const minimum = alias.length <= 4 ? 0.79 : 0.72;
        if (candidateSimilarity >= minimum && candidateSimilarity > best) {
          best = candidateSimilarity;
          matchedAlias = candidate;
        }
      }
    }

    return best >= 0.72 ? { intent, matchedAlias, score: best } : null;
  }

  function matchedCommitmentIntents(query) {
    return commitmentIntents()
      .map((intent, index) => {
        const match = intentMatch(intent, query);
        return match ? { ...match, index } : null;
      })
      .filter(Boolean)
      .sort((left, right) => right.score - left.score || left.index - right.index);
  }

  function priorityPhraseMatches(query) {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery || !catalog || !Array.isArray(catalog.priorities)) return [];

    return catalog.priorities
      .map((priority, index) => {
        let score = 0;
        let matchedPhrase = "";
        const phrases = candidatePhrases(priority);
        phrases.forEach((phrase, phraseIndex) => {
          const exactPhrase = ` ${normalizedQuery} `.includes(` ${phrase} `);
          const phraseScore = exactPhrase
            ? (phraseIndex === 0 ? 1.08 : 1) + Math.min(0.08, phrase.length / 500)
            : contiguousPhraseSimilarity(normalizedQuery, phrase);
          if (phraseScore > score) {
            score = phraseScore;
            matchedPhrase = phrase;
          }
        });
        return { index, matchedPhrase, priority, score };
      })
      .filter((entry) => entry.score >= 0.78)
      .sort((left, right) => right.score - left.score || left.index - right.index);
  }

  function canonicalPriorityTopic(query, excludedPhrases = new Set()) {
    const matches = priorityPhraseMatches(query).filter(
      (entry) => !excludedPhrases.has(entry.matchedPhrase),
    );
    const best = matches[0];
    if (!best) return "";
    const next = matches[1];
    if (next && best.score - next.score < 0.06) return "";
    return String(best.priority.label || "")
      .trim()
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function inferredTopic(query, intentMatchResult, topicHint = "") {
    const actionAliases = new Set();
    if (intentMatchResult) {
      [intentMatchResult.intent.key, ...(intentMatchResult.intent.aliases || [])].forEach(
        (aliasValue) => {
          normalize(aliasValue)
            .split(" ")
            .filter(Boolean)
            .forEach((token) => actionAliases.add(token));
        },
      );
    }
    const canonicalTopic = canonicalPriorityTopic(query, actionAliases);
    if (canonicalTopic) return canonicalTopic;

    const normalizedQuery = normalize(query);
    const residualTokens = normalizedQuery
      .split(" ")
      .filter(Boolean)
      .filter((token) => !TOPIC_STOP_WORDS.has(token))
      .filter((token) => !GENERIC_TOPIC_WORDS.has(token))
      .filter((token) => !/^\d+(?:\.\d+)?$/.test(token))
      .filter(
        (token) =>
          ![...actionAliases].some(
            (aliasToken) =>
              token === aliasToken ||
              (Math.max(token.length, aliasToken.length) >= 5 &&
                similarity(token, aliasToken) >= 0.72),
          ),
      )
      .slice(0, MAX_TOPIC_TOKENS);
    const residual = residualTokens.join(" ").trim();
    if (residual) return residual;

    const canonicalHint = canonicalPriorityTopic(topicHint);
    if (canonicalHint) return canonicalHint;
    return normalize(topicHint)
      .split(" ")
      .filter((token) => token && !TOPIC_STOP_WORDS.has(token))
      .slice(0, MAX_TOPIC_TOKENS)
      .join(" ");
  }

  function fillTopic(template, topic) {
    const article = /^[aeiou]/i.test(topic) ? "an" : "a";
    return String(template || "")
      .replaceAll("a {topic}", `${article} ${topic}`)
      .replaceAll("{topic}", topic);
  }

  function composeCommitmentSuggestions(query, options = {}) {
    const matches = matchedCommitmentIntents(query);
    const best = matches[0];
    if (!best) return [];

    const topic = inferredTopic(query, best, options.topicHint);
    if (!topic || !Array.isArray(best.intent.templates)) return [];
    const normalizedQuery = normalize(query);

    return best.intent.templates
      .map((template, templateIndex) => {
        const templateAliases = [
          template.label,
          ...(Array.isArray(template.aliases) ? template.aliases : []),
        ];
        const templateRelevance = Math.max(
          0,
          ...templateAliases.map((alias) => {
            const normalizedAlias = normalize(fillTopic(alias, topic));
            if (` ${normalizedQuery} `.includes(` ${normalizedAlias} `)) return 1;
            return contiguousPhraseSimilarity(normalizedQuery, normalizedAlias);
          }),
        );
        return {
          ...template,
          label: fillTopic(template.label, topic),
          value: fillTopic(template.value || template.label, topic),
          description: fillTopic(template.description || "", topic),
          aliases: (template.aliases || []).map((alias) => fillTopic(alias, topic)),
          composed: true,
          intent: best.intent.key,
          topic,
          catalogIndex: -100 + templateIndex,
          score: 260 - templateIndex + (templateRelevance >= 0.82 ? 38 : 0),
        };
      })
      .sort((left, right) => right.score - left.score || left.catalogIndex - right.catalogIndex);
  }

  function entriesForContext(context) {
    if (!catalog) return [];
    if (context === "search") {
      return [
        ...(catalog.priorities || []),
        ...(catalog.organizations || []),
        ...(catalog.commitments || []),
      ];
    }
    return Array.isArray(catalog[context]) ? catalog[context] : [];
  }

  function rankSuggestions(context, query, options = {}) {
    const composed =
      context === "commitments" ? composeCommitmentSuggestions(query, options) : [];
    const standard = entriesForContext(context)
      .map((suggestion, catalogIndex) => ({
        ...suggestion,
        catalogIndex,
        score: scoreSuggestion(suggestion, query),
      }))
      .filter((suggestion) => !normalize(query) || suggestion.score > 0)
      .sort((a, b) => b.score - a.score || a.catalogIndex - b.catalogIndex);

    const seen = new Set();
    return [...composed, ...standard]
      .filter((suggestion) => {
        const key = normalize(suggestion.label || suggestion.value);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.score - a.score || a.catalogIndex - b.catalogIndex)
      .slice(0, MAX_RESULTS);
  }

  function controlDescriptor(control) {
    const explicit = control.getAttribute("data-mt-autocomplete");
    if (explicit) return explicit;

    const labels = [];
    if (control.labels) {
      labels.push(...Array.from(control.labels).map((label) => label.textContent || ""));
    }
    const enclosingLabel = control.closest("label");
    if (enclosingLabel) labels.push(enclosingLabel.textContent || "");

    return [
      control.name,
      control.id,
      control.getAttribute("aria-label"),
      control.getAttribute("placeholder"),
      ...labels,
    ]
      .filter(Boolean)
      .join(" ");
  }

  function inferContext(control) {
    const explicit = normalize(control.getAttribute("data-mt-autocomplete"));
    if (["off", "none", "false"].includes(explicit)) return null;
    if (explicit === "search" || CONTEXT_KEYS.includes(explicit)) return explicit;

    const descriptor = normalize(controlDescriptor(control));

    if (control instanceof HTMLInputElement && control.type === "search") {
      return "search";
    }
    if (/\b(cause|priority|value|category|issue|focus area)\b/.test(descriptor)) {
      return "priorities";
    }
    if (/\b(evidence|proof|verification|verify|receipt|attestation)\b/.test(descriptor)) {
      return "evidence";
    }
    if (/\b(duration|cadence|frequency|term length|action window)\b/.test(descriptor)) {
      return "durations";
    }
    if (/\b(baseline|without a trade|without trade|otherwise|status quo)\b/.test(descriptor)) {
      return "baselines";
    }
    if (/\b(exit|withdraw|cancel|cancellation|pause|end future)\b/.test(descriptor)) {
      return "exits";
    }
    if (
      /\b(organization|organisation|charity|recipient|destination|website|site|nonprofit|fund)\b/.test(
        descriptor,
      )
    ) {
      return "organizations";
    }
    if (
      /\b(commitment|action|offer|request|task|deliverable|promise|pledge|what will|goal)\b/.test(
        descriptor,
      )
    ) {
      return "commitments";
    }
    if (/\b(search|find|query)\b/.test(descriptor)) return "search";
    return null;
  }

  function elementValue(element) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      return element.value;
    }
    return element instanceof HTMLElement ? element.textContent || "" : "";
  }

  function correctionElementKey(element) {
    if (!(element instanceof Element)) return "";

    const clause = element.closest(".clause");
    if (clause) {
      const label = normalize(clause.querySelector(".clause-label")?.textContent);
      const matchingClauses = Array.from(document.querySelectorAll(".clause")).filter(
        (candidate) =>
          normalize(candidate.querySelector(".clause-label")?.textContent) === label,
      );
      const clauseIndex = matchingClauses.indexOf(clause);
      const controls = Array.from(
        clause.querySelectorAll(
          'input, textarea, [contenteditable]:not([contenteditable="false"])',
        ),
      );
      const controlIndex = controls.indexOf(element);
      const context = normalize(
        element.getAttribute("data-mt-autocomplete-context") ||
          element.getAttribute("data-mt-autocomplete"),
      );
      if (label && clauseIndex >= 0 && controlIndex >= 0) {
        return `clause:${label}:${clauseIndex}:${context}:${controlIndex}`;
      }
    }

    const form = element.closest("form");
    const formKey = normalize(
      form?.getAttribute("id") || form?.getAttribute("name") || form?.getAttribute("action"),
    );
    const controlKey = normalize(
      element.getAttribute("id") ||
        element.getAttribute("name") ||
        element.getAttribute("aria-label"),
    );
    return controlKey ? `control:${formKey}:${controlKey}` : "";
  }

  function setElementValue(element, value) {
    if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
      const prototype =
        element instanceof HTMLTextAreaElement
          ? HTMLTextAreaElement.prototype
          : HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
      if (descriptor && descriptor.set) descriptor.set.call(element, value);
      else element.value = value;
    } else if (element instanceof HTMLElement) {
      element.textContent = value;
    } else {
      return false;
    }

    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }

  function contextOptionsForElement(element, context) {
    if (context !== "commitments" || !(element instanceof Element)) return {};

    const form = element.closest("form");
    const descriptor =
      element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
        ? normalize(controlDescriptor(element))
        : normalize(
            [
              element.getAttribute("aria-label"),
              element.getAttribute("title"),
              element.closest(".clause")?.querySelector(".clause-label")?.textContent,
              element.closest("label")?.textContent,
            ]
              .filter(Boolean)
              .join(" "),
          );
    const requested = /\b(counterparty|their|requested|other participant)\b/.test(descriptor);
    const preferredName = requested ? "requested_cause" : "offered_cause";
    const alternateName = requested ? "offered_cause" : "requested_cause";
    const namedValue = (name) => {
      const field = form?.querySelector(`[name="${name}"]`);
      return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement
        ? field.value.trim()
        : "";
    };
    const explicitTopic = namedValue(preferredName) || namedValue(alternateName);
    if (explicitTopic) return { topicHint: explicitTopic };

    const priorityControls = form
      ? Array.from(
          form.querySelectorAll(
            '[data-mt-autocomplete="priorities"], [data-mt-autocomplete-context="priorities"]',
          ),
        )
      : [];
    const visibleTopic = priorityControls
      .map((control) => elementValue(control).trim())
      .find(Boolean);
    return visibleTopic ? { topicHint: visibleTopic } : {};
  }

  function ensureCorrectionNotice() {
    if (correctionNotice) return correctionNotice;

    correctionNotice = document.createElement("div");
    correctionNotice.className = "mt-input-assist-correction";
    correctionNotice.hidden = true;
    correctionNotice.setAttribute("role", "status");
    correctionNotice.setAttribute("aria-live", "polite");
    correctionNotice.setAttribute("aria-atomic", "true");
    document.body.appendChild(correctionNotice);
    return correctionNotice;
  }

  function hideCorrectionNotice() {
    window.clearTimeout(correctionNoticeTimer);
    correctionNoticeTimer = 0;
    if (correctionNotice) correctionNotice.hidden = true;
  }

  function showCorrectionNotice(element, previousValue, canonicalValue, resolveElement) {
    const notice = ensureCorrectionNotice();
    notice.replaceChildren();

    const message = document.createElement("span");
    message.textContent = `Changed “${previousValue}” to “${canonicalValue}”.`;
    const undo = document.createElement("button");
    undo.type = "button";
    undo.textContent = "Undo";
    undo.addEventListener("click", () => {
      const currentElement =
        typeof resolveElement === "function" ? resolveElement() || element : element;
      const ignoredValue = normalize(previousValue);
      ignoredCorrectionValues.set(currentElement, ignoredValue);
      const stableKey =
        correctionElementKey(currentElement) || correctionElementKey(element);
      if (stableKey) ignoredCorrectionKeys.set(stableKey, ignoredValue);
      setElementValue(currentElement, previousValue);
      if (currentElement instanceof HTMLElement) currentElement.focus();
      hideCorrectionNotice();
    });
    notice.append(message, undo);
    notice.hidden = false;

    window.clearTimeout(correctionNoticeTimer);
    correctionNoticeTimer = window.setTimeout(hideCorrectionNotice, 7000);
  }

  function correctElement(element, context, options = {}) {
    if (!element || !AUTO_RESOLVE_CONTEXTS.has(context)) return false;
    const currentValue = elementValue(element).trim();
    if (!currentValue) return false;
    const stableKey = correctionElementKey(element);
    const ignoredValue =
      ignoredCorrectionValues.get(element) ||
      (stableKey ? ignoredCorrectionKeys.get(stableKey) : undefined);
    if (ignoredValue && ignoredValue === normalize(currentValue)) return false;
    if (ignoredValue && ignoredValue !== normalize(currentValue)) {
      ignoredCorrectionValues.delete(element);
      if (stableKey) ignoredCorrectionKeys.delete(stableKey);
    }

    const match = resolveCanonicalMatch(context, currentValue, options);
    if (!match || !setElementValue(element, match.canonicalValue)) return false;
    showCorrectionNotice(element, currentValue, match.canonicalValue, options.resolveElement);
    return true;
  }

  function clearCorrectionTimer(element) {
    const timer = correctionTimers.get(element);
    if (timer) window.clearTimeout(timer);
    correctionTimers.delete(element);
  }

  function scheduleCanonicalCorrection(element, context, options = {}) {
    clearCorrectionTimer(element);
    if (!AUTO_RESOLVE_CONTEXTS.has(context) || composingControls.has(element)) return;
    const timer = window.setTimeout(() => {
      correctionTimers.delete(element);
      if (!composingControls.has(element)) correctElement(element, context, options);
    }, AUTO_RESOLVE_DELAY_MS);
    correctionTimers.set(element, timer);
  }

  function eligibleControl(control) {
    if (!(control instanceof HTMLInputElement || control instanceof HTMLTextAreaElement)) {
      return false;
    }
    if (control.disabled || control.readOnly) return false;
    if (control instanceof HTMLTextAreaElement) return true;

    const type = (control.type || "text").toLowerCase();
    return ["search", "text", "url"].includes(type);
  }

  function localCalendarDate() {
    const parts = new Intl.DateTimeFormat("en-CA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).formatToParts(new Date());
    const year = parts.find((part) => part.type === "year")?.value || "";
    const month = parts.find((part) => part.type === "month")?.value || "";
    const day = parts.find((part) => part.type === "day")?.value || "";
    return year && month && day ? `${year}-${month}-${day}` : "";
  }

  function prepareForm(form) {
    if (!(form instanceof HTMLFormElement) || preparedForms.has(form)) return;
    preparedForms.add(form);
    form.addEventListener("submit", () => {
      form
        .querySelectorAll("input, textarea")
        .forEach((control) => {
          const context = inferContext(control);
          if (context) {
            correctElement(control, context, contextOptionsForElement(control, context));
          }
        });
      const values = {
        client_local_date: localCalendarDate(),
        client_time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      };
      Object.entries(values).forEach(([name, value]) => {
        let hidden = form.querySelector(`input[type="hidden"][name="${name}"]`);
        if (!hidden) {
          hidden = document.createElement("input");
          hidden.type = "hidden";
          hidden.name = name;
          form.appendChild(hidden);
        }
        hidden.value = value;
      });
    });
  }

  function prepareFutureDateControl(control) {
    if (
      !(control instanceof HTMLInputElement) ||
      control.type !== "date" ||
      preparedDateControls.has(control)
    ) {
      return;
    }
    preparedDateControls.add(control);
    const descriptor = normalize(controlDescriptor(control));
    if (
      /\b(start|due|deadline|expires|expiration|action date|scheduled|schedule date)\b/.test(
        descriptor,
      )
    ) {
      const today = localCalendarDate();
      if (today && (!control.min || control.min < today)) control.min = today;
    }
    if (control.form) prepareForm(control.form);
  }

  function ensureSuggestionPanel() {
    if (suggestionPanel) return suggestionPanel;

    const panel = document.createElement("div");
    panel.className = "mt-input-assist-panel";
    panel.hidden = true;
    panel.setAttribute("role", "listbox");
    panel.setAttribute("aria-label", "Suggested completions");
    panel.addEventListener("pointerdown", (event) => event.preventDefault());
    document.body.appendChild(panel);
    suggestionPanel = panel;
    return panel;
  }

  function positionFloatingElement(element, anchor) {
    const rect = anchor.getBoundingClientRect();
    const viewportPadding = 12;
    const width = Math.min(Math.max(rect.width, 300), Math.min(520, window.innerWidth - 24));
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      Math.max(viewportPadding, window.innerWidth - width - viewportPadding),
    );
    let top = rect.bottom + 8;

    element.style.width = `${width}px`;
    element.style.left = `${left}px`;
    element.style.top = `${top}px`;

    const panelRect = element.getBoundingClientRect();
    if (panelRect.bottom > window.innerHeight - viewportPadding && rect.top > panelRect.height + 16) {
      top = rect.top - panelRect.height - 8;
      element.style.top = `${Math.max(viewportPadding, top)}px`;
    }
  }

  function closeSuggestions() {
    if (!suggestionPanel) return;
    suggestionPanel.hidden = true;
    suggestionPanel.replaceChildren();
    activeResults = [];
    activeIndex = -1;
    if (activeControl) {
      activeControl.setAttribute("aria-expanded", "false");
      activeControl.removeAttribute("aria-activedescendant");
    }
  }

  function selectSuggestion(index) {
    const suggestion = activeResults[index];
    const control = activeControl;
    if (!suggestion || !control) return;

    const value = suggestionValue(suggestion);
    const prototype =
      control instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
    if (descriptor && descriptor.set) descriptor.set.call(control, value);
    else control.value = value;

    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
    control.focus();
    closeSuggestions();
    updateWebsitePreview(control);
  }

  function renderSuggestions(control) {
    const context = inferContext(control);
    const panel = ensureSuggestionPanel();
    activeControl = control;

    if (!context || !catalog) {
      closeSuggestions();
      return;
    }

    activeResults = rankSuggestions(
      context,
      control.value,
      contextOptionsForElement(control, context),
    );
    activeIndex = activeResults.length ? 0 : -1;
    panel.replaceChildren();

    const heading = document.createElement("div");
    heading.className = "mt-input-assist-heading";
    const title = document.createElement("strong");
    title.textContent = "Suggested completions";
    const hint = document.createElement("span");
    hint.textContent = "↑↓ choose · Enter use · Esc close";
    heading.append(title, hint);
    panel.appendChild(heading);

    if (!activeResults.length) {
      const empty = document.createElement("p");
      empty.className = "mt-input-assist-empty";
      empty.textContent = "No standardized match yet. Custom text is fine.";
      panel.appendChild(empty);
    } else {
      activeResults.forEach((suggestion, index) => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "mt-input-assist-option";
        option.id = `mt-input-assist-option-${index}`;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", index === activeIndex ? "true" : "false");
        const label = document.createElement("strong");
        label.textContent = suggestion.label;
        const description = document.createElement("span");
        description.textContent = suggestion.description || suggestionValue(suggestion);
        option.append(label, description);
        option.addEventListener("pointerenter", () => setActiveIndex(index));
        option.addEventListener("click", () => selectSuggestion(index));
        panel.appendChild(option);
      });
    }

    panel.hidden = false;
    control.setAttribute("role", "combobox");
    control.setAttribute("aria-autocomplete", "list");
    control.setAttribute("aria-controls", "mt-input-assist-listbox");
    control.setAttribute("aria-expanded", "true");
    panel.id = "mt-input-assist-listbox";
    setActiveIndex(activeIndex);
    positionFloatingElement(panel, control);
  }

  function setActiveIndex(index) {
    if (!activeResults.length || !suggestionPanel) return;
    activeIndex = (index + activeResults.length) % activeResults.length;
    const options = suggestionPanel.querySelectorAll('[role="option"]');
    options.forEach((option, optionIndex) => {
      option.setAttribute("aria-selected", optionIndex === activeIndex ? "true" : "false");
    });
    const activeOption = options[activeIndex];
    if (activeOption && activeControl) {
      activeControl.setAttribute("aria-activedescendant", activeOption.id);
      activeOption.scrollIntoView({ block: "nearest" });
    }
  }

  function normalizeMentionHref(rawValue) {
    const cleaned = String(rawValue || "").replace(TRAILING_PUNCTUATION, "");
    const candidate = /^https?:\/\//i.test(cleaned)
      ? cleaned
      : `https://${cleaned.replace(/^www\./i, "")}`;
    try {
      const url = new URL(candidate);
      return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
    } catch {
      return null;
    }
  }

  function extractWebsiteMentions(value) {
    const source = String(value || "");
    const found = [];
    const seen = new Set();
    WEBSITE_PATTERN.lastIndex = 0;

    let match;
    while ((match = WEBSITE_PATTERN.exec(source))) {
      if (match.index > 0 && source[match.index - 1] === "@") continue;
      const href = normalizeMentionHref(match[1]);
      if (!href) continue;
      const key = href.replace(/\/$/, "").toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      found.push({ href, text: match[1].replace(TRAILING_PUNCTUATION, "") });
      if (found.length >= 3) break;
    }
    return found;
  }

  function findDonationRoute(href) {
    if (!catalog || !Array.isArray(catalog.organizations)) return null;
    let url;
    try {
      url = new URL(href);
    } catch {
      return null;
    }
    const host = url.hostname.replace(/^www\./, "").toLowerCase();
    const path = url.pathname.toLowerCase();

    return (
      catalog.organizations.find((organization) => {
        const candidates = [organization.website, organization.donationRoute]
          .filter(Boolean)
          .map((candidate) => {
            try {
              return new URL(candidate);
            } catch {
              return null;
            }
          })
          .filter(Boolean);

        return candidates.some((candidate) => {
          const candidateHost = candidate.hostname.replace(/^www\./, "").toLowerCase();
          if (host !== candidateHost) return false;
          if (host !== "every.org") return true;
          const candidatePath = candidate.pathname.replace(/\/$/, "").toLowerCase();
          return !candidatePath || path.startsWith(candidatePath);
        });
      }) || null
    );
  }

  function ensureHoverCard() {
    if (hoverCard) return hoverCard;

    const card = document.createElement("aside");
    card.className = "mt-donation-hover-card";
    card.hidden = true;
    card.setAttribute("role", "tooltip");
    card.addEventListener("pointerenter", () => window.clearTimeout(hideTimer));
    card.addEventListener("pointerleave", scheduleHideHoverCard);
    document.body.appendChild(card);
    hoverCard = card;
    return card;
  }

  function hideHoverCard() {
    window.clearTimeout(hoverTimer);
    if (hoverCard) hoverCard.hidden = true;
  }

  function scheduleHideHoverCard() {
    window.clearTimeout(hideTimer);
    hideTimer = window.setTimeout(hideHoverCard, 120);
  }

  function showHoverCard(anchor, mention) {
    const card = ensureHoverCard();
    const route = findDonationRoute(mention.href);
    card.replaceChildren();

    const kicker = document.createElement("span");
    kicker.className = "mt-donation-hover-kicker";
    kicker.textContent = route ? "Verified donation route" : "Website link";
    const title = document.createElement("strong");
    title.textContent = route ? route.label : new URL(mention.href).hostname.replace(/^www\./, "");
    const description = document.createElement("p");
    description.textContent = route
      ? `${route.provider || "External provider"} opens the recipient's donation page. Moral Trade does not take custody of the gift.`
      : "Moral Trade has not verified a direct donation route for this site. The website link still opens normally.";
    const actions = document.createElement("div");
    actions.className = "mt-donation-hover-actions";

    const websiteLink = document.createElement("a");
    websiteLink.href = mention.href;
    websiteLink.target = "_blank";
    websiteLink.rel = "noopener noreferrer";
    websiteLink.textContent = "Open website";
    actions.appendChild(websiteLink);

    const routeLink = document.createElement("a");
    routeLink.href = route && route.donationRoute ? route.donationRoute : "/donate";
    if (route && route.donationRoute) {
      routeLink.target = "_blank";
      routeLink.rel = "noopener noreferrer";
    }
    routeLink.className = "mt-donation-hover-primary";
    routeLink.textContent = route ? "Donate through verified route" : "Browse reviewed routes";
    actions.appendChild(routeLink);

    card.append(kicker, title, description, actions);
    card.hidden = false;
    positionFloatingElement(card, anchor);
  }

  function attachHoverCard(anchor, mention) {
    anchor.addEventListener("pointerenter", () => {
      window.clearTimeout(hideTimer);
      window.clearTimeout(hoverTimer);
      hoverTimer = window.setTimeout(() => showHoverCard(anchor, mention), 500);
    });
    anchor.addEventListener("pointerleave", () => {
      window.clearTimeout(hoverTimer);
      scheduleHideHoverCard();
    });
    anchor.addEventListener("focus", () => showHoverCard(anchor, mention));
    anchor.addEventListener("blur", scheduleHideHoverCard);
  }

  function websitePreviewHost(control) {
    const labelledField = control.closest("label");
    return labelledField && labelledField.parentElement ? labelledField : control;
  }

  function updateWebsitePreview(control) {
    const mentions = extractWebsiteMentions(control.value);
    let preview = websitePreviews.get(control);

    if (!mentions.length) {
      if (preview) preview.remove();
      websitePreviews.delete(control);
      return;
    }

    if (!preview || !preview.isConnected) {
      preview = document.createElement("div");
      preview.className = "mt-website-mention-preview";
      preview.setAttribute("aria-label", "Linked websites in this field");
      const host = websitePreviewHost(control);
      host.insertAdjacentElement("afterend", preview);
      websitePreviews.set(control, preview);
    }

    preview.replaceChildren();
    const label = document.createElement("span");
    label.className = "mt-website-mention-label";
    label.textContent = mentions.length === 1 ? "Linked website" : "Linked websites";
    preview.appendChild(label);

    mentions.forEach((mention) => {
      const anchor = document.createElement("a");
      anchor.href = mention.href;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.textContent = mention.text;
      attachHoverCard(anchor, mention);
      preview.appendChild(anchor);
    });
  }

  function prepareControl(control) {
    if (!eligibleControl(control) || preparedControls.has(control)) return;
    preparedControls.add(control);

    const context = inferContext(control);
    if (context) {
      control.setAttribute("data-mt-autocomplete-context", context);
      control.setAttribute("data-mt-autocomplete-ready", "true");
      control.setAttribute("aria-autocomplete", "list");
      control.setAttribute("aria-haspopup", "listbox");
    }

    control.addEventListener("focus", () => {
      if (inferContext(control)) renderSuggestions(control);
      updateWebsitePreview(control);
    });
    control.addEventListener("input", () => {
      const activeContext = inferContext(control);
      if (document.activeElement === control && activeContext) renderSuggestions(control);
      if (activeContext) {
        scheduleCanonicalCorrection(
          control,
          activeContext,
          contextOptionsForElement(control, activeContext),
        );
      }
      updateWebsitePreview(control);
    });
    control.addEventListener("compositionstart", () => {
      composingControls.add(control);
      clearCorrectionTimer(control);
    });
    control.addEventListener("compositionend", () => {
      composingControls.delete(control);
      const activeContext = inferContext(control);
      if (activeContext) {
        scheduleCanonicalCorrection(
          control,
          activeContext,
          contextOptionsForElement(control, activeContext),
        );
      }
    });
    control.addEventListener("keydown", (event) => {
      if (activeControl !== control || !suggestionPanel || suggestionPanel.hidden) return;

      if (event.key === "ArrowDown" && activeResults.length) {
        event.preventDefault();
        setActiveIndex(activeIndex + 1);
      } else if (event.key === "ArrowUp" && activeResults.length) {
        event.preventDefault();
        setActiveIndex(activeIndex - 1);
      } else if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        selectSuggestion(activeIndex);
      } else if (event.key === "Tab" && activeIndex >= 0 && control.value.trim()) {
        selectSuggestion(activeIndex);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeSuggestions();
      }
    });
    control.addEventListener("blur", () => {
      clearCorrectionTimer(control);
      const activeContext = inferContext(control);
      if (!composingControls.has(control) && activeContext) {
        correctElement(
          control,
          activeContext,
          contextOptionsForElement(control, activeContext),
        );
      }
      window.setTimeout(() => {
        if (
          activeControl === control &&
          (!suggestionPanel || !suggestionPanel.contains(document.activeElement))
        ) {
          closeSuggestions();
        }
      }, 80);
    });

    updateWebsitePreview(control);

    if (context && document.activeElement === control) {
      renderSuggestions(control);
    }
  }

  function scan(root) {
    if (root instanceof HTMLFormElement) prepareForm(root);
    if (root instanceof HTMLInputElement && root.type === "date") {
      prepareFutureDateControl(root);
    }
    if (root instanceof Element && root.matches("input, textarea")) prepareControl(root);
    if (!(root instanceof Element || root instanceof Document)) return;
    root.querySelectorAll("input, textarea").forEach(prepareControl);
    root.querySelectorAll('input[type="date"]').forEach(prepareFutureDateControl);
    root.querySelectorAll("form").forEach(prepareForm);
  }

  function start() {
    ensureSuggestionPanel();
    ensureHoverCard();
    scan(document);

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof Element) scan(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    document.addEventListener("pointerdown", (event) => {
      if (
        suggestionPanel &&
        !suggestionPanel.hidden &&
        event.target !== activeControl &&
        !suggestionPanel.contains(event.target)
      ) {
        closeSuggestions();
      }
    });
    window.addEventListener("resize", () => {
      if (activeControl && suggestionPanel && !suggestionPanel.hidden) {
        positionFloatingElement(suggestionPanel, activeControl);
      }
    });
    window.addEventListener(
      "scroll",
      () => {
        if (activeControl && suggestionPanel && !suggestionPanel.hidden) {
          positionFloatingElement(suggestionPanel, activeControl);
        }
        hideHoverCard();
      },
      { capture: true, passive: true },
    );
  }

  window.MoralTradeInputAssist = {
    autoResolveDelayMs: AUTO_RESOLVE_DELAY_MS,
    composeCommitmentSuggestions,
    contextOptionsForElement,
    correctElement,
    editDistance,
    extractWebsiteMentions,
    findDonationRoute,
    inferContext,
    normalize,
    rankSuggestions,
    resolveCanonicalMatch,
    scoreSuggestion,
    similarity,
  };

  fetch(CATALOG_URL, { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) throw new Error(`Input standards returned ${response.status}`);
      return response.json();
    })
    .then((payload) => {
      catalog = payload && typeof payload === "object" ? payload : {};
      CONTEXT_KEYS.forEach((key) => {
        if (!Array.isArray(catalog[key])) catalog[key] = [];
      });
      if (!Array.isArray(catalog.commitmentIntents)) catalog.commitmentIntents = [];
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", start, { once: true });
      } else {
        start();
      }
    })
    .catch((error) => {
      console.warn("[Moral Trade] Contextual autocomplete is unavailable.", error);
    });
})();
