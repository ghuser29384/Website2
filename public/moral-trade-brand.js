(function installCanonicalMoralTradeBrand() {
  "use strict";

  if (window.__MT_CANONICAL_BRAND__) return;
  window.__MT_CANONICAL_BRAND__ = true;

  const BRAND_LABEL = "moral trade";
  const STYLE_ID = "mt-canonical-brand-styles";
  const FAVICON_PATH = "/brand/moral-trade-mark.png?v=20260730";
  const FAVICON_ATTRIBUTE = "data-mt-favicon-canonical";
  const FAVICON_SPECS = [
    { id: "mt-canonical-favicon", rel: "icon" },
    { id: "mt-canonical-shortcut-icon", rel: "shortcut icon" },
    { id: "mt-canonical-apple-touch-icon", rel: "apple-touch-icon" },
  ];
  const ROOT_SELECTOR = [
    "header",
    '[role="banner"]',
    ".topbar",
    ".app-header",
    ".moral-marketplace-app-header",
    ".mtw-header",
    ".mtw-topbar",
  ].join(",");
  const PREFERRED_SELECTOR = [
    'a[aria-label*="moral trade" i]',
    'button[aria-label*="moral trade" i]',
    '[class*="brand" i]',
    '[class*="wordmark" i]',
    '[class*="logo" i]',
  ].join(",");

  function installFavicons() {
    if (!document.head) return;

    for (const link of document.head.querySelectorAll('link[rel*="icon" i]')) {
      if (link.getAttribute(FAVICON_ATTRIBUTE) !== "true") link.remove();
    }

    for (const spec of FAVICON_SPECS) {
      let link = document.getElementById(spec.id);
      if (!(link instanceof HTMLLinkElement)) {
        link = document.createElement("link");
        link.id = spec.id;
        document.head.appendChild(link);
      }

      link.setAttribute(FAVICON_ATTRIBUTE, "true");
      link.rel = spec.rel;
      link.href = FAVICON_PATH;
      link.type = "image/png";
      link.setAttribute("sizes", "512x512");
    }
  }

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      [data-mt-brand-canonical="true"] {
        display: inline-flex !important;
        align-items: center !important;
        gap: 0.48em !important;
        color: var(--mt-brand-foreground, #171815) !important;
        font-family: Arial, Helvetica, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        font-style: normal !important;
        font-weight: 400 !important;
        letter-spacing: -0.035em !important;
        line-height: 1 !important;
        text-decoration: none !important;
        text-transform: none !important;
        white-space: nowrap !important;
        border-bottom: 0 !important;
        box-shadow: none !important;
      }
      [data-mt-brand-canonical="true"]::before,
      [data-mt-brand-canonical="true"]::after {
        display: none !important;
        content: none !important;
      }
      [data-mt-brand-canonical="true"] .mt-canonical-compact-mark {
        display: block !important;
        flex: 0 0 auto !important;
        width: 1.24em !important;
        height: 1.24em !important;
        overflow: visible !important;
      }
      [data-mt-brand-canonical="true"] .mt-canonical-wordmark-label {
        display: inline-block !important;
        color: inherit !important;
        font: inherit !important;
        letter-spacing: inherit !important;
        line-height: inherit !important;
        text-decoration: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function normalizeLabel(element) {
    return String(element.textContent || "")
      .replace(/[®™]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function isBrandLabel(element) {
    return normalizeLabel(element) === BRAND_LABEL;
  }

  function parseRgb(color) {
    const match = String(color || "").match(/rgba?\(([^)]+)\)/i);
    if (!match) return null;

    const values = match[1]
      .split(/[\s,/]+/)
      .filter(Boolean)
      .map(Number);
    if (values.length < 3 || values.slice(0, 3).some((value) => Number.isNaN(value))) return null;

    return {
      alpha: values.length >= 4 && Number.isFinite(values[3]) ? values[3] : 1,
      blue: values[2],
      green: values[1],
      red: values[0],
    };
  }

  function effectiveBackground(element) {
    let current = element;

    while (current) {
      const parsed = parseRgb(getComputedStyle(current).backgroundColor);
      if (parsed && parsed.alpha > 0.08) return parsed;
      current = current.parentElement;
    }

    return { alpha: 1, blue: 255, green: 255, red: 255 };
  }

  function foregroundFor(element) {
    const { red, green, blue } = effectiveBackground(element);
    const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
    return luminance < 0.5 ? "#ffffff" : "#171815";
  }

  function candidateScore(element) {
    let score = 0;
    const tagName = element.tagName;
    const className = typeof element.className === "string" ? element.className.toLowerCase() : "";
    const ariaLabel = String(element.getAttribute("aria-label") || "").toLowerCase();

    if (tagName === "A" || tagName === "BUTTON") score += 12;
    if (className.includes("brand")) score += 10;
    if (className.includes("wordmark")) score += 8;
    if (className.includes("logo")) score += 7;
    if (ariaLabel.includes(BRAND_LABEL)) score += 9;
    if (element.querySelector("svg, img, canvas")) score += 5;
    if (element.getAttribute("data-mt-brand-canonical") === "true") score += 30;

    return score;
  }

  function selectNonOverlapping(candidates) {
    const sorted = [...new Set(candidates)].sort((left, right) => candidateScore(right) - candidateScore(left));
    const selected = [];

    for (const candidate of sorted) {
      if (selected.some((element) => element.contains(candidate) || candidate.contains(element))) continue;
      selected.push(candidate);
    }

    return selected;
  }

  function findBrandElements() {
    const roots = [...new Set(document.querySelectorAll(ROOT_SELECTOR))];
    const found = [];

    for (const root of roots) {
      const preferred = [root, ...root.querySelectorAll(PREFERRED_SELECTOR)].filter(isBrandLabel);
      if (preferred.length) {
        found.push(...selectNonOverlapping(preferred));
        continue;
      }

      const interactive = [...root.querySelectorAll("a, button")].filter(isBrandLabel);
      if (interactive.length) {
        found.push(...selectNonOverlapping(interactive));
        continue;
      }

      const visual = [...root.querySelectorAll("div, span")].filter(
        (element) => isBrandLabel(element) && element.querySelector("svg, img, canvas"),
      );
      found.push(...selectNonOverlapping(visual));
    }

    return selectNonOverlapping(found);
  }

  function canonicalMarkup() {
    return `
      <svg aria-hidden="true" class="mt-canonical-compact-mark" focusable="false" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
        <path d="M160 784 784 160 864 240 240 864Z" fill="currentColor"></path>
        <path d="M80 784h160v160H80z" fill="currentColor"></path>
        <path d="M784 80h160v160H784z" fill="#3158ff"></path>
      </svg>
      <span class="mt-canonical-wordmark-label">Moral Trade</span>
    `;
  }

  function patchBrand(element) {
    const foreground = foregroundFor(element);
    element.style.setProperty("--mt-brand-foreground", foreground);

    if (element.getAttribute("data-mt-brand-canonical") === "true") return false;

    element.setAttribute("data-mt-brand-canonical", "true");
    if (element instanceof HTMLAnchorElement || element instanceof HTMLButtonElement) {
      element.setAttribute("aria-label", "Moral Trade, home");
    }
    element.innerHTML = canonicalMarkup();
    return true;
  }

  let scheduled = false;
  let patching = false;

  function patchAll() {
    if (patching) return;
    patching = true;

    try {
      installFavicons();
      installStyles();
      for (const element of findBrandElements()) patchBrand(element);
    } finally {
      patching = false;
    }
  }

  function schedulePatch() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      patchAll();
    });
  }

  patchAll();

  const observer = new MutationObserver(schedulePatch);
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });

  window.addEventListener("pageshow", schedulePatch);
  window.addEventListener("resize", schedulePatch, { passive: true });
})();
