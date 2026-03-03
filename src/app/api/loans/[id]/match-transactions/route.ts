import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loans, loanRepayments, transactions } from "@/lib/db/schema";
import { eq, gte, desc } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const loanId = Number(id);

    const loan = db.select().from(loans).where(eq(loans.id, loanId)).get();
    if (!loan) {
      return NextResponse.json({ error: "대출을 찾을 수 없습니다" }, { status: 404 });
    }

    // Get already-linked transaction IDs for this loan
    const linkedRepayments = db
      .select({ tid: loanRepayments.linkedTransactionId })
      .from(loanRepayments)
      .where(eq(loanRepayments.loanId, loanId))
      .all();

    const linkedIds = linkedRepayments
      .map((r) => r.tid)
      .filter((tid): tid is number => tid !== null && tid !== undefined);

    // Search by loan name keyword in merchant, last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const sinceDate = sixMonthsAgo.toISOString().slice(0, 10);

    // Extract keyword from loan name (use first meaningful part)
    const keyword = loan.loanName.replace(/[()[\]{}]/g, "").trim();
    if (!keyword) {
      return NextResponse.json({ data: [] });
    }

    let query = db
      .select()
      .from(transactions)
      .where(gte(transactions.date, sinceDate))
      .orderBy(desc(transactions.date));

    const allTxns = query.all();

    // Filter by LIKE match on merchant containing the keyword
    // and exclude already-linked transactions
    const matched = allTxns.filter((txn) => {
      if (linkedIds.includes(txn.id)) return false;
      // Search merchant for keyword match (case-insensitive for Korean)
      return txn.merchant.includes(keyword) ||
             keyword.split(/\s+/).some((k) => k.length >= 2 && txn.merchant.includes(k));
    });

    // Also search by lender name
    const lenderMatched = allTxns.filter((txn) => {
      if (linkedIds.includes(txn.id)) return false;
      if (matched.some((m) => m.id === txn.id)) return false;
      return txn.merchant.includes(loan.lender);
    });

    return NextResponse.json({
      data: [...matched, ...lenderMatched].slice(0, 20),
    });
  } catch (error) {
    console.error("GET /api/loans/[id]/match-transactions error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
