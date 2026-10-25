#!/usr/bin/env python3
"""Additive deterministic registration. Importable; CLI accepts isolated scratch only."""
import argparse
import hashlib
import json
import pathlib
import re
import sqlite3

COLUMNS = {
    'tax_subjects': {'alias','family_member_id','identity_status'},
    'tax_documents': {'subject_id','drive_id','revision','binary_hash','text_hash','label','filename_year','content_year','kind','extraction_status'},
    'tax_versions': {'subject_id','year','document_id','kind','report_class','filing_status','predecessor_id'},
    'tax_facts': {'version_id','document_id','field_code','jurisdiction','basis','amount','page','review_status','supersedes_id'},
    'tax_reviews': {'subject_id','year','version_id','document_id','page','kind','topic','note'},
}


def stable_id(key):
    if not isinstance(key, str) or not re.fullmatch(r'[A-Za-z0-9:_.-]{1,180}', key):
        raise ValueError('Invalid stable key')
    return int(hashlib.sha256(key.encode()).hexdigest()[:13], 16) + 1


def register(db, entries):
    if db.in_transaction:
        raise ValueError('Dedicated idle connection required')
    keys = [e['key'] for e in entries]
    if len(set(keys)) != len(keys) or len({stable_id(k) for k in keys}) != len(keys):
        raise ValueError('Duplicate stable key or hash collision')
    allowed_ids = {key: stable_id(key) for key in keys}
    operations = []
    for entry in entries:
        table, row = entry['table'], entry['row']
        if table not in COLUMNS or not row or not set(row) <= COLUMNS[table]:
            raise ValueError('Registration table/column allowlist required')
        row = dict(row)
        for column, value in row.items():
            if isinstance(value, dict):
                if set(value) != {'ref'} or value['ref'] not in allowed_ids:
                    raise ValueError('Unknown stable reference')
                row[column] = allowed_ids[value['ref']]
            elif isinstance(value, str) and column in {'alias','label','note'}:
                if not value.strip() or len(value)>240 or re.search(r'[\x00-\x1f<>]|\d{6}[ -]?[1-4]\d{6}|\d{10,}|(?:password|passwd|비밀번호|주민등록|계좌)\s*[:=]?', value, re.I):
                    raise ValueError('Unsafe text')
        operations.append((table, {'id':allowed_ids[entry['key']], **row}))
    def guard(action, table, column, database, trigger):
        if action in (sqlite3.SQLITE_INSERT, sqlite3.SQLITE_UPDATE, sqlite3.SQLITE_DELETE):
            return sqlite3.SQLITE_OK if action == sqlite3.SQLITE_INSERT and table in COLUMNS else sqlite3.SQLITE_DENY
        if action in (sqlite3.SQLITE_CREATE_TABLE, sqlite3.SQLITE_DROP_TABLE, sqlite3.SQLITE_ALTER_TABLE):
            return sqlite3.SQLITE_DENY
        return sqlite3.SQLITE_OK
    db.execute('PRAGMA foreign_keys=ON')
    result = {'inserted':0,'unchanged':0}
    db.set_authorizer(guard)
    try:
        db.execute('BEGIN IMMEDIATE')
        ledger = db.execute("SELECT checksum FROM tax_migrations WHERE version='uf-tax-002'").fetchone()
        expected = hashlib.sha256((pathlib.Path(__file__).resolve().parents[1] / 'migrations/uf-tax-002.sql').read_bytes()).hexdigest()
        if not ledger or ledger[0] != expected:
            raise ValueError('002 migration required')
        for table, row in operations:
            columns = list(row)
            existing = db.execute('SELECT '+','.join(columns)+' FROM '+table+' WHERE id=?', (row['id'],)).fetchone()
            if existing:
                if tuple(row.values()) != existing:
                    raise ValueError('Stable registration conflict')
                result['unchanged'] += 1
                continue
            db.execute('INSERT INTO '+table+' ('+','.join(columns)+') VALUES ('+','.join('?' for _ in columns)+')', tuple(row.values()))
            result['inserted'] += 1
        if db.execute('PRAGMA foreign_key_check').fetchall():
            raise ValueError('Registration foreign key failure')
        db.commit()
        return result
    except BaseException:
        db.rollback()
        raise
    finally:
        db.set_authorizer(lambda *args: sqlite3.SQLITE_OK)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db', required=True)
    parser.add_argument('--dataset', required=True)
    args = parser.parse_args()
    path = pathlib.Path(args.db).absolute()
    scratch = pathlib.Path.home() / '.hermes/cache/scratch'
    if path.is_symlink() or not path.is_file() or path.resolve() != path or scratch.resolve() not in path.parents or re.search(r'finance\.db|test\.db|production|development', str(path), re.I):
        raise ValueError('Existing isolated scratch DB required')
    data = json.loads(pathlib.Path(args.dataset).read_text())
    with sqlite3.connect(path) as db:
        print(json.dumps(register(db, data['entries'])))


if __name__ == '__main__':
    main()
