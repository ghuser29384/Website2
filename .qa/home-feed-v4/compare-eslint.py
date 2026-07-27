from __future__ import annotations

from collections import Counter
from pathlib import Path, PurePosixPath
import re
import sys

baseline_log, baseline_status_path, candidate_log, candidate_status_path, report_path = map(
    Path, sys.argv[1:]
)


def read_status(path: Path) -> int:
    return int(path.read_text(encoding="utf-8").strip())


def relative_file(raw: str) -> str:
    value = raw.strip().replace("\\", "/")
    for marker in ("/src/", "/tests/", "/scripts/", "/public/", "/config/"):
        position = value.rfind(marker)
        if position >= 0:
            return value[position + 1 :]
    return PurePosixPath(value).name


def parse(path: Path):
    current = "unknown"
    errors = Counter()
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        stripped = line.strip()
        if stripped.startswith("/") and re.search(r"\.(?:[cm]?[jt]sx?|mjs|cjs)$", stripped):
            current = relative_file(stripped)
            continue
        match = re.match(r"^\s*(\d+):(\d+)\s+error\s+(.+?)\s*$", line)
        if match:
            row, column, message = match.groups()
            errors[f"{current}:{row}:{column}:{message}"] += 1
    return errors


baseline_status = read_status(baseline_status_path)
candidate_status = read_status(candidate_status_path)
baseline_errors = parse(baseline_log)
candidate_errors = parse(candidate_log)
unexpected = candidate_errors - baseline_errors
resolved = baseline_errors - candidate_errors

lines = [
    f"baseline_status={baseline_status}",
    f"candidate_status={candidate_status}",
    f"baseline_error_count={sum(baseline_errors.values())}",
    f"candidate_error_count={sum(candidate_errors.values())}",
    f"unexpected_error_count={sum(unexpected.values())}",
    f"resolved_baseline_error_count={sum(resolved.values())}",
]
if unexpected:
    lines.append("unexpected_errors:")
    lines.extend(f"  {count}x {name}" for name, count in sorted(unexpected.items()))
if resolved:
    lines.append("resolved_baseline_errors:")
    lines.extend(f"  {count}x {name}" for name, count in sorted(resolved.items()))
report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(report_path.read_text(encoding="utf-8"))

if unexpected:
    raise SystemExit("candidate introduced ESLint errors absent from its baseline")
if baseline_status == 0 and candidate_status != 0:
    raise SystemExit("candidate lint failed although its baseline passed")
if candidate_status != 0 and not candidate_errors:
    raise SystemExit("candidate lint failed without a parseable baseline error")
