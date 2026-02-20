import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = path.join(process.cwd(), "finance.db");
const sqlite = new Database(dbPath);

sqlite.pragma("journal_mode = WAL");

// Auto-create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
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
];
for (const col of newColumns) {
  try {
    sqlite.exec(col.sql);
  } catch {
    // Column already exists - ignore
  }
}

// Migration: if old 'category' column exists, migrate to 3-level
try {
  const tableInfo = sqlite.prepare("PRAGMA table_info(transactions)").all() as any[];
  const hasOldCategory = tableInfo.some((col: any) => col.name === "category");
  const hasNewCategory = tableInfo.some((col: any) => col.name === "category_l1");

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

// Auto-seed category_rules if empty
const ruleCount = sqlite.prepare("SELECT COUNT(*) as cnt FROM category_rules").get() as { cnt: number };
if (ruleCount.cnt === 0) {
  const { initialCategoryRules } = require("./seed-rules");
  const insertRule = sqlite.prepare(
    "INSERT INTO category_rules (keyword, category_l1, category_l2, category_l3, priority) VALUES (?, ?, ?, ?, ?)"
  );
  const seedMany = sqlite.transaction((rules: any[]) => {
    for (const r of rules) {
      insertRule.run(r.keyword, r.categoryL1, r.categoryL2 || "", r.categoryL3 || "", r.priority || 0);
    }
  });
  seedMany(initialCategoryRules);
  console.log(`Seeded ${initialCategoryRules.length} category rules`);
}

export const db = drizzle(sqlite, { schema });

export { sqlite };
