import fs from "fs";
import path from "path";

export default async function globalTeardown() {
  const dbPath = process.env.UNAHOUSE_DB_PATH
    ? path.resolve(process.env.UNAHOUSE_DB_PATH)
    : path.join(process.cwd(), "test.db");

  for (const suffix of ["", "-shm", "-wal"]) {
    const file = dbPath + suffix;
    try {
      if (fs.existsSync(file)) fs.unlinkSync(file);
    } catch (e) {
      console.warn(`Warning: could not delete ${file}:`, e);
    }
  }
}
