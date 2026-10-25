import Database from 'better-sqlite3';
import { applyMigration } from '../src/lib/tax/migrations';
import { existsSync, lstatSync, realpathSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// Deliberately synthetic-only. Production rollout needs a separately approved operator procedure.
export function guardedPath(input: string) {
 const root=realpathSync(path.join(process.env.HOME!,'.hermes/cache/scratch'));
 const target=path.resolve(input);
 if(!target.startsWith(root+path.sep) || /(?:finance\.db|test\.db|production|development)/i.test(target)) throw new Error('Synthetic scratch path required');
 const parent=realpathSync(path.dirname(target));
 const stat=lstatSync(target,{throwIfNoEntry:false});
 if(stat?.isSymbolicLink()) throw new Error('Symlink path forbidden');
 if(parent!==path.dirname(target) || !parent.startsWith(root+path.sep) || (existsSync(target) && (lstatSync(target).isSymbolicLink() || realpathSync(target)!==target))) throw new Error('Symlink path forbidden');
 return target;
}
export function migrate(input:string,apply=false) {
 const file=guardedPath(input); if(!apply) return 'dry-run';
 const db=new Database(file);
 try { const outcomes=['uf-tax-001','uf-tax-002'].map(version=>applyMigration(db,version,readFileSync(path.join(process.cwd(),`migrations/${version}.sql`),'utf8'))); return outcomes.every(result=>result==='unchanged')?'unchanged':'applied'; } finally { db.close(); }
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href) {
 const args=process.argv.slice(2); const file=args.find(a=>!a.startsWith('--'));
 if(!file || args.some(a=>a.startsWith('--') && a!=='--apply')) throw new Error('Usage: tax-migrate <explicit synthetic scratch path> [--apply]');
 console.log(migrate(file,args.includes('--apply')));
}
