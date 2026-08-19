from __future__ import annotations

import csv
import hashlib
import json
import math
from pathlib import Path
from typing import Any, Iterable

import numpy as np


def stable_number(value: Any) -> Any:
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating, float)):
        number = float(value)
        if not math.isfinite(number):
            raise ValueError("non-finite values are not serializable")
        if number == 0:
            return 0.0
        return number
    return value


def csv_cell(value: Any) -> Any:
    value = stable_number(value)
    if isinstance(value, float):
        return format(value, ".12g")
    if value is None:
        return ""
    return value


def write_csv(path: Path, rows: Iterable[dict[str, Any]], fieldnames: list[str] | tuple[str, ...]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore", lineterminator="\n")
        writer.writeheader()
        for row in rows:
            writer.writerow({key: csv_cell(row.get(key)) for key in fieldnames})


def _json_default(value: Any) -> Any:
    if isinstance(value, np.ndarray):
        return [stable_number(item) for item in value.tolist()]
    value = stable_number(value)
    if value is not None and not isinstance(value, (str, int, float, bool, list, dict)):
        raise TypeError(f"unsupported JSON value: {type(value)!r}")
    return value


def write_json(path: Path, value: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    rendered = json.dumps(value, sort_keys=True, indent=2, ensure_ascii=False, default=_json_default, allow_nan=False) + "\n"
    path.write_text(rendered, encoding="utf-8")


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def tree_hash(entries: dict[str, str]) -> str:
    digest = hashlib.sha256()
    for path, file_hash in sorted(entries.items()):
        digest.update(path.encode("utf-8"))
        digest.update(b"\0")
        digest.update(file_hash.encode("ascii"))
        digest.update(b"\n")
    return digest.hexdigest()


def file_hashes(root: Path, *, exclude_names: set[str] | None = None) -> dict[str, str]:
    exclude_names = exclude_names or set()
    result: dict[str, str] = {}
    for path in sorted(root.rglob("*")):
        if not path.is_file() or path.name in exclude_names or "__pycache__" in path.parts:
            continue
        result[path.relative_to(root).as_posix()] = sha256_file(path)
    return result
