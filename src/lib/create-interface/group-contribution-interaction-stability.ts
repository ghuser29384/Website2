const CREATE_FRAME_SELECTOR = "iframe[data-create-interface-frame='true']";
const GROUP_HOST_SELECTOR = "[data-mt-group-contribution-host]";

const observedDocuments = new WeakMap<Document, MutationObserver>();
const observedFrames = new WeakSet<HTMLIFrameElement>();
const observedRoots = new WeakSet<ShadowRoot>();
const replayingTargets = new WeakSet<EventTarget>();
let parentObserver: MutationObserver | null = null;

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

    root.addEventListener("click", deferStateReplacingInteraction, true);
    root.addEventListener("change", deferStateReplacingInteraction, true);
    observedRoots.add(root);
  });
}

function deferStateReplacingInteraction(event: Event): void {
  const target = event.target;
  if (!isElementLike(target)) return;

  const shouldDefer =
    (event.type === "click" && target.matches("[data-mode]")) ||
    (event.type === "change" && target.matches("[data-field]"));
  if (!shouldDefer) return;

  if (replayingTargets.has(target)) {
    replayingTargets.delete(target);
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();

  const eventType = event.type;
  const targetWindow = target.ownerDocument.defaultView;
  if (!targetWindow) return;

  targetWindow.setTimeout(() => {
    if (!target.isConnected) return;
    replayingTargets.add(target);

    if (eventType === "click" && isClickableElement(target)) {
      target.click();
      return;
    }

    target.dispatchEvent(
      new (targetWindow as Window & typeof globalThis).Event("change", {
        bubbles: true,
        cancelable: true,
        composed: true,
      }),
    );
  }, 0);
}

function isElementLike(target: EventTarget | null): target is Element {
  return Boolean(
    target &&
      typeof target === "object" &&
      "matches" in target &&
      typeof (target as Element).matches === "function" &&
      "ownerDocument" in target,
  );
}

function isClickableElement(target: Element): target is HTMLElement {
  return "click" in target && typeof (target as HTMLElement).click === "function";
}
