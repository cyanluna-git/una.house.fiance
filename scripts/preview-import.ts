/**
 * 명세서 가져오기 미리보기 (DB에 쓰지 않음).
 *
 * 사용법:
 *   UNAHOUSE_DB_PATH=/tmp/finance-copy.db pnpm tsx scripts/preview-import.ts <폴더|파일> [...]
 *
 * - 카드사는 파일명 → 없으면 상위 폴더명으로 판별한다 (예: 현대카드/hyundaicard_xxx.xls).
 * - 기존 DB와 (date, merchant, amount, card_company)로 비교해 신규/중복을 월별로 요약한다.
 * - 반드시 DB 복사본을 UNAHOUSE_DB_PATH로 지정해서 실행할 것.
 */
import fs from "fs";
import path from "path";
import { db } from "../src/lib/db";
import { transactions } from "../src/lib/db/schema";
import { parseFile } from "../src/lib/parsers";

function collect(p: string, out: string[] = []): string[] {
  const st = fs.statSync(p);
  if (st.isDirectory()) {
    for (const f of fs.readdirSync(p)) collect(path.join(p, f), out);
  } else if (/\.(xlsx|xls)$/i.test(p)) out.push(p);
  return out;
}

function nameForDetect(file: string): string {
  const base = path.basename(file).normalize("NFC");
  const dir = path.basename(path.dirname(file)).normalize("NFC");
  return /(국민|농협|현대|롯데|신한|하나|우리|트래블로그|chak|착)/i.test(base)
    ? base
    : `${dir}_${base}`;
}

async function main() {
  const inputs = process.argv.slice(2);
  if (!inputs.length) {
    console.error("사용법: preview-import.ts <폴더|파일> [...]");
    process.exit(1);
  }
  const files = inputs.flatMap((i) => collect(i)).sort();

  const existing = new Set(
    db
      .select()
      .from(transactions)
      .all()
      .map((t) => `${t.date}|${t.merchant}|${t.amount}|${t.cardCompany}`)
  );

  const seen = new Set<string>();
  const perMonth: Record<string, { new: number; dup: number; sum: number }> = {};
  let failed = 0;

  for (const f of files) {
    const name = nameForDetect(f);
    try {
      const rows = await parseFile(fs.readFileSync(f), name);
      if (!rows.length) {
        console.log(`- ${path.basename(f)}: 0건`);
        continue;
      }
      let n = 0;
      for (const r of rows) {
        const date = r.originalDate || r.date;
        const key = `${date}|${r.merchant}|${r.amount}|${r.cardCompany}`;
        const m = `${r.cardCompany} ${date.slice(0, 7)}`;
        perMonth[m] ??= { new: 0, dup: 0, sum: 0 };
        if (existing.has(key) || seen.has(key)) perMonth[m].dup++;
        else {
          perMonth[m].new++;
          perMonth[m].sum += r.amount;
          seen.add(key);
          n++;
        }
      }
      console.log(`- ${path.basename(f)} → ${rows.length}건 (신규 ${n})`);
    } catch (e) {
      failed++;
      console.log(`- ${path.basename(f)}: 오류 ${(e as Error).message}`);
    }
  }

  console.log("\n[카드/월별 요약]  신규 / 중복 / 신규합계");
  for (const m of Object.keys(perMonth).sort()) {
    const v = perMonth[m];
    console.log(`${m}  ${v.new} / ${v.dup} / ${v.sum.toLocaleString()}원`);
  }
  console.log(`\n파일 ${files.length}개, 실패 ${failed}개. DB에는 아무것도 쓰지 않았습니다.`);
}

main();
