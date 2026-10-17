#!/usr/bin/env python3
"""Validate a multi-agent coding runtime ledger."""

from __future__ import annotations

import argparse
import re
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

PHASE_CHECKS = {
    "kickoff": [
        ("project-goal.md", "## Active /goal"),
        ("project-goal.md", "## Delivery Profile"),
        ("project-goal.md", "## Total Goal"),
        ("project-goal.md", "## Success Definition"),
        ("project-goal.md", "## Completion Standard"),
        ("project-iteration-log.md", "## Source of Truth"),
        ("project-iteration-log.md", "## Latest Human Update"),
        ("repo-map.md", "Path:"),
        ("repo-map.md", "Role:"),
        ("requirement-brief.md", "## Goal"),
        ("requirement-brief.md", "## P0 Requirements"),
        ("requirement-brief.md", "## Acceptance Criteria"),
        ("task-board.md", "## Project Goal"),
        ("task-board.md", "## Current Goal"),
        ("task-board.md", "## Execution Topology"),
        ("task-board.md", "## Checklist"),
        ("task-board.md", "## Checklist Confirmation"),
        ("task-board.md", "## Last Checklist Refresh"),
    ],
    "parallel": [
        ("contracts.md", "## Contract:"),
        ("contracts.md", "### Version / Source Artifact"),
        ("contracts.md", "### Provider / Consumer / Change Owner"),
        ("agent-work-orders.md", "## Work Order"),
        ("agent-work-orders.md", "### Execution Topology"),
        ("agent-work-orders.md", "### Worker Session Identity"),
        ("agent-work-orders.md", "### Execution Mode"),
        ("agent-work-orders.md", "### Model Selection"),
        ("agent-work-orders.md", "### Write Scope"),
        ("agent-work-orders.md", "### Worktree Identity"),
        ("agent-work-orders.md", "### Contract Dependency"),
        ("agent-work-orders.md", "### Acceptance Criteria"),
        ("agent-work-orders.md", "### Iteration Contract"),
        ("agent-work-orders.md", "### Completion Notice"),
        ("agent-work-orders.md", "### Integration Handoff"),
        ("task-board.md", "## In Progress"),
        ("task-board.md", "## Active Worker Sessions"),
        ("agent-communications.md", "## Direct Handshakes"),
        ("agent-communications.md", "## Completion Notices"),
        ("agent-communications.md", "## Human Intervention Notices"),
    ],
    "delivery": [
        ("validation-log.md", "## Authoritative User-Journey Tests"),
        ("validation-log.md", "## Real E2E Status"),
        ("validation-log.md", "## Automated Checks"),
        ("validation-log.md", "## Manual QA"),
        ("validation-log.md", "## Not Verified"),
        ("validation-log.md", "## Residual Risks"),
        ("decision-log.md", "# Decision Log"),
    ],
}

