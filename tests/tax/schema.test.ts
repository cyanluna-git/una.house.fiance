import { test, expect } from 'vitest';
import { getTableConfig } from 'drizzle-orm/sqlite-core';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import * as schema from '../../src/lib/tax/schema';
test('standalone Drizzle columns align with explicit SQL migration without importing legacy DB',()=>{
 const db=new Database(':memory:'); db.exec(readFileSync('migrations/uf-tax-001.sql','utf8'));
 expect(Object.values(schema)).toHaveLength(6);
 for(const table of Object.values(schema)) {
  const config=getTableConfig(table); const columns=db.prepare(`PRAGMA table_info(${config.name})`).all() as {name:string}[];
  expect(config.columns.map(c=>c.name).sort()).toEqual(columns.map(c=>c.name).sort());
 }
 db.close();
});
