#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import os
import re
import statistics
import subprocess
import time
import urllib.error
import urllib.parse
import urllib.request
import zipfile
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any, Iterable

REPO = "ghuser29384/Website2"
OWNER = "ghuser29384"
REPO_NAME = "Website2"
TARGET_RUN_ID = 30567960123
PRODUCT_PR = 326
QA_REF = "hvmxfjjbdcgjjudmthdz"
FIXTURE_OFFER_ID = "10000000-0000-4000-8000-000000000158"
SYNTHETIC_EMAILS = (
    "qa-market-owner@example.com",
    "qa-market-responder@example.com",
)
VERCEL_SCOPE = "ellen-s"
PROJECTS = {
    "website2": "prj_uhfNhPo00nQrcbG0dk2zLWo7UmdK",
    "moraltrade-site": "prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7",
}
REQUIRED_CHECKS = {
    "rendered current-main comparison",
    "duplicate-project exact-head QA binding",
    "synthetic responder signs into the QA deployment",
    "question pending, success, persistence, and reset",
    "Save and Remove saved persist across reloads",
    "counteroffer preserves source_offer and reverses exact terms",
    "responder submits a real pending interest",
    "owner atomically accepts the member response",
    "owner reaches the canonical message and trade-agreement routes",
    "responder accesses the same canonical thread and agreement",
    "application-origin browser diagnostics",
}
REQUIRED_SCREENSHOT_STEMS = {
    "current-main-offer-cards",
    "candidate-participant-grouping",
    "qa-participant-directory",
    "question-posted",
    "counteroffer-source-and-reversal",
    "interest-pending",
    "acceptance-created-core-agreement",
    "canonical-trade-agreement",
}
KNOWN_404_PATHS = {"/", "/discover", "/feed", "/offers"}
NAMED_RUNTIME_ERRORS = (
    "Missing SUPABASE_SERVICE_ROLE_KEY",
    "permission denied for table email_outbox",
)

ROOT = Path(os.environ.get("GITHUB_WORKSPACE", Path.cwd()))
OUT = ROOT / "marketplace-delta-final-audit"
DOWNLOADS = OUT / "downloads"
EXTRACTED = OUT / "extracted"
MEDIA = OUT / "media-inspection"
for directory in (OUT, DOWNLOADS, EXTRACTED, MEDIA):
    directory.mkdir(parents=True, exist_ok=True)

GH_TOKEN = os.environ.get("GH_TOKEN") or os.environ.get("GITHUB_TOKEN", "")
VERCEL_TOKEN = os.environ.get("VERCEL_TOKEN", "")
QA_DB_URL = os.environ.get("QA_SUPABASE_DB_URL", "")


class AuditError(RuntimeError):
    pass


@dataclass
class Finding:
    category: str
    check: str
    passed: bool
    detail: str


findings: list[Finding] = []
failures: list[str] = []


def record(category: str, check: str, passed: bool, detail: str) -> None:
    findings.append(Finding(category, check, passed, detail))
    prefix = "PASS" if passed else "FAIL"
    print(f"{prefix}: [{category}] {check} — {detail}")
    if not passed:
        failures.append(f"[{category}] {check}: {detail}")


def required_env(name: str, value: str) -> None:
    if not value:
        raise AuditError(f"Missing required environment variable: {name}")


def http_json(url: str, *, method: str = "GET", data: Any | None = None, github: bool = False) -> Any:
    headers = {"User-Agent": "moraltrade-marketplace-final-auditor"}
    if github:
        headers.update({"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"})
        if GH_TOKEN:
            headers["Authorization"] = f"Bearer {GH_TOKEN}"
    body = None
    if data is not None:
        body = json.dumps(data).encode("utf-8")
        headers["Content-Type"] = "application/json"
    request = urllib.request.Request(url, data=body, method=method, headers=headers)
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.load(response)


def github_json(path: str, *, method: str = "GET", data: Any | None = None) -> Any:
    return http_json(f"https://api.github.com/repos/{REPO}{path}", method=method, data=data, github=True)


