import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loans, loanRepayments } from "@/lib/db/schema";
import { eq, sum } from "drizzle-orm";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; repaymentId: string }> }
) {
  try {
    const { id, repaymentId } = await params;
    const loanId = Number(id);
    const repayId = Number(repaymentId);

    const loan = db.select().from(loans).where(eq(loans.id, loanId)).get();
    if (!loan) {
      return NextResponse.json({ error: "대출을 찾을 수 없습니다" }, { status: 404 });
    }

    const repayment = db
      .select()
      .from(loanRepayments)
      .where(eq(loanRepayments.id, repayId))
      .get();
    if (!repayment || repayment.loanId !== loanId) {
      return NextResponse.json({ error: "상환내역을 찾을 수 없습니다" }, { status: 404 });
    }

    // Delete the repayment
    db.delete(loanRepayments).where(eq(loanRepayments.id, repayId)).run();

    // Recalculate outstanding_amount
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
      outstandingAmount: newOutstanding,
    });
  } catch (error) {
    console.error("DELETE /api/loans/[id]/repayments/[repaymentId] error:", error);
    return NextResponse.json({ error: "삭제 실패" , errorId: crypto.randomUUID() }, { status: 500 });
  }
}
