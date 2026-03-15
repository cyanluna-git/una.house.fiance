import fs from "fs";
import path from "path";
import { db, sqlite } from "../src/lib/db";
import { salaryItems, salaryStatements } from "../src/lib/db/schema";
import { parseSalaryPdf } from "../src/lib/parsers/salary";

const DEFAULT_DATA_ROOT = "/Users/cyanluna-pro16/Library/CloudStorage/OneDrive-개인/Cyanluna/02_금융/unahouse_finance/income";

export interface IncomeImportOptions {
  dataRoot?: string;
  password?: string;
}

export interface IncomeImportResult {
  importedCount: number;
  duplicateCount: number;
  failedCount: number;
  discoveredFiles: number;
}

export function importIncome(options: IncomeImportOptions = {}): IncomeImportResult {
  const dataRoot = options.dataRoot || DEFAULT_DATA_ROOT;
  const password = options.password || "";
  const files = collectFiles(dataRoot);

  console.log("💰 급여 임포트 시작...");
  console.log(`📁 데이터 경로: ${dataRoot}`);
  console.log(`📊 발견된 파일: ${files.length}개`);

  let importedCount = 0;
  let duplicateCount = 0;
  let failedCount = 0;

  for (const filePath of files) {
    const fileName = path.basename(filePath).normalize("NFC");

    try {
      const parsed = parseSalaryPdf(fs.readFileSync(filePath), password);

      if (
        !parsed.payDate ||
        parsed.grossPay <= 0 ||
        parsed.netPay <= 0 ||
        parsed.items.length === 0
      ) {
        console.log(`⏭️  ${fileName}: 급여 명세서 형식 아님`);
        failedCount++;
        continue;
      }

      const existing = sqlite
        .prepare(
          "SELECT id FROM salary_statements WHERE pay_date = ? AND gross_pay = ? AND net_pay = ?"
        )
        .get(parsed.payDate, parsed.grossPay, parsed.netPay) as { id: number } | undefined;

      if (existing) {
        console.log(`⏭️  ${fileName}: 중복`);
        duplicateCount++;
        continue;
      }

      const stmt = db
        .insert(salaryStatements)
        .values({
          payDate: parsed.payDate,
          employeeName: parsed.employeeName,
          employeeId: parsed.employeeId,
          position: parsed.position,
          department: parsed.department,
          companyName: parsed.companyName,
          grossPay: parsed.grossPay,
          totalDeductions: parsed.totalDeductions,
          netPay: parsed.netPay,
          sourceFile: fileName,
        })
        .run();

      const statementId = Number(stmt.lastInsertRowid);
      for (const item of parsed.items) {
        db.insert(salaryItems)
          .values({
            statementId,
            type: item.type,
            name: item.name,
            amount: item.amount,
          })
          .run();
      }

      console.log(`✓ ${fileName}: ${parsed.payDate} / 실수령 ${parsed.netPay.toLocaleString()}원`);
      importedCount++;
    } catch (error) {
      console.error(`✗ ${fileName}: 오류 -`, (error as Error).message);
      failedCount++;
    }
  }

  console.log("\n📈 급여 임포트 완료!");
  console.log(`✓ 성공: ${importedCount}개 파일`);
  console.log(`⏭️  중복: ${duplicateCount}개 파일`);
  console.log(`✗ 실패: ${failedCount}개 파일`);

  return {
    importedCount,
    duplicateCount,
    failedCount,
    discoveredFiles: files.length,
  };
}

function collectFiles(dirPath: string, fileList: string[] = []): string[] {
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      collectFiles(fullPath, fileList);
    } else if (/\.pdf$/i.test(item)) {
      fileList.push(fullPath);
    }
  }

  return fileList.sort();
}

if (require.main === module) {
  importIncome({
    dataRoot: process.env.INCOME_DATA_ROOT,
    password: process.env.INCOME_PASSWORD,
  });
}