def wait_for_terminal_run() -> dict[str, Any]:
    deadline = time.time() + 45 * 60
    last: dict[str, Any] | None = None
    while time.time() < deadline:
        last = github_json(f"/actions/runs/{TARGET_RUN_ID}")
        if last.get("status") == "completed":
            return last
        print(f"Run {TARGET_RUN_ID} status={last.get('status')}; waiting.")
        time.sleep(20)
    raise AuditError(f"Run {TARGET_RUN_ID} did not become terminal; last={last}")


def download_url(url: str, destination: Path, *, github: bool = False) -> None:
    headers = {"User-Agent": "moraltrade-marketplace-final-auditor"}
    if github and GH_TOKEN:
        headers.update({
            "Authorization": f"Bearer {GH_TOKEN}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        })
    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request, timeout=180) as response:
        destination.write_bytes(response.read())


def safe_extract(archive: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive) as zf:
        base = destination.resolve()
        for member in zf.infolist():
            target = (destination / member.filename).resolve()
            if not str(target).startswith(str(base) + os.sep) and target != base:
                raise AuditError(f"Unsafe artifact member: {member.filename}")
        bad = zf.testzip()
        if bad:
            raise AuditError(f"Corrupt artifact member: {bad}")
        zf.extractall(destination)


def get_artifacts() -> list[dict[str, Any]]:
    payload = github_json(f"/actions/runs/{TARGET_RUN_ID}/artifacts?per_page=100")
    artifacts = [a for a in payload.get("artifacts", []) if not a.get("expired")]
    browser = [a for a in artifacts if "browser-evidence" in a.get("name", "")]
    proof = [a for a in artifacts if "final-proof" in a.get("name", "")]
    record("artifacts", "browser evidence artifact present", bool(browser), f"found {len(browser)}")
    record("artifacts", "final proof artifact present", bool(proof), f"found {len(proof)}")
    selected: list[dict[str, Any]] = []
    if browser:
        selected.append(max(browser, key=lambda x: x.get("created_at", "")))
    if proof:
        selected.append(max(proof, key=lambda x: x.get("created_at", "")))
    for artifact in selected:
        archive = DOWNLOADS / f"{artifact['name']}.zip"
        download_url(artifact["archive_download_url"], archive, github=True)
        digest = hashlib.sha256(archive.read_bytes()).hexdigest()
        artifact["download_sha256"] = digest
        artifact["local_archive"] = str(archive.relative_to(OUT))
        destination = EXTRACTED / artifact["name"]
        safe_extract(archive, destination)
        artifact["extracted_to"] = str(destination.relative_to(OUT))
        record("artifacts", f"download and integrity: {artifact['name']}", archive.stat().st_size > 0, f"{archive.stat().st_size} bytes; sha256={digest}")
    (OUT / "artifact-index.json").write_text(json.dumps(selected, indent=2), encoding="utf-8")
    return selected


def recursively_find(name: str) -> list[Path]:
    return sorted(EXTRACTED.rglob(name))


def report_label(report: dict[str, Any], path: Path) -> str:
    viewport = report.get("viewport") or {}
    if viewport.get("width") and viewport.get("height"):
        return f"{viewport['width']}x{viewport['height']}"
    lowered = str(path).lower()
    return "1440x900" if "desktop" in lowered else "390x844" if "mobile" in lowered else path.parent.name


def inspect_reports() -> dict[str, Any]:
    report_paths = recursively_find("report.json")
    summaries: dict[str, Any] = {}
    record("reports", "desktop and mobile JSON reports found", len(report_paths) >= 2, f"found {len(report_paths)}")
    for path in report_paths:
        try:
            report = json.loads(path.read_text(encoding="utf-8"))
        except Exception as exc:
            record("reports", f"parse {path}", False, repr(exc))
            continue
        label = report_label(report, path)
        checks = report.get("checks") or []
        names = {str(c.get("name")) for c in checks}
        failed = [c for c in checks if c.get("outcome") != "pass"]
        missing = sorted(REQUIRED_CHECKS - names)
        record("reports", f"{label} outcome", report.get("outcome") == "pass" and not report.get("failure"), f"outcome={report.get('outcome')}; failure={report.get('failure')}")
        record("reports", f"{label} all recorded checks pass", not failed, f"failed={len(failed)}")
        record("reports", f"{label} required checks present", not missing, f"missing={missing}")
        record("reports", f"{label} agreement and thread created", bool(report.get("agreementId")) and bool(report.get("threadId")), f"agreement={report.get('agreementId')}; thread={report.get('threadId')}")
        comparison = report.get("comparison") or {}
        comparison_ok = comparison.get("baselineGroupCount") == 0 and int(comparison.get("candidateGroupCount", 0)) > 0
        record("reports", f"{label} rendered baseline comparison", comparison_ok, json.dumps(comparison, sort_keys=True))
        diagnostics = report.get("diagnostics") or []
        page_errors = sum(len(d.get("pageErrors") or []) for d in diagnostics)
        record("reports", f"{label} page exceptions", page_errors == 0, f"count={page_errors}")
        summaries[label] = {
            "path": str(path.relative_to(OUT)),
            "outcome": report.get("outcome"),
            "agreementId": report.get("agreementId"),
            "threadId": report.get("threadId"),
            "check_count": len(checks),
            "failed_checks": failed,
            "missing_required_checks": missing,
            "known_diagnostics": len(report.get("knownDiagnostics") or []),
            "comparison": comparison,
            "viewport": report.get("viewport"),
        }
        md = path.with_name("report.md")
        md_ok = False
        detail = "missing"
        if md.exists():
            text = md.read_text(encoding="utf-8", errors="replace")
            md_ok = "Outcome: **pass**" in text and "FAIL:" not in text
            detail = f"{len(text)} characters"
        record("reports", f"{label} Markdown report", md_ok, detail)
    record("reports", "both requested viewports represented", {"1440x900", "390x844"}.issubset(summaries.keys()), f"labels={sorted(summaries)}")
    (OUT / "report-inspection.json").write_text(json.dumps(summaries, indent=2), encoding="utf-8")
    return summaries


def image_stats(path: Path) -> dict[str, Any]:
    from PIL import Image, ImageStat
    with Image.open(path) as image:
        image.verify()
    with Image.open(path) as image:
        rgb = image.convert("RGB")
        stat = ImageStat.Stat(rgb)
        extrema = rgb.getextrema()
        return {
            "width": image.width,
            "height": image.height,
            "mode": image.mode,
            "stddev": stat.stddev,
            "extrema": extrema,
            "bytes": path.stat().st_size,
            "nonblank": max(stat.stddev) > 2.0 and any(hi - lo > 10 for lo, hi in extrema),
        }


def run_command(command: list[str], *, timeout: int = 180) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=timeout)


