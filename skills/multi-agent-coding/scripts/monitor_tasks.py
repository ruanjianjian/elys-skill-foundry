#!/usr/bin/env python3
"""Refresh only registered task statuses. Never dispatch, cancel or accept work."""
import argparse
import json
from pathlib import Path
import subprocess
import sys
import time


def collect(task, ledger):
    row = {k: task.get(k) for k in ('id', 'title', 'adapter', 'cwd', 'job_id', 'thread_id', 'visibility', 'review_state')}
    row['checked_at'] = time.time()
    try:
        if task['adapter'] == 'companion':
            command = [sys.executable, str(Path(__file__).with_name('codex_desktop.py'))]
            if task.get('companion'):
                command += ['--companion', task['companion']]
            command += ['status', task['job_id'], '--cwd', task['cwd'], '--json']
            result = subprocess.run(command, capture_output=True, text=True, timeout=20)
            if result.returncode:
                raise ValueError('status probe failed: ' + result.stderr[-500:])
            job = json.loads(result.stdout)['job']
            if job['id'] != task['job_id']:
                raise ValueError('Returned job ID does not match registry')
            if task.get('thread_id') and job.get('threadId') != task['thread_id']:
                raise ValueError('Returned thread ID does not match registry')
            row.update(status=job.get('status', 'unknown'), phase=job.get('phase'),
                       progress=job.get('progressPreview', []), thread_id=job.get('threadId'),
                       source_updated_at=job.get('updatedAt'))
        elif task['adapter'] == 'native':
            # Native tools belong to the Lead host; accept only an explicit, fresh receipt.
            receipt_path = (ledger / task['receipt']).resolve()
            if not receipt_path.is_relative_to(ledger.resolve()):
                raise ValueError('Native receipt must be within ledger')
            receipt = json.loads(receipt_path.read_text())
            if receipt['thread_id'] != task['thread_id']:
                raise ValueError('Native receipt thread mismatch')
            if time.time() - receipt['checked_at'] > 120:
                raise ValueError('Native receipt stale; Lead must refresh through native status/wait tools')
            row.update(status=receipt['status'], progress=receipt.get('progress', []),
                       source_updated_at=receipt['checked_at'])
        else:
            raise ValueError('Unsupported adapter')
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as error:
        row.update(status='unknown', error=str(error))
    return row


def refresh(ledger):
    registry = json.loads((ledger / 'task-sources.json').read_text())
    tasks = registry['tasks']
    ids = [task['id'] for task in tasks]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate task IDs')
    rows = [collect(task, ledger) for task in tasks]
    snapshot = {'checked_at': time.time(), 'tasks': rows}
    temporary = ledger / 'task-status.tmp'
    temporary.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2))
    temporary.replace(ledger / 'task-status.json')
    return snapshot


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--ledger', required=True, type=Path)
    parser.add_argument('--watch', action='store_true')
    parser.add_argument('--interval', type=int, default=30)
    parser.add_argument('--duration', type=int, default=3600, help='Bounded monitoring duration in seconds')
    args = parser.parse_args()
    if args.interval < 15 or args.duration < 1:
        parser.error('interval >= 15 and duration >= 1 required')
    deadline = time.monotonic() + args.duration
    previous = None
    while True:
        snapshot = refresh(args.ledger.resolve())
        signature = json.dumps([{k:v for k,v in row.items() if k != 'checked_at'} for row in snapshot['tasks']], sort_keys=True)
        if signature != previous:
            print(json.dumps(snapshot, ensure_ascii=False), flush=True)
            previous = signature
        if not args.watch or time.monotonic() >= deadline:
            break
        time.sleep(min(args.interval, max(0, deadline - time.monotonic())))


if __name__ == '__main__':
    main()
