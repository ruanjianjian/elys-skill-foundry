#!/usr/bin/env python3
"""Verify Companion discovery and argument forwarding without starting sessions."""
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).with_name('codex_desktop.py')
spec = importlib.util.spec_from_file_location('desktop', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class DesktopTests(unittest.TestCase):
    def test_registry_and_ambiguity(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            registry = root / 'plugins/installed_plugins.json'
            registry.parent.mkdir()
            plugin = root / 'version 1'
            script = plugin / 'scripts/codex-companion.mjs'
            script.parent.mkdir(parents=True)
            script.write_text('')
            registry.write_text(json.dumps({'plugins': {'codex@openai-codex': [{'installPath': str(plugin)}]}}))
            with patch.dict(os.environ, {'CLAUDE_CONFIG_DIR': str(root)}):
                self.assertEqual(module.locate(), script.resolve())
                registry.write_text('{"plugins":{}}')
                with self.assertRaises(ValueError):
                    module.locate()
                self.assertEqual(module.locate(str(script)), script.resolve())

    def test_exact_forwarding_and_exit_code(self):
        with tempfile.TemporaryDirectory() as directory:
            script = Path(directory) / 'companion.mjs'
            script.write_text('console.log(JSON.stringify(process.argv.slice(2))); process.exit(7);')
            env = dict(os.environ)
            env.pop('CODEX_COMPANION_WRITE_SANDBOX', None)
            args = ['status', 'job-specific', '--cwd', '/path with spaces', '--json']
            result = subprocess.run([sys.executable, str(SCRIPT), '--companion', str(script), *args],
                                    capture_output=True, text=True, env=env)
            self.assertEqual(result.returncode, 7)
            self.assertEqual(json.loads(result.stdout), args)


if __name__ == '__main__':
    unittest.main()
