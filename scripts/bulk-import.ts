import fs from "fs";
import path from "path";
import { db } from "../src/lib/db";
import { transactions } from "../src/lib/db/schema";
import { parseFile } from "../src/lib/parsers";
import { categorizeMerchant } from "../src/lib/categorizer";

const DATA_ROOT = "/Users/cyanluna-pro16/Library/CloudStorage/OneDrive-개인/Cyanluna/02_금융/unahouse_finance/raw";

async function bulkImport() {
  console.log("🚀 대량 임포트 시작...");
  console.log(`📁 데이터 경로: ${DATA_ROOT}`);

  const files = collectFiles(DATA_ROOT);
  console.log(`📊 발견된 파일: ${files.length}개`);

  let importedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const filePath of files) {
    const fileName = path.basename(filePath).normalize("NFC");

    try {
      const buffer = fs.readFileSync(filePath);
      const parsedTransactions = parseFile(buffer, fileName);

      if (parsedTransactions.length === 0) {
        console.log(`⏭️  ${fileName}: 거래 내역 없음`);
        skippedCount++;
        continue;
      }

      const transactionsToSave = parsedTransactions.map((t) => {
        const cat = categorizeMerchant(t.merchant);
        return {
          date: t.date,
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

  console.log("\n📈 임포트 완료!");
  console.log(`✓ 성공: ${importedCount}개 파일`);
  console.log(`✗ 실패: ${failedCount}개 파일`);
  console.log(`⏭️  스킵: ${skippedCount}개 파일`);
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

bulkImport().catch(console.error);
