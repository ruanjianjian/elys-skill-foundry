#!/usr/bin/env python3
"""Serve a weekly-report preview and persist sanitized review feedback."""

from argparse import ArgumentParser
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import tempfile
from urllib.parse import urlparse


FEEDBACK_PATH = "/__work_status_review_feedback"
MAX_BODY_BYTES = 256_000


def sanitize_payload(payload: object) -> dict:
    if not isinstance(payload, dict):
        raise ValueError("payload must be an object")
    raw_state = payload.get("card_state", {})
    if not isinstance(raw_state, dict) or len(raw_state) > 200:
        raise ValueError("card_state must be an object with at most 200 cards")
    card_state = {}
    for card_id, item in raw_state.items():
        if not isinstance(card_id, str) or len(card_id) > 160 or not isinstance(item, dict):
            raise ValueError("invalid card state")
        card_state[card_id] = {
            "confirmed": bool(item.get("confirmed", False)),
            "deleted": bool(item.get("deleted", False)),
            "note": str(item.get("note", ""))[:500],
        }
    return {
        "schema_version": 1,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "card_state": card_state,
        "overall_note": str(payload.get("overall_note", ""))[:1200],
        "source_url": str(payload.get("source_url", ""))[:1000],
    }


def atomic_write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=path.parent,
        prefix=path.name + ".",
        suffix=".tmp",
        delete=False,
    ) as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
        temporary = Path(handle.name)
    os.replace(temporary, path)


def create_handler(html_path: Path, feedback_path: Path, host: str, port: int):
    allowed_origins = {
        "null",
        f"http://{host}:{port}",
        f"http://localhost:{port}",
    }

    class ReviewHandler(BaseHTTPRequestHandler):
        server_version = "CodexReviewPreview/1.0"

        def log_message(self, format_string: str, *args: object) -> None:
            print(f"[{self.log_date_time_string()}] {format_string % args}")

        def _origin_allowed(self) -> bool:
            origin = self.headers.get("Origin")
            return origin is None or origin in allowed_origins

        def _cors(self) -> None:
            origin = self.headers.get("Origin")
            if origin in allowed_origins:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")

        def _json(self, status: int, payload: dict) -> None:
            body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_response(status)
            self._cors()
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_OPTIONS(self) -> None:
            if urlparse(self.path).path != FEEDBACK_PATH or not self._origin_allowed():
                self.send_error(403)
                return
            self.send_response(204)
            self._cors()
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
            self.end_headers()

        def do_GET(self) -> None:
            path = urlparse(self.path).path
            if path == FEEDBACK_PATH:
                if feedback_path.exists():
                    self._json(200, json.loads(feedback_path.read_text(encoding="utf-8")))
                else:
                    self._json(404, {"error": "feedback_not_found"})
                return
            if path not in {"/", "/" + html_path.name}:
                self.send_error(404)
                return
            body = html_path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(body)

        def do_POST(self) -> None:
            if urlparse(self.path).path != FEEDBACK_PATH:
                self.send_error(404)
                return
            if not self._origin_allowed():
                self._json(403, {"error": "origin_not_allowed"})
                return
            if not self.headers.get("Content-Type", "").startswith("application/json"):
                self._json(415, {"error": "application_json_required"})
                return
            try:
                length = int(self.headers.get("Content-Length", "0"))
            except ValueError:
                length = 0
            if length <= 0 or length > MAX_BODY_BYTES:
                self._json(413, {"error": "invalid_body_size"})
                return
            try:
                payload = sanitize_payload(json.loads(self.rfile.read(length)))
                atomic_write_json(feedback_path, payload)
            except (ValueError, json.JSONDecodeError) as error:
                self._json(400, {"error": str(error)})
                return
            self._json(200, {"ok": True, "updated_at": payload["updated_at"]})

    return ReviewHandler


def main() -> None:
    parser = ArgumentParser()
    parser.add_argument("--html", required=True, type=Path)
    parser.add_argument("--feedback", required=True, type=Path)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8765, type=int)
    args = parser.parse_args()
    html_path = args.html.resolve()
    feedback_path = args.feedback.resolve()
    if not html_path.is_file():
        raise SystemExit(f"HTML file not found: {html_path}")
    server = ThreadingHTTPServer(
        (args.host, args.port),
        create_handler(html_path, feedback_path, args.host, args.port),
    )
    print(f"Review preview: http://{args.host}:{args.port}/{html_path.name}", flush=True)
    print(f"Feedback file: {feedback_path}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
