import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loans, loanRepayments } from "@/lib/db/schema";
import { eq, asc, sum } from "drizzle-orm";

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

    const repayments = db
      .select()
      .from(loanRepayments)
      .where(eq(loanRepayments.loanId, loanId))
      .orderBy(asc(loanRepayments.date), asc(loanRepayments.id))
      .all();

    // Calculate running remaining principal
    let remaining = loan.originalAmount;
    const withRemaining = repayments.map((r) => {
      remaining -= r.principalAmount;
      return {
        ...r,
        remainingPrincipal: remaining,
      };
    });

    return NextResponse.json({
      data: withRemaining,
      loan: {
        id: loan.id,
        originalAmount: loan.originalAmount,
        outstandingAmount: loan.outstandingAmount,
      },
    });
  } catch (error) {
    console.error("GET /api/loans/[id]/repayments error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const loanId = Number(id);
    const body = await request.json();

    const loan = db.select().from(loans).where(eq(loans.id, loanId)).get();
    if (!loan) {
      return NextResponse.json({ error: "대출을 찾을 수 없습니다" }, { status: 404 });
    }

    const principalAmount = Number(body.principalAmount || 0);
    const interestAmount = Number(body.interestAmount || 0);

    if (principalAmount < 0 || interestAmount < 0) {
      return NextResponse.json({ error: "금액은 0 이상이어야 합니다" }, { status: 400 });
    }

    if (principalAmount === 0 && interestAmount === 0) {
      return NextResponse.json({ error: "원금상환액 또는 이자납입액을 입력하세요" }, { status: 400 });
    }

    if (!body.date) {
      return NextResponse.json({ error: "날짜를 입력하세요" }, { status: 400 });
    }

    // Validate: principalAmount should not exceed outstanding
    if (principalAmount > loan.outstandingAmount) {
      return NextResponse.json(
        { error: `원금상환액(${principalAmount.toLocaleString()}원)이 잔여원금(${loan.outstandingAmount.toLocaleString()}원)을 초과합니다` },
        { status: 400 }
      );
    }

    // Insert the repayment
    const result = db
      .insert(loanRepayments)
      .values({
        loanId,
        date: body.date,
        principalAmount,
        interestAmount,
        memo: body.memo || null,
        linkedTransactionId: body.linkedTransactionId ? Number(body.linkedTransactionId) : null,
      })
      .run();

    // Recalculate outstanding_amount = original_amount - SUM(principal_amounts)
    const sumResult = db
      .select({ total: sum(loanRepayments.principalAmount) })
      .from(loanRepayments)
      .where(eq(loanRepayments.loanId, loanId))
      .get();

    const totalRepaid = Number(sumResult?.total || 0);
    const newOutstanding = loan.originalAmount - totalRepaid;

    db.update(loans)
      .set({ outstandingAmount: newOutstanding })
      .where(eq(loans.id, loanId))
      .run();

    return NextResponse.json({
      success: true,
      id: Number(result.lastInsertRowid),
      outstandingAmount: newOutstanding,
    });
  } catch (error) {
    console.error("POST /api/loans/[id]/repayments error:", error);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