def inspect_trace(path: Path) -> dict[str, Any]:
    result: dict[str, Any] = {"path": str(path.relative_to(OUT)), "bytes": path.stat().st_size}
    with zipfile.ZipFile(path) as zf:
        bad = zf.testzip()
        names = zf.namelist()
        trace_names = [n for n in names if n.endswith("trace.trace")]
        network_names = [n for n in names if n.endswith("trace.network")]
        action_events = 0
        for name in trace_names:
            raw = zf.read(name).decode("utf-8", errors="ignore")
            action_events += raw.count('"type":"before"') + raw.count('"type":"after"')
        result.update({
            "corrupt_member": bad,
            "member_count": len(names),
            "trace_files": trace_names,
            "network_files": network_names,
            "action_events": action_events,
            "valid": bad is None and bool(trace_names) and bool(network_names) and action_events > 0,
        })
    return result


def average_hash(path: Path) -> str:
    from PIL import Image
    with Image.open(path) as image:
        values = list(image.convert("L").resize((16, 16)).getdata())
    mean = statistics.mean(values)
    bits = "".join("1" if value >= mean else "0" for value in values)
    return hex(int(bits, 2))[2:].zfill(64)


def inspect_video(path: Path) -> dict[str, Any]:
    probe = run_command([
        "ffprobe", "-v", "error", "-select_streams", "v:0",
        "-show_entries", "stream=codec_name,width,height,duration:format=duration",
        "-of", "json", str(path),
    ], timeout=120)
    result: dict[str, Any] = {"path": str(path.relative_to(OUT)), "bytes": path.stat().st_size, "ffprobe_exit": probe.returncode}
    try:
        payload = json.loads(probe.stdout or "{}")
    except json.JSONDecodeError:
        payload = {}
    streams = payload.get("streams") or []
    stream = streams[0] if streams else {}
    try:
        duration = float(stream.get("duration") or (payload.get("format") or {}).get("duration") or 0)
    except (TypeError, ValueError):
        duration = 0.0
    result.update({"codec": stream.get("codec_name"), "width": stream.get("width"), "height": stream.get("height"), "duration": duration})
    frame_dir = MEDIA / "video-frames" / hashlib.sha256(str(path).encode()).hexdigest()[:12]
    frame_dir.mkdir(parents=True, exist_ok=True)
    frames: list[Path] = []
    for index, ratio in enumerate((0.2, 0.5, 0.8), start=1):
        target = frame_dir / f"frame-{index}.png"
        proc = run_command(["ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", f"{max(0.1, duration * ratio):.3f}", "-i", str(path), "-frames:v", "1", "-y", str(target)], timeout=120)
        if proc.returncode == 0 and target.exists() and target.stat().st_size > 0:
            frames.append(target)
    hashes = [average_hash(frame) for frame in frames]
    result["frame_paths"] = [str(frame.relative_to(OUT)) for frame in frames]
    result["distinct_frame_hashes"] = len(set(hashes))
    result["valid"] = probe.returncode == 0 and bool(streams) and duration > 1.0 and int(stream.get("width") or 0) > 0 and int(stream.get("height") or 0) > 0 and len(frames) >= 2 and len(set(hashes)) >= 2
    return result


