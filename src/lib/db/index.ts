import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import {
  normalizeTransactionDates,
  parseStatementMonthFromFileName,
} from "@/lib/statement-date";

const dbPath = process.env.UNAHOUSE_DB_PATH
  ? path.resolve(process.env.UNAHOUSE_DB_PATH)
  : path.join(process.cwd(), "finance.db");
const sqlite = new Database(dbPath);

sqlite.pragma("journal_mode = WAL");

// Auto-create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    original_date TEXT,
    billing_month TEXT,
    payment_month_candidate TEXT,
    aggregation_date TEXT,
    aggregation_month TEXT,
    aggregation_basis TEXT,
    card_company TEXT NOT NULL,
    card_name TEXT,
    merchant TEXT NOT NULL,
    amount INTEGER NOT NULL,
    payment_type TEXT,
    installment_months INTEGER DEFAULT 0,
    installment_seq INTEGER DEFAULT 0,
    payment_amount INTEGER DEFAULT 0,
    fee INTEGER DEFAULT 0,
    discount INTEGER DEFAULT 0,
    category_l1 TEXT DEFAULT '기타',
    category_l2 TEXT DEFAULT '미분류',
    category_l3 TEXT DEFAULT '',
    note TEXT,
    source_file TEXT,
    source_type TEXT DEFAULT 'card',
    is_manual INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS salary_statements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pay_date TEXT NOT NULL,
    employee_name TEXT,
    employee_id TEXT,
    position TEXT,
    department TEXT,
    company_name TEXT,
    gross_pay INTEGER NOT NULL,
    total_deductions INTEGER NOT NULL,
    net_pay INTEGER NOT NULL,
    source_file TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS salary_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    statement_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    amount INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_type TEXT NOT NULL,
    loan_name TEXT NOT NULL,
    purpose TEXT,
    lender TEXT NOT NULL,
    repay_institution TEXT,
    original_amount INTEGER NOT NULL,
    outstanding_amount INTEGER NOT NULL,
    interest_rate REAL NOT NULL,
    rate_type TEXT NOT NULL,
    variable_period_months INTEGER,
    variable_next_rate REAL,
    repay_method TEXT,
    monthly_payment INTEGER,
    payment_day INTEGER,
    start_date TEXT,
    end_date TEXT,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS category_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    category_l1 TEXT NOT NULL,
    category_l2 TEXT NOT NULL DEFAULT '',
    category_l3 TEXT NOT NULL DEFAULT '',
    priority INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS family_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    relation TEXT NOT NULL,
    birth_year INTEGER,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS trips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    destination TEXT,
    start_date TEXT,
    end_date TEXT,
    budget INTEGER,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS transaction_splits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    category_l1 TEXT NOT NULL,
    category_l2 TEXT DEFAULT '',
    category_l3 TEXT DEFAULT '',
    amount INTEGER NOT NULL,
    necessity TEXT DEFAULT 'unset',
    note TEXT
  );
  CREATE TABLE IF NOT EXISTS cards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    card_company TEXT NOT NULL,
    card_name TEXT NOT NULL,
    card_number TEXT,
    card_type TEXT DEFAULT '신용',
    is_active INTEGER DEFAULT 1,
    annual_fee INTEGER DEFAULT 0,
    issue_date TEXT,
    expiry_date TEXT,
    monthly_target INTEGER,
    monthly_discount_limit INTEGER,
    main_benefits TEXT,
    family_member_id INTEGER,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS loan_repayments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    loan_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    principal_amount INTEGER NOT NULL,
    interest_amount INTEGER NOT NULL,
    memo TEXT,
    linked_transaction_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS asset_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    asset_type TEXT NOT NULL,
    name TEXT NOT NULL,
    institution TEXT,
    account_no TEXT,
    monthly_deposit INTEGER,
    deposit_day INTEGER,
    interest_rate REAL,
    start_date TEXT,
    maturity_date TEXT,
    is_active INTEGER DEFAULT 1,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS asset_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    snapshot_date TEXT NOT NULL,
    balance INTEGER NOT NULL,
    principal INTEGER,
    memo TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS fixed_expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    amount INTEGER NOT NULL,
    payment_day INTEGER,
    payment_method TEXT,
    recipient TEXT,
    family_member_id INTEGER,
    start_date TEXT NOT NULL,
    end_date TEXT,
    is_active INTEGER DEFAULT 1,
    note TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// Migration: add necessity, family_member_id, trip_id to transactions
