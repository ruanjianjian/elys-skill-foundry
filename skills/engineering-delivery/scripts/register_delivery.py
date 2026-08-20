#!/usr/bin/env python3
"""Stable skill entrypoint for the installed Feishu Codex Bridge helper."""

from __future__ import annotations

import runpy
import sys
from pathlib import Path


HELPER = (
    Path.home()
    / ".local"
    / "share"
    / "feishu-codex-bot"
    / "app"
    / "scripts"
    / "register_delivery.py"
)
if not HELPER.is_file():
    raise SystemExit(f"Bridge delivery helper is not installed: {HELPER}")
sys.argv[0] = str(HELPER)
runpy.run_path(str(HELPER), run_name="__main__")
