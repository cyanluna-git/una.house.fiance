PRAGMA foreign_keys = ON;
BEGIN IMMEDIATE;
CREATE TABLE IF NOT EXISTS tax_subjects (
 id INTEGER PRIMARY KEY, alias TEXT NOT NULL CHECK(length(alias) BETWEEN 1 AND 40),
 family_member_id INTEGER REFERENCES family_members(id), identity_status TEXT NOT NULL DEFAULT 'unconfirmed' CHECK(identity_status IN ('unconfirmed','confirmed'))
);
CREATE TABLE IF NOT EXISTS tax_documents (
 id INTEGER PRIMARY KEY, subject_id INTEGER NOT NULL REFERENCES tax_subjects(id), drive_id TEXT NOT NULL,
 revision TEXT NOT NULL, binary_hash TEXT NOT NULL, text_hash TEXT,
 label TEXT NOT NULL, filename_year INTEGER, content_year INTEGER CHECK(content_year BETWEEN 1900 AND 2200),
 kind TEXT NOT NULL CHECK(kind IN ('return','correction','receipt','payment','withholding','other')),
 extraction_status TEXT NOT NULL DEFAULT 'manual' CHECK(extraction_status IN ('manual','pending','reviewed','failed')),
 UNIQUE(drive_id,revision,binary_hash), UNIQUE(id,subject_id)
);
CREATE TABLE IF NOT EXISTS tax_versions (
 id INTEGER PRIMARY KEY, subject_id INTEGER NOT NULL REFERENCES tax_subjects(id), year INTEGER NOT NULL CHECK(year BETWEEN 1900 AND 2200),
 document_id INTEGER NOT NULL, kind TEXT NOT NULL CHECK(kind IN ('original','amendment','correction','comparison')),
 report_class TEXT NOT NULL CHECK(report_class IN ('regular','late','amended','annual','withholding','other')),
 filing_status TEXT NOT NULL DEFAULT 'unknown' CHECK(filing_status IN ('unknown','draft','filed')),
 predecessor_id INTEGER REFERENCES tax_versions(id), UNIQUE(id,subject_id,year),
 FOREIGN KEY(document_id,subject_id) REFERENCES tax_documents(id,subject_id)
);
CREATE TABLE IF NOT EXISTS tax_facts (
 id INTEGER PRIMARY KEY, version_id INTEGER NOT NULL REFERENCES tax_versions(id), document_id INTEGER NOT NULL REFERENCES tax_documents(id),
 field_code TEXT NOT NULL CHECK(field_code IN ('salary','bonus','gross_total','taxable_base','earned_income_deduction','earned_income_amount','computed_tax','basic_deduction','pension_deduction','insurance_deduction','housing_deduction','earned_income_credit','child_credit','donation_credit','medical_credit','education_credit','standard_credit','penalty_late_filing','penalty_underreporting','penalty_late_payment','income','deduction','credit','assessed','withheld','settlement','mortgage','child','donation')),
 jurisdiction TEXT NOT NULL CHECK(jurisdiction IN ('national','local','penalty')),
 basis TEXT NOT NULL CHECK(basis IN ('source','calculated')), amount INTEGER CHECK(amount IS NULL OR typeof(amount)='integer'),
 page INTEGER NOT NULL CHECK(page>0), review_status TEXT NOT NULL DEFAULT 'observed' CHECK(review_status IN ('observed','verified')), supersedes_id INTEGER UNIQUE REFERENCES tax_facts(id)
);
CREATE TABLE IF NOT EXISTS tax_reviews (
 id INTEGER PRIMARY KEY, subject_id INTEGER NOT NULL REFERENCES tax_subjects(id), year INTEGER CHECK(year BETWEEN 1900 AND 2200),
 version_id INTEGER REFERENCES tax_versions(id), document_id INTEGER REFERENCES tax_documents(id), page INTEGER CHECK(page>0),
 kind TEXT NOT NULL CHECK(kind IN ('user_statement','document_finding','selection','review_event')),
 topic TEXT NOT NULL CHECK(topic IN ('mortgage','child','donation','identity','year','version','other')),
 note TEXT NOT NULL CHECK(length(note) BETWEEN 1 AND 240),
 CHECK(kind!='document_finding' OR (document_id IS NOT NULL AND page IS NOT NULL)),
 CHECK(kind!='selection' OR version_id IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS tax_settlement_links (
 id INTEGER PRIMARY KEY, version_id INTEGER NOT NULL REFERENCES tax_versions(id),
 transaction_id INTEGER REFERENCES transactions(id), payslip_id INTEGER REFERENCES salary_statements(id),
 direction TEXT NOT NULL CHECK(direction IN ('payment','refund')), jurisdiction TEXT NOT NULL DEFAULT 'national' CHECK(jurisdiction IN ('national','local','penalty')), amount INTEGER NOT NULL CHECK(typeof(amount)='integer' AND amount>0),
 status TEXT NOT NULL CHECK(status IN ('candidate','confirmed')), evidence_document_id INTEGER REFERENCES tax_documents(id),
 evidence_page INTEGER CHECK(evidence_page>0), confirms_id INTEGER UNIQUE REFERENCES tax_settlement_links(id),
 CHECK((transaction_id IS NULL)!=(payslip_id IS NULL)),
 CHECK(status!='confirmed' OR (evidence_document_id IS NOT NULL AND evidence_page IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS tax_versions_subject_year ON tax_versions(subject_id,year);
CREATE INDEX IF NOT EXISTS tax_documents_text_hash ON tax_documents(text_hash);
CREATE INDEX IF NOT EXISTS tax_facts_version ON tax_facts(version_id);
CREATE INDEX IF NOT EXISTS tax_reviews_subject ON tax_reviews(subject_id,year);
CREATE UNIQUE INDEX IF NOT EXISTS tax_links_transaction_version ON tax_settlement_links(version_id,transaction_id,status,jurisdiction) WHERE transaction_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS tax_links_payslip_version ON tax_settlement_links(version_id,payslip_id,status,jurisdiction) WHERE payslip_id IS NOT NULL;
COMMIT;
