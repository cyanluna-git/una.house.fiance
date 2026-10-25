import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';

test('manual UI offers explicit wage/base/components, body classifications and independent fact review',()=>{
 const html=readFileSync('src/app/tax/page.tsx','utf8')+readFileSync('src/lib/tax/taxonomy.ts','utf8');
 for(const code of ['salary','bonus','gross_total','taxable_base','earned_income_deduction','earned_income_amount','computed_tax','basic_deduction','pension_deduction','insurance_deduction','housing_deduction','earned_income_credit','child_credit','donation_credit','medical_credit','education_credit','standard_credit','penalty_late_filing','penalty_underreporting','penalty_late_payment','assessed','withheld','settlement','regular','late','amended','observed','verified']) expect(html).toMatch(new RegExp(`\\b${code}:`));
 expect(html).toContain('원문 신고 분류');
 expect(html).toContain('관측 검토 상태');
});

test('identity and bounded historical candidate controls are explicit',()=>{
 const html=readFileSync('src/app/tax/page.tsx','utf8')+readFileSync('src/lib/tax/taxonomy.ts','utf8');
 for(const text of ['신원 검토 저장','family_member_id','identity_status','조회 시작일','조회 종료일','이전 페이지','다음 페이지','view=candidates','마스킹']) expect(html).toContain(text);
 expect(html).not.toContain('최근 200건');
});
