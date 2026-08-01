const CREATE_FRAME_SELECTOR = "iframe[data-create-interface-frame='true']";
const GROUP_HOST_SELECTOR = "[data-mt-group-contribution-host]";
const HOST_ATTRIBUTE = "data-mt-group-contribution-host";
const OPTION_ATTRIBUTE = "data-mt-group-contribution-option";
const STORAGE_KEY = "mt:create:group-contribution-drafts:v1";
const REMOUNT_DELAY_MS = 100;

const observedDocuments = new WeakMap<Document, MutationObserver>();
const observedFrames = new WeakSet<HTMLIFrameElement>();
const observedRoots = new WeakSet<ShadowRoot>();
const pendingHosts = new WeakSet<HTMLElement>();
let parentObserver: MutationObserver | null = null;

interface StoredDrafts {
  version: 1;
  drafts: Record<string, Record<string, unknown>>;
}

export function installGroupContributionInteractionStability(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (!isCreateTradePath(window.location.pathname)) return;

  const attach = () => {
    const frame = document.querySelector<HTMLIFrameElement>(CREATE_FRAME_SELECTOR);
    if (!frame) {
      observeCreateDocument(document);
      return;
    }

    if (!observedFrames.has(frame)) {
      observedFrames.add(frame);
      frame.addEventListener("load", () => {
        if (frame.contentDocument) observeCreateDocument(frame.contentDocument);
      });
    }
    if (frame.contentDocument) observeCreateDocument(frame.contentDocument);
  };

  attach();
  parentObserver ??= new window.MutationObserver(attach);
  parentObserver.observe(document.documentElement, { childList: true, subtree: true });
}

function isCreateTradePath(pathname: string): boolean {
  return pathname === "/trades/new" || pathname.startsWith("/trades/new/");
}

function observeCreateDocument(targetDocument: Document): void {
  scanGroupRoots(targetDocument);
  if (observedDocuments.has(targetDocument)) return;

  const targetWindow = targetDocument.defaultView;
  if (!targetWindow || !targetDocument.documentElement) return;

  const observer = new (targetWindow as Window & typeof globalThis).MutationObserver(() => {
    scanGroupRoots(targetDocument);
  });
  observer.observe(targetDocument.documentElement, { childList: true, subtree: true });
  observedDocuments.set(targetDocument, observer);
}

function scanGroupRoots(targetDocument: Document): void {
  targetDocument.querySelectorAll<HTMLElement>(GROUP_HOST_SELECTOR).forEach((host) => {
    const root = host.shadowRoot;
    if (!root || observedRoots.has(root)) return;

    root.addEventListener("click", stabilizeStateReplacingInteraction, true);
    root.addEventListener("change", stabilizeStateReplacingInteraction, true);
    observedRoots.add(root);
  });
}

function stabilizeStateReplacingInteraction(event: Event): void {
  const control = event.target;
  if (!isElementLike(control)) return;

  const mode = event.type === "click" ? control.getAttribute("data-mode") : null;
  const field = event.type === "change" ? control.getAttribute("data-field") : null;
  if (!mode && !field) return;

  const root = control.getRootNode();
  const host = isShadowRootLike(root) ? root.host : null;
  if (!isHtmlElementLike(host) || pendingHosts.has(host)) return;

  const key = host.getAttribute(HOST_ATTRIBUTE);
  const targetWindow = control.ownerDocument.defaultView;
  if (!key || !targetWindow) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  const updated = mode
    ? updateStoredDraft(targetWindow, key, (draft) => {
        draft.mode = mode;
      })
    : updateStoredField(targetWindow, key, field!, control);
  if (!updated) return;

  pendingHosts.add(host);
  targetWindow.setTimeout(() => {
    pendingHosts.delete(host);
    remountOption(host, key);
  }, REMOUNT_DELAY_MS);
}

function updateStoredField(
  targetWindow: Window,
  key: string,
  field: string,
  control: Element,
): boolean {
  return updateStoredDraft(targetWindow, key, (draft) => {
    if (field === "counterpartyParticipation" && isInputLike(control)) {
      draft[field] = control.checked ? "explicitly-included" : "explicitly-excluded";
      return;
    }

    if (isInputLike(control) && control.type === "checkbox") {
      draft[field] = control.checked;
      return;
    }

    if (isInputLike(control) && control.dataset.minorUnits === "true") {
      const parsed = Number.parseFloat(control.value);
      draft[field] = Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0;
      return;
    }

    const value = controlValue(control);
    if (field === "minimumReliability" && value.trim() === "") {
      draft[field] = null;
      return;
    }

    const existing = draft[field];
    if (typeof existing === "number" || existing === null) {
      const parsed = Number(value);
      draft[field] = Number.isFinite(parsed) ? parsed : 0;
      return;
    }

    draft[field] = value;
  });
}

function updateStoredDraft(
  targetWindow: Window,
  key: string,
  update: (draft: Record<string, unknown>) => void,
): boolean {
  try {
    const raw = targetWindow.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<StoredDrafts>;
    if (parsed.version !== 1 || !isRecord(parsed.drafts)) return false;

    const draft = parsed.drafts[key];
    if (!isRecord(draft)) return false;
    update(draft);

    targetWindow.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, drafts: parsed.drafts } satisfies StoredDrafts),
    );
    return true;
  } catch {
    return false;
  }
}

function remountOption(host: HTMLElement, key: string): void {
  const card = host.previousElementSibling;
  if (!isHtmlElementLike(card)) return;

  card.removeAttribute(OPTION_ATTRIBUTE);
  host.remove();
  window.MoralTradeGroupContributions?.refresh();

  window.dispatchEvent(
    new CustomEvent("moraltrade:group-contribution-remount", {
      detail: { optionKey: key },
    }),
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isElementLike(target: EventTarget | null): target is Element {
  return Boolean(
    target &&
      typeof target === "object" &&
      "getAttribute" in target &&
      "getRootNode" in target &&
      "ownerDocument" in target,
  );
}

function isHtmlElementLike(value: unknown): value is HTMLElement {
  return Boolean(
    value &&
      typeof value === "object" &&
      "getAttribute" in value &&
      "removeAttribute" in value &&
      "remove" in value,
  );
}

function isShadowRootLike(value: unknown): value is ShadowRoot {
  return Boolean(value && typeof value === "object" && "host" in value);
}

function isInputLike(control: Element): control is HTMLInputElement {
  return control.tagName === "INPUT" && "checked" in control && "value" in control;
}

function controlValue(control: Element): string {
  return "value" in control ? String(control.value ?? "") : "";
}
