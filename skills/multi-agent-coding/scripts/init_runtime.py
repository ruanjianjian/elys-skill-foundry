#!/usr/bin/env python3
"""Initialize a multi-agent coding runtime ledger."""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path


REQUIRED_FILES = [
    "project-goal.md",
    "task-board.md",
    "requirement-brief.md",
    "repo-map.md",
    "contracts.md",
    "decision-log.md",
    "agent-work-orders.md",
    "agent-communications.md",
    "project-iteration-log.md",
    "open-questions.md",
    "validation-log.md",
]


def skill_root() -> Path:
    return Path(__file__).resolve().parents[1]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create docs/agent-runtime ledger files.")
    parser.add_argument("--root", default=".", help="Project root. Defaults to current directory.")
    parser.add_argument(
        "--dir",
        default="docs/agent-runtime",
        help="Ledger directory relative to root. Defaults to docs/agent-runtime.",
    )
    parser.add_argument("--force", action="store_true", help="Overwrite existing ledger files.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.root).expanduser().resolve()
    ledger_dir = root / args.dir
    template_dir = skill_root() / "assets" / "runtime-templates"

    if not template_dir.is_dir():
        raise SystemExit(f"Template directory not found: {template_dir}")

    ledger_dir.mkdir(parents=True, exist_ok=True)

    created: list[str] = []
    skipped: list[str] = []
    overwritten: list[str] = []

    for name in REQUIRED_FILES:
        src = template_dir / name
        dst = ledger_dir / name
        if not src.is_file():
            raise SystemExit(f"Template missing: {src}")
        existed_before = dst.exists()
        if existed_before and not args.force:
            skipped.append(name)
            continue
        shutil.copyfile(src, dst)
        if existed_before:
            overwritten.append(name)
        else:
            created.append(name)

    print(f"Runtime ledger: {ledger_dir}")
    if created:
        print("Created:")
        for name in created:
            print(f"  - {name}")
    if overwritten:
        print("Overwritten:")
        for name in overwritten:
            print(f"  - {name}")
    if skipped:
        print("Already existed:")
        for name in skipped:
            print(f"  - {name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
