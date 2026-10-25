import {test,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {factLabels} from '../../src/lib/tax/taxonomy';

test('all admitted financial subtypes have a human-readable label',()=>{
 const sql=readFileSync('migrations/uf-tax-002.sql','utf8');
 const codes=sql.match(/field_code IN \(([^)]+)\)/)![1].split(',').map(s=>s.trim().slice(1,-1));
 expect(Object.keys(factLabels).sort()).toEqual(codes.sort());
 expect(factLabels.retirement_pension_credit).not.toBe(factLabels.pension_deduction);
 expect(sql).not.toContain('rural_special');
});
