import fs from "fs";
import path from "path";
import { parseFile } from "../src/lib/parsers";

const DATA_ROOT = "/Users/cyanluna-pro16/Library/CloudStorage/OneDrive-개인/Cyanluna/02_금융/unahouse_finance/raw";

const testFiles = [
  { company: "국민카드", relPath: "국민카드 명세서 2025.03~2026.02/국민카드_2025년 03월 명세서.xlsx" },
  { company: "농협카드", relPath: "농협카드 명세서 2025.04~2026.02/농협카드_2025년 04월 명세서.xlsx" },
  { company: "현대카드", relPath: "현대카드 명세서 2025.03~2026.02/현대카드_2025년 03월 명세서.xls" },
  { company: "롯데카드", relPath: "롯데카드 명세서 2025.03~2026.02/롯데카드_2025년 03월 명세서.xls" },
  { company: "신한카드", relPath: "신한카드 명세서 2025.03~2025.10/신한카드_2025년 04월 명세서.xls" },
  { company: "하나카드", relPath: "하나카드 명세서 2025.03~2026.02/하나카드_2025년 03월 명세서.xls" },
  { company: "우리카드", relPath: "우리카드_2026년 02월 명세서.xls" },
];

console.log("=== 카드사별 파서 테스트 ===\n");

async function runTests() {
  let passed = 0;
  let failed = 0;

  for (const { company, relPath } of testFiles) {
    const fullPath = path.join(DATA_ROOT, relPath);
    const fileName = path.basename(fullPath).normalize("NFC");

    if (!fs.existsSync(fullPath)) {
      console.log(`[SKIP] ${company}: 파일 없음 - ${relPath}`);
      failed++;
      continue;
    }

    try {
      const buffer = fs.readFileSync(fullPath);
      const results = await parseFile(buffer, fileName);

      if (results.length === 0) {
        console.log(`[FAIL] ${company}: 0건 파싱됨 (파서 로직 문제)`);
        const preview = buffer.toString("utf-8", 0, 500);
        console.log(`  파일 미리보기: ${preview.substring(0, 200)}...`);
        failed++;
      } else {
        console.log(`[PASS] ${company}: ${results.length}건 파싱 성공`);
        for (const t of results.slice(0, 3)) {
          console.log(`  ${t.date} | ${t.merchant.substring(0, 20).padEnd(20)} | ${t.amount.toLocaleString()}원`);
        }
        passed++;
      }
    } catch (error) {
      console.log(`[FAIL] ${company}: ${(error as Error).message}`);
      failed++;
    }

    console.log();
  }

  console.log(`\n=== 결과: ${passed} PASS / ${failed} FAIL (총 ${testFiles.length}개) ===`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
