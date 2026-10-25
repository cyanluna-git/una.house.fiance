import { test, expect } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { TaxStore } from '../../src/lib/tax/store';

test('bounded calendar query finds synthetic historical settlements behind newer rows with stable pages',()=>{
 const db=new Database(':memory:');
 db.exec('CREATE TABLE family_members(id INTEGER PRIMARY KEY); CREATE TABLE transactions(id INTEGER PRIMARY KEY,date TEXT,amount INTEGER); CREATE TABLE salary_statements(id INTEGER PRIMARY KEY,pay_date TEXT,net_pay INTEGER);');
 db.exec(readFileSync('migrations/uf-tax-001.sql','utf8'));
 for(let id=1;id<=205;id++) { db.prepare('INSERT INTO transactions VALUES(?,?,?)').run(id,id<=3?'2024-06-15':'2026-01-01',735); db.prepare('INSERT INTO salary_statements VALUES(?,?,?)').run(id,id<=3?'2024-06-15':'2026-01-01',1000); }
 const store=new TaxStore(db); const before=db.prepare('SELECT * FROM transactions').all();
 const query={from:'2024-01-01',to:'2024-12-31',page:1,pageSize:2};
 const first=store.candidates(query);
 expect(first.transactions.rows.map(r=>r.id)).toEqual([3,2]); expect(first.transactions.total).toBe(3); expect(first.transactions.hasMore).toBe(true);
 expect(store.candidates({...query,page:2}).payslips.rows.map(r=>r.id)).toEqual([1]);
 const s=store.create('subject',{alias:'Synthetic historical'}).id;
 const d=store.create('document',{subject_id:s,drive_id:'synthetic_historical',revision:'r1',binary_hash:'a'.repeat(64),label:'Synthetic payment',kind:'payment',content_year:2024}).id;
 const v=store.create('version',{subject_id:s,year:2024,document_id:d,kind:'original',report_class:'annual'}).id;
 const base={version_id:v,transaction_id:1,direction:'payment',amount:5};
 const c=store.create('link',{...base,status:'candidate'});
 store.create('link',{...base,status:'confirmed',confirms_id:c.id,evidence_document_id:d,evidence_page:2});
 expect(store.snapshot().links.at(-1)?.evidence_document_id).toBe(d);
 expect(db.prepare('SELECT * FROM transactions').all()).toEqual(before);
 for(const invalid of [{from:'2024-02-30'},{to:'2024-13-01'},{from:'2025-01-01'},{page:0},{pageSize:101},{page:1.5},{from:'2024-1-01'}]) expect(()=>store.candidates({...query,...invalid})).toThrow();
 expect(store.snapshot()).not.toHaveProperty('candidates'); db.close();
});
