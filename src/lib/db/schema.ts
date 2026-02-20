import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

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
  categoryL1: text("category_l1").default("기타"),
  categoryL2: text("category_l2").default("미분류"),
  categoryL3: text("category_l3").default(""),
  note: text("note"),
  sourceFile: text("source_file"),
  sourceType: text("source_type").default("card"),
  isManual: integer("is_manual", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const categoryRules = sqliteTable("category_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  keyword: text("keyword").notNull(),
  categoryL1: text("category_l1").notNull(),
  categoryL2: text("category_l2").notNull().default(""),
  categoryL3: text("category_l3").notNull().default(""),
  priority: integer("priority").default(0),
});

export const salaryStatements = sqliteTable("salary_statements", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  payDate: text("pay_date").notNull(), // YYYY-MM-DD
  employeeName: text("employee_name"),
  employeeId: text("employee_id"),
  position: text("position"),
  department: text("department"),
  companyName: text("company_name"),
  grossPay: integer("gross_pay").notNull(),
  totalDeductions: integer("total_deductions").notNull(),
  netPay: integer("net_pay").notNull(),
  sourceFile: text("source_file"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const salaryItems = sqliteTable("salary_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  statementId: integer("statement_id").notNull(),
  type: text("type").notNull(), // 'payment' or 'deduction'
  name: text("name").notNull(),
  amount: integer("amount").notNull(),
});

export const loans = sqliteTable("loans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  loanType: text("loan_type").notNull(), // 장기주택, 차량, 학자금, 신용, 마이너스, 기타
  loanName: text("loan_name").notNull(),
  purpose: text("purpose"),
  lender: text("lender").notNull(),
  repayInstitution: text("repay_institution"),
  originalAmount: integer("original_amount").notNull(),
  outstandingAmount: integer("outstanding_amount").notNull(),
  interestRate: real("interest_rate").notNull(),
  rateType: text("rate_type").notNull(), // 고정 / 변동
  variablePeriodMonths: integer("variable_period_months"),
  variableNextRate: real("variable_next_rate"),
  repayMethod: text("repay_method"), // 원리금균등, 원금균등, 만기일시, 자유상환
  monthlyPayment: integer("monthly_payment"),
  paymentDay: integer("payment_day"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  note: text("note"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type CategoryRule = typeof categoryRules.$inferSelect;
export type NewCategoryRule = typeof categoryRules.$inferInsert;
export type SalaryStatement = typeof salaryStatements.$inferSelect;
export type SalaryItem = typeof salaryItems.$inferSelect;
export type Loan = typeof loans.$inferSelect;
export type NewLoan = typeof loans.$inferInsert;
