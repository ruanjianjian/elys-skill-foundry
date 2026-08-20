#!/usr/bin/env python3
"""Smoke-test the standalone review storage bridge injector."""

from pathlib import Path
import subprocess
import sys
import tempfile


SCRIPT = Path(__file__).with_name("inject_review_storage_bridge.py")


def main() -> None:
    with tempfile.TemporaryDirectory() as directory:
        target = Path(directory) / "preview.html"
        target.write_text(
            '<!doctype html><html><head><meta http-equiv="Content-Security-Policy" '
            'content="connect-src blob: data:;"></head><body>'
            '<iframe sandbox="allow-scripts"></iframe></body></html>',
            encoding="utf-8",
        )
        subprocess.run([sys.executable, str(SCRIPT), str(target)], check=True)
        once = target.read_text(encoding="utf-8")
        subprocess.run([sys.executable, str(SCRIPT), str(target)], check=True)
        twice = target.read_text(encoding="utf-8")
        assert once == twice
        assert once.count('id="work-status-review-storage-bridge"') == 1
        assert once.index("work-status-review-storage-bridge") < once.index("<iframe")
        assert 'payload.action === "context"' in once
        assert 'payload.action === "copy"' in once
        assert 'payload.action === "get"' in once
        assert 'payload.action === "set"' in once
        assert 'payload.action === "sync"' in once
        assert 'http://127.0.0.1:8765/__work_status_review_feedback' in once
        assert "connect-src 'self' http://127.0.0.1:8765 blob: data:;" in once
        assert 'sandbox="allow-scripts"' in once
    print("review storage bridge smoke test: PASS")


if __name__ == "__main__":
    main()
