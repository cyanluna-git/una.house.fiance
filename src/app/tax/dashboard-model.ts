import type {TaxStore} from '../../lib/tax/store';
type Snapshot=ReturnType<TaxStore['snapshot']>;
export const years=[2020,2021,2022,2023,2024,2025];
export const metrics=[
 {id:'gross_total',label:'총급여',scope:'national',group:'소득'},
 {id:'salary',label:'급여',scope:'national',group:'소득'},
 {id:'bonus',label:'상여',scope:'national',group:'소득'},
 {id:'assessed',label:'국세 결정세액',scope:'national',group:'결정세액'},
 {id:'local_assessed',label:'지방세 결정세액',scope:'local',group:'결정세액'},
 {id:'national_ratio',label:'국세 결정세액 / 총급여',scope:'national',group:'계산 비율'},
 {id:'local_ratio',label:'지방세 결정세액 / 총급여',scope:'local',group:'계산 비율'},
 {id:'housing_deduction',label:'주택 소득공제',scope:'national',group:'소득공제'},
 {id:'credit_card_deduction',label:'신용카드 등 사용액 공제',scope:'national',group:'소득공제'},
 {id:'insurance_deduction',label:'보험료 소득공제',scope:'national',group:'소득공제'},
 {id:'health_insurance_deduction',label:'건강보험료 소득공제',scope:'national',group:'소득공제'},
 {id:'employment_insurance_deduction',label:'고용보험료 소득공제',scope:'national',group:'소득공제'},
 {id:'child_credit',label:'자녀 세액공제',scope:'national',group:'세액공제'},
 {id:'protection_insurance_credit',label:'보장성보험료 세액공제',scope:'national',group:'세액공제'},
 {id:'donation_credit',label:'기부금 세액공제',scope:'national',group:'세액공제'},
 {id:'general_nonreligious_donation_credit',label:'일반 기부금 종교단체 외 세액공제',scope:'national',group:'세액공제'},
 {id:'religious_donation_credit',label:'종교단체 기부금 세액공제',scope:'national',group:'세액공제'},
 {id:'special_donation_credit',label:'특례 기부금 세액공제',scope:'national',group:'세액공제'},
 {id:'political_donation_credit_under_limit',label:'정치자금 10만원 이하 세액공제',scope:'national',group:'세액공제'},
 {id:'political_donation_credit_over_limit',label:'정치자금 10만원 초과 세액공제',scope:'national',group:'세액공제'},
 {id:'hometown_donation_credit_under_limit',label:'고향사랑 10만원 이하 세액공제',scope:'national',group:'세액공제'},
];
export type Point={year:number;versionId:number|null;amount:number|null;yoy:number|null;reason:string;factIds:number[]};
export function seriesFor(data:Snapshot,subject:string,item:string,basis:string,choices:Record<string,string>):Point[]{
 const metric=metrics.find(m=>m.id===item)!;
 const ratio=item.endsWith('_ratio');
 const code=ratio?'assessed':item==='local_assessed'?'assessed':item;
 const points:Point[]=years.map(year=>{
  const versions=data.versions.filter(v=>String(v.subject_id)===subject&&v.year===year);
  const selected=choices[String(year)]??String(data.annual.find(a=>String(a.subject_id)===subject&&a.year===year)?.selected_version_id??'');
  const version=versions.find(v=>String(v.id)===selected);
  if(!version)return {year,versionId:null,amount:null,yoy:null,reason:'버전 미선택',factIds:[]};
  const active=data.facts.filter(f=>f.version_id===version.id&&!data.facts.some(n=>n.supersedes_id===f.id));
  const facts=active.filter(f=>f.field_code===code&&f.jurisdiction===metric.scope&&f.basis===basis);
  const gross=ratio?active.filter(f=>f.field_code==='gross_total'&&f.jurisdiction==='national'&&f.basis===basis):[];
  let reason=facts.length>1||gross.length>1?'복수 관측 · 선택 안 함':!facts.length||ratio&&!gross.length?'관측 없음':facts[0].amount===null||ratio&&gross[0].amount===null?'미확인':ratio&&gross[0].amount===0?'총급여 0 · 비율 없음':'';
  const amount=reason?null:ratio?Number(facts[0].amount)/Number(gross[0].amount)*100:Number(facts[0].amount);
  if(amount!==null&&!Number.isFinite(amount))reason='유효한 수치 없음';
  return {year,versionId:Number(version.id),amount:reason?null:amount,yoy:null,reason,factIds:[...facts,...gross].map(f=>Number(f.id))};
 });
 return points.map((p,i)=>({...p,yoy:i&&p.amount!==null&&points[i-1].amount!==null&&points[i-1].amount!==0?(p.amount-points[i-1].amount!)/points[i-1].amount!*100:null}));
}
export function chartSegments(points:Point[]):Point[][]{
 const segments:Point[][]=[];let current:Point[]=[];
 for(const point of points){if(point.amount===null){if(current.length)segments.push(current);current=[];}else current.push(point);}
 if(current.length)segments.push(current);
 return segments;
}
