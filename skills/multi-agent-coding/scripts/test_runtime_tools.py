#!/usr/bin/env python3
"""Isolated behavioral checks for ledger helpers and the read-only board."""
import importlib.util
import subprocess
import sys
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import urlopen, Request

SCRIPTS = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("board", SCRIPTS / "board_server.py")
board = importlib.util.module_from_spec(spec)
spec.loader.exec_module(board)


class RuntimeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory(prefix="coordination-test-")
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.ledger = self.root / "docs/agent-runtime"

    def run_script(self, name, *args):
        return subprocess.run([sys.executable, str(SCRIPTS / name), "--root", str(self.root), *args], capture_output=True, text=True)

    def initialize(self):
        result = self.run_script("init_runtime.py")
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)

    def test_init_preserves_existing_work(self):
        self.initialize()
        target = self.ledger / "contracts.md"
        target.write_text("User-owned contract v7", encoding="utf-8")
        self.initialize()
        self.assertEqual(target.read_text(), "User-owned contract v7")

    def test_local_log_needs_no_feishu(self):
        self.initialize()
        result = self.run_script("validate_runtime.py", "--phase", "kickoff")
        self.assertEqual(result.returncode, 0, result.stdout)
        self.assertNotIn("no Feishu link", result.stdout)
        strict = self.run_script("validate_runtime.py", "--phase", "delivery", "--strict")
        self.assertNotEqual(strict.returncode, 0, "Empty templates must not pass strict validation")

    def test_enabled_feishu_requires_link_or_blocker(self):
        self.initialize()
        target = self.ledger / "project-iteration-log.md"
        target.write_text("# Project Iteration Log\n## Source of Truth\n- Type: Feishu Doc\n## Latest Human Update\nRequested sync\n", encoding="utf-8")
        result = self.run_script("validate_runtime.py", "--phase", "kickoff")
        self.assertIn("no Feishu link", result.stdout)

    def test_missing_ledger_fails(self):
        self.assertNotEqual(self.run_script("validate_runtime.py").returncode, 0)

    def test_board_readonly_scoped_and_escaped(self):
        self.initialize()
        target = self.ledger / "task-board.md"
        original = "<script>alert('x')</script>\nworker: running"
        target.write_text(original, encoding="utf-8")
        server = ThreadingHTTPServer(("127.0.0.1", 0), board.make_handler(target))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            base = f"http://127.0.0.1:{server.server_port}"
            with urlopen(base, timeout=3) as response:
                page = response.read().decode()
                self.assertIn("&lt;script&gt;", page)
                self.assertNotIn("<script>", page)
                self.assertEqual(response.headers["Cache-Control"], "no-store")
            for suffix in ("/api/cancel", "/../contracts.md"):
                with self.assertRaises(HTTPError) as error:
                    urlopen(base + suffix, timeout=3)
                self.assertEqual(error.exception.code, 404)
            with self.assertRaises(HTTPError) as error:
                urlopen(Request(base, data=b"cancel", method="POST"), timeout=3)
            self.assertEqual(error.exception.code, 501)
            self.assertEqual(target.read_text(), original)
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=3)


if __name__ == "__main__":
    unittest.main()
