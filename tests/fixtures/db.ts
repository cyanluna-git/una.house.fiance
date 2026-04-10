import fs from "fs";
import path from "path";

function getDbPath(): string {
  return process.env.UNAHOUSE_DB_PATH
    ? path.resolve(process.env.UNAHOUSE_DB_PATH)
    : path.join(process.cwd(), "test.db");
}

export function setupTestDb(): void {
  const dbPath = getDbPath();
  for (const suffix of ["", "-shm", "-wal"]) {
    const file = dbPath + suffix;
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch {
      // ignore errors on cleanup
    }
  }
}

export function cleanupTestDb(): void {
  const dbPath = getDbPath();
  for (const suffix of ["", "-shm", "-wal"]) {
    const file = dbPath + suffix;
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (e) {
      console.warn(`Warning: could not delete ${file}:`, e);
    }
  }
}
