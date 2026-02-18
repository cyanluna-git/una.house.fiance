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
  CREATE TABLE IF NOT EXISTS category_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    category_l1 TEXT NOT NULL,
    category_l2 TEXT NOT NULL DEFAULT '',
    category_l3 TEXT NOT NULL DEFAULT '',
    priority INTEGER DEFAULT 0
  );
`);

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

export const db = drizzle(sqlite, { schema });

export { sqlite };
