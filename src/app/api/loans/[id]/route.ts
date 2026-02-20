import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const loanId = Number(id);

    const existing = db.select().from(loans).where(eq(loans.id, loanId)).get();
    if (!existing) {
      return NextResponse.json({ error: "대출을 찾을 수 없습니다" }, { status: 404 });
    }

    db.update(loans)
      .set({
        loanType: body.loanType ?? existing.loanType,
        loanName: body.loanName ?? existing.loanName,
        purpose: body.purpose !== undefined ? body.purpose : existing.purpose,
        lender: body.lender ?? existing.lender,
        repayInstitution: body.repayInstitution !== undefined ? body.repayInstitution : existing.repayInstitution,
        originalAmount: body.originalAmount ? Number(body.originalAmount) : existing.originalAmount,
        outstandingAmount: body.outstandingAmount ? Number(body.outstandingAmount) : existing.outstandingAmount,
        interestRate: body.interestRate !== undefined ? Number(body.interestRate) : existing.interestRate,
        rateType: body.rateType ?? existing.rateType,
        variablePeriodMonths: body.variablePeriodMonths !== undefined ? (body.variablePeriodMonths ? Number(body.variablePeriodMonths) : null) : existing.variablePeriodMonths,
        variableNextRate: body.variableNextRate !== undefined ? (body.variableNextRate ? Number(body.variableNextRate) : null) : existing.variableNextRate,
        repayMethod: body.repayMethod !== undefined ? body.repayMethod : existing.repayMethod,
        monthlyPayment: body.monthlyPayment !== undefined ? (body.monthlyPayment ? Number(body.monthlyPayment) : null) : existing.monthlyPayment,
        paymentDay: body.paymentDay !== undefined ? (body.paymentDay ? Number(body.paymentDay) : null) : existing.paymentDay,
        startDate: body.startDate !== undefined ? body.startDate : existing.startDate,
        endDate: body.endDate !== undefined ? body.endDate : existing.endDate,
        note: body.note !== undefined ? body.note : existing.note,
      })
      .where(eq(loans.id, loanId))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/loans/[id] error:", error);
    return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const loanId = Number(id);

    const existing = db.select().from(loans).where(eq(loans.id, loanId)).get();
    if (!existing) {
      return NextResponse.json({ error: "대출을 찾을 수 없습니다" }, { status: 404 });
    }

    db.delete(loans).where(eq(loans.id, loanId)).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/loans/[id] error:", error);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
