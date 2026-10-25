import {test,expect} from 'vitest';
import Database from 'better-sqlite3';
import {readFileSync} from 'node:fs';
import {applyMigration} from '../../src/lib/tax/migrations';

test('002 preserves populated facts, dependencies and migration ledger on replay',()=>{
 const db=new Database(':memory:');
 db.exec('CREATE TABLE family_members(id INTEGER PRIMARY KEY); CREATE TABLE transactions(id INTEGER PRIMARY KEY); CREATE TABLE salary_statements(id INTEGER PRIMARY KEY);');
 applyMigration(db,'uf-tax-001',readFileSync('migrations/uf-tax-001.sql','utf8'));
 db.exec("INSERT INTO tax_subjects VALUES(1,'Synthetic',NULL,'unconfirmed'); INSERT INTO tax_documents VALUES(1,1,'synthetic','1','abc',NULL,'Synthetic',2024,2024,'withholding','manual'); INSERT INTO tax_versions VALUES(1,1,2024,1,'original','annual','unknown',NULL); INSERT INTO tax_facts VALUES(10,1,1,'salary','national','source',NULL,1,'observed',NULL); INSERT INTO tax_facts VALUES(11,1,1,'salary','national','source',0,1,'observed',10); CREATE TABLE ref(id INTEGER PRIMARY KEY,fact_id INTEGER REFERENCES tax_facts(id)); INSERT INTO ref VALUES(1,11); CREATE INDEX extra_fact_index ON tax_facts(page); CREATE TRIGGER extra_fact_trigger AFTER INSERT ON tax_facts BEGIN SELECT 1; END;");
 const sql=readFileSync('migrations/uf-tax-002.sql','utf8');
 const facts=db.prepare('SELECT * FROM tax_facts').all();
 expect(applyMigration(db,'uf-tax-002',sql)).toBe('applied');
 expect(db.prepare('SELECT * FROM tax_facts').all()).toEqual(facts);
 expect(db.pragma('foreign_key_check')).toEqual([]);
 expect(db.pragma('foreign_keys',{simple:true})).toBe(1);
 const ledger=db.prepare('SELECT * FROM tax_migrations').all();
 expect(applyMigration(db,'uf-tax-002',sql)).toBe('unchanged');
 expect(db.prepare('SELECT * FROM tax_migrations').all()).toEqual(ledger);
 expect(()=>applyMigration(db,'uf-tax-002',sql+'\n')).toThrow(/checksum/);
 db.close();
});
