import { test, expect } from 'vitest';
import { mkdtempSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { guardedPath, migrate } from '../../scripts/tax-migrate';

test('actual dashboard handler cashflow unchanged by tax migration and reviewed tax amounts',async()=>{
 const root=realpathSync(path.join(process.env.HOME!,'.hermes/cache/scratch'));
 const dir=mkdtempSync(path.join(root,'tax-dashboard-'));
 const file=guardedPath(path.join(dir,'synthetic.sqlite'));
 if(!file.startsWith(root+path.sep)) throw new Error('Isolated DB required before legacy import');
 process.env.UNAHOUSE_DB_PATH=file;
 const {default:Database}=await import('better-sqlite3'); const seed=new Database(file);
 seed.exec("CREATE TABLE category_rules(id INTEGER PRIMARY KEY,keyword TEXT,category_l1 TEXT,category_l2 TEXT,category_l3 TEXT,priority INTEGER); INSERT INTO category_rules VALUES(1,'Synthetic','other','','',0)"); seed.close();
 const {sqlite}=await import('../../src/lib/db/index');
 const {GET}=await import('../../src/app/api/dashboard/route');
 const {NextRequest}=await import('next/server');
 sqlite.prepare("INSERT INTO transactions(date,card_company,merchant,amount) VALUES('2023-05-01','Synthetic','Synthetic merchant',735)").run();
 sqlite.prepare("INSERT INTO salary_statements(pay_date,gross_pay,total_deductions,net_pay) VALUES('2023-05-01',2000,200,1800)").run();
 const before=await GET(new NextRequest('http://localhost/api/dashboard?year=2023')); expect(before.status).toBe(200); const baseline=await before.json();
 migrate(file,true);
 const {TaxStore}=await import('../../src/lib/tax/store'); const store=new TaxStore(sqlite);
 const s=store.create('subject',{alias:'Synthetic dashboard'}).id;
 const d=store.create('document',{subject_id:s,drive_id:'synthetic_dashboard',revision:'r1',binary_hash:'a'.repeat(64),label:'Synthetic annual',content_year:2023,kind:'return'}).id;
 const v=store.create('version',{subject_id:s,document_id:d,year:2023,kind:'original',report_class:'annual'}).id;
 store.create('fact',{version_id:v,document_id:d,field_code:'settlement',jurisdiction:'national',basis:'source',amount:-305,page:1});
 const after=await GET(new NextRequest('http://localhost/api/dashboard?year=2023')); expect(after.status).toBe(200); expect(await after.json()).toEqual(baseline);
 sqlite.close(); delete process.env.UNAHOUSE_DB_PATH;
});
