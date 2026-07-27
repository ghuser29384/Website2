from __future__ import annotations

from collections import Counter
from pathlib import Path
import re
import sys

baseline_log, baseline_status_path, candidate_log, candidate_status_path, report_path = map(
    Path, sys.argv[1:]
)


def read_status(path: Path) -> int:
    return int(path.read_text(encoding="utf-8").strip())


def parse(path: Path):
    text = path.read_text(encoding="utf-8", errors="replace")
    failures = Counter()
    for line in text.splitlines():
        match = re.match(r"^\s*not ok\s+\d+\s+-\s+(.+?)\s*$", line)
        if match:
            failures[match.group(1)] += 1
    fail_counts = [int(value) for value in re.findall(r"^# fail\s+(\d+)\s*$", text, re.MULTILINE)]
    test_counts = [int(value) for value in re.findall(r"^# tests\s+(\d+)\s*$", text, re.MULTILINE)]
    return failures, fail_counts[-1] if fail_counts else None, test_counts[-1] if test_counts else None


baseline_status = read_status(baseline_status_path)
candidate_status = read_status(candidate_status_path)
baseline_failures, baseline_fail_count, baseline_test_count = parse(baseline_log)
candidate_failures, candidate_fail_count, candidate_test_count = parse(candidate_log)
unexpected = candidate_failures - baseline_failures
resolved = baseline_failures - candidate_failures

lines = [
    f"baseline_status={baseline_status}",
    f"candidate_status={candidate_status}",
    f"baseline_test_count={baseline_test_count}",
    f"candidate_test_count={candidate_test_count}",
    f"baseline_fail_count={baseline_fail_count}",
    f"candidate_fail_count={candidate_fail_count}",
    f"unexpected_failure_count={sum(unexpected.values())}",
    f"resolved_baseline_failure_count={sum(resolved.values())}",
]
if unexpected:
    lines.append("unexpected_failures:")
    lines.extend(f"  {count}x {name}" for name, count in sorted(unexpected.items()))
if resolved:
    lines.append("resolved_baseline_failures:")
    lines.extend(f"  {count}x {name}" for name, count in sorted(resolved.items()))
report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(report_path.read_text(encoding="utf-8"))

if unexpected:
    raise SystemExit("candidate introduced failing subtests absent from its baseline")
if candidate_status != 0 and (candidate_fail_count is None or candidate_fail_count == 0):
    raise SystemExit("candidate failed outside the established npm-test baseline")
if baseline_status == 0 and candidate_status != 0:
    raise SystemExit("candidate failed although its baseline passed")
if candidate_fail_count is not None and candidate_fail_count != sum(candidate_failures.values()):
    raise SystemExit("candidate TAP summary did not match parsed failing subtests")
