#!/usr/bin/env python3
from __future__ import annotations

import json
import os
import re
import sys
from pathlib import Path


DEFAULT_PROBE_AHEAD = 1000


def is_mpgf_spec(path: Path, pattern: re.Pattern[str]) -> tuple[bool, int | None]:
    match = pattern.match(path.name)
    if not match:
        return False, None
    return True, int(match.group(1))


def main() -> int:
    roots = [Path(arg).expanduser().resolve() for arg in (sys.argv[1:] or ["."])]
    probe_ahead = int(os.environ.get("MPGF_FIND_LATEST_PROBE_AHEAD", str(DEFAULT_PROBE_AHEAD)))
    existing_roots = []
    missing_roots = []
    inaccessible_roots = []
    probed_paths = []

    for root in roots:
        if root.exists():
            existing_roots.append(root)
        else:
            missing_roots.append(root)

    if not existing_roots:
        print(json.dumps({
            "ok": False,
            "error": "No search roots exist",
            "search_roots": [str(root) for root in roots],
            "missing_roots": [str(root) for root in missing_roots],
        }, indent=2))
        return 2

    pattern = re.compile(r"^moralpublicgoods(\d+)\.md$")

    matches: list[tuple[int, Path]] = []
    seen: set[Path] = set()
    for root in existing_roots:
        if root.is_file():
            resolved = root.resolve()
            if resolved not in seen:
                seen.add(resolved)
                ok, version = is_mpgf_spec(root, pattern)
                if ok and version is not None:
                    matches.append((version, root))
            continue

        try:
            next(root.iterdir())
        except StopIteration:
            pass
        except PermissionError as exc:
            inaccessible_roots.append({
                "root": str(root),
                "error": str(exc),
            })
            continue

        def on_walk_error(error: OSError) -> None:
            inaccessible_roots.append({
                "root": error.filename or str(root),
                "error": str(error),
            })

        for dirpath, _, filenames in os.walk(root, onerror=on_walk_error):
            for filename in filenames:
                if not filename.startswith("moralpublicgoods") or not filename.endswith(".md"):
                    continue
                path = Path(dirpath) / filename
                resolved = path.resolve()
                if resolved in seen:
                    continue
                seen.add(resolved)
                ok, version = is_mpgf_spec(path, pattern)
                if ok and version is not None:
                    matches.append((version, path))

    if inaccessible_roots and probe_ahead > 0:
        highest_seen = max((version for version, _ in matches), default=0)
        start_version = max(1, highest_seen)
        stop_version = start_version + probe_ahead
        for item in inaccessible_roots:
            root = Path(item["root"])
            for version in range(start_version, stop_version):
                candidate = root / f"moralpublicgoods{version}.md"
                try:
                    if not candidate.is_file():
                        continue
                except PermissionError:
                    continue
                resolved = candidate.resolve()
                if resolved in seen:
                    continue
                seen.add(resolved)
                matches.append((version, candidate))
                probed_paths.append(str(candidate))

    if not matches:
        print(json.dumps({
            "ok": False,
            "error": "No moralpublicgoods[v].md files found under searched roots",
            "search_roots": [str(root) for root in existing_roots],
            "missing_roots": [str(root) for root in missing_roots],
            "inaccessible_roots": inaccessible_roots,
            "probed_paths": probed_paths,
        }, indent=2))
        return 1

    latest_version, latest_path = max(matches, key=lambda item: item[0])
    next_version = latest_version + 1

    if inaccessible_roots and not probed_paths:
        print(json.dumps({
            "ok": False,
            "error": "Search incomplete because one or more roots could not be read",
            "search_roots": [str(root) for root in existing_roots],
            "missing_roots": [str(root) for root in missing_roots],
            "inaccessible_roots": inaccessible_roots,
            "probed_paths": probed_paths,
            "partial_latest_version": latest_version,
            "partial_next_version": next_version,
            "partial_latest_path": str(latest_path),
            "partial_latest_filename": latest_path.name,
            "hint": "Grant folder access, move the latest moralpublicgoods[v].md into a readable root, or pass the exact readable file path."
        }, indent=2))
        return 3

    print(json.dumps({
        "ok": True,
        "search_root": str(existing_roots[0]),
        "search_roots": [str(root) for root in existing_roots],
        "missing_roots": [str(root) for root in missing_roots],
        "inaccessible_roots": inaccessible_roots,
        "probed_paths": probed_paths,
        "search_warning": "Some roots could not be listed; exact moralpublicgoods<N>.md filenames were probed." if inaccessible_roots else None,
        "latest_version": latest_version,
        "next_version": next_version,
        "latest_path": str(latest_path),
        "latest_filename": latest_path.name,
        "next_filename": f"moralpublicgoods{next_version}.md"
    }, indent=2))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
