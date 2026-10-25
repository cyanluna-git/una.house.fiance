import importlib.util
import pathlib
import sqlite3
import unittest

ROOT = pathlib.Path(__file__).resolve().parents[2]


class ProductionMigrationTests(unittest.TestCase):
    def test_atomic_additive_and_idempotent(self):
        script = ROOT / 'scripts/tax-production-migrate.py'
        self.assertTrue(script.exists(), 'Explicit production migration runner is missing')
        spec = importlib.util.spec_from_file_location('rollout', script)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        db = sqlite3.connect(':memory:')
        db.executescript('CREATE TABLE family_members(id INTEGER PRIMARY KEY); CREATE TABLE transactions(id INTEGER PRIMARY KEY); CREATE TABLE salary_statements(id INTEGER PRIMARY KEY); INSERT INTO transactions VALUES(42);')
        sql = (ROOT / 'migrations/uf-tax-001.sql').read_text()
        self.assertEqual(module.apply(db, sql), 'applied')
        before = db.execute('SELECT * FROM tax_migrations').fetchall()
        self.assertEqual(module.apply(db, sql), 'unchanged')
        self.assertEqual(before, db.execute('SELECT * FROM tax_migrations').fetchall())
        self.assertEqual(db.execute('SELECT * FROM transactions').fetchall(), [(42,)])
        for table in module.TABLES:
            self.assertEqual(db.execute('SELECT COUNT(*) FROM ' + table).fetchone()[0], 0)
        with self.assertRaises(ValueError):
            module.apply(db, sql + '\n')
        with self.assertRaises(ValueError):
            module.target('/opt/demos/unahouse-finance/shared/other.db')
        failed = sqlite3.connect(':memory:')
        with self.assertRaises(sqlite3.Error):
            module.apply(failed, sql.replace('CREATE INDEX IF NOT EXISTS tax_versions_subject_year', 'INVALID SQL tax_versions_subject_year'))
        self.assertEqual(failed.execute("SELECT name FROM sqlite_master WHERE name LIKE 'tax_%'").fetchall(), [])


if __name__ == '__main__':
    unittest.main()
