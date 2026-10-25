import type Database from 'better-sqlite3';
import { createHash } from 'node:crypto';

export function applyMigration(db:Database.Database,version:string,sql:string) {
 const checksum=createHash('sha256').update(sql).digest('hex');
 // Original standalone SQL is unchanged; the runner owns its transaction boundary.
 const body=sql.replace(/^PRAGMA foreign_keys = ON;\s*/,'').replace(/^BEGIN IMMEDIATE;\s*/,'').replace(/COMMIT;\s*$/,'');
 db.pragma('foreign_keys = ON');
 return db.transaction(()=>{
  db.exec('CREATE TABLE IF NOT EXISTS tax_migrations(version TEXT PRIMARY KEY,applied_at TEXT NOT NULL,checksum TEXT NOT NULL)');
  const prior=db.prepare('SELECT checksum FROM tax_migrations WHERE version=?').get(version) as {checksum:string}|undefined;
  if(prior) { if(prior.checksum!==checksum) throw new Error('Migration checksum drift'); return 'unchanged'; }
  db.exec(body);
  db.prepare('INSERT INTO tax_migrations(version,applied_at,checksum) VALUES(?,?,?)').run(version,new Date().toISOString(),checksum);
  return 'applied';
 }).immediate();
}
