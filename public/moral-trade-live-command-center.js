(function moralTradeCommandCenterHandoffBootstrap() {
  "use strict";

  if (window.__MT_COMMAND_CENTER_HANDOFF_STARTED__) return;
  window.__MT_COMMAND_CENTER_HANDOFF_STARTED__ = true;

  const HANDOFF_KEY = "moral-trade.command-center.handoff.v1";
  const HANDOFF_VERSION = 1;
  const MAX_COMMAND_LENGTH = 2_000;
  const PENDING_COMMAND_KEY = "moral-trade.command.pending.v1";
  const LEGACY_DEMO_COMMAND =
    "Offer $80 for AI-safety research if 12 transit trips are replaced";
  const COMMAND_PLACEHOLDER =
    "Ask Command to do anything in Moral Trade…";
  const DEFAULT_EXIT_CONDITIONS =
    "Either participant may withdraw before both participants confirm the final terms; no commitment begins before that confirmation.";

  const CAUSE_RULES = [
    {
      label: "Animal welfare",
      pattern:
        /\b(?:animal welfare|factory farm|farmed animal|vegetarian|vegan|meatless|avoid meat|meat consumption)\b/i,
    },
    {
      label: "AI safety",
      pattern: /\b(?:ai[- ]?safety|ai alignment|artificial intelligence safety)\b/i,
    },
    {
      label: "Global poverty",
      pattern: /\b(?:global poverty|poverty reduction|extreme poverty)\b/i,
    },
    {
      label: "Global health",
      pattern: /\b(?:global health|malaria|vaccination|disease prevention)\b/i,
    },
    {
      label: "Climate change",
      pattern:
        /\b(?:climate|carbon|emissions?|transit trips?|car trips?|public transport)\b/i,
    },
    {
      label: "Democracy",
      pattern: /\b(?:democracy|democratic institutions|voting access)\b/i,
    },
    {
      label: "Future flourishing",
      pattern: /\b(?:future flourishing|future generations|long[- ]?term future)\b/i,
    },
  ];

  function clean(value, maxLength = MAX_COMMAND_LENGTH) {
    return String(value || "")
      .normalize("NFKC")
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, maxLength);
  }

  function ensurePeriod(value) {
    const normalized = clean(value, 5_000).replace(/[.;:,!?]+$/, "");
    return normalized ? `${normalized}.` : "";
  }

  function sentenceCase(value) {
    const normalized = clean(value, 5_000)
      .replace(/^(?:you|the other participant|the counterparty)\s+/i, "")
      .replace(/^to\s+/i, "");
    if (!normalized) return "";
    return ensurePeriod(`${normalized.charAt(0).toUpperCase()}${normalized.slice(1)}`);
  }

  function causeFor(value) {
    const normalized = clean(value);
    return CAUSE_RULES.find((entry) => entry.pattern.test(normalized))?.label || "";
  }

  function stripCommandPrefix(value) {
    let normalized = clean(value);
    normalized = normalized.replace(
      /^(?:please\s+)?(?:create|build|draft|make)\s+(?:me\s+)?(?:an?\s+)?(?:offer|trade|commitment)\s*:?\s*/i,
      "",
    );
    normalized = normalized.replace(/^offer\s+(?=\$|an?\b)/i, "");
    return normalized || clean(value);
  }

  function splitReciprocal(value) {
    const normalized = stripCommandPrefix(value);
    const separators = [
      /\s+in\s+exchange\s+for\s+/i,
      /\s+in\s+return\s+for\s+/i,
      /\s+provided\s+that\s+/i,
      /\s+if\s+/i,
      /\s+when\s+/i,
    ];

    for (const separator of separators) {
      const match = separator.exec(normalized);
      if (!match || match.index <= 0) continue;
      const offered = clean(normalized.slice(0, match.index), 5_000);
      const requested = clean(
        normalized.slice(match.index + match[0].length),
        5_000,
      );
      if (offered && requested) return { offered, requested };
    }

    return { offered: normalized, requested: "" };
  }

  function normalizeAmount(value) {
    return clean(value, 40).replace(/\s+/g, "");
  }

  function agreedDestination(target, cause) {
    const normalized = clean(target, 500).replace(/^(?:an?\s+)?/i, "");
    const category = cause.toLowerCase();
    if (category && normalized.toLowerCase() === category) {
      const label = category === "ai safety" ? "AI-safety" : category;
      return `an agreed ${label} organization`;
    }
    return normalized;
  }

  function parseOfferedAction(value) {
    const segment = clean(value, 5_000);
    const donation =
      /^(\$[\d,]+(?:\.\d{1,2})?)\s+(?:donation|gift)\s+to\s+(.+)$/i.exec(
        segment,
      ) ||
      /^donate\s+(\$[\d,]+(?:\.\d{1,2})?)\s+to\s+(.+)$/i.exec(
        segment,
      );

    if (donation) {
      const amount = normalizeAmount(donation[1]);
      const target = clean(donation[2], 500);
      const cause = causeFor(target) || causeFor(segment);
      return {
        action: ensurePeriod(
          `Donate ${amount} to ${agreedDestination(target, cause)}`,
        ),
        cause,
        descriptor: `${amount} donation`,
        kind: "donation",
      };
    }

    const funding = /^(\$[\d,]+(?:\.\d{1,2})?)\s+(?:for|toward|towards)\s+(.+)$/i.exec(
      segment,
    );
    if (funding) {
      const amount = normalizeAmount(funding[1]);
      const target = clean(funding[2], 500);
      return {
        action: ensurePeriod(`Provide ${amount} for ${target}`),
        cause: causeFor(target) || causeFor(segment),
        descriptor: `${amount} contribution`,
        kind: "funding",
      };
    }

    return {
      action: sentenceCase(segment),
      cause: causeFor(segment),
      descriptor: "offered commitment",
      kind: "other",
    };
  }

  function quantityWord(value) {
    const normalized = clean(value, 20).toLowerCase();
    return normalized === "one" ? "1" : normalized;
  }

  function requestedDescriptor(value) {
    const normalized = clean(value, 5_000);
    const meal = /\b(\d+|one)\s+(?:vegetarian|vegan|meatless)\s+meals?\b/i.exec(
      normalized,
    );
    if (meal) {
      const quantity = quantityWord(meal[1]);
      return quantity === "1" ? "vegetarian meal" : `${quantity} vegetarian meals`;
    }

    const trips = /\b(\d+|one)\s+(?:transit|car|commute)\s+trips?\b/i.exec(
      normalized,
    );
    if (trips) {
      const quantity = quantityWord(trips[1]);
      return quantity === "1" ? "trip commitment" : `${quantity}-trip commitment`;
    }

    return "requested commitment";
  }

  function durationFor(value) {
    const normalized = clean(value, 5_000);
    const meal = /\b(\d+|one)\s+(?:vegetarian|vegan|meatless)\s+meals?\b/i.exec(
      normalized,
    );
    if (meal) {
      const quantity = quantityWord(meal[1]);
      return quantity === "1" ? "One meal" : `${quantity} meals`;
    }

    const trips = /\b(\d+|one)\s+(?:transit|car|commute)\s+trips?\b/i.exec(
      normalized,
    );
    if (trips) {
      const quantity = quantityWord(trips[1]);
      return quantity === "1" ? "One trip" : `${quantity} trips`;
    }

    const time = /\b(\d+|one)\s+(day|week|month|year)s?\b/i.exec(normalized);
    if (time) {
      const quantity = quantityWord(time[1]);
      const unit = clean(time[2], 20).toLowerCase();
      return quantity === "1"
        ? `One ${unit}`
        : `${quantity} ${unit}${quantity === "1" ? "" : "s"}`;
    }

    return "";
  }

  function parseCommand(command) {
    const normalized = clean(command);
    const { offered, requested } = splitReciprocal(normalized);
    const offeredTerms = parseOfferedAction(offered);
    const requestedAction = requested ? sentenceCase(requested) : "";
    const requestedCause = requested ? causeFor(requested) : "";
    const duration = requested ? durationFor(requested) : durationFor(offered);
    const requestDescriptor = requestedDescriptor(requested);

    const noTradeBaseline = requested
      ? offeredTerms.kind === "donation" && requestDescriptor.includes("vegetarian")
        ? `Without this trade, neither the ${offeredTerms.descriptor} nor the ${requestDescriptor} is assumed to occur.`
        : "Without this trade, neither stated commitment is assumed to occur."
      : "";

    const values = {
      offeredCause: offeredTerms.cause,
      requestedCause,
      proposedAction: offeredTerms.action,
      requestedAction,
      noTradeBaseline,
      duration,
      startDate: "",
      evidenceDueDate: "",
      evidenceRule: "",
      exitConditions: DEFAULT_EXIT_CONDITIONS,
      notes: "",
    };

    const reviewFields = [];
    if (!values.offeredCause || !values.requestedCause) reviewFields.push("priorities");
    if (!values.requestedAction) reviewFields.push("reciprocal commitment");
    reviewFields.push("no-trade baseline", "deadline", "evidence");

    return {
      values,
      reviewFields: [...new Set(reviewFields)],
    };
  }

  function createHandoffRecord(command, now = Date.now()) {
    const parsed = parseCommand(command);
    return {
      version: HANDOFF_VERSION,
      source: "command-center",
      createdAt: Number(now),
      values: parsed.values,
      reviewFields: parsed.reviewFields,
    };
  }

  function commandTextFor(button) {
    if (!button || typeof button.closest !== "function") return "";
    const setting = button.closest(".setting");
    if (setting) {
      const label = setting.querySelector("span");
      return clean(label?.textContent);
    }

    const drawer = button.closest("#drawer") || document;
    const input = drawer.querySelector?.(".search input");
    return clean(input?.value);
  }

  function showTransferError(button, message) {
    const drawer = button?.closest?.("#drawer");
    const input = drawer?.querySelector?.(".search input");
    if (input) {
      input.setAttribute("aria-invalid", "true");
      input.focus();
    }

    if (!drawer) return;
    let status = drawer.querySelector('[data-mt-command-status="true"]');
    if (!status) {
      status = document.createElement("p");
      status.dataset.mtCommandStatus = "true";
      status.className = "muted";
      status.setAttribute("role", "alert");
      button.insertAdjacentElement("afterend", status);
    }
    status.textContent = message;
  }

  function storePendingCommand(command) {
    try {
      window.sessionStorage.setItem(PENDING_COMMAND_KEY, command);
      return true;
    } catch (error) {
      console.warn("[Moral Trade] Command could not be transferred.", error);
      return false;
    }
  }

  function routeCommand(button, event) {
    const command = commandTextFor(button);
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();

    if (!command) {
      showTransferError(button, "Enter a Moral Trade request first.");
      return false;
    }

    if (!storePendingCommand(command)) {
      showTransferError(
        button,
        "The request could not be transferred securely. Copy it, then open Command.",
      );
      return false;
    }

    window.location.assign("/command?source=drawer");
    return true;
  }

  function prepareDrawer(root = document) {
    const drawer = root.querySelector?.("#drawer") ||
      (root.matches?.("#drawer") ? root : null);
    if (!drawer) return;
    const input = drawer.querySelector('.search input');
    if (!input) return;

    if (clean(input.value) === LEGACY_DEMO_COMMAND) input.value = "";
    input.placeholder = COMMAND_PLACEHOLDER;
    input.setAttribute("aria-label", "Ask Moral Trade Command");
    input.setAttribute("autocomplete", "off");

    const eyebrow = drawer.querySelector(".eyebrow");
    if (eyebrow && /command center/i.test(eyebrow.textContent || "")) {
      eyebrow.textContent = "COMMAND";
    }
    const heading = drawer.querySelector("h1, h2");
    if (heading && /create the next commitment/i.test(heading.textContent || "")) {
      heading.textContent = "Ask Moral Trade.";
    }
    const descriptiveCopy = Array.from(drawer.querySelectorAll("p")).find((element) =>
      /describe the value you will offer/i.test(element.textContent || ""),
    );
    if (descriptiveCopy) {
      descriptiveCopy.textContent =
        "Search, plan, compare, draft, navigate, and prepare authorized actions in one persistent conversation.";
    }
    const buildButton = drawer.querySelector('[data-action="from-command"]');
    if (buildButton && /build this offer/i.test(buildButton.textContent || "")) {
      buildButton.textContent = "Send to Command";
      buildButton.setAttribute("aria-label", "Send request to the Command workspace");
    }
    if (buildButton && !drawer.querySelector('[data-mt-full-command="true"]')) {
      const fullLink = document.createElement("a");
      fullLink.href = "/command";
      fullLink.dataset.mtFullCommand = "true";
      fullLink.textContent = "Open full Command workspace →";
      fullLink.style.display = "inline-block";
      fullLink.style.marginTop = "12px";
      fullLink.style.color = "inherit";
      fullLink.style.fontSize = "13px";
      buildButton.insertAdjacentElement("afterend", fullLink);
    }
  }

  function start() {
    prepareDrawer(document);

    const drawer = document.querySelector("#drawer");
    if (drawer && typeof MutationObserver !== "undefined") {
      const observer = new MutationObserver(() => prepareDrawer(drawer));
      observer.observe(drawer, { childList: true, subtree: true });
    }

    document.addEventListener(
      "click",
      (event) => {
        const button = event.target?.closest?.('[data-action="from-command"]');
        if (button) routeCommand(button, event);
      },
      true,
    );

    document.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Enter") return;
        const input = event.target;
        if (!input?.matches?.("#drawer .search input")) return;
        const button = document.querySelector(
          '#drawer [data-action="from-command"]',
        );
        if (button) routeCommand(button, event);
      },
      true,
    );
  }

  window.MoralTradeCommandHandoff = {
    HANDOFF_KEY,
    HANDOFF_VERSION,
    PENDING_COMMAND_KEY,
    LEGACY_DEMO_COMMAND,
    createHandoffRecord,
    commandTextFor,
    parseCommand,
    splitReciprocal,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
