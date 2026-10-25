"use client";
import {useState} from 'react';
import type {TaxStore} from '../../lib/tax/store';
import {metrics,seriesFor,chartSegments,type Point} from './dashboard-model';
import {Disclosure} from './TaxDisplay';
type Snapshot=ReturnType<TaxStore['snapshot']>;
const value=(n:number|null,ratio=false,difference=false)=>n===null?'—':`${n.toLocaleString('ko-KR',{maximumFractionDigits:ratio?2:0})}${ratio?(difference?'%p':'%'):'원'}`;
export function axisLabel(n:number,ratio=false){
 if(n===0)return ratio?'0%':'0원';
 const [unit,suffix]=ratio?[1,'%']:Math.abs(n)>=1e12?[1e12,'조원']:Math.abs(n)>=1e8?[1e8,'억원']:Math.abs(n)>=1e4?[1e4,'만원']:[1,'원'];
 return `${(n/unit).toLocaleString('ko-KR',{maximumSignificantDigits:4})}${suffix}`;
}
export function TaxDashboard({data}:{data:Snapshot}){
 const [subject,setSubject]=useState(String(data.subjects[0]?.id??''));
 const [item,setItem]=useState('gross_total'),[basis,setBasis]=useState('source');
 const [choices,setChoices]=useState<Record<string,string>>({});
 const [comparison,setComparison]=useState('');
 const metric=metrics.find(m=>m.id===item)!;const ratio=item.endsWith('_ratio');
 const points=seriesFor(data,subject,item,basis,choices);
 const versions=data.versions.filter(v=>String(v.subject_id)===subject&&v.year===2024);
 const alternative=comparison?seriesFor(data,subject,item,basis,{...choices,'2024':comparison})[4]:null;
 const all=[...points,...alternative?[alternative]:[]].flatMap(p=>p.amount===null?[]:[p.amount]);
 const low=Math.min(0,...all),high=Math.max(0,...all),span=high-low||1;
 const x=(year:number)=>112+(year-2020)*83;
 const y=(n:number)=>170-(n-low)/span*140;
 const path=(segment:Point[])=>segment.map(p=>`${x(p.year)},${y(p.amount!)}`).join(' ');
 const selected=points[4];
 return <section className="tax-dashboard rounded-xl border bg-white p-4" data-testid="item-dashboard">
 <div className="tax-dash-title"><div><h2 className="text-lg font-semibold">연도별 비교</h2><p className="text-xs text-slate-500">2020–2025 · 항목별 연간 추이</p></div><span className="text-xs text-amber-800">신원 {data.subjects.find(s=>String(s.id)===subject)?.identity_status==='confirmed'?'사람이 확인함':'미확인'} · 납부 미확인</span></div>
 <div className="tax-dash-controls"><label>비교 대상<select value={subject} onChange={e=>{setSubject(e.target.value);setChoices({});setComparison('');}}>{data.subjects.map(s=><option key={s.id} value={s.id}>{String(s.alias??s.id)}</option>)}</select></label><label>비교 항목<select aria-label="비교 항목" value={item} onChange={e=>setItem(e.target.value)}>{['소득','결정세액','계산 비율','소득공제','세액공제'].map(group=><optgroup label={group} key={group}>{metrics.filter(m=>m.group===group).map(m=><option key={m.id} value={m.id}>{m.label}</option>)}</optgroup>)}</select></label><label>관측 근거<select aria-label="관측 근거" value={basis} onChange={e=>setBasis(e.target.value)}><option value="source">원문 관측</option><option value="calculated">계산값 관측</option></select></label></div>
 <h3 className="font-semibold mt-3">{metric.label} <span className="text-xs font-normal text-slate-500">{metric.group} · {metric.scope==='local'?'지방세':'국세'} · {basis==='source'?'원문':'계산값'}</span></h3>
 <p className="text-xs text-slate-500">{ratio?'단위 % · 계산: 동일 버전·근거의 결정세액 ÷ 국세 총급여 × 100':'단위 원 · 축은 금액별 원/만원/억원/조원 (유효숫자 4자리)'} · 0 기준선 · ● 선택 버전 · ◇ 2024 비교 · 결측은 연결하지 않음</p>
 <svg className="tax-trend" viewBox="0 0 580 205" role="img" aria-label={`${metric.label} 2020년부터 2025년 추이. 상세 수치는 아래 연도별 목록`}>
 {[low,high].filter((n,i,a)=>a.indexOf(n)===i).map(n=><g key={n}><line x1="112" x2="527" y1={y(n)} y2={y(n)} stroke="#e2e8f0"/><text x="103" textAnchor="end" y={y(n)+4}>{axisLabel(n,ratio)}</text></g>)}
 <line data-zero-baseline x1="112" x2="527" y1={y(0)} y2={y(0)} stroke="#64748b"/>
 {chartSegments(points).map((s,i)=><polyline key={i} points={path(s)} fill="none" stroke="#2563eb" strokeWidth="3"/>)}
 {points.map(p=><g key={p.year}>{p.amount!==null&&<circle cx={x(p.year)} cy={y(p.amount)} r="4" fill="#2563eb"><title>{`${p.year}: ${value(p.amount,ratio)} · #${p.versionId}`}</title></circle>}<text x={x(p.year)} y="196" textAnchor="middle">{p.year}</text></g>)}
 {alternative?.amount!==null&&alternative&&<path d={`M ${x(2024)} ${y(alternative.amount!)-6} l 6 6 l -6 6 l -6 -6 Z`} fill="#b45309"><title>{`2024 비교 #${alternative.versionId}: ${value(alternative.amount,ratio)}`}</title></path>}
 </svg>
 <div className="tax-year-figures" aria-label="연도별 상세 수치">{points.map(p=><div data-year-point={p.year} key={p.year}><strong>{p.year}</strong><span>{value(p.amount,ratio)}</span><small>{p.amount===null?p.reason:`#${p.versionId} · ${basis==='source'?'원문':'계산값'}`}</small><small>{ratio?'전년 비율 대비': '전년 대비'} {p.yoy===null?'—':`${p.yoy.toFixed(1)}%`}</small></div>)}</div>
 <p className="text-xs text-slate-500 mt-2">증감률은 같은 항목·세목·근거의 직전 달력연도 대비 계산값. 결측·직전값 0은 산출 안 함. 비율은 표시용 계산값이며 최종 납부율·절세액이 아닙니다. 소득공제와 세액공제는 합산하지 않습니다.</p>
 <Disclosure label="연도별 열람 버전 · 화면에서만 변경 (저장 안 함)"><div className="tax-dash-controls">{points.map(p=><label key={p.year}>{p.year} 열람 버전<select aria-label={`${p.year} 열람 버전`} value={p.versionId??''} onChange={e=>setChoices({...choices,[p.year]:e.target.value})}><option value="">미선택</option>{data.versions.filter(v=>String(v.subject_id)===subject&&v.year===p.year).map(v=><option key={v.id} value={v.id}>#{v.id} {String(v.kind)} · {String(v.report_class)}</option>)}</select></label>)}</div><label>2024 비교 버전<select aria-label="2024 비교 버전" value={comparison} onChange={e=>setComparison(e.target.value)}><option value="">비교 안 함</option>{versions.map(v=><option key={v.id} value={v.id}>#{v.id} {String(v.kind)}</option>)}</select></label>{alternative&&<p data-testid="version-difference">2024 선택 #{selected.versionId??'미선택'} {value(selected.amount,ratio)} / 비교 #{alternative.versionId} {value(alternative.amount,ratio)} · 차이 (비교 − 선택) {value(selected.amount===null||alternative.amount===null?null:alternative.amount-selected.amount,ratio,true)}</p>}<p className="text-xs">원문·후속 버전을 각각 열람합니다. 자동 최종본 추정 없음 · 기존 저장 비교 기준 불변 · 접수증·기납부·실제 납부는 결정세액과 혼합하지 않습니다.</p></Disclosure>
 <Disclosure label="항목별 연도 비교표 (보조)"><div className="tax-table-scroll"><table><caption>현재 열람 버전 · {basis==='source'?'원문':'계산값'} · 원 (비율은 %)</caption><thead><tr><th>항목 / 구분</th>{points.map(p=><th key={p.year}>{p.year} #{p.versionId??'—'}</th>)}</tr></thead><tbody>{metrics.map(m=><tr key={m.id}><th>{m.label}<small className="block">{m.group}</small></th>{seriesFor(data,subject,m.id,basis,choices).map(p=><td key={p.year}>{value(p.amount,m.id.endsWith('_ratio'))}</td>)}</tr>)}</tbody></table></div></Disclosure>
 </section>;
}
