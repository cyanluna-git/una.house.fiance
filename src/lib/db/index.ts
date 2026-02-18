import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const dbPath = path.join(process.cwd(), "finance.db");
const sqlite = new Database(dbPath);

// Enable foreign keys
sqlite.pragma("journal_mode = WAL");

export const db = drizzle(sqlite, { schema });

// Export for use in migrations/seed
export { sqlite };