// Each ALTER is wrapped individually to handle cases where column already exists
const newColumns = [
  { name: "necessity", sql: `ALTER TABLE transactions ADD COLUMN necessity TEXT DEFAULT 'unset'` },
  { name: "family_member_id", sql: `ALTER TABLE transactions ADD COLUMN family_member_id INTEGER` },
  { name: "trip_id", sql: `ALTER TABLE transactions ADD COLUMN trip_id INTEGER` },
  { name: "is_company_expense", sql: `ALTER TABLE transactions ADD COLUMN is_company_expense INTEGER DEFAULT 0` },
  { name: "card_id", sql: `ALTER TABLE transactions ADD COLUMN card_id INTEGER` },
  { name: "original_date", sql: `ALTER TABLE transactions ADD COLUMN original_date TEXT` },
  { name: "billing_month", sql: `ALTER TABLE transactions ADD COLUMN billing_month TEXT` },
  { name: "payment_month_candidate", sql: `ALTER TABLE transactions ADD COLUMN payment_month_candidate TEXT` },
  { name: "aggregation_date", sql: `ALTER TABLE transactions ADD COLUMN aggregation_date TEXT` },
  { name: "aggregation_month", sql: `ALTER TABLE transactions ADD COLUMN aggregation_month TEXT` },
  { name: "aggregation_basis", sql: `ALTER TABLE transactions ADD COLUMN aggregation_basis TEXT` },
  { name: "approval_no", sql: `ALTER TABLE transactions ADD COLUMN approval_no TEXT` },
];
for (const col of newColumns) {
  try {
    sqlite.exec(col.sql);
  } catch {
    // Column already exists - ignore
  }
}
// 승인번호 조회용 (유니크 아님: 같은 승인번호가 다른 카드사/날짜에 다시 나올 수 있다)
sqlite.exec(`CREATE INDEX IF NOT EXISTS idx_txn_approval_no ON transactions(approval_no) WHERE approval_no IS NOT NULL`);

// Migration: add frequency, weekdays, annual_date to fixed_expenses
const fixedExpenseNewColumns = [
  { name: "frequency", sql: `ALTER TABLE fixed_expenses ADD COLUMN frequency TEXT DEFAULT 'monthly'` },
  { name: "weekdays", sql: `ALTER TABLE fixed_expenses ADD COLUMN weekdays TEXT` },
  { name: "annual_date", sql: `ALTER TABLE fixed_expenses ADD COLUMN annual_date TEXT` },
];
for (const col of fixedExpenseNewColumns) {
  try {
    sqlite.exec(col.sql);
  } catch {
    // Column already exists - ignore
  }
}

// Migration: if old 'category' column exists, migrate to 3-level
try {
  const tableInfo = sqlite.prepare("PRAGMA table_info(transactions)").all() as Array<{ name: string; type: string }>;
  const hasOldCategory = tableInfo.some((col) => col.name === "category");
  const hasNewCategory = tableInfo.some((col) => col.name === "category_l1");

  if (hasOldCategory && !hasNewCategory) {
    sqlite.exec(`ALTER TABLE transactions ADD COLUMN category_l1 TEXT DEFAULT '기타'`);
    sqlite.exec(`ALTER TABLE transactions ADD COLUMN category_l2 TEXT DEFAULT '미분류'`);
    sqlite.exec(`ALTER TABLE transactions ADD COLUMN category_l3 TEXT DEFAULT ''`);

    const migrationUpdates = [
      ["식비",   "식비", ""],
      ["교통",   "교통", ""],
      ["쇼핑",   "쇼핑", ""],
      ["보험",   "보험", ""],
      ["통신",   "통신", ""],
      ["의료",   "의료", ""],
      ["기부",   "기부", ""],
      ["급여",   "수입", "급여"],
      ["대출",   "대출", ""],
      ["기타",   "기타", "기타지출"],
      ["미분류", "기타", "미분류"],
    ];

    const stmt = sqlite.prepare(
      "UPDATE transactions SET category_l1 = ?, category_l2 = ? WHERE category = ?"
    );
    for (const [oldCat, l1, l2] of migrationUpdates) {
      stmt.run(l1, l2, oldCat);
    }

    console.log("Migration complete: category -> category_l1/l2/l3");
  }
} catch (migrationError) {
  console.error("Migration check failed:", migrationError);
}

