#!/usr/bin/env python3
"""Integrity-bound bootstrap for the one-use Issue #782 production UAT controller."""
from __future__ import annotations

import base64
import gzip
import hashlib
import os
from pathlib import Path

_PAYLOAD_SHA256 = "91ee93f8dd4581b1cfae633c50eee8b335e0b247283cf6c47c8ce3d0d6a66107"
repo_root = Path(__file__).resolve().parents[2]
part_paths = [Path(value) for value in os.environ["CONTROLLER_PAYLOAD_PARTS"].split(",") if value]
if not part_paths:
    raise SystemExit("No Issue #782 controller payload parts were configured.")
encoded = "".join((repo_root / path).read_text(encoding="utf-8").strip() for path in part_paths)
source = gzip.decompress(base64.b64decode(encoded, validate=True))
if hashlib.sha256(source).hexdigest() != _PAYLOAD_SHA256:
    raise SystemExit("Embedded Issue #782 controller integrity check failed.")
exec(compile(source, "issue-782-canonical-production-uat-20260826.py", "exec"), {"__name__": "__main__"})
