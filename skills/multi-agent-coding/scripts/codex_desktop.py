#!/usr/bin/env python3
"""Locate and invoke the installed Codex Companion for desktop task dispatch.

Usage: codex_desktop.py [--companion PATH] doctor
       codex_desktop.py [--companion PATH] task|status|result|cancel [Companion arguments]

Companion owns jobs, sessions and lifecycle. No CLI fallback or desktop DB writes.
"""
import argparse
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys


def locate(explicit=None):
    if explicit:
        candidates = [Path(explicit).expanduser()]
    else:
        config = Path(os.environ.get('CLAUDE_CONFIG_DIR', str(Path.home() / '.claude')))
        registry = config / 'plugins' / 'installed_plugins.json'
        if not registry.is_file():
            raise ValueError('Claude plugin registry missing; install Codex Companion or pass --companion.')
        records = json.loads(registry.read_text()).get('plugins', {}).get('codex@openai-codex', [])
        candidates = [Path(row['installPath']) / 'scripts/codex-companion.mjs'
                      for row in records if row.get('installPath')]
    candidates = list(dict.fromkeys(p.resolve() for p in candidates if p.is_file()))
    if len(candidates) != 1:
        raise ValueError('Expected one installed Companion; pass --companion with the intended script. Found: ' + str(candidates))
    return candidates[0]


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--companion', help='Explicit installed codex-companion.mjs path')
    parser.add_argument('action', choices=['doctor', 'task', 'status', 'result', 'cancel'])
    parser.add_argument('arguments', nargs=argparse.REMAINDER)
    args = parser.parse_args()
    companion = locate(args.companion)
    node = shutil.which('node')
    if not node:
        raise ValueError('Node.js missing')
    # Do not inherit a local patch that silently expands write permissions.
    override = os.environ.get('CODEX_COMPANION_WRITE_SANDBOX')
    if override and override not in ('read-only', 'workspace-write'):
        raise ValueError('Unsupported CODEX_COMPANION_WRITE_SANDBOX; use workspace-write for task writes.')
    if args.action == 'doctor':
        help_result = subprocess.run([node, str(companion), '--help'], capture_output=True, text=True, timeout=20)
        codex = shutil.which('codex')
        auth = subprocess.run([codex, 'login', 'status'], capture_output=True, timeout=20) if codex else None
        source = companion.parent / 'lib/codex.mjs'
        source_text = source.read_text() if source.is_file() else ''
        print(json.dumps({'companion': str(companion), 'node': node, 'codex': codex,
                          'help_ok': help_result.returncode == 0,
                          'authenticated': auth is not None and auth.returncode == 0,
                          'user_thread_source_marker': 'threadSource: "user"' in source_text,
                          'desktop_visibility': 'unverified; confirm actual returned thread in Codex desktop'}, ensure_ascii=False))
        return 0 if help_result.returncode == 0 and auth and auth.returncode == 0 else 1
    # Forward exact arguments and exit code; IDs and status come from Companion.
    return subprocess.call([node, str(companion), args.action, *args.arguments])


if __name__ == '__main__':
    try:
        sys.exit(main())
    except (OSError, ValueError, subprocess.SubprocessError) as error:
        print(json.dumps({'error': str(error)}), file=sys.stderr)
        sys.exit(1)