try {
  const txRows = sqlite.prepare(`
    SELECT id, date, original_date, billing_month, payment_month_candidate, source_file
    FROM transactions
  `).all() as Array<{
    id: number;
    date: string;
    original_date: string | null;
    billing_month: string | null;
    payment_month_candidate: string | null;
    source_file: string | null;
  }>;

  const updateDates = sqlite.prepare(`
    UPDATE transactions
    SET original_date = ?,
        billing_month = ?,
        payment_month_candidate = ?,
        aggregation_date = ?,
        aggregation_month = ?,
        aggregation_basis = ?
    WHERE id = ?
  `);

  for (const row of txRows) {
    const originalDate = row.original_date || row.date;
    const inferredStatementMonth = parseStatementMonthFromFileName(row.source_file);
    const normalized = normalizeTransactionDates({
      originalDate,
      billingMonth: row.billing_month || inferredStatementMonth,
      paymentMonthCandidate: row.payment_month_candidate || null,
    });

    updateDates.run(
      normalized.originalDate,
      normalized.billingMonth,
      normalized.paymentMonthCandidate,
      normalized.aggregationDate,
      normalized.aggregationMonth,
      normalized.aggregationBasis,
      row.id
    );
  }
} catch (migrationError) {
  console.error("Transaction date normalization migration failed:", migrationError);
}

// Dedup existing transactions before creating UNIQUE index
try {
  sqlite.exec(`
    DELETE FROM transactions
    WHERE id NOT IN (
      SELECT MIN(id) FROM transactions
      GROUP BY date, merchant, amount, card_company
    )
  `);
} catch (dedupError) {
  console.error("Transaction dedup failed:", dedupError);
}

// Dedup existing category_rules before creating UNIQUE index
try {
  sqlite.exec(`
    DELETE FROM category_rules
    WHERE id NOT IN (
      SELECT MIN(id) FROM category_rules
      GROUP BY keyword
    )
  `);
} catch (dedupError) {
  console.error("Category rules dedup failed:", dedupError);
}

// Create indexes
sqlite.exec(`
  CREATE UNIQUE INDEX IF NOT EXISTS uq_txn_date_merchant_amount_card
    ON transactions(date, merchant, amount, card_company);
  CREATE INDEX IF NOT EXISTS idx_txn_trip_id ON transactions(trip_id);
  CREATE INDEX IF NOT EXISTS idx_txn_card_id ON transactions(card_id);
  CREATE INDEX IF NOT EXISTS idx_txn_family_member_id ON transactions(family_member_id);
  CREATE INDEX IF NOT EXISTS idx_txn_date ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_txn_card_company ON transactions(card_company);
  CREATE INDEX IF NOT EXISTS idx_txn_aggregation_month ON transactions(aggregation_month);
  CREATE UNIQUE INDEX IF NOT EXISTS uq_category_rules_keyword ON category_rules(keyword);
  CREATE INDEX IF NOT EXISTS idx_splits_transaction_id ON transaction_splits(transaction_id);
  CREATE INDEX IF NOT EXISTS idx_salary_items_statement_id ON salary_items(statement_id);
  CREATE INDEX IF NOT EXISTS idx_loan_repayments_loan_id ON loan_repayments(loan_id);
  CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_snapshots_account_date ON asset_snapshots(account_id, snapshot_date);
`);

