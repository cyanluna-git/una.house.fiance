import Database from 'better-sqlite3';
import path from 'node:path';
import { TaxStore } from './store';

export function withTaxStore<T>(action:(store:TaxStore)=>T):T {
 const file=path.resolve(process.env.UNAHOUSE_DB_PATH || path.join(process.cwd(),'finance.db'));
 let db:Database.Database;
 try { db=new Database(file,{fileMustExist:true}); } catch { throw new Error('Migration required'); }
 try {
  const count=db.prepare("SELECT count(*) n FROM sqlite_master WHERE type='table' AND name IN ('tax_subjects','tax_documents','tax_versions','tax_facts','tax_reviews','tax_settlement_links')").get() as {n:number};
  if(count.n!==6) throw new Error('Migration required');
  db.pragma('busy_timeout = 5000'); return action(new TaxStore(db));
 } finally { db.close(); }
}
