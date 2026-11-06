from __future__ import annotations

import argparse
import json
import mimetypes
import os
import sys
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.providers import ProviderError
from app.services.store import AppState
from app.settings import Settings


REPO_ROOT = Path(__file__).resolve().parents[3]
WEB_ROOT = REPO_ROOT / "apps" / "web" / "app"
STATE = AppState(Settings.from_env())


def _json_default(value):
    if hasattr(value, "to_dict"):
        return value.to_dict()
    if hasattr(value, "__dict__"):
        return value.__dict__
    return str(value)


class Handler(BaseHTTPRequestHandler):
    server_version = "CNOps/0.1"

    def log_message(self, format: str, *args) -> None:
        if self.path.startswith("/api/health"):
            return
        super().log_message(format, *args)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length == 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        return json.loads(raw)

    def _send_json(self, payload, status: int = 200) -> None:
        encoded = json.dumps(payload, default=_json_default, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _send_text(self, payload: str, status: int = 200, content_type: str = "text/plain") -> None:
        encoded = payload.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _send_not_found(self) -> None:
        self._send_json({"error": "not found", "path": self.path}, HTTPStatus.NOT_FOUND)

    def _send_provider_error(self, exc: ProviderError) -> None:
        self._send_json({"error": str(exc), "provider_error": True}, HTTPStatus.BAD_GATEWAY)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path.startswith("/api/"):
            self._handle_api_get(parsed.path, parse_qs(parsed.query))
            return
        self._serve_static(parsed.path)

    def do_HEAD(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            return
        if parsed.path in {"", "/"}:
            self.send_response(HTTPStatus.OK)
            self.send_header("Content-Type", "text/html")
            self.end_headers()
            return
        self.send_response(HTTPStatus.NOT_FOUND)
        self.end_headers()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if not parsed.path.startswith("/api/"):
            self._send_not_found()
            return
        body = self._read_json()
        self._handle_api_post(parsed.path, body)

    def _handle_api_get(self, path: str, query: dict) -> None:
        try:
            if path == "/api/health":
                self._send_json(
                    {
                        "status": "ok",
                        "app_env": STATE.settings.app_env,
                        "persistence_provider": "postgres" if STATE.record_store.enabled else "memory",
                        "live_x_api_enabled": STATE.settings.allow_live_x_api,
                        "live_x_write_enabled": STATE.settings.allow_live_x_write,
                        "non_test_writes_enabled": STATE.settings.allow_non_test_mode_write,
                        "emergency_stop_external_writes": STATE.settings.emergency_stop_external_writes,
                    }
                )
                return
            if path == "/api/dashboard":
                self._send_json(STATE.dashboard())
                return
            if path == "/api/candidates":
                self._send_json({"candidates": STATE.list_candidates()})
                return
            if path.startswith("/api/candidates/"):
                candidate_id = path.split("/")[-1]
                self._send_json(STATE.candidate_detail(candidate_id))
                return
            if path.startswith("/api/drafts/") and path.endswith("/export"):
                draft_id = path.split("/")[-2]
                consent_ack = (query.get("consent_ack") or ["false"])[0].lower() in {"1", "true", "yes", "on"}
                consent_actor = (query.get("consent_actor") or [""])[0]
                consent_reason = (query.get("consent_reason") or [""])[0]
                self._send_text(
                    STATE.export_draft(draft_id, consent_ack=consent_ack, consent_actor=consent_actor, consent_reason=consent_reason),
                    content_type="text/plain",
                )
                return
            if path == "/api/admission":
                self._send_json(STATE.admission().to_dict())
                return
            if path == "/api/writing-limit":
                self._send_json(STATE.writing_limit().to_dict())
                return
            if path == "/api/costs":
                self._send_json(STATE.refresh_usage_reconciliation())
                return
            if path == "/api/settings":
                self._send_json(STATE.settings.public_dict())
                return
            if path == "/api/governance":
                self._send_json(STATE.governance_status(public=True))
                return
            if path.startswith("/api/evals/runs/"):
                run_id = path.split("/")[-1]
                result = STATE.get_eval_run(run_id)
                if result:
                    self._send_json(result)
                else:
                    self._send_not_found()
                return
        except KeyError as exc:
            self._send_json({"error": "missing entity", "id": str(exc)}, HTTPStatus.NOT_FOUND)
            return
        except PermissionError as exc:
            self._send_json({"error": str(exc)}, HTTPStatus.FORBIDDEN)
            return
        except ProviderError as exc:
            self._send_provider_error(exc)
            return
        self._send_not_found()

    def _handle_api_post(self, path: str, body: dict) -> None:
        try:
            if path == "/api/x/sync-eligible-posts":
                max_results = int(body.get("max_results", 20))
                test_mode = bool(body.get("test_mode", True))
                candidates = STATE.sync_eligible_posts(max_results=max_results, test_mode=test_mode)
                self._send_json({"candidates": [candidate.to_dict() for candidate in candidates]})
                return
            if path.endswith("/analyze") and path.startswith("/api/candidates/"):
                candidate_id = path.split("/")[-2]
                self._send_json({"claims": [claim.to_dict() for claim in STATE.analyze_candidate(candidate_id)]})
                return
            if path.endswith("/retrieve") and path.startswith("/api/candidates/"):
                candidate_id = path.split("/")[-2]
                self._send_json({"evidence_cards": [card.to_dict() for card in STATE.retrieve_evidence(candidate_id)]})
                return
            if path.endswith("/drafts") and path.startswith("/api/candidates/"):
                candidate_id = path.split("/")[-2]
                self._send_json({"drafts": [draft.to_dict() for draft in STATE.generate_drafts(candidate_id)]})
                return
            if path.endswith("/critique") and path.startswith("/api/drafts/"):
                draft_id = path.split("/")[-2]
                self._send_json(STATE.critique_draft(draft_id).to_dict())
                return
            if path.endswith("/evaluate-x") and path.startswith("/api/drafts/"):
                draft_id = path.split("/")[-2]
                self._send_json(STATE.evaluate_x(draft_id).to_dict())
                return
            if path.endswith("/approve") and path.startswith("/api/drafts/"):
                draft_id = path.split("/")[-2]
                self._send_json(STATE.approve_draft(draft_id, body.get("operator_override_reason")).to_dict())
                return
            if path.endswith("/submit") and path.startswith("/api/drafts/"):
                draft_id = path.split("/")[-2]
                test_mode = bool(body.get("test_mode", True))
                submission, gate = STATE.submit_draft(draft_id, test_mode=test_mode)
                self._send_json({"submission": submission.to_dict() if submission else None, "gate": gate})
                return
            if path == "/api/notes-written/sync":
                notes = STATE.sync_notes_written()
                self._send_json({"notes": [note.to_dict() for note in notes], "count": len(notes)})
                return
            if path == "/api/evals/run":
                self._send_json(STATE.run_evals())
                return
        except KeyError as exc:
            self._send_json({"error": "missing entity", "id": str(exc)}, HTTPStatus.NOT_FOUND)
            return
        except PermissionError as exc:
            self._send_json({"error": str(exc)}, HTTPStatus.FORBIDDEN)
            return
        except ProviderError as exc:
            self._send_provider_error(exc)
            return
        self._send_not_found()

    def _serve_static(self, path: str) -> None:
        requested = (WEB_ROOT / path.lstrip("/")).resolve()
        if path in {"", "/"} or not requested.exists() or requested.is_dir():
            requested = WEB_ROOT / "index.html"
        if WEB_ROOT not in requested.parents and requested != WEB_ROOT / "index.html":
            self._send_not_found()
            return
        if not requested.exists():
            self._send_text("Web app not built", status=HTTPStatus.NOT_FOUND)
            return
        content_type = mimetypes.guess_type(str(requested))[0] or "application/octet-stream"
        data = requested.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def run_server(host: str, port: int) -> None:
    STATE.seed_history()
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"Community Notes Ops Copilot running at http://{host}:{port}")
    server.serve_forever()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    default_host = os.getenv("HOST") or ("0.0.0.0" if os.getenv("PORT") else "127.0.0.1")
    parser.add_argument("--host", default=default_host)
    parser.add_argument("--port", type=int, default=int(os.getenv("PORT", "8000")))
    args = parser.parse_args(argv)
    run_server(args.host, args.port)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
