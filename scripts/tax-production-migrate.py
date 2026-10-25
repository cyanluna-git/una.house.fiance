#!/usr/bin/env python3
"""Explicit UF-TAX-001 operator runner; never imports application startup DDL."""
import argparse
import hashlib
import json
import os
import pathlib
import sqlite3
from datetime import datetime, timezone

PRODUCTION = '/opt/demos/unahouse-finance/shared/finance.db'
BACKUPS = pathlib.Path(PRODUCTION).parent / 'backups'
TABLES = ('tax_subjects', 'tax_documents', 'tax_versions', 'tax_facts', 'tax_reviews', 'tax_settlement_links')
VERSION = 'uf-tax-001'


def target(value):
    p = pathlib.Path(value)
    if str(p) != PRODUCTION or p.is_symlink() or str(p.resolve(strict=True)) != PRODUCTION:
        raise ValueError('Exact resolved production allowlist required')
    return p


def connect(file):
    db = sqlite3.connect(pathlib.Path(file).as_uri() + '?mode=ro', uri=True)
    db.execute('PRAGMA query_only=ON')
    return db


def digest(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, default=lambda v: {'bytes': v.hex()}, separators=(',', ':')).encode()).hexdigest()


def snapshot(db):
    result = {}
    for (name, sql) in db.execute("SELECT name,sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'tax_%' ORDER BY name"):
        q = '"' + name.replace('"', '""') + '"'
        rows = sorted(digest(list(row)) for row in db.execute('SELECT * FROM ' + q))
        indexes = db.execute("SELECT name,sql FROM sqlite_master WHERE tbl_name=? AND type IN ('index','trigger') ORDER BY name", (name,)).fetchall()
        result[name] = {'count': len(rows), 'rows': rows, 'schema': digest([sql, indexes])}
    return result


def apply(db, sql):
    checksum = hashlib.sha256(sql.encode()).hexdigest()
    prefix = 'PRAGMA foreign_keys = ON;\nBEGIN IMMEDIATE;\n'
    if not sql.startswith(prefix) or not sql.endswith('COMMIT;\n'):
        raise ValueError('Unknown standalone transaction markers')
    body = sql[len(prefix):-len('COMMIT;\n')]
    db.execute('PRAGMA foreign_keys=ON')
    db.execute('BEGIN IMMEDIATE')
    try:
        db.execute('CREATE TABLE IF NOT EXISTS tax_migrations(version TEXT PRIMARY KEY,applied_at TEXT NOT NULL,checksum TEXT NOT NULL)')
        prior = db.execute('SELECT checksum FROM tax_migrations WHERE version=?', (VERSION,)).fetchone()
        if prior:
            if prior[0] != checksum:
                raise ValueError('Migration checksum drift')
            db.rollback()
            return 'unchanged'
        present = db.execute("SELECT name FROM sqlite_master WHERE name LIKE 'tax_%' AND name!='tax_migrations'").fetchall()
        if present:
            raise ValueError('Unexpected pre-existing tax schema')
        # Execute individual complete statements: executescript would implicitly commit.
        statement = ''
        for line in body.splitlines(True):
            statement += line
            if sqlite3.complete_statement(statement):
                db.execute(statement)
                statement = ''
        if statement.strip():
            raise ValueError('Incomplete SQL')
        db.execute('INSERT INTO tax_migrations VALUES(?,?,?)', (VERSION, datetime.now(timezone.utc).isoformat(timespec='milliseconds').replace('+00:00', 'Z'), checksum))
        db.commit()
        return 'applied'
    except BaseException:
        db.rollback()
        raise


def private_json(file, value):
    fd = os.open(file, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as stream:
        json.dump(value, stream, sort_keys=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode', choices=['prepare', 'migrate', 'verify'])
    parser.add_argument('--db', required=True)
    parser.add_argument('--evidence', required=True)
    parser.add_argument('--sql', required=True)
    args = parser.parse_args()
    dbpath = target(args.db)
    evidence = pathlib.Path(args.evidence)
    if evidence.parent != BACKUPS or not evidence.name.startswith('uf-tax-001-') or evidence.is_symlink():
        raise ValueError('Private server backup directory required')
    if args.mode == 'prepare':
        evidence.mkdir(mode=0o700)
    if evidence.resolve() != evidence or evidence.stat().st_mode & 0o077:
        raise ValueError('Private evidence directory required')
    sql = pathlib.Path(args.sql).read_text()
    backup = evidence / 'baseline.sqlite'
    with connect(dbpath) as source:
        if args.mode == 'prepare':
            fd = os.open(backup, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            os.close(fd)
            with sqlite3.connect(backup) as dest:
                source.backup(dest)
            with connect(backup) as saved:
                assert saved.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
                baseline = snapshot(saved)
            rehearsal = evidence / 'restore-rehearsal.sqlite'
            fd = os.open(rehearsal, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
            os.close(fd)
            with connect(backup) as saved, sqlite3.connect(rehearsal) as restored:
                saved.backup(restored)
                assert restored.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
                assert snapshot(restored) == baseline
            private_json(evidence / 'baseline.json', baseline)
            private_json(evidence / 'prerequisites.json', {'backup_sha256': hashlib.sha256(backup.read_bytes()).hexdigest(), 'sql_sha256': hashlib.sha256(sql.encode()).hexdigest(), 'restore_ok': True, 'utc': datetime.now(timezone.utc).isoformat()})
            print(json.dumps({'backup': str(backup), 'mode': '0600', 'restore_integrity': 'ok', 'legacy_tables': len(baseline), 'legacy_rows': sum(t['count'] for t in baseline.values()), 'snapshot_sha256': digest(baseline)}))
            return
        baseline = json.loads((evidence / 'baseline.json').read_text())
        prerequisites = json.loads((evidence / 'prerequisites.json').read_text())
        assert prerequisites['restore_ok'] and prerequisites['backup_sha256'] == hashlib.sha256(backup.read_bytes()).hexdigest()
        assert prerequisites['sql_sha256'] == hashlib.sha256(sql.encode()).hexdigest()
        with connect(backup) as saved:
            assert saved.execute('PRAGMA integrity_check').fetchone()[0] == 'ok'
            assert snapshot(saved) == baseline
        assert snapshot(source) == baseline, 'Legacy data/schema changed; operator review required'
    outcome = None
    if args.mode == 'migrate':
        with sqlite3.connect(dbpath, timeout=5) as writable:
            outcome = apply(writable, sql)
    with connect(dbpath) as current:
        assert snapshot(current) == baseline, 'Legacy data/schema changed; operator review required'
        counts = {name: current.execute('SELECT COUNT(*) FROM ' + name).fetchone()[0] for name in TABLES}
        assert all(v == 0 for v in counts.values())
        ledger = current.execute('SELECT version,applied_at,checksum FROM tax_migrations').fetchall()
        assert len(ledger) == 1 and ledger[0][2] == prerequisites['sql_sha256']
        report = {'mode': args.mode, 'outcome': outcome, 'utc': datetime.now(timezone.utc).isoformat(), 'legacy_unchanged': True, 'legacy_tables': len(baseline), 'legacy_rows': sum(t['count'] for t in baseline.values()), 'tax_counts': counts, 'ledger': ledger, 'integrity': current.execute('PRAGMA integrity_check').fetchone()[0]}
        private_json(evidence / (args.mode + '-' + datetime.now(timezone.utc).strftime('%H%M%S%f') + '.json'), report)
        print(json.dumps(report))


if __name__ == '__main__':
    main()
