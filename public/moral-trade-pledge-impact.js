(function installMoralTradePledgeImpact() {
  "use strict";

  if (window.MoralTradePledgeImpact) return;

  const responseCache = new Map();
  const money = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

  function formatMoney(cents) {
    return money.format(Number(cents || 0) / 100);
  }

  function formatProbability(basisPoints) {
    const value = Number(basisPoints || 0) / 100;
    return `${value.toFixed(value >= 10 ? 1 : 2)}%`;
  }

  function find(root, selector) {
    return root.querySelector(selector);
  }

  function show(element, visible) {
    if (element) element.hidden = !visible;
  }

  function cacheKey(root) {
    return [root.dataset.poolKey, root.dataset.campaignId, root.dataset.pledgeCents].join(":");
  }

  async function load(root) {
    const key = cacheKey(root);
    if (responseCache.has(key)) return responseCache.get(key);
    const params = new URLSearchParams({
      pool: root.dataset.poolKey || "",
      campaign: root.dataset.campaignId || "",
      pledgeCents: root.dataset.pledgeCents || "0",
    });
    const promise = fetch(`/api/mpgf/pledge-impact?${params.toString()}`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Pledge-impact forecast returned ${response.status}`);
      return response.json();
    });
    responseCache.set(key, promise);
    try {
      return await promise;
    } catch (error) {
      responseCache.delete(key);
      throw error;
    }
  }

  function renderUnavailable(root, payload) {
    show(find(root, "[data-impact-loading]"), false);
    show(find(root, "[data-impact-available]"), false);
    show(find(root, "[data-impact-unavailable]"), true);
    const message = find(root, "[data-impact-message]");
    if (message) {
      message.textContent = payload?.message ||
        "The forecast service is temporarily unavailable. Only the mechanical gap change is shown.";
    }
    root.dataset.impactStatus = "unavailable";
    root.dataset.impactReason = payload?.reason || "service_unavailable";
  }

  function renderAvailable(root, payload) {
    show(find(root, "[data-impact-loading]"), false);
    show(find(root, "[data-impact-unavailable]"), false);
    show(find(root, "[data-impact-available]"), true);

    const firstThreshold = payload.thresholds?.[0];
    const additional = find(root, "[data-impact-additional]");
    const multiplier = find(root, "[data-impact-multiplier]");
    const range = find(root, "[data-impact-range]");
    const pass = find(root, "[data-impact-pass]");
    const bonus = find(root, "[data-impact-bonus]");
    const recommendation = find(root, "[data-impact-recommend]");

    if (additional) additional.textContent = formatMoney(payload.additionalFundingFromOthers?.estimateCents);
    if (multiplier) multiplier.textContent = `${Number(payload.fundingMultiplier || 0).toFixed(1)}× per $1 pledged`;
    if (range) {
      range.textContent = `90% range ${formatMoney(payload.additionalFundingFromOthers?.lower90Cents)}–${formatMoney(payload.additionalFundingFromOthers?.upper90Cents)}`;
    }
    if (pass && firstThreshold) {
      const change = Number(firstThreshold.probabilityWithPledgeBps) - Number(firstThreshold.probabilityWithoutPledgeBps);
      pass.textContent = `Pass chance ${formatProbability(firstThreshold.probabilityWithoutPledgeBps)} → ${formatProbability(firstThreshold.probabilityWithPledgeBps)} (+${(change / 100).toFixed(change >= 100 ? 1 : 2)} pp)`;
    }
    if (bonus) {
      bonus.textContent = payload.failureBonusConditionalOnFailure
        ? `${formatMoney(payload.failureBonusConditionalOnFailure.projectedCents)} projected bonus if the threshold is missed`
        : "No released failure-bonus projection";
    }
    if (recommendation && payload.recommendation && payload.recommendation.pledgeCents !== Number(root.dataset.pledgeCents)) {
      recommendation.hidden = false;
      recommendation.dataset.recommendCents = String(payload.recommendation.pledgeCents);
      recommendation.textContent = `Use suggested ${formatMoney(payload.recommendation.pledgeCents)}`;
    } else if (recommendation) {
      recommendation.hidden = true;
    }

    root.__pledgeImpactPayload = payload;
    root.dataset.impactStatus = "available";
    root.dataset.forecastVersion = payload.forecastVersion || "";
  }

  async function hydrateRoot(root) {
    if (!(root instanceof HTMLElement) || root.dataset.impactHydrating === "true") return;
    root.dataset.impactHydrating = "true";
    try {
      const payload = await load(root);
      if (!root.isConnected) return;
      if (payload?.status === "available") renderAvailable(root, payload);
      else renderUnavailable(root, payload);
    } catch {
      if (root.isConnected) renderUnavailable(root, null);
    } finally {
      delete root.dataset.impactHydrating;
    }
  }

  function hydrate() {
    document.querySelectorAll("[data-pledge-impact-root]").forEach(hydrateRoot);
  }

  function closeDialog() {
    document.querySelector("[data-pledge-impact-dialog]")?.remove();
  }

  function openDialog(root) {
    const payload = root?.__pledgeImpactPayload;
    if (!payload || payload.status !== "available") return;
    closeDialog();
    const threshold = payload.thresholds?.[0];
    const followOn = payload.followOnEffect?.included
      ? `Included using ${String(payload.followOnEffect.evidenceType).replaceAll("_", " ")} causal evidence.`
      : "Not included because no qualifying causal evidence has been released for this pool type.";
    const dialog = document.createElement("div");
    dialog.className = "mt-impact-dialog-backdrop";
    dialog.dataset.pledgeImpactDialog = "true";
    dialog.innerHTML = `<section class="mt-impact-dialog" role="dialog" aria-modal="true" aria-labelledby="mt-impact-dialog-title">
      <header><div><span>EXPERIMENTAL ESTIMATE</span><h2 id="mt-impact-dialog-title">How this is calculated</h2></div><button type="button" data-impact-close aria-label="Close calculation">×</button></header>
      <div class="mt-impact-dialog-grid">
        <section><h3>1. Direct threshold effect</h3><p>The model compares the pool with and without this pledge while holding downstream behavior fixed. The next-threshold estimate moves from ${formatProbability(threshold?.probabilityWithoutPledgeBps)} to ${formatProbability(threshold?.probabilityWithPledgeBps)}.</p></section>
        <section><h3>2. Follow-on contribution effect</h3><p>${followOn}</p></section>
        <section><h3>3. Settlement adjustment</h3><p>Expected payment failures, expired authorizations, withdrawals, and collection risks change the estimate by ${formatMoney(payload.decomposition?.settlementAdjustmentCents)}.</p></section>
        <section><h3>4. Timing effect</h3><p>Earlier activation contributes ${formatMoney(payload.decomposition?.timingEffectCents)} only where it is expected to preserve or attract settled funding.</p></section>
        <section><h3>5. Credit allocation</h3><p>Shapley-style allocated credit is ${formatMoney(payload.allocatedFundingCredit?.estimateCents)}. It is designed to add up and is not a literal causal estimate. Individual causal estimates may overlap.</p></section>
        <section><h3>6. Uncertainty and model performance</h3><p>The 90% range is ${formatMoney(payload.additionalFundingFromOthers?.lower90Cents)}–${formatMoney(payload.additionalFundingFromOthers?.upper90Cents)}. Model ${payload.modelVersion} was evaluated on ${Number(payload.modelPerformance?.sampleSize || 0).toLocaleString("en-US")} observations; calibration error is ${formatProbability(payload.modelPerformance?.calibrationErrorBps)}.</p></section>
      </div>
      <footer>Forecast ${payload.forecastVersion} · released ${new Date(payload.releasedAt).toLocaleString("en-US")}</footer>
    </section>`;
    document.body.append(dialog);
    dialog.querySelector("[data-impact-close]")?.focus();
  }

  function applyRecommendation(button) {
    const root = button.closest("[data-pledge-impact-root]");
    const cents = Number(button.dataset.recommendCents || 0);
    if (!root || !Number.isSafeInteger(cents) || cents <= 0) return;
    const range = document.querySelector(`[data-pledge-range][data-pool-id="${CSS.escape(root.dataset.poolKey || "")}"]`);
    if (!(range instanceof HTMLInputElement)) return;
    range.value = String(Math.round(cents / 100));
    range.dispatchEvent(new Event("input", { bubbles: true }));
  }

  document.addEventListener("click", (event) => {
    const method = event.target.closest?.("[data-pledge-impact-method]");
    if (method) {
      event.preventDefault();
      openDialog(method.closest("[data-pledge-impact-root]"));
      return;
    }
    const recommend = event.target.closest?.("[data-impact-recommend]");
    if (recommend) {
      event.preventDefault();
      applyRecommendation(recommend);
      return;
    }
    if (event.target.closest?.("[data-impact-close]") || event.target.matches?.(".mt-impact-dialog-backdrop")) {
      closeDialog();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeDialog();
  });

  window.MoralTradePledgeImpact = { hydrate };
  hydrate();
})();
