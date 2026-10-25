import { test, expect } from 'vitest';
import { mkdtempSync } from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { migrate, guardedPath } from '../../scripts/tax-migrate';
import { GET, POST } from '../../src/app/api/tax/route';

test('API missing schema is helpful 503, strict envelopes reject unknown input, safe manual flow works',async()=>{
 const dir=mkdtempSync(path.join(process.env.HOME!,'.hermes/cache/scratch/tax-api-'));
 process.env.UNAHOUSE_DB_PATH=guardedPath(path.join(dir,'synthetic.sqlite'));
 expect((await GET(new Request('http://localhost/api/tax'))).status).toBe(503);
 const db=new Database(process.env.UNAHOUSE_DB_PATH); db.exec('CREATE TABLE family_members(id INTEGER PRIMARY KEY); CREATE TABLE transactions(id INTEGER PRIMARY KEY,amount INTEGER,date TEXT); CREATE TABLE salary_statements(id INTEGER PRIMARY KEY,net_pay INTEGER,pay_date TEXT)'); db.close(); migrate(process.env.UNAHOUSE_DB_PATH,true);
 const send=(body:unknown)=>POST(new Request('http://localhost/api/tax',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
 expect((await send({kind:'subject',data:{alias:'Synthetic API'},rawText:'not allowed'})).status).toBe(400);
 expect((await send({kind:'subject',data:{alias:'Synthetic API'}})).status).toBe(201);
 expect((await send({kind:'subject',data:{alias:'1234567890123'}})).status).toBe(400);
 const response=await GET(new Request('http://localhost/api/tax')); expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toContain('no-store');
 const body=await response.json(); expect(body.subjects[0].alias).toBe('Synthetic API'); expect(body.subjects[0]).not.toHaveProperty('password');
 const seed=new Database(process.env.UNAHOUSE_DB_PATH);
 for(let id=1;id<=225;id++) {seed.prepare('INSERT INTO transactions(id,date,amount) VALUES(?,?,?)').run(id,id<=25?'2024-06-15':'2026-01-01',735);seed.prepare('INSERT INTO salary_statements(id,pay_date,net_pay) VALUES(?,?,?)').run(id,id<=25?'2024-06-15':'2026-01-01',1800);} seed.close();
 const candidates=await GET(new Request('http://localhost/api/tax?view=candidates&from=2024-01-01&to=2024-12-31&page=2&pageSize=2'));
 expect(candidates.status).toBe(200); expect((await candidates.json()).transactions).toMatchObject({total:25,hasMore:true,page:2});
 for(const query of ['from=2024-02-30&to=2024-12-31&page=1&pageSize=2','from=2025-01-01&to=2024-01-01&page=1&pageSize=2','from=2024-01-01&to=2024-12-31&page=1&pageSize=101','from=2024-01-01&to=2024-12-31&page=1&pageSize=2&extra=x']) expect((await GET(new Request('http://localhost/api/tax?view=candidates&'+query))).status).toBe(400);
 expect((await send({kind:'identity',data:{subject_id:body.subjects[0].id,alias:'Reviewed alias',family_member_id:null,identity_status:'confirmed'}})).status).toBe(201);
 expect((await (await GET(new Request('http://localhost/api/tax'))).json()).reviews[0].topic).toBe('identity');
 delete process.env.UNAHOUSE_DB_PATH;
});
