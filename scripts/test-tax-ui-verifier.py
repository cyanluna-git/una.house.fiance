#!/usr/bin/env python3
"""Exercise verifier functions without importing its executable runner."""
import ast
import datetime as dt
import hashlib
import json
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT = Path(__file__).with_name('tax-ui-final-verify.py')

def functions(root):
    tree = ast.parse(SCRIPT.read_text())
    defs = [n for n in tree.body if isinstance(n, ast.FunctionDef)]
    scope = dict(Path=Path, ROOT=root, hashlib=hashlib, dt=dt, subprocess=subprocess,
                 ENV={}, ART=root, STAMP='test', records=[], json=json)
    exec(compile(ast.Module(body=defs, type_ignores=[]), str(SCRIPT), 'exec'), scope)
    return scope

class VerifierSafety(unittest.TestCase):
    def test_manifest_rejects_sensitive_paths_before_any_bytes_read(self):
        with tempfile.TemporaryDirectory(dir=Path.home()/'.hermes/cache/scratch') as tmp:
            root=Path(tmp)
            allowed=['src/example.ts','scripts/check.py','tests/example.test.ts','migrations/001.sql','package.json']
            denied=['backups/finance.db.2024.bak','src/backup.ts','src/report.bak.ts','src/finance.db-wal.ts','src/financial/report.json','src/image.png','src/blob.bin','src/database.sqlite-shm','src/export.csv','docs/notes.md']
            for name in allowed+denied:
                p=root/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('synthetic text')
            original=Path.read_bytes
            reads=[]
            def read(p):
                rel=p.relative_to(root).as_posix()
                self.assertIn(rel,allowed, 'excluded path reached bytes read: '+rel)
                reads.append(rel)
                return original(p)
            with patch.object(subprocess,'check_output',return_value='\n'.join(allowed+denied)),patch.object(Path,'read_bytes',read):
                result=functions(root)['manifest']()
            self.assertEqual(set(reads),set(allowed))
            self.assertEqual(len(result['files']),len(allowed))

    def test_check_failure_is_not_silently_ignored(self):
        with tempfile.TemporaryDirectory(dir=Path.home()/'.hermes/cache/scratch') as tmp:
            scope=functions(Path(tmp))
            scope['manifest']=lambda:{'hash':'synthetic','files':[]}
            with self.assertRaises((RuntimeError,SystemExit)):
                scope['check']('injected-failure',['python3','-c','raise SystemExit(7)'])
            self.assertEqual(scope['records'][0]['exit'],7)

if __name__=='__main__': unittest.main()
