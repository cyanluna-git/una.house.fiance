import { sql } from "drizzle-orm";
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(), // YYYY-MM-DD
  cardCompany: text("card_company").notNull(),
  cardName: text("card_name"),
  merchant: text("merchant").notNull(),
  amount: integer("amount").notNull(),
  paymentType: text("payment_type"),
  installmentMonths: integer("installment_months").default(0),
  installmentSeq: integer("installment_seq").default(0),
  paymentAmount: integer("payment_amount").default(0),
  fee: integer("fee").default(0),
  discount: integer("discount").default(0),
  category: text("category").default("미분류"),
  note: text("note"),
  sourceFile: text("source_file"),
  sourceType: text("source_type").default("card"),
  isManual: integer("is_manual", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const categoryRules = sqliteTable("category_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keyword: text("keyword").notNull(),
  category: text("category").notNull(),
  priority: integer("priority").default(0),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type CategoryRule = typeof categoryRules.$inferSelect;
export type NewCategoryRule = typeof categoryRules.$inferInsert;
