#!/usr/bin/env python3
"""End-to-end smoke test for the local review preview server."""

import json
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


SERVER = Path(__file__).with_name("serve_review_preview.py")


def free_port() -> int:
    with socket.socket() as connection:
        connection.bind(("127.0.0.1", 0))
        return connection.getsockname()[1]


def main() -> None:
    with tempfile.TemporaryDirectory() as directory:
        root = Path(directory)
        html = root / "preview.html"
        feedback = root / "review-feedback.json"
        html.write_text("<!doctype html><title>Review</title>", encoding="utf-8")
        port = free_port()
        process = subprocess.Popen(
            [
                sys.executable,
                str(SERVER),
                "--html",
                str(html),
                "--feedback",
                str(feedback),
                "--port",
                str(port),
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
        try:
            base = f"http://127.0.0.1:{port}"
            for _ in range(40):
                try:
                    with urlopen(base + "/preview.html", timeout=0.5) as response:
                        assert response.status == 200
                    break
                except URLError:
                    time.sleep(0.05)
            else:
                raise AssertionError("review server did not start")
            body = json.dumps(
                {
                    "card_state": {
                        "card-a": {
                            "confirmed": True,
                            "deleted": False,
                            "note": "needs owner",
                        }
                    },
                    "overall_note": "shorten the summary",
                    "source_url": "file:///preview.html",
                }
            ).encode("utf-8")
            request = Request(
                base + "/__work_status_review_feedback",
                data=body,
                method="POST",
                headers={"Content-Type": "application/json", "Origin": "null"},
            )
            with urlopen(request, timeout=2) as response:
                assert response.status == 200
            persisted = json.loads(feedback.read_text(encoding="utf-8"))
            assert persisted["card_state"]["card-a"]["note"] == "needs owner"
            assert persisted["overall_note"] == "shorten the summary"
            with urlopen(base + "/__work_status_review_feedback", timeout=2) as response:
                assert json.load(response)["schema_version"] == 1
            blocked = Request(
                base + "/__work_status_review_feedback",
                data=body,
                method="POST",
                headers={"Content-Type": "application/json", "Origin": "https://example.com"},
            )
            try:
                urlopen(blocked, timeout=2)
                raise AssertionError("unexpected cross-origin write")
            except HTTPError as error:
                assert error.code == 403
        finally:
            process.terminate()
            process.wait(timeout=5)
    print("review preview server smoke test: PASS")


if __name__ == "__main__":
    main()