def inspect_media() -> dict[str, Any]:
    screenshots: list[dict[str, Any]] = []
    for path in sorted(EXTRACTED.rglob("*.png")):
        try:
            stats = image_stats(path)
            stats.update({"path": str(path.relative_to(OUT)), "stem": path.stem})
            screenshots.append(stats)
        except Exception as exc:
            screenshots.append({"path": str(path.relative_to(OUT)), "valid": False, "error": repr(exc)})
    stems = {item.get("stem") for item in screenshots}
    missing_stems = sorted(REQUIRED_SCREENSHOT_STEMS - stems)
    invalid_images = [item for item in screenshots if not item.get("nonblank", False)]
    record("media", "screenshots present", len(screenshots) >= 16, f"count={len(screenshots)}")
    record("media", "required screenshot subjects present", not missing_stems, f"missing={missing_stems}")
    record("media", "screenshots decode and are nonblank", not invalid_images, f"invalid={len(invalid_images)}")
    traces = [inspect_trace(path) for path in sorted(EXTRACTED.rglob("trace.zip"))]
    record("media", "Playwright traces present", len(traces) >= 6, f"count={len(traces)}")
    record("media", "Playwright traces pass ZIP/action/network integrity", all(item.get("valid") for item in traces), f"invalid={sum(not item.get('valid') for item in traces)}")
    videos: list[dict[str, Any]] = []
    for pattern in ("*.webm", "*.mp4"):
        videos.extend(inspect_video(path) for path in sorted(EXTRACTED.rglob(pattern)))
    record("media", "recorded browser videos present", len(videos) >= 6, f"count={len(videos)}")
    record("media", "videos decode, have duration, and contain changing frames", all(item.get("valid") for item in videos), f"invalid={sum(not item.get('valid') for item in videos)}")
    result = {"screenshots": screenshots, "traces": traces, "videos": videos}
    (OUT / "media-inspection.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
    return result


def parse_key_value_file(path: Path) -> dict[str, str]:
    result: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        if "=" in line:
            key, value = line.split("=", 1)
            result[key.strip()] = value.strip()
    return result


def inspect_final_proof() -> dict[str, Any]:
    proof_paths = recursively_find("exact-head-proof.txt")
    record("proof", "exact-head proof file found", bool(proof_paths), f"found={len(proof_paths)}")
    proof = parse_key_value_file(proof_paths[-1]) if proof_paths else {}
    for key, expected in {
        "desktop_status": "PASS", "mobile_status": "PASS", "post_browser_fixture": "clean",
        "temporary_bypasses": "revoked", "production_changed": "NO",
    }.items():
        record("proof", key, proof.get(key) == expected, f"actual={proof.get(key)!r}; expected={expected!r}")
    candidate_sha = proof.get("exact_candidate_sha", "")
    record("proof", "exact candidate SHA present", bool(re.fullmatch(r"[0-9a-f]{40}", candidate_sha)), candidate_sha)
    pr = github_json(f"/pulls/{PRODUCT_PR}")
    pr_head = pr.get("head", {}).get("sha", "")
    record("proof", "proof SHA equals current PR #326 head", candidate_sha == pr_head, f"proof={candidate_sha}; pr={pr_head}")
    record("proof", "PR #326 remains unmerged", not pr.get("merged"), f"state={pr.get('state')}; draft={pr.get('draft')}")
    for label, paths in (("pre", recursively_find("pre-browser-state.json")), ("post", recursively_find("post-browser-state.json"))):
        record("proof", f"{label}-browser clean-state proof found", bool(paths), f"found={len(paths)}")
        if paths:
            state = json.loads(paths[-1].read_text(encoding="utf-8"))
            zero_keys = ["interests", "guest_interests", "agreements", "threads", "comments", "carts", "counterproposals", "invitations", "review_events", "notifications", "outbox"]
            clean = state.get("offer_clean") is True and all(int(state.get(key, -1)) == 0 for key in zero_keys) and state.get("migration_recorded") is True and state.get("member_rpc") is True and state.get("guest_rpc") is True
            record("proof", f"{label}-browser state is exact and clean", clean, json.dumps(state, sort_keys=True))
    env_paths = recursively_find("branch-scoped-qa-environment.txt")
    record("proof", "branch-scoped QA environment proof found", bool(env_paths), f"found={len(env_paths)}")
    if env_paths:
        text = env_paths[-1].read_text(encoding="utf-8", errors="replace")
        for project in PROJECTS:
            line = next((line for line in text.splitlines() if f"project={project} " in line), "")
            ok = f"qa_ref={QA_REF}" in line and "url_match=true" in line and "publishable_key_match=true" in line and ("service_role_match=true" in line or "service_role_present=true" in line)
            record("proof", f"{project} is bound to QA Preview values", ok, line)
    tsc_paths = recursively_find("marketplace-delta-typescript-differential.txt")
    if tsc_paths:
        tsc = parse_key_value_file(tsc_paths[-1])
        record("proof", "TypeScript differential has zero candidate-only errors", tsc.get("candidate_only_errors") == "0", json.dumps(tsc, sort_keys=True))
    else:
        record("proof", "TypeScript differential proof found", False, "missing")
    (OUT / "exact-proof-inspection.json").write_text(json.dumps(proof, indent=2), encoding="utf-8")
    return proof


def normalize_event(event: Any) -> dict[str, Any]:
    if not isinstance(event, dict):
        return {"raw": str(event)}
    def first(keys: Iterable[str]) -> Any:
        for key in keys:
            if key in event and event[key] is not None:
                return event[key]
        return None
    return {
        "message": first(("message", "text", "msg", "proxyMessage")),
        "level": first(("level", "severity", "type")),
        "statusCode": first(("statusCode", "status", "responseStatus")),
        "requestPath": first(("requestPath", "path", "pathname", "url")),
    }


def capture_vercel_logs(url: str) -> tuple[int, str]:
    help_proc = run_command(["npx", "--yes", "vercel@latest", "logs", "--help"], timeout=180)
    help_text = help_proc.stdout
    (OUT / "vercel-logs-help.txt").write_text(help_text, encoding="utf-8")
    command = ["npx", "--yes", "vercel@latest", "logs", url]
    if "--json" in help_text:
        command.append("--json")
    if "--since" in help_text:
        command.extend(["--since", "24h"])
    if "--limit" in help_text:
        command.extend(["--limit", "1000"])
    command.extend(["--scope", VERCEL_SCOPE, "--token", VERCEL_TOKEN])
    try:
        proc = run_command(command, timeout=240)
        return proc.returncode, proc.stdout
    except subprocess.TimeoutExpired as exc:
        output = exc.stdout or ""
        if isinstance(output, bytes):
            output = output.decode("utf-8", errors="replace")
        return 124, output


def inspect_runtime_logs(proof: dict[str, str]) -> dict[str, Any]:
    required_env("VERCEL_TOKEN", VERCEL_TOKEN)
    summaries: dict[str, Any] = {}
    for project in PROJECTS:
        prefix = project.replace("-", "_")
        url = proof.get(f"{prefix}_preview", "")
        deployment = proof.get(f"{prefix}_deployment", "")
        if not url:
            record("runtime", f"{project} exact deployment URL in proof", False, "missing")
            continue
        code, raw = capture_vercel_logs(url)
        named_counts = {needle: raw.count(needle) for needle in NAMED_RUNTIME_ERRORS}
        parsed: list[dict[str, Any]] = []
        for line in raw.splitlines():
            candidate = line.strip()
            if "{" in candidate and not candidate.startswith("{"):
                candidate = candidate[candidate.find("{"):]
            try:
                parsed.append(normalize_event(json.loads(candidate)))
            except json.JSONDecodeError:
                continue
        error_fatal: list[dict[str, Any]] = []
        five_xx: list[dict[str, Any]] = []
        four_oh_four: list[dict[str, str]] = []
        for event in parsed:
            level = str(event.get("level") or "").lower()
            if level in {"error", "fatal"}:
                error_fatal.append(event)
            try:
                status = int(event.get("statusCode"))
            except (TypeError, ValueError):
                status = 0
            if 500 <= status <= 599:
                five_xx.append(event)
            if status == 404:
                raw_route = str(event.get("requestPath") or "")
                parsed_url = urllib.parse.urlparse(raw_route)
                four_oh_four.append({"path": parsed_url.path or raw_route.split("?", 1)[0], "query": parsed_url.query, "raw": raw_route})
        unknown_404 = [item for item in four_oh_four if item["path"] not in KNOWN_404_PATHS]
        command_ok = code == 0 or (code == 124 and (parsed or not raw.strip()))
        record("runtime", f"{project} runtime log query completed", command_ok, f"exit={code}; parsed={len(parsed)}; deployment={deployment}")
        for needle, count in named_counts.items():
            record("runtime", f"{project}: {needle}", count == 0, f"count={count}")
        record("runtime", f"{project} error/fatal entries", not error_fatal, f"count={len(error_fatal)}")
        record("runtime", f"{project} HTTP 5xx responses", not five_xx, f"count={len(five_xx)}")
        record("runtime", f"{project} application-origin 404 routes classified", not unknown_404, f"all={four_oh_four}; unknown={unknown_404}")
        summaries[project] = {
            "deployment": deployment,
            "url": url,
            "command_exit": code,
            "parsed_event_count": len(parsed),
            "named_error_counts": named_counts,
            "error_fatal": error_fatal,
            "http_5xx_count": len(five_xx),
            "http_404_routes": four_oh_four,
            "unknown_404_routes": unknown_404,
        }
    (OUT / "runtime-log-inspection.json").write_text(json.dumps(summaries, indent=2), encoding="utf-8")
    return summaries


def independent_qa_check() -> dict[str, Any]:
    required_env("QA_SUPABASE_DB_URL", QA_DB_URL)
    emails_sql = ",".join("'" + email.replace("'", "''") + "'" for email in SYNTHETIC_EMAILS)
    sql = f"""
with synthetic_profiles as (select id from public.profiles where email in ({emails_sql})),
fixture_agreements as (select id from public.agreements where offer_id='{FIXTURE_OFFER_ID}'::uuid),
fixture_threads as (select id from public.trade_threads where offer_id='{FIXTURE_OFFER_ID}'::uuid)
select jsonb_build_object(
  'offer_clean', exists(select 1 from public.offers where id='{FIXTURE_OFFER_ID}'::uuid and fingerprint='qa-pr-158-marketplace-fixture-v1' and status::text='open' and workflow_status='published' and closed_at is null and deleted_at is null),
  'interests', (select count(*) from public.interests where offer_id='{FIXTURE_OFFER_ID}'::uuid),
  'guest_interests', (select count(*) from public.guest_interests where offer_id='{FIXTURE_OFFER_ID}'::uuid),
  'agreements', (select count(*) from fixture_agreements),
  'agreement_versions', (select count(*) from public.trade_agreement_versions where agreement_id in (select id from fixture_agreements)),
  'agreement_confirmations', (select count(*) from public.trade_agreement_confirmations where agreement_version_id in (select id from public.trade_agreement_versions where agreement_id in (select id from fixture_agreements))),
  'threads', (select count(*) from fixture_threads),
  'messages', (select count(*) from public.trade_messages where thread_id in (select id from fixture_threads)),
  'comments', (select count(*) from public.offer_comments where offer_id='{FIXTURE_OFFER_ID}'::uuid),
  'carts', (select count(*) from public.offer_carts where offer_id='{FIXTURE_OFFER_ID}'::uuid),
  'counterproposals', (select count(*) from public.trade_counterproposals where offer_id='{FIXTURE_OFFER_ID}'::uuid),
  'invitations', (select count(*) from public.trade_invitations where offer_id='{FIXTURE_OFFER_ID}'::uuid),
  'review_events', (select count(*) from public.trade_review_events where offer_id='{FIXTURE_OFFER_ID}'::uuid),
  'recommendations', (select count(*) from public.offer_recommendations where source_offer_id='{FIXTURE_OFFER_ID}'::uuid or recommended_offer_id='{FIXTURE_OFFER_ID}'::uuid),
  'performance_bonds', (select count(*) from public.performance_bonds where offer_id='{FIXTURE_OFFER_ID}'::uuid),
  'donation_matches', (select count(*) from public.donation_offset_matches where offer_id='{FIXTURE_OFFER_ID}'::uuid),
  'financial_reservations', (select count(*) from public.financial_commitment_reservations where offer_id='{FIXTURE_OFFER_ID}'::uuid),
  'notifications', (select count(*) from public.trade_notifications where user_id in (select id from synthetic_profiles)),
  'outbox', (select count(*) from public.email_outbox where profile_id in (select id from synthetic_profiles) or recipient_email in ({emails_sql})),
  'migration_recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20260729170000' and name='marketplace_atomic_acceptance_current_core'),
  'member_rpc', to_regprocedure('public.accept_marketplace_interest_v1(uuid,uuid,text)') is not null,
  'guest_rpc', to_regprocedure('public.accept_marketplace_guest_interest_v1(uuid,uuid,text)') is not null
)::text;
"""
    proc = run_command(["psql", QA_DB_URL, "--no-psqlrc", "--tuples-only", "--no-align", "--set", "ON_ERROR_STOP=1", "--command", sql], timeout=120)
    if proc.returncode != 0:
        record("qa", "independent QA query", False, proc.stdout[-2000:])
        return {}
    state = json.loads(proc.stdout.strip())
    zero_keys = ["interests", "guest_interests", "agreements", "agreement_versions", "agreement_confirmations", "threads", "messages", "comments", "carts", "counterproposals", "invitations", "review_events", "recommendations", "performance_bonds", "donation_matches", "financial_reservations", "notifications", "outbox"]
    record("qa", "deterministic offer restored open/published", state.get("offer_clean") is True, json.dumps(state, sort_keys=True))
    for key in zero_keys:
        record("qa", f"zero synthetic residue: {key}", int(state.get(key, -1)) == 0, f"count={state.get(key)}")
    record("qa", "candidate migration recorded in QA", state.get("migration_recorded") is True, str(state.get("migration_recorded")))
    record("qa", "member and guest RPCs present", state.get("member_rpc") is True and state.get("guest_rpc") is True, f"member={state.get('member_rpc')}; guest={state.get('guest_rpc')}")
    (OUT / "independent-qa-state.json").write_text(json.dumps(state, indent=2), encoding="utf-8")
    return state


def review_threads_check() -> dict[str, Any]:
    required_env("GH_TOKEN", GH_TOKEN)
    query = """query($owner:String!, $repo:String!, $number:Int!) { repository(owner:$owner, name:$repo) { pullRequest(number:$number) { reviewThreads(first:100) { nodes { isResolved isOutdated path line comments(first:20) { nodes { body author { login } createdAt } } } } } } }"""
    payload = {"query": query, "variables": {"owner": OWNER, "repo": REPO_NAME, "number": PRODUCT_PR}}
    request = urllib.request.Request("https://api.github.com/graphql", data=json.dumps(payload).encode(), headers={"User-Agent": "moraltrade-marketplace-final-auditor", "Authorization": f"Bearer {GH_TOKEN}", "Content-Type": "application/json"})
    with urllib.request.urlopen(request, timeout=60) as response:
        result = json.load(response)
    if result.get("errors"):
        record("review", "query PR #326 review threads", False, json.dumps(result["errors"]))
        return result
    nodes = (((result.get("data") or {}).get("repository") or {}).get("pullRequest") or {}).get("reviewThreads", {}).get("nodes", [])
    unresolved = [node for node in nodes if not node.get("isResolved") and not node.get("isOutdated")]
    record("review", "no unresolved current review threads on PR #326", not unresolved, f"total={len(nodes)}; unresolved={len(unresolved)}")
    summary = {"total": len(nodes), "unresolved": unresolved, "threads": nodes}
    (OUT / "review-thread-inspection.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return summary


def build_summary(run: dict[str, Any], artifacts: list[dict[str, Any]], reports: dict[str, Any], proof: dict[str, Any], runtime: dict[str, Any], qa: dict[str, Any], review: dict[str, Any]) -> str:
    decision = "GO" if not failures else "NO-GO"
    lines = [
        "# Marketplace delta final evidence audit", "", f"## Decision: **{decision}**", "",
        f"- Source workflow run: `{TARGET_RUN_ID}`", f"- Source workflow conclusion: `{run.get('conclusion')}`",
        f"- Exact candidate SHA: `{proof.get('exact_candidate_sha', 'unknown')}`", f"- Product PR: `#{PRODUCT_PR}`",
        f"- Audit findings: `{len(findings)}` total; `{len(failures)}` failed", "", "## Browser reports", "",
    ]
    for label, report in sorted(reports.items()):
        lines.append(f"- `{label}`: outcome `{report.get('outcome')}`, agreement `{report.get('agreementId')}`, thread `{report.get('threadId')}`, checks `{report.get('check_count')}`")
    lines.extend(["", "## Runtime logs", ""])
    for project, result in runtime.items():
        lines.append(f"- `{project}` deployment `{result.get('deployment')}`: error/fatal `{len(result.get('error_fatal') or [])}`, 5xx `{result.get('http_5xx_count')}`, 404 routes `{result.get('http_404_routes')}`")
    lines.extend(["", "## Independent QA state", "", "```json", json.dumps(qa, indent=2, sort_keys=True), "```", ""])
    lines.append(f"- Review threads: `{review.get('total', 0)}` total; `{len(review.get('unresolved') or [])}` unresolved current threads")
    lines.extend(["", "## Artifact archives", ""])
    for artifact in artifacts:
        lines.append(f"- `{artifact.get('name')}` — ID `{artifact.get('id')}`, SHA-256 `{artifact.get('download_sha256')}`, size `{artifact.get('size_in_bytes')}`")
    if failures:
        lines.extend(["", "## Blocking findings", ""])
        lines.extend(f"- {failure}" for failure in failures)
    else:
        lines.extend(["", "## Release interpretation", "", "The exact-head QA, report and media integrity checks, exact-deployment runtime-log checks, independent zero-residue query, and review-thread check passed. This is a **GO for merge review and a controlled migration-first promotion**, not an authorization to merge or deploy from this audit workflow."])
    return "\n".join(lines) + "\n"


def main() -> int:
    try:
        required_env("GH_TOKEN", GH_TOKEN)
        required_env("QA_SUPABASE_DB_URL", QA_DB_URL)
        run = wait_for_terminal_run()
        record("workflow", "run reached terminal state", run.get("status") == "completed", f"status={run.get('status')}")
        record("workflow", "run conclusion is success", run.get("conclusion") == "success", f"conclusion={run.get('conclusion')}")
        artifacts = get_artifacts()
        reports = inspect_reports()
        inspect_media()
        proof = inspect_final_proof()
        runtime = inspect_runtime_logs(proof) if proof else {}
        qa = independent_qa_check()
        review = review_threads_check()
        summary = build_summary(run, artifacts, reports, proof, runtime, qa, review)
    except Exception as exc:
        record("auditor", "unexpected finalizer exception", False, repr(exc))
        summary = "# Marketplace delta final evidence audit\n\n## Decision: **NO-GO**\n\n" + "\n".join(f"- {failure}" for failure in failures) + "\n"
    decision = "GO" if not failures else "NO-GO"
    (OUT / "decision.txt").write_text(decision + "\n", encoding="utf-8")
    (OUT / "findings.json").write_text(json.dumps([asdict(item) for item in findings], indent=2), encoding="utf-8")
    (OUT / "review-body.md").write_text(summary, encoding="utf-8")
    (OUT / "README.md").write_text(summary, encoding="utf-8")
    print(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
