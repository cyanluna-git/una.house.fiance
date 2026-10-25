import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
// Explicit SQL is authoritative for checks, compound FKs and indexes; parity is tested.
export const taxSubjects=sqliteTable('tax_subjects',{
 id:integer('id').primaryKey(),alias:text('alias').notNull(),familyMemberId:integer('family_member_id'),identityStatus:text('identity_status').notNull().default('unconfirmed'),
});
export const taxDocuments=sqliteTable('tax_documents',{
 id:integer('id').primaryKey(),subjectId:integer('subject_id').notNull().references(()=>taxSubjects.id),driveId:text('drive_id').notNull(),revision:text('revision').notNull(),binaryHash:text('binary_hash').notNull(),textHash:text('text_hash'),label:text('label').notNull(),filenameYear:integer('filename_year'),contentYear:integer('content_year'),kind:text('kind').notNull(),extractionStatus:text('extraction_status').notNull().default('manual'),
});
export const taxVersions=sqliteTable('tax_versions',{
 id:integer('id').primaryKey(),subjectId:integer('subject_id').notNull().references(()=>taxSubjects.id),year:integer('year').notNull(),documentId:integer('document_id').notNull().references(()=>taxDocuments.id),kind:text('kind').notNull(),reportClass:text('report_class').notNull(),filingStatus:text('filing_status').notNull().default('unknown'),predecessorId:integer('predecessor_id'),
});
export const taxFacts=sqliteTable('tax_facts',{
 id:integer('id').primaryKey(),versionId:integer('version_id').notNull().references(()=>taxVersions.id),documentId:integer('document_id').notNull().references(()=>taxDocuments.id),fieldCode:text('field_code').notNull(),jurisdiction:text('jurisdiction').notNull(),basis:text('basis').notNull(),amount:integer('amount'),page:integer('page').notNull(),reviewStatus:text('review_status').notNull().default('observed'),supersedesId:integer('supersedes_id').unique(),
});
export const taxReviews=sqliteTable('tax_reviews',{
 id:integer('id').primaryKey(),subjectId:integer('subject_id').notNull().references(()=>taxSubjects.id),year:integer('year'),versionId:integer('version_id').references(()=>taxVersions.id),documentId:integer('document_id').references(()=>taxDocuments.id),page:integer('page'),kind:text('kind').notNull(),topic:text('topic').notNull(),note:text('note').notNull(),
});
export const taxSettlementLinks=sqliteTable('tax_settlement_links',{
 id:integer('id').primaryKey(),versionId:integer('version_id').notNull().references(()=>taxVersions.id),transactionId:integer('transaction_id'),payslipId:integer('payslip_id'),direction:text('direction').notNull(),jurisdiction:text('jurisdiction').notNull().default('national'),amount:integer('amount').notNull(),status:text('status').notNull(),evidenceDocumentId:integer('evidence_document_id').references(()=>taxDocuments.id),evidencePage:integer('evidence_page'),confirmsId:integer('confirms_id').unique(),
});
