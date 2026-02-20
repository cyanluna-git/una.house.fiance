import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loans } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const data = db.select().from(loans).orderBy(desc(loans.createdAt)).all();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/loans error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.loanType || !body.loanName || !body.lender || !body.originalAmount) {
      return NextResponse.json(
        { error: "필수 정보(대출유형, 대출명, 금융기관, 대출원금)를 입력하세요" },
        { status: 400 }
      );
    }

    const result = db
      .insert(loans)
      .values({
        loanType: body.loanType,
        loanName: body.loanName,
        purpose: body.purpose || null,
        lender: body.lender,
        repayInstitution: body.repayInstitution || null,
        originalAmount: Number(body.originalAmount),
        outstandingAmount: Number(body.outstandingAmount || body.originalAmount),
        interestRate: Number(body.interestRate || 0),
        rateType: body.rateType || "고정",
        variablePeriodMonths: body.variablePeriodMonths ? Number(body.variablePeriodMonths) : null,
        variableNextRate: body.variableNextRate ? Number(body.variableNextRate) : null,
        repayMethod: body.repayMethod || null,
        monthlyPayment: body.monthlyPayment ? Number(body.monthlyPayment) : null,
        paymentDay: body.paymentDay ? Number(body.paymentDay) : null,
        startDate: body.startDate || null,
        endDate: body.endDate || null,
        note: body.note || null,
      })
      .run();

    return NextResponse.json({
      success: true,
      id: Number(result.lastInsertRowid),
    });
  } catch (error) {
    console.error("POST /api/loans error:", error);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