// Auto-sync card benefits and targets if empty
try {
  sqlite.exec(`
    UPDATE cards SET
      card_name = '쿠팡 와우 카드',
      annual_fee = 20000,
      monthly_target = 0,
      monthly_discount_limit = 40000,
      main_benefits = '쿠팡/쿠팡이츠/쿠팡플레이 최대 4% 적립(월 최대 4만P), 기타 가맹점 2.4% 적립, 전월실적 없음',
      note = '명세서 표기: 비자 400'
    WHERE id = 1 AND (annual_fee = 0 OR annual_fee IS NULL);

    UPDATE cards SET
      card_name = 'KT할부Plus NH농협카드',
      annual_fee = 20000,
      monthly_target = 300000,
      monthly_discount_limit = 17000,
      main_benefits = 'KT 단말기 장기할부 및 통신요금 12,000원~17,000원 청구할인',
      note = '명세서 표기: L555'
    WHERE id = 2 AND (annual_fee = 0 OR annual_fee IS NULL);

    UPDATE cards SET
      card_name = 'KT Super DC',
      annual_fee = 25000,
      monthly_target = 300000,
      monthly_discount_limit = 20000,
      main_benefits = 'KT 유무선 통신요금 자동이체 시 10,000~20,000원 결제일 청구할인',
      note = '명세서 표기: 본인KT프리미엄슈퍼'
    WHERE id = 3 AND (annual_fee = 0 OR annual_fee IS NULL);

    UPDATE cards SET
      card_name = '디지로카 라스베가스',
      annual_fee = 20000,
      monthly_target = 0,
      monthly_discount_limit = 100000,
      main_benefits = '국내외 결제금액별 0.5~2% 청구할인 (50만원 이상 2%), 5만원 이상 무이자 할부',
      note = '명세서 표기: 본인라스베가스'
    WHERE id = 4 AND (annual_fee = 0 OR annual_fee IS NULL);

    UPDATE cards SET
      card_name = '신한카드',
      annual_fee = 15000,
      monthly_target = 300000,
      monthly_discount_limit = 20000,
      main_benefits = '생활/외식/쇼핑 청구할인',
      note = '명세서 표기: 본인202'
    WHERE id = 5 AND (annual_fee = 0 OR annual_fee IS NULL);

    UPDATE cards SET
      card_name = 'U+ X 우리카드',
      card_number = '9771',
      annual_fee = 25000,
      monthly_target = 400000,
      monthly_discount_limit = 28000,
      main_benefits = 'LG U+ 통신요금 자동납부/장기할부 25,000~28,000원 청구할인',
      note = '명세서 표기: 우리카드 9771'
    WHERE id = 6 AND (annual_fee = 0 OR annual_fee IS NULL);

    UPDATE cards SET
      card_name = '후불하이패스',
      annual_fee = 2000,
      monthly_target = 0,
      monthly_discount_limit = 0,
      main_benefits = '고속도로 통행료 후불결제 (모카드 M3 BOOST 연동)',
      note = '명세서 표기: 본인 M3 하이패스'
    WHERE id = 7 AND (annual_fee = 0 OR annual_fee IS NULL);

    UPDATE cards SET
      card_name = 'M3 BOOST',
      annual_fee = 90000,
      monthly_target = 500000,
      monthly_discount_limit = 20000,
      main_benefits = '업종별 0.5~3% M포인트 적립(100만 이상 1.5배, 200만 2배), 온라인/해외 5% 특별적립, 100만 이상 1만 보너스P, 주말 무료주차',
      note = '명세서 표기: 본인 M3 BOOST'
    WHERE id = 8 AND (annual_fee = 0 OR annual_fee IS NULL);

    UPDATE cards SET
      card_name = '아산페이',
      card_type = '체크',
      annual_fee = 0,
      monthly_target = 0,
      monthly_discount_limit = 30000,
      main_benefits = '아산시 지역화폐 충전 시 10% 인센티브(할인구매), 전통시장 및 가맹점 소득공제 30%'
    WHERE id = 9 AND (monthly_discount_limit IS NULL);
  `);
} catch (cardSyncErr) {
  console.warn("Card sync failed:", cardSyncErr);
}

// Auto-seed category_rules if empty
const ruleCount = sqlite.prepare("SELECT COUNT(*) as cnt FROM category_rules").get() as { cnt: number };
if (ruleCount.cnt === 0) {
  const { initialCategoryRules } = require("./seed-rules");
  const insertRule = sqlite.prepare(
    "INSERT OR IGNORE INTO category_rules (keyword, category_l1, category_l2, category_l3, priority) VALUES (?, ?, ?, ?, ?)"
  );
  const seedMany = sqlite.transaction((rules: Array<{ keyword: string; categoryL1: string; categoryL2?: string; categoryL3?: string; priority?: number }>) => {
    for (const r of rules) {
      insertRule.run(r.keyword, r.categoryL1, r.categoryL2 || "", r.categoryL3 || "", r.priority || 0);
    }
  });
  seedMany(initialCategoryRules);
  console.log(`Seeded ${initialCategoryRules.length} category rules`);
}

export const db = drizzle(sqlite, { schema });

export { sqlite };
