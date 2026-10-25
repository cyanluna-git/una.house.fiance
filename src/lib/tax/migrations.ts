import type Database from 'better-sqlite3';
import { createHash } from 'node:crypto';

export function applyMigration(db:Database.Database,version:string,sql:string) {
 if(db.inTransaction) throw new Error('Dedicated idle connection required');
 const checksum=createHash('sha256').update(sql).digest('hex');
 const rebuild=version==='uf-tax-002';
 const body=sql.replace(/^PRAGMA foreign_keys = (?:ON|OFF);\s*/,'').replace(/^BEGIN IMMEDIATE;\s*/,'').replace(/COMMIT;\s*$/,'');
 const foreignKeys=db.pragma('foreign_keys',{simple:true});
 db.pragma(`foreign_keys = ${rebuild?'OFF':'ON'}`);
 try {
  return db.transaction(()=>{
   db.exec('CREATE TABLE IF NOT EXISTS tax_migrations(version TEXT PRIMARY KEY,applied_at TEXT NOT NULL,checksum TEXT NOT NULL)');
   const prior=db.prepare('SELECT checksum FROM tax_migrations WHERE version=?').get(version) as {checksum:string}|undefined;
   if(prior) { if(prior.checksum!==checksum) throw new Error('Migration checksum drift'); return 'unchanged'; }
   let objects:{sql:string}[]=[];
   let rows:unknown[]=[];
   if(rebuild) {
    const initial=db.prepare("SELECT checksum FROM tax_migrations WHERE version='uf-tax-001'").get() as {checksum:string}|undefined;
    if(initial?.checksum!=='76c0281eff26752d992cf6aef80699e7a42cee3b3d9f8758fff85f3d7bf210e9') throw new Error('Immutable 001 ledger required');
    objects=db.prepare("SELECT sql FROM sqlite_master WHERE tbl_name='tax_facts' AND type IN ('index','trigger') AND sql IS NOT NULL ORDER BY type,name").all() as {sql:string}[];
    rows=db.prepare('SELECT * FROM tax_facts ORDER BY id').all();
   }
   db.exec(body);
   for(const object of objects) db.exec(object.sql);
   if(rebuild && JSON.stringify(rows)!==JSON.stringify(db.prepare('SELECT * FROM tax_facts ORDER BY id').all())) throw new Error('Fact preservation failed');
   if(rebuild && ((db.pragma('foreign_key_check') as unknown[]).length || db.pragma('integrity_check',{simple:true})!=='ok')) throw new Error('Migration integrity failed');
   db.prepare('INSERT INTO tax_migrations(version,applied_at,checksum) VALUES(?,?,?)').run(version,new Date().toISOString(),checksum);
   return 'applied';
  }).immediate();
 } finally { if(rebuild) db.pragma(`foreign_keys = ${foreignKeys?'ON':'OFF'}`); }
}
