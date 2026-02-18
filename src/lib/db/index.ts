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
    category TEXT DEFAULT '미분류',
    note TEXT,
    source_file TEXT,
    source_type TEXT DEFAULT 'card',
    is_manual INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS category_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    keyword TEXT NOT NULL,
    category TEXT NOT NULL,
    priority INTEGER DEFAULT 0
  );
`);

export const db = drizzle(sqlite, { schema });

export { sqlite };
