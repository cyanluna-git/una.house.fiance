/**
 * 명세서 등록 (행 단위 중복 제외).
 * 사용법: pnpm tsx scripts/import-statements.ts [--apply] <폴더|파일> [...]
 * --apply 없으면 미리보기만. 중복 키: (date, merchant, amount, card_company) — DB UNIQUE 인덱스와 동일.
 */
import fs from "fs";
import path from "path";
import { db } from "../src/lib/db";
import { transactions, cards } from "../src/lib/db/schema";
import { parseFile } from "../src/lib/parsers";
import { categorizeMerchant } from "../src/lib/categorizer";
import { normalizeTransactionDates, parseStatementMonthFromFileName } from "../src/lib/statement-date";

const apply = process.argv.includes("--apply");
const inputs = process.argv.slice(2).filter((a) => !a.startsWith("--"));

function collect(p: string, out: string[] = []): string[] {
  if (fs.statSync(p).isDirectory()) for (const f of fs.readdirSync(p)) collect(path.join(p, f), out);
  else if (/\.(xlsx|xls)$/i.test(p)) out.push(p);
  return out;
}
function nameForDetect(file: string) {
  const base = path.basename(file).normalize("NFC");
  const dir = path.basename(path.dirname(file)).normalize("NFC");
  return /(국민|농협|현대|롯데|신한|하나|우리|트래블로그|chak|착)/i.test(base) ? base : `${dir}_${base}`;
}

async function main() {
  const files = inputs.flatMap((i) => collect(i)).sort();
  const keys = new Set(db.select().from(transactions).all().map((t) => `${t.date}|${t.merchant}|${t.amount}|${t.cardCompany}`));
  const allCards = db.select().from(cards).all();
  function findCardId(company: string, cardName: string | null | undefined): number | null {
    if (!company) return null;
    const norm = (s: string) => s.replace(/본인/g, "").replace(/\s+/g, "").trim();
    const cNameNorm = cardName ? norm(cardName) : "";
    for (const c of allCards) {
      if (c.cardCompany !== company) continue;
      if (c.cardName && cardName && norm(c.cardName) === cNameNorm) return c.id;
      if (c.cardNumber && cardName && cardName.includes(c.cardNumber.replace(/'/g, ""))) return c.id;
    }
    return null;
  }
  const rows: any[] = [];
  let parsed = 0;
  for (const f of files) {
    const name = nameForDetect(f);
    const list = await parseFile(fs.readFileSync(f), name, process.env.IMPORT_PASSWORD);
    const stMonth = parseStatementMonthFromFileName(name);
    for (const t of list) {
      parsed++;
      const od = t.originalDate || t.date;
      const key = `${od}|${t.merchant}|${t.amount}|${t.cardCompany}`;
      if (keys.has(key)) continue;
      keys.add(key);
      const cat = categorizeMerchant(t.merchant);
      const nd = normalizeTransactionDates({ originalDate: od, billingMonth: t.billingMonth || stMonth, paymentMonthCandidate: t.paymentMonthCandidate || null });
      rows.push({
        date: od, originalDate: nd.originalDate, billingMonth: nd.billingMonth, paymentMonthCandidate: nd.paymentMonthCandidate,
        aggregationDate: nd.aggregationDate, aggregationMonth: nd.aggregationMonth, aggregationBasis: nd.aggregationBasis,
        cardCompany: t.cardCompany, cardName: t.cardName, merchant: t.merchant, amount: t.amount, paymentType: t.paymentType,
        installmentMonths: t.installmentMonths || 0, installmentSeq: t.installmentSeq || 0, paymentAmount: t.paymentAmount || 0,
        fee: t.fee || 0, discount: t.discount || 0, categoryL1: cat.categoryL1, categoryL2: cat.categoryL2, categoryL3: cat.categoryL3,
        necessity: cat.necessity, sourceFile: path.basename(f).normalize("NFC"), sourceType: "card" as const, isManual: false,
        cardId: findCardId(t.cardCompany, t.cardName),
      });
    }
  }
  console.log(`파일 ${files.length}개, 파싱 ${parsed}건, 신규 ${rows.length}건, 중복 제외 ${parsed - rows.length}건`);
  if (!apply) return console.log("미리보기만 (DB 미변경). --apply로 등록.");
  let ins = 0, skip = 0;
  db.transaction((tx: any) => {
    for (const r of rows) {
      try { tx.insert(transactions).values(r).run(); ins++; } catch { skip++; }
    }
  });
  console.log(`등록 ${ins}건, 충돌로 건너뜀 ${skip}건`);
}
main();
