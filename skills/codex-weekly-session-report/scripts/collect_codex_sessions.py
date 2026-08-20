#!/usr/bin/env python3
"""Collect Codex session evidence using rollout event timestamps."""

from __future__ import annotations

import argparse
import csv
import datetime as dt
import json
import os
import re
import sqlite3
import sys
from pathlib import Path
from typing import Any

try:
    from zoneinfo import ZoneInfo
except ImportError:  # pragma: no cover
    ZoneInfo = None


NOISE_BLOCKS = [
    re.compile(r"<recommended_plugins>.*?</recommended_plugins>", re.DOTALL),
    re.compile(r"<environment_context>.*?</environment_context>", re.DOTALL),
    re.compile(r"<permissions instructions>.*?</permissions instructions>", re.DOTALL),
    re.compile(r"<apps_instructions>.*?</apps_instructions>", re.DOTALL),
]


def clean_text(text: str) -> str:
    for pattern in NOISE_BLOCKS:
        text = pattern.sub(" ", text)
    return re.sub(r"\s+", " ", text).strip()


def parse_local_datetime(value: str, tz: Any) -> dt.datetime:
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        parsed = dt.datetime.fromisoformat(value + "T00:00:00")
    else:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=tz)
    return parsed.astimezone(tz)


def last_full_week(now: dt.datetime) -> tuple[dt.datetime, dt.datetime]:
    end_date = (now - dt.timedelta(days=now.weekday())).date()
    end = dt.datetime.combine(end_date, dt.time.min, tzinfo=now.tzinfo)
    return end - dt.timedelta(days=7), end


def load_columns(conn: sqlite3.Connection) -> set[str]:
    return {row[1] for row in conn.execute("pragma table_info(threads)").fetchall()}


def select_threads(conn: sqlite3.Connection) -> list[sqlite3.Row]:
    """Read every indexed thread with a rollout path.

    Filtering by created_at/updated_at here would miss old sessions that were
    actively continued during the reporting window. The rollout is filtered
    later by each event's own timestamp.
    """
    columns = load_columns(conn)
    desired = [
        "id",
        "title",
        "cwd",
        "created_at",
        "updated_at",
        "rollout_path",
        "preview",
        "first_user_message",
        "thread_source",
        "source",
        "tokens_used",
    ]
    select_cols = [column for column in desired if column in columns]
    sql = f"""
        select {", ".join(select_cols)}
        from threads
        where rollout_path is not null and rollout_path != ''
        order by coalesce(updated_at, created_at) desc, id desc
    """
    return conn.execute(sql).fetchall()


def parse_event_timestamp(value: Any) -> dt.datetime | None:
    if isinstance(value, (int, float)):
        # Rollouts normally use ISO-8601 strings, but accept epoch seconds or ms.
        seconds = float(value) / 1000 if value > 10_000_000_000 else float(value)
        return dt.datetime.fromtimestamp(seconds, dt.timezone.utc)
    if not isinstance(value, str) or not value.strip():
        return None
    try:
        return dt.datetime.fromisoformat(value.strip().replace("Z", "+00:00"))
    except ValueError:
        return None


def event_timestamp(payload: dict[str, Any]) -> dt.datetime | None:
    for key in ("timestamp", "created_at", "time"):
        parsed = parse_event_timestamp(payload.get(key))
        if parsed:
            return parsed
    nested = payload.get("payload")
    if isinstance(nested, dict):
        for key in ("timestamp", "created_at", "time"):
            parsed = parse_event_timestamp(nested.get(key))
            if parsed:
                return parsed
    return None


def message_text(payload: dict[str, Any]) -> str:
    parts: list[str] = []
    for item in payload.get("content") or []:
        if isinstance(item, dict):
            text = item.get("text") or item.get("content") or ""
            if text:
                parts.append(str(text))
    return "\n".join(parts)


