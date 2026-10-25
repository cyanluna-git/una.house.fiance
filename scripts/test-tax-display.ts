import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import assert from 'node:assert/strict';
const test=(_name:string,run:()=>void)=>run();
import {AnnualDisplay} from '../src/app/tax/TaxDisplay';

(globalThis as any).React=React;
test('unique summary preserves amounts and distinguishes source from calculated basis',()=>{
 const facts=[['gross_total','national','source',1234567890123],['assessed','national','calculated',0],['assessed','local','source',null],['settlement','national','calculated',-735]].map(([field_code,jurisdiction,basis,amount],id)=>({id,field_code,jurisdiction,basis,amount}));
 const data={annual:[{subject_id:1,year:2019,selected_version_id:1,comparison_facts:facts}],subjects:[{id:1,alias:'synthetic'}],versions:[],documents:[]} as any;
 const html=renderToStaticMarkup(React.createElement(AnnualDisplay,{data,subject:"",year:""}));
 for(const text of ['1,234,567,890,123원','0원','미확인','-735원','원문 관측','계산값'])assert.ok(html.includes(text),text);
 assert.ok(!html.includes('정산액: 국세 원문 관측'));
});
