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
  necessity: text("necessity").default("unset"), // essential | discretionary | waste | unset
  familyMemberId: integer("family_member_id"),
  tripId: integer("trip_id"),
  note: text("note"),
  sourceFile: text("source_file"),
  sourceType: text("source_type").default("card"),
  isManual: integer("is_manual", { mode: "boolean" }).default(false),
  isCompanyExpense: integer("is_company_expense", { mode: "boolean" }).default(false),
  cardId: integer("card_id"),
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

export const familyMembers = sqliteTable("family_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  relation: text("relation").notNull(), // 본인, 배우자, 자녀1, 자녀2, ...
  birthYear: integer("birth_year"),
  note: text("note"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const trips = sqliteTable("trips", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // e.g. "2025 제주 가족여행"
  destination: text("destination"),
  startDate: text("start_date"),
  endDate: text("end_date"),
  budget: integer("budget"),
  note: text("note"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export const transactionSplits = sqliteTable("transaction_splits", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  transactionId: integer("transaction_id").notNull(),
  categoryL1: text("category_l1").notNull(),
  categoryL2: text("category_l2").default(""),
  categoryL3: text("category_l3").default(""),
  amount: integer("amount").notNull(),
  necessity: text("necessity").default("unset"),
  note: text("note"),
});

export const fixedExpenses = sqliteTable("fixed_expenses", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(), // 항목명 (양가적금, 아이용돈, 월회비 등)
  category: text("category").notNull(), // 적금, 용돈, 회비, 보험, 공과금, 기부, 기타
  amount: integer("amount").notNull(), // 월 금액
  paymentDay: integer("payment_day"), // 이체일 (1~31)
  paymentMethod: text("payment_method"), // 자동이체, 계좌이체, 카드 등
  recipient: text("recipient"), // 수취처/계좌
  familyMemberId: integer("family_member_id"), // 귀속 구성원
  startDate: text("start_date").notNull(), // 시작일 YYYY-MM-DD
  endDate: text("end_date"), // 종료일 (null이면 진행중)
  isActive: integer("is_active", { mode: "boolean" }).default(true),
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
export type FamilyMember = typeof familyMembers.$inferSelect;
export type NewFamilyMember = typeof familyMembers.$inferInsert;
export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
export type TransactionSplit = typeof transactionSplits.$inferSelect;
export type NewTransactionSplit = typeof transactionSplits.$inferInsert;
export type FixedExpense = typeof fixedExpenses.$inferSelect;
export type NewFixedExpense = typeof fixedExpenses.$inferInsert;

export const cards = sqliteTable("cards", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cardCompany: text("card_company").notNull(),
  cardName: text("card_name").notNull(),
  cardNumber: text("card_number"),
  cardType: text("card_type").default("신용"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  annualFee: integer("annual_fee").default(0),
  issueDate: text("issue_date"),
  expiryDate: text("expiry_date"),
  monthlyTarget: integer("monthly_target"),
  monthlyDiscountLimit: integer("monthly_discount_limit"),
  mainBenefits: text("main_benefits"),
  familyMemberId: integer("family_member_id"),
  note: text("note"),
  createdAt: text("created_at").default(sql`(datetime('now'))`),
});

export type Card = typeof cards.$inferSelect;
export type NewCard = typeof cards.$inferInsert;
