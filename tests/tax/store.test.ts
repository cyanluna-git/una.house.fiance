import { expect, test } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';

test('explicit additive migration creates six tables and preserves existing cashflow', () => {
  const db = new Database(':memory:');
  db.exec('CREATE TABLE transactions(id INTEGER PRIMARY KEY, amount INTEGER); INSERT INTO transactions VALUES(1, 735); CREATE TABLE salary_statements(id INTEGER PRIMARY KEY, net_pay INTEGER); INSERT INTO salary_statements VALUES(1, 1800); CREATE TABLE family_members(id INTEGER PRIMARY KEY);');
  const sql = readFileSync('migrations/uf-tax-001.sql', 'utf8');
  db.exec(sql); db.exec(sql);
  expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'tax_%'").all()).toHaveLength(6);
  expect(db.prepare('SELECT sum(amount) n FROM transactions').get()).toEqual({ n: 735 });
  expect(db.prepare('SELECT sum(net_pay) n FROM salary_statements').get()).toEqual({ n: 1800 });
  db.close();
});
