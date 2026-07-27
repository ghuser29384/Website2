#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    source = path.read_text(encoding="utf-8")
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one {label} in {path}; found {count}.")
    path.write_text(source.replace(old, new, 1), encoding="utf-8")


def main() -> None:
    inline = Path("src/app/offers/offer-plane-inline-mount.tsx")
    replace_once(
        inline,
        '''    portalHost.className = styles.portalHost;
    portalHost.dataset.offerPlaneInline = "true";
    setHost(portalHost);

    function placeHost() {''',
        '''    portalHost.className = styles.portalHost;
    portalHost.dataset.offerPlaneInline = "true";

    function placeHost() {''',
        "inline portal synchronous host state update",
    )
    replace_once(
        inline,
        '''    placeHost();
    const frame = window.requestAnimationFrame(placeHost);''',
        '''    placeHost();
    const frame = window.requestAnimationFrame(() => {
      placeHost();
      setHost(portalHost);
    });''',
        "inline portal animation-frame placement",
    )

    visual = Path("src/app/offers/offer-visual-directory-mount.tsx")
    replace_once(
        visual,
        '''    if (!queryState.shouldShow) {
      setEntries([]);
      setHost(null);
      return;
    }''',
        '''    if (!queryState.shouldShow) {
      return;
    }''',
        "visual directory synchronous hidden-state reset",
    )
    replace_once(
        visual,
        '''    portalHost.className = styles.portalHost;
    portalHost.dataset.visualOfferDirectory = "true";
    setHost(portalHost);

    const controller = new AbortController();''',
        '''    portalHost.className = styles.portalHost;
    portalHost.dataset.visualOfferDirectory = "true";

    const controller = new AbortController();''',
        "visual directory synchronous host state update",
    )
    replace_once(
        visual,
        '''    const observer = new MutationObserver(syncDirectory);
    observer.observe(document.body, { childList: true, subtree: true });
    const frame = window.requestAnimationFrame(syncDirectory);''',
        '''    const observer = new MutationObserver(syncDirectory);
    observer.observe(document.body, { childList: true, subtree: true });
    const frame = window.requestAnimationFrame(() => {
      setEntries([]);
      setHost(portalHost);
      syncDirectory();
    });''',
        "visual directory animation-frame synchronization",
    )
    replace_once(
        visual,
        '''      restoreDirectory();
      portalHost.remove();
      setEntries([]);
      setHost(null);
    };''',
        '''      restoreDirectory();
      portalHost.remove();
    };''',
        "visual directory cleanup state updates",
    )

    connections = Path("src/components/profile/complete-profile-connections.tsx")
    replace_once(
        connections,
        '''  useEffect(() => {
    if (initialOpen) setOpen(true);
  }, [initialOpen]);''',
        '''  useEffect(() => {
    if (!initialOpen) return;

    const frame = window.requestAnimationFrame(() => setOpen(true));
    return () => window.cancelAnimationFrame(frame);
  }, [initialOpen]);''',
        "connections initial-open synchronous state update",
    )

    print("Applied the three current-main React effect lint fixes to the integrated PR #158 candidate.")


if __name__ == "__main__":
    main()
