import fs from "fs";
import path from "path";

const DB_FILES = ["finance.db", "finance.db-wal", "finance.db-shm"];
const DB_PATHS = DB_FILES.map((name) => path.join(process.cwd(), name));
const BACKUP_DIR = path.join(process.cwd(), "tmp-db-backups");

function backupExistingDbFiles() {
  const existing = DB_PATHS.filter((dbPath) => fs.existsSync(dbPath));
  if (existing.length === 0) return;

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");

  for (const dbPath of existing) {
    const backupPath = path.join(BACKUP_DIR, `${stamp}-${path.basename(dbPath)}`);
    fs.copyFileSync(dbPath, backupPath);
    console.log(`💾 backup ${path.basename(dbPath)} -> ${path.relative(process.cwd(), backupPath)}`);
  }
}

function removeExistingDbFiles() {
  for (const dbPath of DB_PATHS) {
    if (fs.existsSync(dbPath)) {
      fs.rmSync(dbPath, { force: true });
      console.log(`🗑️  removed ${path.basename(dbPath)}`);
    }
  }
}

async function main() {
  backupExistingDbFiles();
  removeExistingDbFiles();

  const { bulkImport } = await import("./bulk-import");
  const { importIncome } = await import("./import-income");

  const cardResult = await bulkImport({
    dataRoot: process.env.IMPORT_DATA_ROOT,
    password: process.env.IMPORT_PASSWORD,
  });

  const chakDataRoot =
    process.env.CHAK_DATA_ROOT ||
    "/Users/cyanluna-pro16/Library/CloudStorage/OneDrive-개인/Cyanluna/02_금융/unahouse_finance/Chak";
  const chakResult = fs.existsSync(chakDataRoot)
    ? await bulkImport({
        dataRoot: chakDataRoot,
        password: process.env.CHAK_PASSWORD,
      })
    : null;

  const incomeResult = importIncome({
    dataRoot: process.env.INCOME_DATA_ROOT,
    password: process.env.INCOME_PASSWORD,
  });

  console.log("\n✅ 전체 복구 완료");
  console.log(JSON.stringify({ cardResult, chakResult, incomeResult }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
