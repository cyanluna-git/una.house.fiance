import fs from "fs";
import path from "path";
import { db, sqlite } from "../src/lib/db";
import { transactions } from "../src/lib/db/schema";
import { parseFile } from "../src/lib/parsers";
import { categorizeMerchant } from "../src/lib/categorizer";
import {
  normalizeTransactionDates,
  parseStatementMonthFromFileName,
} from "../src/lib/statement-date";
import { getDefaultDataRoot, resolveDataRoot } from "./data-root";

async function bulkImport() {
  const dataRoot = resolveDataRoot(process.argv[2]);

  console.log("🚀 대량 임포트 시작...");
  console.log(`📁 데이터 경로: ${dataRoot}`);

  if (!fs.existsSync(dataRoot)) {
    console.error("✗ 데이터 경로를 찾을 수 없습니다.");
    console.error(`  전달값: ${dataRoot}`);
    console.error(`  기본값: ${getDefaultDataRoot()}`);
    console.error("  사용법: UNAHOUSE_IMPORT_ROOT=/path/to/raw pnpm import");
    process.exit(1);
  }

  const files = collectFiles(dataRoot);
  console.log(`📊 발견된 파일: ${files.length}개`);

  let importedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const filePath of files) {
    const fileName = path.basename(filePath).normalize("NFC");

    try {
      const buffer = fs.readFileSync(filePath);
      const parsedTransactions = await parseFile(buffer, fileName, password);

      if (parsedTransactions.length === 0) {
        console.log(`⏭️  ${fileName}: 거래 내역 없음`);
        skippedCount++;
        continue;
      }

      const statementMonth = parseStatementMonthFromFileName(fileName);
      const transactionsToSave = parsedTransactions.map((t) => {
        const cat = categorizeMerchant(t.merchant);
        const originalDate = t.originalDate || t.date;
        const normalizedDates = normalizeTransactionDates({
          originalDate,
          billingMonth: t.billingMonth || statementMonth,
          paymentMonthCandidate: t.paymentMonthCandidate || null,
        });

        return {
          date: originalDate,
          originalDate: normalizedDates.originalDate,
          billingMonth: normalizedDates.billingMonth,
          paymentMonthCandidate: normalizedDates.paymentMonthCandidate,
          aggregationDate: normalizedDates.aggregationDate,
          aggregationMonth: normalizedDates.aggregationMonth,
          aggregationBasis: normalizedDates.aggregationBasis,
          cardCompany: t.cardCompany,
          cardName: t.cardName,
          merchant: t.merchant,
          amount: t.amount,
          paymentType: t.paymentType,
          installmentMonths: t.installmentMonths || 0,
          installmentSeq: t.installmentSeq || 0,
          paymentAmount: t.paymentAmount || 0,
          fee: t.fee || 0,
          discount: t.discount || 0,
          categoryL1: cat.categoryL1,
          categoryL2: cat.categoryL2,
          categoryL3: cat.categoryL3,
          necessity: cat.necessity,
          sourceFile: fileName,
          sourceType: "card" as const,
          isManual: false,
        };
      });

      try {
        db.insert(transactions).values(transactionsToSave).run();
        console.log(`✓ ${fileName}: ${parsedTransactions.length}건 임포트`);
        importedCount++;
      } catch (dbError: any) {
        // Might fail due to duplicates, but continue
        console.log(`⚠️  ${fileName}: ${parsedTransactions.length}건 처리 (중복 포함 가능)`);
        importedCount++;
      }
    } catch (error) {
      console.error(`✗ ${fileName}: 오류 -`, (error as Error).message);
      failedCount++;
    }
  }

  syncCardsFromTransactions();

  console.log("\n📈 임포트 완료!");
  console.log(`✓ 성공: ${importedCount}개 파일`);
  console.log(`✗ 실패: ${failedCount}개 파일`);
  console.log(`⏭️  스킵: ${skippedCount}개 파일`);

  return {
    importedCount,
    failedCount,
    skippedCount,
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
    } else if (/\.(xlsx|xls)$/.test(item)) {
      fileList.push(fullPath);
    }
  }

  return fileList;
}

if (require.main === module) {
  bulkImport({
    dataRoot: process.env.IMPORT_DATA_ROOT,
    password: process.env.IMPORT_PASSWORD,
  }).catch(console.error);
}
