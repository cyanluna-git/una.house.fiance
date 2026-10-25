import {chromium,expect} from '@playwright/test';
import {createHash} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import isolated from '../tests/fixtures/isolated-env';
const base=isolated.isolatedBaseURL();
const browser=await chromium.launch();const context=await browser.newContext();
await context.addCookies([{name:'unahouse_auth',value:createHash('sha256').update(process.env.UNAHOUSE_ACCESS_KEY_BASE64!).digest('hex'),domain:'127.0.0.1',path:'/'}]);
const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
try{
 const post=async(kind:string,data:any)=>{const r=await context.request.post(base+'/api/tax',{data:{kind,data}});expect(r.status(),await r.text()).toBe(201);return(await r.json()).id;};
 let snapshot=await(await context.request.get(base+'/api/tax')).json();
 if(!snapshot.subjects.length){
  const sid=await post('subject',{alias:'합성 연간 비교 대상'});const docs:number[]=[],versions:number[]=[];
  for(let i=0;i<10;i++)docs.push(await post('document',{subject_id:sid,drive_id:'synthetic_dashboard_'+i,revision:'r1',binary_hash:'b'.repeat(64),label:'합성 근거 문서 '+i,filename_year:2020+Math.min(i,5),content_year:i<6?2020+i:2024,kind:i===9?'receipt':'return'}));
  for(let i=0;i<9;i++)versions.push(await post('version',{subject_id:sid,year:i<6?2020+i:2024,document_id:docs[i],kind:i<6?'original':'comparison',report_class:i===6?'late':'regular',...(i>=6?{predecessor_id:versions[4]}:{})}));
  const fields=['gross_total','salary','bonus','assessed','assessed','housing_deduction','credit_card_deduction','insurance_deduction','child_credit','protection_insurance_credit','donation_credit','health_insurance_deduction','employment_insurance_deduction','general_nonreligious_donation_credit','religious_donation_credit','special_donation_credit','political_donation_credit_under_limit','political_donation_credit_over_limit','hometown_donation_credit_under_limit','withheld','settlement','receipt_payment_due','gross_total','assessed','computed_tax','taxable_base','earned_income_deduction'];
  for(let vi=0;vi<9;vi++){const year=vi<6?2020+vi:2024;const k=year-2020;for(let slot=0;slot<27;slot++){
   let code=fields[slot];if(vi===2&&slot===1)code='earned_income_amount';
   let amount:number|null=slot===0?48000000+k*6000000:slot===1?42000000+k*5000000:slot===2?6000000+k*1000000:slot===3?2400000+k*420000+(vi===6?5:vi===7?300:vi===8?-250:0):slot===4?240000+k*42000:slot===19?3200000+k*400000:slot===20?-735:slot===21?999999:slot===22?49000000+k*6000000:slot===23?2300000+k*420000:100000+slot*11000+k*37000;
   if(slot===5&&vi===1)amount=null;if(slot===8&&vi===0)amount=0;if(slot===10&&vi===3)amount=-500;
   await post('fact',{version_id:versions[vi],document_id:docs[vi],field_code:code,jurisdiction:slot===4?'local':'national',basis:slot===22||slot===23?'calculated':'source',review_status:slot%2?'observed':'verified',amount,page:1+slot%3});
  }}
  for(let i=0;i<4;i++)await post('fact',{version_id:versions[i],document_id:docs[i],field_code:i===3?'bonus':'mortgage',jurisdiction:'national',basis:'source',review_status:'observed',amount:900000+i,page:2});
  for(let i=0;i<6;i++)await post('review',{subject_id:sid,year:2020+i,version_id:versions[i],kind:'selection',topic:'version',note:'합성 연도별 명시적 기준 '+i});
  for(let i=0;i<11;i++)await post('review',{subject_id:sid,year:2024,version_id:versions[4],kind:'review_event',topic:'version',note:i===0?'합성 원문과 후속 결정세액 5원 차이. 최종본 미확인.':'합성 개별 검토 '+i});
  snapshot=await(await context.request.get(base+'/api/tax')).json();
 }
 expect(snapshot.facts).toHaveLength(247);expect(snapshot.reviews).toHaveLength(17);expect(snapshot.versions).toHaveLength(9);expect(snapshot.documents).toHaveLength(10);expect(snapshot.links).toHaveLength(0);expect(snapshot.subjects[0].identity_status).toBe('unconfirmed');
 await page.goto(base+'/tax');const dashboard=page.getByTestId('item-dashboard');await expect(dashboard).toBeVisible();
 const postRequests:string[]=[];page.on('request',r=>{if(r.method()==='POST')postRequests.push(r.url());});
 for(const width of [360,390,430,1440]){
  await page.setViewportSize({width,height:844});await page.reload();await expect(dashboard).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  const graph=dashboard.locator('svg');const box=(await graph.boundingBox())!;expect(box.y+box.height).toBeLessThan(844);expect(box.width).toBeGreaterThan(250);
  await expect(page.locator('[data-fact-id]')).toHaveCount(0);await expect(dashboard.locator('[data-year-point]')).toHaveCount(6);
  await page.screenshot({path:`artifacts/dashboard-${width}-firstscreen.png`});
  await page.getByLabel('비교 항목',{exact:true}).selectOption('housing_deduction');await expect(dashboard.locator('[data-year-point="2021"]')).toContainText('미확인');
  expect(await graph.locator('polyline').count()).toBe(2);
  await page.screenshot({path:`artifacts/dashboard-${width}-itemcomparison.png`});
  await page.getByLabel('비교 항목',{exact:true}).selectOption('salary');await expect(dashboard.locator('[data-year-point="2022"]')).toContainText('관측 없음');expect(await graph.locator('polyline').count()).toBe(2);
  await page.getByLabel('비교 항목',{exact:true}).selectOption('bonus');await expect(dashboard.locator('[data-year-point="2023"]')).toContainText('복수 관측');
  await page.getByLabel('비교 항목',{exact:true}).selectOption('child_credit');await expect(dashboard.locator('[data-year-point="2020"]')).toContainText('0원');
  await page.getByLabel('비교 항목',{exact:true}).selectOption('donation_credit');await expect(dashboard.locator('[data-year-point="2023"]')).toContainText('-500원');
  await page.getByLabel('비교 항목',{exact:true}).selectOption('national_ratio');await expect(dashboard.locator('[data-year-point="2020"]')).toContainText('5%');
  await page.getByLabel('관측 근거',{exact:true}).selectOption('calculated');await expect(dashboard.locator('[data-year-point="2020"]')).toContainText('4.69%');
  await page.getByLabel('관측 근거',{exact:true}).selectOption('source');await page.getByLabel('비교 항목',{exact:true}).selectOption('assessed');
  await page.getByText('연도별 열람 버전 · 화면에서만 변경 (저장 안 함)',{exact:true}).click();
  const original=snapshot.versions.find((v:any)=>v.year===2024&&v.kind==='original'),later=snapshot.versions.find((v:any)=>v.year===2024&&v.report_class==='late');
  await page.getByLabel('2024 비교 버전',{exact:true}).selectOption(String(later.id));await expect(page.getByTestId('version-difference')).toContainText('5원');
  await page.getByLabel('2024 열람 버전',{exact:true}).selectOption(String(later.id));await page.getByLabel('2024 비교 버전',{exact:true}).selectOption(String(original.id));await expect(page.getByTestId('version-difference')).toContainText('-5원');
  await page.getByTestId('version-difference').scrollIntoViewIfNeeded();await page.screenshot({path:`artifacts/dashboard-${width}-2024switch.png`});
  await page.getByText('항목별 연도 비교표 (보조)',{exact:true}).click();await expect(dashboard.locator('table')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 }
 expect(postRequests).toEqual([]);
 const unchanged=await(await context.request.get(base+'/api/tax')).json();expect(unchanged.annual).toEqual(snapshot.annual);expect(unchanged.reviews).toEqual(snapshot.reviews);
 await page.reload();await expect(dashboard).toBeVisible();await page.getByText('원문 항목·등록·대사 상세 (247개 관측)',{exact:true}).click();
 const picker=page.getByLabel('열람 버전 (비교 기준 변경 아님)');const seen=new Set<string>();
 for(const version of snapshot.versions){await picker.selectOption(String(version.id));for(const group of ['소득','공제','세금']){const summary=page.locator('summary').filter({hasText:new RegExp('^'+group+' \\(')});await summary.click();const groupRows=summary.locator('..').locator('[data-fact-id]');const expectedCount=snapshot.facts.filter((f:any)=>f.version_id===version.id&&(/deduction|credit|mortgage|child|donation/.test(String(f.field_code))?'공제':/salary|bonus|gross|income|taxable_base/.test(String(f.field_code))?'소득':'세금')===group).length;await expect(groupRows).toHaveCount(expectedCount);for(const id of await groupRows.evaluateAll(es=>es.map(e=>e.getAttribute('data-fact-id')!)))seen.add(id);if(await groupRows.count()){await groupRows.first().getByText('근거 보기',{exact:true}).click();await expect(groupRows.first().locator('a')).toHaveAttribute('href',/#page=\d+/);}expect((await summary.boundingBox())!.height).toBeGreaterThanOrEqual(44);await summary.click();}}
 expect(seen.size).toBe(247);
 const reviews=page.getByText('검토 이력 (17)',{exact:true});await reviews.focus();await page.keyboard.press('Enter');const reviewRows=reviews.locator('..').locator('li');await expect(reviewRows).toHaveCount(17);for(const [i,row]of snapshot.reviews.entries()){await expect(reviewRows.nth(i)).toContainText(String(row.note));await reviewRows.nth(i).scrollIntoViewIfNeeded();await expect(reviewRows.nth(i)).toBeVisible();}
 await page.setViewportSize({width:390,height:844});await page.getByText('부분 배분 후보 등록 / 사람이 증거 확인 후 확정',{exact:true}).click();const last=page.getByRole('button',{name:'연결 이력 추가',exact:true});await last.scrollIntoViewIfNeeded();const b=(await last.boundingBox())!,nav=(await page.locator('nav').last().boundingBox())!;expect(b.y+b.height).toBeLessThanOrEqual(nav.y);
 expect(errors).toEqual([]);writeFileSync('artifacts/dashboard-result.json',JSON.stringify({errors,counts:{facts:seen.size,reviews:17,versions:9},postRequests,viewports:[360,390,430,1440],checks:['firstscreen trend','item comparison','missing intervals','negative and zero','same-basis ratios','2024 local switches ±5 won','annual unchanged','247 individually reachable facts and source pages','17 individually accessible reviews','fixed nav clearance']},null,2));
 console.log('PASS dashboard four viewports, firstscreen charts, gaps/null/zero/negative/ambiguous, ratios, 2024 local version ±5won without POST, unchanged annual, 247 facts/source pages, 17 reviews, fixed nav clearance');
}finally{await browser.close();}
