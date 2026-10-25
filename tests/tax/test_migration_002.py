import hashlib
import importlib.util
import pathlib
import sqlite3
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]
spec = importlib.util.spec_from_file_location('rollout002', ROOT / 'scripts/tax-production-migrate.py')
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)


class Migration002Tests(unittest.TestCase):
    def seed(self):
        db = sqlite3.connect(':memory:')
        db.executescript('CREATE TABLE family_members(id INTEGER PRIMARY KEY); CREATE TABLE transactions(id INTEGER PRIMARY KEY); CREATE TABLE salary_statements(id INTEGER PRIMARY KEY); INSERT INTO transactions VALUES(7);')
        runner.apply(db, (ROOT / 'migrations/uf-tax-001.sql').read_text())
        db.executescript("INSERT INTO tax_subjects VALUES(1,'Synthetic',NULL,'unconfirmed'); INSERT INTO tax_documents VALUES(1,1,'synthetic','1','abc',NULL,'Synthetic',2024,2024,'withholding','manual'); INSERT INTO tax_versions VALUES(1,1,2024,1,'original','annual','unknown',NULL); INSERT INTO tax_facts VALUES(10,1,1,'salary','national','source',NULL,1,'observed',NULL); INSERT INTO tax_facts VALUES(11,1,1,'salary','national','source',0,1,'observed',10); CREATE TABLE fact_reference(id INTEGER PRIMARY KEY,fact_id INTEGER REFERENCES tax_facts(id)); INSERT INTO fact_reference VALUES(1,11); CREATE INDEX extra_fact_index ON tax_facts(page); CREATE TRIGGER extra_fact_trigger AFTER INSERT ON tax_facts BEGIN SELECT 1; END;")
        return db

    def state(self, db):
        return (db.execute("SELECT type,name,tbl_name,sql FROM sqlite_master ORDER BY name").fetchall(), db.execute('SELECT * FROM tax_facts ORDER BY id').fetchall(), db.execute('SELECT * FROM tax_migrations ORDER BY version').fetchall(), runner.snapshot(db))

    def test_every_rebuild_boundary_rolls_back(self):
        sql = (ROOT / 'migrations/uf-tax-002.sql').read_text()
        for marker in ['CREATE TABLE', 'INSERT INTO tax_facts_new', 'DROP TABLE', 'ALTER TABLE', 'CREATE INDEX', 'CREATE TRIGGER', 'ledger']:
            with self.subTest(marker=marker):
                db = self.seed()
                before = self.state(db)
                def fail(statement):
                    if marker in statement:
                        raise RuntimeError('injected')
                with self.assertRaisesRegex(RuntimeError, 'injected'):
                    runner.apply(db, sql, version='uf-tax-002', fault=fail)
                self.assertEqual(before, self.state(db))
                self.assertEqual(db.execute('PRAGMA foreign_keys').fetchone()[0], 1)
                self.assertEqual(db.execute('PRAGMA foreign_key_check').fetchall(), [])
                db.close()

    def test_populated_rebuild_preserves_identity_references_and_replay(self):
        self.assertTrue((ROOT / 'migrations/uf-tax-002.sql').exists(), 'New immutable migration required')
        db = self.seed()
        before = self.state(db)
        sql = (ROOT / 'migrations/uf-tax-002.sql').read_text()
        self.assertEqual(runner.apply(db, sql, version='uf-tax-002'), 'applied')
        self.assertEqual(before[1], self.state(db)[1])
        self.assertEqual(before[2][0], self.state(db)[2][0])
        self.assertEqual(before[3], runner.snapshot(db))
        self.assertEqual(db.execute('PRAGMA foreign_key_check').fetchall(), [])
        self.assertEqual(db.execute('PRAGMA foreign_keys').fetchone()[0], 1)
        for name in ['extra_fact_index', 'extra_fact_trigger']:
            self.assertEqual(next(x for x in before[0] if x[1] == name), next(x for x in self.state(db)[0] if x[1] == name))
        db.execute("INSERT INTO tax_facts VALUES(12,1,1,'credit_card_deduction','national','source',-7,1,'observed',NULL)")
        db.commit()
        with self.assertRaises(sqlite3.IntegrityError):
            db.execute("INSERT INTO tax_facts VALUES(13,1,1,'not_a_tax_field','national','source',0,1,'observed',NULL)")
        db.rollback()
        stable = self.state(db)
        self.assertEqual(runner.apply(db, sql, version='uf-tax-002'), 'unchanged')
        self.assertEqual(stable, self.state(db))
        with self.assertRaisesRegex(ValueError, 'checksum'):
            runner.apply(db, sql + '\n', version='uf-tax-002')
        self.assertEqual(hashlib.sha256((ROOT / 'migrations/uf-tax-001.sql').read_bytes()).hexdigest(), '76c0281eff26752d992cf6aef80699e7a42cee3b3d9f8758fff85f3d7bf210e9')


if __name__ == '__main__':
    unittest.main()