def extract_rollout(
    path: str,
    start_epoch: int,
    end_epoch: int,
    tz: Any,
) -> dict[str, Any]:
    result: dict[str, Any] = {
        "rollout_exists": False,
        "rollout_error": "",
        "user_message_count": 0,
        "assistant_message_count": 0,
        "first_user": "",
        "last_user": "",
        "final_assistant": "",
        "event_types": {},
        "event_count": 0,
        "timestamp_count": 0,
        "timestamp_parse_errors": 0,
        "first_event_local": "",
        "last_event_local": "",
        "active_in_window": False,
        "window_event_count": 0,
        "window_user_message_count": 0,
        "window_assistant_message_count": 0,
        "window_first_user": "",
        "window_last_user": "",
        "window_final_assistant": "",
    }
    if not path:
        result["rollout_error"] = "missing_path"
        return result

    rollout_path = Path(path).expanduser()
    if not rollout_path.exists():
        result["rollout_error"] = "file_not_found"
        return result

    result["rollout_exists"] = True
    users: list[str] = []
    assistants: list[str] = []
    window_users: list[str] = []
    window_assistants: list[str] = []
    event_types: dict[str, int] = {}
    first_event: dt.datetime | None = None
    last_event: dt.datetime | None = None

    try:
        with rollout_path.open("r", encoding="utf-8") as handle:
            for line in handle:
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    result["timestamp_parse_errors"] += 1
                    continue

                result["event_count"] += 1
                event_type = obj.get("type") or ""
                event_types[event_type] = event_types.get(event_type, 0) + 1
                timestamp = event_timestamp(obj)
                in_window = False
                if timestamp is None:
                    result["timestamp_parse_errors"] += 1
                else:
                    result["timestamp_count"] += 1
                    first_event = timestamp if first_event is None else min(first_event, timestamp)
                    last_event = timestamp if last_event is None else max(last_event, timestamp)
                    seconds = timestamp.timestamp()
                    in_window = start_epoch <= seconds < end_epoch
                    if in_window:
                        result["active_in_window"] = True
                        result["window_event_count"] += 1

                if event_type != "response_item":
                    continue
                payload = obj.get("payload") or {}
                if payload.get("type") != "message":
                    continue
                role = payload.get("role")
                text = clean_text(message_text(payload))
                if not text:
                    continue
                if role == "user":
                    users.append(text)
                    if in_window:
                        window_users.append(text)
                elif role == "assistant":
                    assistants.append(text)
                    if in_window:
                        window_assistants.append(text)
    except OSError as exc:
        result["rollout_error"] = f"read_error:{exc}"
        return result

    result["event_types"] = event_types
    result["user_message_count"] = len(users)
    result["assistant_message_count"] = len(assistants)
    result["first_user"] = users[0] if users else ""
    result["last_user"] = users[-1] if users else ""
    result["final_assistant"] = assistants[-1] if assistants else ""
    result["window_user_message_count"] = len(window_users)
    result["window_assistant_message_count"] = len(window_assistants)
    result["window_first_user"] = window_users[0] if window_users else ""
    result["window_last_user"] = window_users[-1] if window_users else ""
    result["window_final_assistant"] = window_assistants[-1] if window_assistants else ""
    if first_event:
        result["first_event_local"] = first_event.astimezone(tz).isoformat()
    if last_event:
        result["last_event_local"] = last_event.astimezone(tz).isoformat()

    if result["timestamp_count"] == 0:
        result["rollout_error"] = "missing_event_timestamps"
    elif not assistants:
        result["rollout_error"] = "no_assistant_result"
    return result


def first_line(value: str) -> str:
    lines = [line.strip() for line in (value or "").splitlines() if line.strip()]
    return lines[0] if lines else ""


def automation_id(text: str) -> str:
    match = re.search(r"Automation ID:\s*([^\s]+)", text or "")
    return match.group(1) if match else ""


def row_to_record(
    row: sqlite3.Row,
    start_epoch: int,
    end_epoch: int,
    tz: Any,
) -> dict[str, Any]:
    data = dict(row)
    rollout = extract_rollout(data.get("rollout_path") or "", start_epoch, end_epoch, tz)
    title = data.get("title") or ""
    first_user_db = data.get("first_user_message") or ""
    first_user = rollout["first_user"] or clean_text(first_user_db)
    updated_at = int(data.get("updated_at") or data.get("created_at") or 0)
    created_at = int(data.get("created_at") or updated_at)
    created_before_window = created_at < start_epoch
    coarse_overlap = created_at < end_epoch and updated_at >= start_epoch
    title_first = first_line(title)
    record: dict[str, Any] = {
        "id": data.get("id"),
        "title": title,
        "title_first_line": title_first,
        "cwd": data.get("cwd") or "",
        "created_at_epoch": created_at,
        "updated_at_epoch": updated_at,
        "created_at_local": dt.datetime.fromtimestamp(created_at, tz).isoformat(),
        "updated_at_local": dt.datetime.fromtimestamp(updated_at, tz).isoformat(),
        "rollout_path": data.get("rollout_path") or "",
        "thread_source": data.get("thread_source") or "",
        "source": data.get("source") or "",
        "tokens_used_local": data.get("tokens_used", 0),
        "automation_id": automation_id(title) or automation_id(first_user),
        "is_automation": title_first.startswith("Automation:")
        or bool(automation_id(title))
        or bool(automation_id(first_user)),
        "first_user": first_user,
        "preview": clean_text(data.get("preview") or ""),
        "created_before_window": created_before_window,
        "coarse_overlap_by_index": coarse_overlap,
    }
    record.update(rollout)
    record["candidate_for_review"] = bool(
        rollout["active_in_window"]
        or (coarse_overlap and rollout["rollout_error"] == "missing_event_timestamps")
    )
    record["activity_basis"] = (
        "rollout_event_timestamp"
        if rollout["active_in_window"]
        else "index_fallback_access_gap"
        if record["candidate_for_review"]
        else "outside_window"
    )
    return record


