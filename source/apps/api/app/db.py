from __future__ import annotations

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[3]
LOCAL_DIR = REPO_ROOT / ".local"


def ensure_local_dir() -> Path:
    LOCAL_DIR.mkdir(exist_ok=True)
    return LOCAL_DIR


def mark_migrated() -> Path:
    target = ensure_local_dir() / "schema-version.txt"
    target.write_text("0001_initial\n", encoding="utf-8")
    return target


def mark_seeded() -> Path:
    target = ensure_local_dir() / "fixtures-seeded.txt"
    target.write_text("fixture data is loaded in memory at runtime\n", encoding="utf-8")
    return target

