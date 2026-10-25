import type Database from 'better-sqlite3';

export type Row = { id: number; [key: string]: string | number | null | boolean };
export function safeDriveUrl(id: string, page?: number) {
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(id) || (page !== undefined && (!Number.isSafeInteger(page) || page < 1))) throw new Error('Invalid source');
  return `https://drive.google.com/file/d/${id}/view${page ? `#page=${page}` : ''}`;
}
const fields = {
 subject: ['alias','family_member_id','identity_status'],
 document: ['subject_id','drive_id','revision','binary_hash','text_hash','label','filename_year','content_year','kind','extraction_status'],
 version: ['subject_id','year','document_id','kind','report_class','filing_status','predecessor_id'],
 fact: ['version_id','document_id','field_code','jurisdiction','basis','amount','page','supersedes_id','review_status'],
 link: ['jurisdiction','version_id','transaction_id','payslip_id','direction','amount','status','evidence_document_id','evidence_page','confirms_id'],
 review: ['subject_id','year','version_id','document_id','page','kind','topic','note'],
} as const;
const tables = {subject:'tax_subjects',document:'tax_documents',version:'tax_versions',fact:'tax_facts',review:'tax_reviews',link:'tax_settlement_links'} as const;
type Kind = keyof typeof tables;
const numeric = new Set(['family_member_id','subject_id','filename_year','content_year','year','document_id','predecessor_id','version_id','amount','page','supersedes_id','transaction_id','payslip_id','evidence_document_id','evidence_page','confirms_id']);
function safeText(value: string, max: number) {
 if (!value.trim() || value.length>max || /[\u0000-\u001f<>]|\d{6}[ -]?[1-4]\d{6}|\d{10,}|(?:password|passwd|비밀번호|주민등록|계좌)\s*[:=]?/i.test(value)) throw new Error('Unsafe text');
}
export class TaxStore {
 constructor(private db: Database.Database) { db.pragma('foreign_keys = ON'); }
 private row(table: string, id: unknown): Row {
  const row=this.db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(id) as Row|undefined;
  if(!row) throw new Error('Missing reference'); return row;
 }
 private sameVersion(a: Row,b: Row) { if(a.subject_id!==b.subject_id || a.year!==b.year) throw new Error('Context mismatch'); }
 private documentContext(id: unknown, subject: unknown, year: unknown) {
  const d=this.row('tax_documents',id); if(d.subject_id!==subject || (year!=null && d.content_year!==year)) throw new Error('Source context mismatch'); return d;
 }
 create(kind: string, input: unknown): Row {
  if (!Object.prototype.hasOwnProperty.call(tables,kind) || !input || typeof input!=='object' || Array.isArray(input)) throw new Error('Invalid input');
  const k=kind as Kind; const data=input as Record<string,string|number|null>; const keys=Object.keys(data);
  if(!keys.length || keys.some(key=>!(fields[k] as readonly string[]).includes(key))) throw new Error('Unknown field');
  for(const [key,value] of Object.entries(data)) {
   if(value===null) continue;
   if(numeric.has(key)) { if(typeof value!=='number' || !Number.isSafeInteger(value)) throw new Error('Integer required'); }
   else {
    if(typeof value!=='string') throw new Error('Text required');
    if(['alias','label','note'].includes(key)) safeText(value,key==='note'?240:key==='alias'?40:120);
    else if(key==='revision') { if(!/^[A-Za-z0-9_.-]{1,120}$/.test(value)) throw new Error('Invalid revision'); }
    else if(!value || value.length>120 || /[\u0000-\u001f<>]/.test(value)) throw new Error('Invalid token');
   }
  }
  if(k==='document') {
   if(typeof data.drive_id!=='string') throw new Error('Source required'); safeDriveUrl(data.drive_id);
   for(const key of ['binary_hash','text_hash']) if(data[key]!=null && !/^[a-f0-9]{64}$/.test(String(data[key]))) throw new Error('Invalid fingerprint');
   const existing=this.db.prepare('SELECT * FROM tax_documents WHERE drive_id=? AND revision=? AND binary_hash=?').get(data.drive_id,data.revision,data.binary_hash) as Row|undefined;
   if(existing) { if(existing.subject_id!==data.subject_id) throw new Error('Subject conflict'); return existing; }
  }
  if(k==='version') {
   this.documentContext(data.document_id,data.subject_id,data.year);
   if(data.predecessor_id!=null) this.sameVersion(data as unknown as Row,this.row('tax_versions',data.predecessor_id));
  }
  if(k==='fact') {
   const v=this.row('tax_versions',data.version_id); this.documentContext(data.document_id,v.subject_id,v.year);
   if(data.supersedes_id!=null) { const f=this.row('tax_facts',data.supersedes_id); for(const key of ['version_id','field_code','jurisdiction','basis']) if(f[key]!==data[key]) throw new Error('Revision mismatch'); }
  }
  if(k==='review') {
   if(data.version_id!=null) this.sameVersion(data as unknown as Row,this.row('tax_versions',data.version_id));
   if(data.document_id!=null) this.documentContext(data.document_id,data.subject_id,data.year);
  }
  if(k==='link') {
   return this.db.transaction(()=>{
    const v=this.row('tax_versions',data.version_id);
    if((data.transaction_id==null)===(data.payslip_id==null)) throw new Error('One settlement reference required');
    const column=data.transaction_id!=null?'transaction_id':'payslip_id';
    const source=this.row(column==='transaction_id'?'transactions':'salary_statements',data[column]);
    if(data.confirms_id!=null) {
     const prior=this.row('tax_settlement_links',data.confirms_id);
     if(prior.status!=='candidate' || data.status!=='confirmed' || prior.jurisdiction!==(data.jurisdiction??'national')) throw new Error('Invalid confirmation');
     for(const key of ['version_id',column,'direction','amount']) if(prior[key]!==data[key]) throw new Error('Confirmation mismatch');
    }
    if(data.status==='confirmed') {
     const evidence=this.documentContext(data.evidence_document_id,v.subject_id,v.year);
     if(!(column==='payslip_id'?['withholding','payment']:['payment']).includes(String(evidence.kind))) throw new Error('Payment evidence required');
     const total=this.db.prepare(`SELECT coalesce(sum(amount),0) n FROM tax_settlement_links WHERE ${column}=? AND status='confirmed'`).get(data[column]) as {n:number};
     // Existing card/manual amounts are expense-oriented, not bank debit/credit evidence.
     // Direction is explicitly reviewed; never inferred from their sign or salary net pay.
     const capacity=Math.abs(Number(column==='transaction_id'?source.amount:source.net_pay));
     if(typeof data.amount!=='number' || total.n+data.amount>capacity) throw new Error('Overallocated');
    }
    return this.insert(k,data);
   }).immediate();
  }
  return this.insert(k,data);
 }
 private insert(k:Kind,data:Record<string,string|number|null>):Row {
  const keys=Object.keys(data);
  const table=tables[k]; const result=this.db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${keys.map(()=>'?').join(',')})`).run(...keys.map(key=>data[key]));
  return this.row(table,result.lastInsertRowid);
 }
 reviewIdentity(input:unknown):Row {
  if(!input || typeof input!=='object' || Array.isArray(input)) throw new Error('Invalid identity review');
  const data=input as Record<string,unknown>;
  if(Object.keys(data).sort().join(',')!=='alias,family_member_id,identity_status,subject_id' || !Number.isSafeInteger(data.subject_id) || typeof data.alias!=='string' || !['confirmed','unconfirmed'].includes(String(data.identity_status)) || (data.family_member_id!==null && !Number.isSafeInteger(data.family_member_id))) throw new Error('Invalid identity review');
  safeText(data.alias,40);
  return this.db.transaction(()=>{
   this.row('tax_subjects',data.subject_id);
   if(data.family_member_id!==null) this.row('family_members',data.family_member_id);
   this.db.prepare('UPDATE tax_subjects SET alias=?,family_member_id=?,identity_status=? WHERE id=?').run(data.alias,data.family_member_id,data.identity_status,data.subject_id);
   this.insert('review',{subject_id:Number(data.subject_id),kind:'review_event',topic:'identity',note:`${new Date().toISOString()} identity ${data.identity_status}; family ${data.family_member_id??'none'}`});
   return this.row('tax_subjects',data.subject_id);
  }).immediate();
 }
 candidates(query: {from:string;to:string;page:number;pageSize:number}) {
  const {from,to,page,pageSize}=query;
  const date=(value:string)=>typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
  if(!date(from) || !date(to) || from>to || !Number.isSafeInteger(page) || page<1 || !Number.isSafeInteger(pageSize) || pageSize<1 || pageSize>100 || !Number.isSafeInteger((page-1)*pageSize)) throw new Error('Invalid candidate query');
  const read=(table:string,dateColumn:string,amount:string)=>{
   const total=(this.db.prepare(`SELECT count(*) n FROM ${table} WHERE ${dateColumn} BETWEEN ? AND ?`).get(from,to) as {n:number}).n;
   const rows=this.db.prepare(`SELECT id,${dateColumn},${amount} FROM ${table} WHERE ${dateColumn} BETWEEN ? AND ? ORDER BY ${dateColumn} DESC,id DESC LIMIT ? OFFSET ?`).all(from,to,pageSize,(page-1)*pageSize) as Row[];
   return {rows,total,hasMore:page*pageSize<total,page,pageSize};
  };
  return {transactions:read('transactions','date','amount'),payslips:read('salary_statements','pay_date','net_pay')};
 }
 snapshot() {
  const read=(kind:Kind)=>this.db.prepare(`SELECT id,${fields[kind].join(',')} FROM ${tables[kind]} ORDER BY id`).all() as Row[];
  const subjects=read('subject');
  const documents=read('document').map((d):Row & {url:string;year_mismatch:boolean;duplicate_candidate:boolean}=>({...d,url:safeDriveUrl(String(d.drive_id)),year_mismatch:d.filename_year!=null && d.content_year!=null && d.filename_year!==d.content_year,duplicate_candidate:Boolean(d.text_hash && this.db.prepare('SELECT 1 FROM tax_documents WHERE text_hash=? AND binary_hash!=? AND id!=?').get(d.text_hash,d.binary_hash,d.id))}));
  const versions=read('version'), facts=read('fact'), reviews=read('review');
  const activeFacts=facts.filter(f=>!facts.some(next=>next.supersedes_id===f.id));
  const annual=versions.filter((v,i)=>versions.findIndex(x=>x.subject_id===v.subject_id && x.year===v.year)===i).map(v=>{
   const selection=reviews.filter(r=>r.kind==='selection' && r.subject_id===v.subject_id && r.year===v.year).at(-1);
   return {subject_id:v.subject_id,year:v.year,selected_version_id:selection?.version_id??null,payment_status:'unknown',comparison_facts:activeFacts.filter(f=>f.version_id===selection?.version_id)};
  });
  const links=read('link');

  const reconciliation=versions.flatMap(v=>['national','local','penalty'].map(scope=>{
   const observations=activeFacts.filter(f=>f.version_id===v.id && f.field_code==='settlement' && f.jurisdiction===scope && f.basis==='source');
   const expected=observations.length===1 && typeof observations[0].amount==='number'?observations[0].amount:null;
   const confirmed=links.filter(l=>l.version_id===v.id && l.status==='confirmed' && l.jurisdiction===scope).reduce((n,l)=>n+Number(l.amount)*(l.direction==='refund'?-1:1),0);
   const difference=expected===null?null:expected-confirmed;
   return {version_id:v.id,scope,expected,confirmed,difference,status:difference===null?'unknown':difference===0?'matched':'mismatch'};
  }));
  return {subjects,documents,versions,facts,reviews,annual,links,reconciliation};
 }
}