def write_outputs(records: list[dict[str, Any]], out_dir: Path, summary: dict[str, Any]) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    with (out_dir / "sessions.jsonl").open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")

    fields = [
        "id",
        "created_at_local",
        "updated_at_local",
        "first_event_local",
        "last_event_local",
        "title_first_line",
        "cwd",
        "candidate_for_review",
        "active_in_window",
        "activity_basis",
        "is_automation",
        "automation_id",
        "rollout_error",
        "window_user_message_count",
        "window_assistant_message_count",
        "window_first_user",
        "window_final_assistant",
        "rollout_path",
    ]
    with (out_dir / "sessions.tsv").open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields, delimiter="\t", extrasaction="ignore")
        writer.writeheader()
        for record in records:
            compact = dict(record)
            for key in ("window_first_user", "window_final_assistant"):
                compact[key] = clean_text(compact.get(key, ""))[:1200]
            writer.writerow(compact)

    with (out_dir / "summary.json").open("w", encoding="utf-8") as handle:
        json.dump(summary, handle, ensure_ascii=False, indent=2, sort_keys=True)
        handle.write("\n")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    default_codex_home = Path(os.environ.get("CODEX_HOME") or Path.home() / ".codex")
    parser.add_argument("--state-db", default=str(default_codex_home / "state_5.sqlite"))
    parser.add_argument("--timezone", default=os.environ.get("TZ") or "America/New_York")
    parser.add_argument("--start", help="Local inclusive start, YYYY-MM-DD or ISO datetime")
    parser.add_argument("--end", help="Local exclusive end, YYYY-MM-DD or ISO datetime")
    parser.add_argument("--last-week", action="store_true", help="Use last full Monday-to-Monday week")
    parser.add_argument("--out-dir", default="/tmp/codex-weekly-session-report")
    args = parser.parse_args()

    if ZoneInfo is None:
        print("Python zoneinfo is required", file=sys.stderr)
        return 2
    tz = ZoneInfo(args.timezone)
    if args.last_week or not (args.start and args.end):
        start, end = last_full_week(dt.datetime.now(tz))
    else:
        start = parse_local_datetime(args.start, tz)
        end = parse_local_datetime(args.end, tz)
    if not start < end:
        print("--start must be before --end", file=sys.stderr)
        return 2

    state_db = Path(os.path.expandvars(args.state_db)).expanduser()
    if not state_db.exists():
        print(f"state DB not found: {state_db}", file=sys.stderr)
        return 2

    conn = sqlite3.connect(str(state_db))
    conn.row_factory = sqlite3.Row
    total_indexed = conn.execute("select count(*) from threads").fetchone()[0]
    rows = select_threads(conn)
    records = [row_to_record(row, int(start.timestamp()), int(end.timestamp()), tz) for row in rows]
    candidates = [record for record in records if record["candidate_for_review"]]
    active = [record for record in records if record["active_in_window"]]
    missing_rollouts = [record for record in candidates if not record["rollout_exists"]]
    timestamp_gaps = [record for record in candidates if record["rollout_error"] == "missing_event_timestamps"]
    no_result = [record for record in candidates if record["rollout_error"] == "no_assistant_result"]
    summary = {
        "state_db": str(state_db),
        "timezone": args.timezone,
        "start_local": start.isoformat(),
        "end_local": end.isoformat(),
        "start_epoch": int(start.timestamp()),
        "end_epoch": int(end.timestamp()),
        "indexed_threads": total_indexed,
        "threads_with_rollout_path": len(rows),
        "candidate_sessions": len(candidates),
        "active_sessions_by_rollout_timestamp": len(active),
        "access_gap_candidates": len(candidates) - len(active),
        "automation_sessions": sum(1 for record in active if record["is_automation"]),
        "non_automation_sessions": sum(1 for record in active if not record["is_automation"]),
        "continued_older_sessions": sum(1 for record in active if record["created_before_window"]),
        "missing_rollout_files": len(missing_rollouts),
        "rollouts_without_event_timestamps": len(timestamp_gaps),
        "sessions_without_assistant_result": len(no_result),
    }
    out_dir = Path(args.out_dir).expanduser()
    write_outputs(records, out_dir, summary)
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    print(f"wrote {out_dir / 'sessions.jsonl'}")
    print(f"wrote {out_dir / 'sessions.tsv'}")
    print(f"wrote {out_dir / 'summary.json'}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
