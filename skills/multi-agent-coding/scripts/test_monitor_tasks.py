#!/usr/bin/env python3
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import time
import unittest
from unittest.mock import patch

ROOT = Path(__file__).parent

def load(name):
    spec = importlib.util.spec_from_file_location(name, ROOT / (name + '.py'))
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

monitor = load('monitor_tasks')
board = load('board_server')


class MonitorTests(unittest.TestCase):
    def test_multiple_tasks_updates_and_stale_board(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root/'task-board.md').write_text('Lead record')
            tasks = [{'id': str(i), 'adapter': 'native', 'thread_id': str(i), 'receipt': str(i)+'.json'} for i in range(2)]
            (root/'task-sources.json').write_text(json.dumps({'tasks':tasks}))
            for i in range(2):
                (root/(str(i)+'.json')).write_text(json.dumps({'thread_id':str(i),'status':'running','checked_at':time.time(),'progress':['<script>bad</script>']}))
            snap = monitor.refresh(root)
            self.assertEqual([t['status'] for t in snap['tasks']], ['running','running'])
            (root/'1.json').write_text(json.dumps({'thread_id':'1','status':'completed','checked_at':time.time()}))
            snap = monitor.refresh(root)
            self.assertEqual([t['status'] for t in snap['tasks']], ['running','completed'])
            rendered = board.render(root/'task-board.md').decode()
            self.assertIn('&lt;script&gt;', rendered)
            self.assertNotIn('<script>', rendered)
            snap['checked_at'] = 0
            (root/'task-status.json').write_text(json.dumps(snap))
            self.assertIn('快照过期', board.render(root/'task-board.md').decode())

    def test_exact_job_mismatch_and_probe_failure(self):
        task = {'id':'a','adapter':'companion','job_id':'wanted','cwd':'/repo'}
        response = subprocess.CompletedProcess([], 0, json.dumps({'job':{'id':'wrong','status':'completed'}}), '')
        with patch.object(monitor.subprocess, 'run', return_value=response):
            self.assertEqual(monitor.collect(task, Path('/tmp'))['status'], 'unknown')
        with patch.object(monitor.subprocess, 'run', side_effect=subprocess.TimeoutExpired('probe',20)):
            self.assertEqual(monitor.collect(task, Path('/tmp'))['status'], 'unknown')

    def test_stale_native_receipt(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            (root/'receipt.json').write_text(json.dumps({'thread_id':'t','status':'completed','checked_at':0}))
            row=monitor.collect({'id':'a','adapter':'native','thread_id':'t','receipt':'receipt.json'},root)
            self.assertEqual(row['status'],'unknown')


if __name__ == '__main__':
    unittest.main()
