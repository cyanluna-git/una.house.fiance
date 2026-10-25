import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const mod=require('../src/app/tax/dashboard-model');
assert.equal(typeof mod.seriesFor,'function','dashboard presentation series must exist');
const data:any={subjects:[{id:1}],versions:[{id:1,subject_id:1,year:2020},{id:2,subject_id:1,year:2021},{id:3,subject_id:1,year:2022}],annual:[{subject_id:1,year:2020,selected_version_id:1},{subject_id:1,year:2021,selected_version_id:2},{subject_id:1,year:2022,selected_version_id:3}],facts:[{id:1,version_id:1,field_code:'gross_total',jurisdiction:'national',basis:'source',amount:100},{id:2,version_id:2,field_code:'gross_total',jurisdiction:'national',basis:'source',amount:120}]};
const points=mod.seriesFor(data,'1','gross_total','source',{});
assert.deepEqual(points.map((p:any)=>p.amount),[100,120,null,null,null,null]);
assert.equal(points[1].yoy,20);
assert.equal(points[2].yoy,null);
console.log('PASS dashboard annual presentation, exact preceding calendar year, missing gaps');
const React=require('react');(globalThis as any).React=React;
const {renderToStaticMarkup}=require('react-dom/server');
const ui=require('../src/app/tax/TaxDashboard');
const html=renderToStaticMarkup(React.createElement(ui.TaxDashboard,{data}));
for(const text of ['연도별 비교','항목별 연간 추이','비교 항목','2025','신원 미확인','결측은 연결하지 않음','연도별 상세 수치','화면에서만 변경'])assert.ok(html.includes(text),text);
assert.ok(html.includes('<svg'));
console.log('PASS dashboard first-screen graph, item selector, six years, local version controls');
const fs=require('node:fs');const pageSource=fs.readFileSync(new URL('../src/app/tax/page.tsx',import.meta.url),'utf8');
assert.ok(pageSource.includes('<TaxDashboard data={data}/>'),'dashboard must precede collapsed originals');
// Exercise guarded presentation contracts independently of the store.
const fixture=structuredClone(data);
fixture.facts.push({id:3,version_id:2,field_code:'assessed',jurisdiction:'national',basis:'source',amount:12});
assert.equal(mod.seriesFor(fixture,'1','national_ratio','source',{})[1].amount,10);
fixture.facts.push({id:4,version_id:2,field_code:'assessed',jurisdiction:'national',basis:'calculated',amount:99});
assert.equal(mod.seriesFor(fixture,'1','national_ratio','calculated',{})[1].amount,null,'no cross-basis gross denominator');
fixture.facts.push({id:5,version_id:2,field_code:'assessed',jurisdiction:'national',basis:'source',amount:13});
assert.equal(mod.seriesFor(fixture,'1','assessed','source',{})[1].amount,null,'ambiguous observations are gaps');
fixture.facts.at(-1).supersedes_id=3;
assert.equal(mod.seriesFor(fixture,'1','assessed','source',{})[1].amount,13,'superseded original excluded');
fixture.facts[0].amount=0;
assert.equal(mod.seriesFor(fixture,'1','gross_total','source',{})[1].yoy,null,'zero previous denominator');
fixture.facts[0].amount=null;
assert.equal(mod.seriesFor(fixture,'1','gross_total','source',{})[0].amount,null);
assert.equal(mod.seriesFor(fixture,'1','gross_total','source',{'2021':''})[1].amount,null,'explicit deselection stays missing');
fixture.facts[0].amount=-100;
assert.equal(mod.seriesFor(fixture,'1','gross_total','source',{})[0].amount,-100,'negative is not zero');
assert.deepEqual(mod.chartSegments([{year:2020,amount:1},{year:2021,amount:null},{year:2022,amount:2}]).map((s:any)=>s.map((p:any)=>p.year)),[[2020],[2022]]);
const skipped=structuredClone(data);skipped.annual[1].selected_version_id=null;
assert.equal(mod.seriesFor(skipped,'1','gross_total','source',{})[1].amount,null,'never infer sole version');
console.log('PASS ratios same basis/version/jurisdiction, ambiguity, supersession, negative, zero, null, no joined gaps, no inferred selection');
assert.ok(fs.readFileSync(new URL('../src/app/tax/tax.css',import.meta.url),'utf8').includes('font-size:18px'),'SVG labels remain readable on mobile scale');
const svgLabels=(amounts:number[])=>{
 const sample=structuredClone(data);
 sample.facts.forEach((f:any,i:number)=>f.amount=amounts[i]);
 const markup=renderToStaticMarkup(React.createElement(ui.TaxDashboard,{data:sample}));
 return [...markup.match(/<svg[\s\S]*?<\/svg>/)![0].matchAll(/<text\b[^>]*>(.*?)<\/text>/g)].map(m=>m[1]).filter(t=>!/^202\d$/.test(t));
};
for(const [amounts,expected] of [
 [[-500,120000],['-500원','12만원']],
 [[100,4999],['0원','4,999원']],
 [[0,0],['0원']],
 [[-4999,-500],['-4,999원','0원']],
 [[100000000,1200000000000],['0원','1.2조원']],
] as [number[],string[]][]){
 assert.deepEqual(svgLabels(amounts),expected,`explicit readable nonzero SVG endpoints: ${amounts}`);
}
console.log('PASS adaptive SVG endpoint labels: mixed signs, sub-5000, zero, negative, large');

// Render the real component with local selector state, without a browser or store.
const renderSelection=(sample:any,item:string,comparison="")=>{
 const original=React.useState;let index=0;
 React.useState=()=>original(index<5?["1",item,"source",{},comparison][index++]:true);
 try{return renderToStaticMarkup(React.createElement(ui.TaxDashboard,{data:sample}));}finally{React.useState=original;}
};
const ratioSample=structuredClone(data);
ratioSample.versions=[{id:4,subject_id:1,year:2024},{id:5,subject_id:1,year:2024}];
ratioSample.annual=[{subject_id:1,year:2024,selected_version_id:4}];
ratioSample.facts=[4,5].flatMap((id,i)=>[{id:id*2,version_id:id,field_code:'gross_total',jurisdiction:'national',basis:'source',amount:10000},{id:id*2+1,version_id:id,field_code:'assessed',jurisdiction:'national',basis:'source',amount:500+i*100}]);
const ratioMarkup=renderSelection(ratioSample,'national_ratio','5');
assert.match(ratioMarkup,/차이 \(비교 − 선택\) 1%p/,'6% minus 5% is 1 percentage point, not relative percent');
assert.match(ratioMarkup,/>6%<\/text>/,'ratio SVG endpoint includes explicit percent unit');
ratioSample.facts[1].amount=0.0001;ratioSample.facts[3].amount=0.0002;
const tinyRatio=renderSelection(ratioSample,'national_ratio','5');
assert.match(tinyRatio,/>0.000002%<\/text>/,'tiny nonzero ratio endpoint must not collapse to zero');
console.log('PASS rendered ratio difference percentage points and precise ratio SVG endpoints');
