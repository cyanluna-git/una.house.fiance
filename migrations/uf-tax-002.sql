PRAGMA foreign_keys = OFF;
BEGIN IMMEDIATE;
CREATE TABLE tax_facts_new (
 id INTEGER PRIMARY KEY, version_id INTEGER NOT NULL REFERENCES tax_versions(id), document_id INTEGER NOT NULL REFERENCES tax_documents(id),
 field_code TEXT NOT NULL CHECK(field_code IN ('salary','bonus','gross_total','taxable_base','earned_income_deduction','earned_income_amount','computed_tax','basic_deduction','pension_deduction','insurance_deduction','housing_deduction','earned_income_credit','child_credit','donation_credit','medical_credit','education_credit','standard_credit','penalty_late_filing','penalty_underreporting','penalty_late_payment','income','deduction','credit','assessed','withheld','settlement','mortgage','child','donation','assessed_including_penalties','credit_card_deduction','dependent_basic_deduction','disabled_additional_deduction','employment_insurance_deduction','general_nonreligious_donation_credit','health_insurance_deduction','hometown_donation_credit_under_limit','penalty_total','political_donation_credit_over_limit','political_donation_credit_under_limit','protection_insurance_credit','receipt_payment_due','religious_donation_credit','retirement_pension_credit','self_basic_deduction','senior_additional_deduction','special_donation_credit','spouse_basic_deduction')),
 jurisdiction TEXT NOT NULL CHECK(jurisdiction IN ('national','local','penalty')),
 basis TEXT NOT NULL CHECK(basis IN ('source','calculated')), amount INTEGER CHECK(amount IS NULL OR typeof(amount)='integer'),
 page INTEGER NOT NULL CHECK(page>0), review_status TEXT NOT NULL DEFAULT 'observed' CHECK(review_status IN ('observed','verified')), supersedes_id INTEGER UNIQUE REFERENCES tax_facts(id)
);
INSERT INTO tax_facts_new (id,version_id,document_id,field_code,jurisdiction,basis,amount,page,review_status,supersedes_id) SELECT id,version_id,document_id,field_code,jurisdiction,basis,amount,page,review_status,supersedes_id FROM tax_facts;
DROP TABLE tax_facts;
ALTER TABLE tax_facts_new RENAME TO tax_facts;
COMMIT;
