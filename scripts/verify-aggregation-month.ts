import { sql } from "drizzle-orm";
import { db } from "../src/lib/db";
import { transactions } from "../src/lib/db/schema";

type MonthCheck = {
  month: string;
  expectedCount: number;
};

const zeroMonths: MonthCheck[] = [
  { month: "2022-06", expectedCount: 0 },
  { month: "2024-06", expectedCount: 0 },
];

async function main() {
  const focusMonth = process.argv[2] || "2026-02";
  let hasFailure = false;

  console.log("=== 집계월 회귀 검증 ===");
  console.log(`검증 대상 기준월: ${focusMonth}\n`);

  for (const check of zeroMonths) {
    const row = db
      .select({ count: sql<number>`count(*)` })
      .from(transactions)
      .where(sql`${transactions.aggregationMonth} = ${check.month}`)
      .get();

    const count = Number(row?.count || 0);
    const status = count === check.expectedCount ? "PASS" : "FAIL";
    console.log(`[${status}] ${check.month}: ${count}건`);

    if (count !== check.expectedCount) {
      hasFailure = true;
    }
  }

  const shifted = db
    .select({
      id: transactions.id,
      merchant: transactions.merchant,
      originalDate: transactions.originalDate,
      aggregationDate: transactions.aggregationDate,
      aggregationMonth: transactions.aggregationMonth,
      billingMonth: transactions.billingMonth,
      aggregationBasis: transactions.aggregationBasis,
      paymentType: transactions.paymentType,
      installmentMonths: transactions.installmentMonths,
    })
    .from(transactions)
    .where(sql`
      ${transactions.aggregationMonth} = ${focusMonth}
      and ${transactions.originalDate} is not null
      and ${transactions.aggregationDate} is not null
      and ${transactions.originalDate} <> ${transactions.aggregationDate}
    `)
    .limit(5)
    .all();

  if (shifted.length === 0) {
    console.log(`\n[FAIL] ${focusMonth}: 원거래일과 집계일이 분리된 샘플을 찾지 못했습니다.`);
    hasFailure = true;
  } else {
    console.log(`\n[PASS] ${focusMonth}: 이동된 거래 샘플 ${shifted.length}건 확인`);
    for (const tx of shifted) {
      console.log(
        `  #${tx.id} ${tx.merchant} | original=${tx.originalDate} | aggregation=${tx.aggregationDate} | billing=${tx.billingMonth} | basis=${tx.aggregationBasis}`
      );
    }
  }

  process.exit(hasFailure ? 1 : 0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
