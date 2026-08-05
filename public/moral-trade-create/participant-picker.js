(() => {
  "use strict";

  const ENDPOINT = "/api/create/participants";
  const MIN_QUERY_LENGTH = 2;
  const SEARCH_DELAY_MS = 140;
  const mounted = new WeakMap();
  let viewerPromise = null;
  let pickerSequence = 0;

  function cleanText(value, maximum = 120) {
    return typeof value === "string"
      ? value.normalize("NFKC").replace(/\s+/gu, " ").trim().slice(0, maximum)
      : "";
  }

  function containsContactLikeIdentity(value) {
    const cleaned = cleanText(value, 120);
    if (cleaned.includes("@") || /(?:https?:\/\/|www\.)/iu.test(cleaned)) return true;
    const digits = cleaned.replace(/[^0-9]/gu, "");
    return digits.length >= 7 && /^[+0-9() .-]+$/u.test(cleaned);
  }

  function accountTypeLabel(value) {
    return value === "organization" ? "Organization" : "Individual account";
  }

  function verificationLabel(value) {
    if (value === "organization-verified") return "Verified organization";
    if (value === "identity-verified") return "Identity verified";
    return "Not verified";
  }

  function initials(value) {
    const parts = cleanText(value)
      .split(/\s+/u)
      .filter(Boolean)
      .slice(0, 2);
    return (parts.map((part) => part[0]).join("") || "MT").toUpperCase();
  }

  async function readJson(response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  async function requestDirectory(query, signal) {
    const url = new URL(ENDPOINT, window.location.href);
    if (query) url.searchParams.set("q", query);
    url.searchParams.set("limit", "12");

    const response = await fetch(url.toString(), {
      cache: "no-store",
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal,
    });
    const body = await readJson(response);
    if (!response.ok || !body || body.ok !== true) {
      const message = body && typeof body.message === "string"
        ? body.message
        : response.status === 401
          ? "Sign in before selecting participants."
          : "Participant search is unavailable. Try again.";
      throw new Error(message);
    }
    return body;
  }

  function loadViewer(options = {}) {
    if (options.refresh === true) viewerPromise = null;
    viewerPromise ??= requestDirectory("", undefined).then((body) => body.viewer);
    return viewerPromise;
  }

  function buildAvatar(entry) {
    const avatar = document.createElement("span");
    avatar.className = "mt-participant-avatar";
    avatar.setAttribute("aria-hidden", "true");
    const avatarUrl = cleanText(entry.avatarUrl, 500);
    if (avatarUrl && /^https:\/\//u.test(avatarUrl)) {
      const image = document.createElement("img");
      image.alt = "";
      image.loading = "lazy";
      image.referrerPolicy = "no-referrer";
      image.src = avatarUrl;
      avatar.append(image);
    } else {
      avatar.textContent = initials(entry.displayName || entry.username);
    }
    return avatar;
  }

  function describeSelected(target) {
    if (target.kind === "external-claim") {
      return "Unclaimed invitee · private claim link after publication";
    }
    return `${target.displayNameSnapshot} · ${accountTypeLabel(target.accountType)} · ${verificationLabel(target.verification)}`;
  }

  function renderSelected(root, target, config) {
    root.replaceChildren();
    const wrapper = document.createElement("div");
    wrapper.className = "mt-participant-selected";

    const copy = document.createElement("div");
    const primary = document.createElement("strong");
    primary.textContent = target.kind === "account"
      ? `@${target.usernameSnapshot}`
      : target.displayNameSnapshot;
    const secondary = document.createElement("span");
    secondary.textContent = describeSelected(target);
    copy.append(primary, secondary);
    wrapper.append(copy);

    if (!config.locked) {
      const clear = document.createElement("button");
      clear.type = "button";
      clear.textContent = "Remove";
      clear.setAttribute("aria-label", `Remove ${primary.textContent}`);
      clear.addEventListener("click", () => {
        config.onClear?.();
        if (!config.onClear) renderSearch(root, config);
      });
      wrapper.append(clear);
    }
    root.append(wrapper);
  }

  function accountTarget(entry) {
    return {
      kind: "account",
      profileId: entry.profileId,
      usernameSnapshot: entry.username,
      displayNameSnapshot: entry.displayName,
      accountType: entry.accountType,
      verification: entry.verification,
      publicMention: entry.publicMention,
      invitationState: "draft",
      isCreator: false,
    };
  }

  function externalTarget(displayName) {
    return {
      kind: "external-claim",
      displayNameSnapshot: displayName,
      deliveryChannel: "claim-link",
      publicMention: "unclaimed-invitee",
      invitationState: "draft",
      isCreator: false,
    };
  }

  function renderSearch(root, config) {
    root.replaceChildren();
    const id = `mt-participant-picker-${++pickerSequence}`;
    const wrapper = document.createElement("div");
    wrapper.className = "mt-participant-picker";
    wrapper.innerHTML = `<label for="${id}"></label><input id="${id}" role="combobox" aria-autocomplete="list" aria-expanded="false" autocomplete="off" spellcheck="false" /><div class="mt-participant-results" role="listbox" hidden></div><div class="mt-participant-status" role="status" aria-live="polite"></div>`;

    const label = wrapper.querySelector("label");
    const input = wrapper.querySelector("input");
    const results = wrapper.querySelector(".mt-participant-results");
    const status = wrapper.querySelector(".mt-participant-status");
    const listboxId = `${id}-results`;
    results.id = listboxId;
    input.setAttribute("aria-controls", listboxId);
    label.textContent = cleanText(config.label || "Participant", 80);
    status.textContent = "Type at least two characters, then explicitly select an account.";
    root.append(wrapper);

    let activeIndex = -1;
    let options = [];
    let timer = null;
    let requestSequence = 0;
    let controller = null;
    let disposed = false;

    function closeList() {
      activeIndex = -1;
      options = [];
      results.hidden = true;
      results.replaceChildren();
      input.setAttribute("aria-expanded", "false");
      input.removeAttribute("aria-activedescendant");
    }

    function setActive(index) {
      if (!options.length) return;
      activeIndex = ((index % options.length) + options.length) % options.length;
      options.forEach((option, optionIndex) => {
        option.button.classList.toggle("active", optionIndex === activeIndex);
        option.button.setAttribute("aria-selected", optionIndex === activeIndex ? "true" : "false");
      });
      const active = options[activeIndex];
      input.setAttribute("aria-activedescendant", active.button.id);
      active.button.scrollIntoView({ block: "nearest" });
    }

    function choose(target) {
      closeList();
      config.onSelect?.(target);
      if (!config.onSelect) renderSelected(root, target, config);
    }

    function addAccountOption(entry, index) {
      const button = document.createElement("button");
      button.type = "button";
      button.id = `${listboxId}-option-${index}`;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", "false");
      button.setAttribute(
        "aria-label",
        `@${entry.username} — ${entry.displayName} — ${accountTypeLabel(entry.accountType)} — ${verificationLabel(entry.verification)}`,
      );
      const copy = document.createElement("span");
      copy.className = "mt-participant-option-copy";
      const username = document.createElement("strong");
      username.textContent = `@${entry.username}`;
      const details = document.createElement("span");
      const mention = entry.publicMention === "pending-invitee"
        ? " · public name hidden until acceptance"
        : "";
      details.textContent = `${entry.displayName} · ${accountTypeLabel(entry.accountType)} · ${verificationLabel(entry.verification)}${mention}`;
      copy.append(username, details);
      button.append(buildAvatar(entry), copy);
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => choose(accountTarget(entry)));
      results.append(button);
      return { button, target: accountTarget(entry) };
    }

    function addExternalOption(displayName, index) {
      const button = document.createElement("button");
      button.type = "button";
      button.id = `${listboxId}-option-${index}`;
      button.setAttribute("role", "option");
      button.setAttribute("aria-selected", "false");
      button.setAttribute("aria-label", `Invite “${displayName}” by private claim link`);
      const avatar = document.createElement("span");
      avatar.className = "mt-participant-avatar";
      avatar.setAttribute("aria-hidden", "true");
      avatar.textContent = "+";
      const copy = document.createElement("span");
      copy.className = "mt-participant-option-copy";
      const title = document.createElement("strong");
      title.textContent = `Invite “${displayName}”`;
      const details = document.createElement("span");
      details.textContent = "Unclaimed invitee · private claim link after publication";
      copy.append(title, details);
      button.append(avatar, copy);
      const target = externalTarget(displayName);
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => choose(target));
      results.append(button);
      return { button, target };
    }

    async function search(rawQuery, sequence) {
      const query = cleanText(rawQuery, 80);
      if (query.length < MIN_QUERY_LENGTH) {
        status.textContent = "Type at least two characters, then explicitly select an account.";
        closeList();
        return;
      }

      status.textContent = "Searching public usernames and safe display names… Select one explicitly.";
      controller?.abort();
      controller = new AbortController();
      try {
        const body = await requestDirectory(query, controller.signal);
        if (disposed || sequence !== requestSequence) return;
        const excluded = new Set(Array.isArray(config.excludedProfileIds) ? config.excludedProfileIds : []);
        const accounts = Array.isArray(body.results)
          ? body.results.filter((entry) => entry && !excluded.has(entry.profileId))
          : [];

        results.replaceChildren();
        options = accounts.map(addAccountOption);
        const externalClaimAllowed =
          config.allowExternalClaim &&
          query.length >= MIN_QUERY_LENGTH &&
          !containsContactLikeIdentity(query);
        if (externalClaimAllowed) {
          options.push(addExternalOption(query, options.length));
        }

        if (options.length === 0) {
          const empty = document.createElement("div");
          empty.className = "mt-participant-empty";
          empty.textContent = "No eligible account matched. Try a public username or a broader display name.";
          results.append(empty);
        }
        results.hidden = false;
        input.setAttribute("aria-expanded", "true");
        status.textContent = accounts.length
          ? `${accounts.length} eligible account${accounts.length === 1 ? "" : "s"} found. Select one explicitly.`
          : externalClaimAllowed
            ? "No account matched. You may create an unclaimed invitee by private claim link."
            : config.allowExternalClaim && containsContactLikeIdentity(query)
              ? "No eligible account matched. Enter a person's name; contact details are handled outside the proposal record."
              : "No eligible account matched.";
      } catch (error) {
        if (disposed || (error && error.name === "AbortError")) return;
        closeList();
        status.textContent = error instanceof Error
          ? error.message
          : "Participant search failed. Try again.";
      }
    }

    function queueSearch() {
      requestSequence += 1;
      const sequence = requestSequence;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => search(input.value, sequence), SEARCH_DELAY_MS);
    }

    input.addEventListener("input", queueSearch);
    input.addEventListener("focus", () => {
      if (input.value.trim().length >= MIN_QUERY_LENGTH) queueSearch();
    });
    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive(activeIndex + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive(activeIndex - 1);
      } else if (event.key === "Enter" && activeIndex >= 0) {
        event.preventDefault();
        choose(options[activeIndex].target);
      } else if (event.key === "Escape") {
        event.preventDefault();
        closeList();
      }
    });
    input.addEventListener("blur", () => {
      window.setTimeout(() => {
        if (!wrapper.contains(document.activeElement)) closeList();
      }, 120);
    });

    return () => {
      disposed = true;
      if (timer !== null) window.clearTimeout(timer);
      controller?.abort();
      closeList();
    };
  }

  function mount(root, config = {}) {
    if (!(root instanceof HTMLElement)) {
      throw new TypeError("Participant picker root must be an HTMLElement.");
    }
    mounted.get(root)?.();
    const cleanup = config.selected
      ? (renderSelected(root, config.selected, config), () => root.replaceChildren())
      : renderSearch(root, config);
    const dispose = typeof cleanup === "function" ? cleanup : () => root.replaceChildren();
    mounted.set(root, dispose);
    return () => {
      if (mounted.get(root) === dispose) mounted.delete(root);
      dispose();
    };
  }

  window.MoralTradeParticipantPicker = Object.freeze({
    loadViewer,
    mount,
  });
})();
