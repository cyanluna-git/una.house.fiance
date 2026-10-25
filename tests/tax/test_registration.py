import importlib.util
import pathlib
import sqlite3
import unittest
from test_migration_002 import Migration002Tests, ROOT, runner


class RegistrationTests(unittest.TestCase):
    def test_registration_replay_and_conflict_are_atomic(self):
        path = ROOT / 'scripts/tax-register.py'
        self.assertTrue(path.exists(), 'Allowlisted deterministic registration runner required')
        spec = importlib.util.spec_from_file_location('registration', path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        db = Migration002Tests().seed()
        runner.apply(db, (ROOT / 'migrations/uf-tax-002.sql').read_text(), version='uf-tax-002')
        entries = [{'key':'subject:synthetic','table':'tax_subjects','row':{'alias':'Masked','family_member_id':None,'identity_status':'unconfirmed'}}]
        baseline = runner.snapshot(db)
        self.assertEqual(module.register(db, entries), {'inserted':1,'unchanged':0})
        before = db.iterdump()
        before = list(before)
        self.assertEqual(module.register(db, entries), {'inserted':0,'unchanged':1})
        self.assertEqual(list(db.iterdump()), before)
        conflict = [{'key':'subject:new','table':'tax_subjects','row':{'alias':'Other','family_member_id':None,'identity_status':'unconfirmed'}}, {**entries[0],'row':{**entries[0]['row'],'alias':'Changed'}}]
        with self.assertRaisesRegex(ValueError, 'conflict'):
            module.register(db, conflict)
        self.assertEqual(list(db.iterdump()), before)
        self.assertEqual(runner.snapshot(db), baseline)
        with self.assertRaises(ValueError):
            module.register(db, [{'key':'bad','table':'transactions','row':{'id':9}}])
        self.assertEqual(runner.snapshot(db), baseline)


if __name__ == '__main__':
    unittest.main()
