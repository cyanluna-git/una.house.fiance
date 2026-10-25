import { test, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { TaxStore, safeDriveUrl } from '../../src/lib/tax/store';
let db: Database.Database; let store: TaxStore;
beforeEach(() => { db = new Database(':memory:'); db.exec('CREATE TABLE family_members(id INTEGER PRIMARY KEY); CREATE TABLE transactions(id INTEGER PRIMARY KEY,amount INTEGER,date TEXT,source_type TEXT); INSERT INTO transactions VALUES(1,905,\'2023-05-01\',\'manual\'); CREATE TABLE salary_statements(id INTEGER PRIMARY KEY,net_pay INTEGER,pay_date TEXT); INSERT INTO salary_statements VALUES(1,1000,\'2023-05-01\');'); db.exec(readFileSync('migrations/uf-tax-001.sql','utf8')); store=new TaxStore(db); });
afterEach(()=>db.close());
const doc=(subject_id:number, extra={})=>({subject_id,drive_id:'synthetic_file',revision:'r1',binary_hash:'a'.repeat(64),text_hash:'b'.repeat(64),label:'Synthetic return',filename_year:2021,content_year:2020,kind:'return',...extra});
test('opaque fingerprints and Drive IDs permit long digit runs but free text still rejects PII',()=>{
 const s=store.create('subject',{alias:'Synthetic opaque'}).id;
 expect(store.create('document',doc(s,{drive_id:'file_123456789012345',revision:'123456789012',binary_hash:'1234567890123456'.repeat(4),text_hash:'0123456789012345'.repeat(4)})).id).toBeGreaterThan(0);
 expect(()=>store.create('document',doc(s,{label:'account 123456789012'}))).toThrow();
});
test('explicit tax components remain distinct through annual selection and preserve five won',()=>{
 const {s,d,v}=setup();
 const values={salary:4000,bonus:500,gross_total:4500,taxable_base:3000,earned_income_deduction:700,earned_income_amount:3800,computed_tax:300,basic_deduction:150,pension_deduction:50,insurance_deduction:40,housing_deduction:30,earned_income_credit:20,child_credit:10,donation_credit:5,medical_credit:3,education_credit:2,standard_credit:1,penalty_late_filing:5,penalty_underreporting:0,penalty_late_payment:7};
 for(const [field_code,amount] of Object.entries(values)) store.create('fact',{version_id:v,document_id:d,field_code,jurisdiction:field_code.startsWith('penalty_')?'penalty':'national',basis:'source',amount,page:1});
 store.create('review',{subject_id:s,year:2020,version_id:v,kind:'selection',topic:'version',note:'Explicit basis'});
 expect(Object.fromEntries(store.snapshot().annual[0].comparison_facts.map(f=>[f.field_code,f.amount]))).toEqual(values);
 expect(()=>store.create('fact',{version_id:v,document_id:d,field_code:'unknown_component',jurisdiction:'national',basis:'source',amount:1,page:1})).toThrow();
});
test('body filing classification does not follow correction filename and fact verification never confirms identity',()=>{
 const s=store.create('subject',{alias:'Synthetic late'}).id;
 const d=store.create('document',doc(s,{kind:'correction',label:'Synthetic correction filename',extraction_status:'manual'})).id;
 const v=store.create('version',{subject_id:s,document_id:d,year:2020,kind:'correction',report_class:'late',filing_status:'filed'}).id;
 const f=store.create('fact',{version_id:v,document_id:d,field_code:'salary',jurisdiction:'national',basis:'source',amount:5,page:1});
 expect(f.review_status).toBe('observed');
 const verified=store.create('fact',{version_id:v,document_id:d,field_code:'salary',jurisdiction:'national',basis:'source',amount:5,page:1,supersedes_id:f.id,review_status:'verified'});
 const snap=store.snapshot();
 expect(verified.review_status).toBe('verified');
 expect(snap.subjects[0].identity_status).toBe('unconfirmed');
 expect(snap.documents[0].extraction_status).toBe('manual');
 expect(snap.documents[0].kind).toBe('correction');
 expect(snap.versions[0].report_class).toBe('late');
 expect(snap.versions[0].filing_status).toBe('filed');
 for(const report_class of ['regular','amended']) expect(store.create('version',{subject_id:s,document_id:d,year:2020,kind:'comparison',report_class}).id).toBeGreaterThan(v);
 expect(()=>store.create('fact',{version_id:v,document_id:d,field_code:'salary',jurisdiction:'national',basis:'source',amount:5,page:1,review_status:'identity_confirmed'})).toThrow();
});
test('manual source registration is idempotent and preserves binary revisions and year mismatch',()=>{
 const s=store.create('subject',{alias:'Synthetic A'}).id;
 const a=store.create('document',doc(s)); expect(store.create('document',doc(s)).id).toBe(a.id);
 const b=store.create('document',doc(s,{binary_hash:'c'.repeat(64)})); expect(b.id).not.toBe(a.id);
 expect(store.snapshot().documents).toHaveLength(2); expect(store.snapshot().documents[0].year_mismatch).toBe(true);
 expect(store.snapshot().documents[1].duplicate_candidate).toBe(true);
 expect(safeDriveUrl('synthetic_file',2)).toBe('https://drive.google.com/file/d/synthetic_file/view#page=2');
 expect(()=>safeDriveUrl('javascript:bad')).toThrow();
});
function setup() { const s=store.create('subject',{alias:'Synthetic A'}).id; const d=store.create('document',doc(s)).id; const v=store.create('version',{subject_id:s,year:2020,document_id:d,kind:'original',report_class:'annual'}).id; return {s,d,v}; }
test('versions require matching subject and content year; comparison selection is explicit',()=>{
 const {s,d,v}=setup(); const s2=store.create('subject',{alias:'Synthetic B'}).id;
 expect(()=>store.create('version',{subject_id:s2,year:2020,document_id:d,kind:'original',report_class:'annual'})).toThrow();
 expect(()=>store.create('version',{subject_id:s,year:2021,document_id:d,kind:'original',report_class:'annual'})).toThrow();
 const v2=store.create('version',{subject_id:s,year:2020,document_id:d,kind:'correction',report_class:'annual',predecessor_id:v}).id;
 expect(store.snapshot().annual[0].selected_version_id).toBe(null);
 store.create('review',{subject_id:s,year:2020,version_id:v,kind:'selection',topic:'version',note:'Human selected comparison basis'});
 expect(store.snapshot().annual[0].selected_version_id).toBe(v); expect(v2).not.toBe(v);
});
test('facts preserve null, zero, signed adjustments, jurisdictions, page proof and revision history',()=>{
 const {d,v}=setup();
 const a=store.create('fact',{version_id:v,document_id:d,field_code:'settlement',jurisdiction:'national',basis:'source',amount:null,page:1});
 store.create('fact',{version_id:v,document_id:d,field_code:'settlement',jurisdiction:'national',basis:'source',amount:0,page:2,supersedes_id:a.id});
 store.create('fact',{version_id:v,document_id:d,field_code:'settlement',jurisdiction:'local',basis:'source',amount:-305,page:2});
 store.create('fact',{version_id:v,document_id:d,field_code:'settlement',jurisdiction:'penalty',basis:'calculated',amount:5,page:3});
 expect(store.snapshot().facts.map(x=>x.amount)).toEqual([null,0,-305,5]);
 expect(()=>store.create('fact',{version_id:v,document_id:d,field_code:'income',jurisdiction:'national',basis:'source',amount:0,page:0})).toThrow();
});
test('strict allowlists reject PII, arbitrary source URLs, unsafe text and unknown data',()=>{
 for(const data of [{alias:'Synthetic',password:'no'},{alias:'900101-1234567'},{alias:'account 123456789012'},{alias:'password=abc'},{alias:'x'.repeat(41)}]) expect(()=>store.create('subject',data)).toThrow();
 expect(()=>store.create('subject',{alias:{x:1}})).toThrow();
 const {s}=setup(); expect(()=>store.create('review',{subject_id:s,kind:'user_statement',topic:'other',note:'a'.repeat(241)})).toThrow();
 store.create('review',{subject_id:s,kind:'user_statement',topic:'mortgage',note:'Repayment year unknown'});
 expect(store.snapshot().reviews[0].year).toBe(null);
});
test('settlement candidates never assert paid; confirmed allocations require payment evidence and cannot overallocate across versions or subjects',()=>{
 const {s,d,v}=setup();
 const receipt=store.create('document',doc(s,{drive_id:'synthetic_receipt',kind:'receipt'})).id;
 const payment=store.create('document',doc(s,{drive_id:'synthetic_payment',kind:'payment'})).id;
 const base={version_id:v,transaction_id:1,direction:'payment',amount:900,status:'candidate'};
 const candidate=store.create('link',base); expect(store.snapshot().links[0].status).toBe('candidate');
 expect(store.snapshot().annual[0].payment_status).toBe('unknown');
 expect(()=>store.create('link',{...base,status:'confirmed',evidence_document_id:receipt,evidence_page:1,confirms_id:candidate.id})).toThrow();
 expect(()=>store.create('link',{...base,status:'confirmed',jurisdiction:'local',evidence_document_id:payment,evidence_page:1,confirms_id:candidate.id})).toThrow();
 store.create('link',{...base,status:'confirmed',evidence_document_id:payment,evidence_page:1,confirms_id:candidate.id});
 const v2=store.create('version',{subject_id:s,year:2020,document_id:d,kind:'amendment',report_class:'annual'}).id;
 expect(()=>store.create('link',{...base,version_id:v2,amount:6,status:'confirmed',evidence_document_id:payment,evidence_page:1})).toThrow();
 store.create('link',{...base,version_id:v2,amount:5,status:'confirmed',evidence_document_id:payment,evidence_page:1});
 expect(store.snapshot().links.filter(x=>x.status==='confirmed').map(x=>x.amount)).toEqual([900,5]);
 expect(()=>store.create('link',{...base,version_id:v2,amount:1,status:'confirmed',evidence_document_id:payment,evidence_page:1})).toThrow();
 expect(()=>store.create('link',{version_id:v,payslip_id:999,direction:'refund',amount:5,status:'candidate'})).toThrow();
});
test('payslip allocations use reviewed withholding evidence, preserve signed fact values and never create salary',()=>{
 const {s,v}=setup(); const proof=store.create('document',doc(s,{drive_id:'synthetic_withholding',kind:'withholding'})).id;
 store.create('link',{version_id:v,payslip_id:1,direction:'refund',amount:305,status:'confirmed',evidence_document_id:proof,evidence_page:1});
 expect(db.prepare('SELECT count(*) n FROM salary_statements').get()).toEqual({n:1});
 expect(store.candidates({from:'2023-01-01',to:'2023-12-31',page:1,pageSize:20}).payslips.rows).toHaveLength(1);
});
test('annual comparison exposes selected facts without combining observations; settlement retains a five unit mismatch',()=>{
 const {s,d,v}=setup();
 store.create('fact',{version_id:v,document_id:d,field_code:'settlement',jurisdiction:'national',basis:'source',amount:905,page:1});
 store.create('fact',{version_id:v,document_id:d,field_code:'income',jurisdiction:'national',basis:'source',amount:4300,page:1});
 store.create('review',{subject_id:s,year:2020,version_id:v,kind:'selection',topic:'version',note:'Reviewed basis'});
 const proof=store.create('document',doc(s,{drive_id:'payment_proof',kind:'payment'})).id;
 store.create('link',{version_id:v,transaction_id:1,direction:'payment',amount:900,status:'confirmed',evidence_document_id:proof,evidence_page:1});
 expect(store.snapshot().annual[0].comparison_facts).toHaveLength(2);
 expect(store.snapshot().reconciliation[0].difference).toBe(5);
 expect(store.snapshot().reconciliation[0].status).toBe('mismatch');
});
test('cross-subject source and revision references are rejected; a branching fact revision is not silently selected',()=>{
 const {s,d,v}=setup(); const other=store.create('subject',{alias:'Synthetic B'}).id;
 const od=store.create('document',doc(other,{drive_id:'other_subject'})).id;
 expect(()=>store.create('fact',{version_id:v,document_id:od,field_code:'income',jurisdiction:'national',basis:'source',amount:1,page:1})).toThrow();
 expect(()=>store.create('review',{subject_id:s,kind:'document_finding',topic:'mortgage',note:'Deletion observed',document_id:d})).toThrow();
 const f={version_id:v,document_id:d,field_code:'income',jurisdiction:'national',basis:'source',amount:1,page:1};
 const original=store.create('fact',f); store.create('fact',{...f,supersedes_id:original.id,amount:2});
 expect(()=>store.create('fact',{...f,supersedes_id:original.id,amount:3})).toThrow();
});
test('local and penalty allocations remain separate from national reconciliation',()=>{
 const {s,d,v}=setup(); const proof=store.create('document',doc(s,{drive_id:'local_payment',kind:'payment'})).id;
 store.create('fact',{version_id:v,document_id:d,field_code:'settlement',jurisdiction:'national',basis:'source',amount:905,page:1});
 store.create('fact',{version_id:v,document_id:d,field_code:'settlement',jurisdiction:'local',basis:'source',amount:105,page:1});
 store.create('link',{version_id:v,transaction_id:1,jurisdiction:'local',direction:'payment',amount:100,status:'confirmed',evidence_document_id:proof,evidence_page:1});
 expect(store.snapshot().reconciliation.find(r=>r.scope==='national')?.difference).toBe(905);
 expect(store.snapshot().reconciliation.find(r=>r.scope==='local')?.difference).toBe(5);
});
