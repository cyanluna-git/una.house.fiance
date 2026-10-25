import {test,expect} from 'vitest';
import Database from 'better-sqlite3';
import {readFileSync} from 'node:fs';
import {applyMigration} from '../../src/lib/tax/migrations';
test('ledger is transactional, checksum drift rejected and identical replay preserves timestamp and facts',()=>{
 const db=new Database(':memory:'); db.exec('CREATE TABLE family_members(id INTEGER PRIMARY KEY)');
 const sql=readFileSync('migrations/uf-tax-001.sql','utf8');
 expect(applyMigration(db,'uf-tax-001',sql)).toBe('applied');
 db.exec("INSERT INTO tax_subjects(alias) VALUES('Synthetic ledger')");
 const before=db.prepare('SELECT * FROM tax_migrations').all();
 expect(applyMigration(db,'uf-tax-001',sql)).toBe('unchanged');
 expect(db.prepare('SELECT * FROM tax_migrations').all()).toEqual(before);
 expect(db.prepare('SELECT count(*) n FROM tax_subjects').get()).toEqual({n:1});
 expect(()=>applyMigration(db,'uf-tax-001',sql+'\n-- drift')).toThrow('checksum');
 expect(()=>applyMigration(db,'broken','CREATE TABLE rollback_probe(id); INVALID SQL;')).toThrow();
 expect(db.prepare("SELECT name FROM sqlite_master WHERE name='rollback_probe'").get()).toBeUndefined();
 expect(db.prepare('SELECT count(*) n FROM tax_migrations').get()).toEqual({n:1}); db.close();
});