PLACEHOLDER_RE = re.compile(r"<[^>\n]+>|TODO|TBD", re.IGNORECASE)
CHECKBOX_RE = re.compile(r"^\s*-\s+\[[ xX]\]\s+", re.MULTILINE)
UNCHECKED_RE = re.compile(r"^\s*-\s+\[\s\]\s+", re.MULTILINE)
E2E_RESULT_RE = re.compile(
    r"real\s*e2e|end[- ]to[- ]end|端到端|Status:\s*(通过|未通过|待用户人工验收)",
    re.IGNORECASE,
)
FEISHU_LINK_RE = re.compile(r"https?://[^\s]*(feishu|larksuite)[^\s]*", re.IGNORECASE)
FEISHU_PENDING_RE = re.compile(r"not-created|pending|blocked|未创建|待同步|阻塞", re.IGNORECASE)
MULTI_SESSION_RE = re.compile(r"^- Mode:[ \t]*multi-session[ \t]*$", re.IGNORECASE | re.MULTILINE)
SESSION_ID_RE = re.compile(
    r"^- Task\s*/\s*thread ID:[ \t]*([^\s<]+)[ \t]*$",
    re.IGNORECASE | re.MULTILINE,
)
TOPOLOGY_CHOICE_RE = re.compile(
    r"^- Mode:[ \t]*(single-session \+ subagents|multi-session)[ \t]*$",
    re.IGNORECASE | re.MULTILINE,
)
TOPOLOGY_CONFIRMATION_RE = re.compile(
    r"^- Explicitly confirmed choice:[ \t]*(\S.*)$",
    re.IGNORECASE | re.MULTILINE,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check docs/agent-runtime ledger completeness.")
    parser.add_argument("--root", default=".", help="Project root. Defaults to current directory.")
    parser.add_argument(
        "--dir",
        default="docs/agent-runtime",
        help="Ledger directory relative to root. Defaults to docs/agent-runtime.",
    )
    parser.add_argument(
        "--phase",
        choices=["kickoff", "parallel", "delivery"],
        default="delivery",
        help="Validation depth.",
    )
    parser.add_argument(
        "--goal-mode",
        action="store_true",
        help="Require plan.md/checklist.md goal-driven delivery checks.",
    )
    parser.add_argument("--strict", action="store_true", help="Treat warnings as failures.")
    return parser.parse_args()


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def section_has_content(text: str, heading: str) -> bool:
    pattern = re.compile(rf"^{re.escape(heading)}\s*$", re.MULTILINE)
    match = pattern.search(text)
    if not match:
        return False
    next_heading = re.search(r"^#{1,3}\s+", text[match.end() :], re.MULTILINE)
    end = match.end() + next_heading.start() if next_heading else len(text)
    body = text[match.end() : end]
    stripped = "\n".join(
        line.strip()
        for line in body.splitlines()
        if line.strip() and not line.strip().startswith("```")
    )
    return bool(stripped)


def main() -> int:
    args = parse_args()
    root = Path(args.root).expanduser().resolve()
    ledger_dir = root / args.dir
    errors: list[str] = []
    warnings: list[str] = []

    if not ledger_dir.is_dir():
        errors.append(f"Ledger directory missing: {ledger_dir}")
    else:
        for name in REQUIRED_FILES:
            path = ledger_dir / name
            if not path.is_file():
                errors.append(f"Missing required file: {name}")

    if errors:
        print("Runtime ledger validation failed:")
        for item in errors:
            print(f"  ERROR: {item}")
        return 1

    file_text = {name: read_text(ledger_dir / name) for name in REQUIRED_FILES}
    plan_path = root / "plan.md"
    checklist_path = root / "checklist.md"
    goal_mode = args.goal_mode or plan_path.exists() or checklist_path.exists()

    for phase in ["kickoff", "parallel", "delivery"]:
        for name, needle in PHASE_CHECKS[phase]:
            if needle not in file_text[name]:
                errors.append(f"{name} missing required marker for {phase}: {needle}")
        if phase == args.phase:
            break

    for name, text in file_text.items():
        if PLACEHOLDER_RE.search(text):
            warnings.append(f"{name} still contains placeholder text")

    for name, heading in [
        ("project-goal.md", "## Active /goal"),
        ("project-goal.md", "## Delivery Profile"),
        ("project-goal.md", "## Total Goal"),
        ("project-goal.md", "## Success Definition"),
        ("project-goal.md", "## Completion Standard"),
        ("requirement-brief.md", "## Goal"),
        ("requirement-brief.md", "## P0 Requirements"),
        ("requirement-brief.md", "## Acceptance Criteria"),
        ("task-board.md", "## Project Goal"),
        ("task-board.md", "## Current Goal"),
        ("task-board.md", "## Execution Topology"),
        ("task-board.md", "## Checklist"),
        ("task-board.md", "## Checklist Confirmation"),
    ]:
        if not section_has_content(file_text[name], heading):
            warnings.append(f"{name} section appears empty: {heading}")

    iteration_log = file_text["project-iteration-log.md"]
    if "Type: Feishu Doc" in iteration_log and not FEISHU_LINK_RE.search(iteration_log) and not FEISHU_PENDING_RE.search(iteration_log):
        warnings.append(
            "project-iteration-log.md has no Feishu link and does not mark sync as pending or blocked"
        )

    work_orders = file_text["agent-work-orders.md"]
    if MULTI_SESSION_RE.search(work_orders) and not SESSION_ID_RE.search(work_orders):
        warnings.append(
            "agent-work-orders.md selects multi-session but has no populated task/thread ID"
        )

    task_board = file_text["task-board.md"]
    if TOPOLOGY_CHOICE_RE.search(task_board) and not TOPOLOGY_CONFIRMATION_RE.search(task_board):
        warnings.append(
            "task-board.md selects an execution topology but has no explicit human confirmation"
        )

    if args.phase == "delivery":
        for name, heading in [
            ("validation-log.md", "## Authoritative User-Journey Tests"),
            ("validation-log.md", "## Real E2E Status"),
            ("validation-log.md", "## Not Verified"),
            ("validation-log.md", "## Residual Risks"),
        ]:
            if not section_has_content(file_text[name], heading):
                warnings.append(f"{name} section appears empty: {heading}")
        if not E2E_RESULT_RE.search(file_text["validation-log.md"]):
            warnings.append(
                "validation-log.md has no explicit real E2E pass/fail/acceptance status"
            )

    if goal_mode:
        if not plan_path.is_file():
            errors.append("Goal mode requires plan.md at project root")
        if not checklist_path.is_file():
            errors.append("Goal mode requires checklist.md at project root")
        if checklist_path.is_file():
            checklist_text = read_text(checklist_path)
            if not CHECKBOX_RE.search(checklist_text):
                warnings.append("checklist.md contains no markdown checkbox items")
            if not re.search(r"confirm|confirmed|确认|已确认", checklist_text, re.IGNORECASE):
                warnings.append("checklist.md does not record human confirmation")
            if args.phase == "delivery" and UNCHECKED_RE.search(checklist_text):
                warnings.append("checklist.md still has unchecked items at delivery phase")
    if errors:
        print("Runtime ledger validation failed:")
        for item in errors:
            print(f"  ERROR: {item}")
    else:
        print(f"Runtime ledger validation passed: {ledger_dir}")

    if warnings:
        print("Warnings:")
        for item in warnings:
            print(f"  WARN: {item}")

    if errors or (args.strict and warnings):
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
