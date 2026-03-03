import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { loans } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

interface ScheduleRow {
  month: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  remaining: number;
}

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

    if (!loan.endDate) {
      return NextResponse.json({
        schedule: [],
        error: "만기일 없음 - 대출 만기일을 설정하면 상환 일정을 계산할 수 있습니다",
      });
    }

    if (!loan.startDate) {
      return NextResponse.json({
        schedule: [],
        error: "시작일 없음 - 대출 시작일을 설정하면 상환 일정을 계산할 수 있습니다",
      });
    }

    // Calculate total months between start and end
    const startDate = new Date(loan.startDate);
    const endDate = new Date(loan.endDate);
    const totalMonths =
      (endDate.getFullYear() - startDate.getFullYear()) * 12 +
      (endDate.getMonth() - startDate.getMonth());

    if (totalMonths <= 0) {
      return NextResponse.json({
        schedule: [],
        error: "만기일이 시작일보다 이전입니다",
      });
    }

    const P = loan.originalAmount;
    const annualRate = loan.interestRate / 100;
    const r = annualRate / 12; // monthly rate
    const n = totalMonths;

    const schedule: ScheduleRow[] = [];

    if (loan.repayMethod === "원리금균등") {
      // Equal payment (principal + interest): M = P*r*(1+r)^n / ((1+r)^n - 1)
      let M: number;
      if (r === 0) {
        // No interest: equal principal payments
        M = Math.round(P / n);
      } else {
        const factor = Math.pow(1 + r, n);
        M = Math.round((P * r * factor) / (factor - 1));
      }

      let remaining = P;
      for (let i = 1; i <= n; i++) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + i);
        const dateStr = date.toISOString().slice(0, 10);

        const interestPayment = r === 0 ? 0 : Math.round(remaining * r);
        const principalPayment = i === n ? remaining : M - interestPayment;
        const payment = principalPayment + interestPayment;
        remaining = Math.max(0, remaining - principalPayment);

        schedule.push({
          month: i,
          date: dateStr,
          payment,
          principal: principalPayment,
          interest: interestPayment,
          remaining,
        });
      }
    } else if (loan.repayMethod === "원금균등") {
      // Equal principal payments
      const monthlyPrincipal = Math.round(P / n);
      let remaining = P;

      for (let i = 1; i <= n; i++) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + i);
        const dateStr = date.toISOString().slice(0, 10);

        const interestPayment = r === 0 ? 0 : Math.round(remaining * r);
        const principalPayment = i === n ? remaining : monthlyPrincipal;
        const payment = principalPayment + interestPayment;
        remaining = Math.max(0, remaining - principalPayment);

        schedule.push({
          month: i,
          date: dateStr,
          payment,
          principal: principalPayment,
          interest: interestPayment,
          remaining,
        });
      }
    } else if (loan.repayMethod === "만기일시") {
      // Interest-only, then lump sum at end
      for (let i = 1; i <= n; i++) {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + i);
        const dateStr = date.toISOString().slice(0, 10);

        const interestPayment = r === 0 ? 0 : Math.round(P * r);
        const principalPayment = i === n ? P : 0;
        const payment = principalPayment + interestPayment;
        const remaining = i === n ? 0 : P;

        schedule.push({
          month: i,
          date: dateStr,
          payment,
          principal: principalPayment,
          interest: interestPayment,
          remaining,
        });
      }
    } else {
      // 자유상환 or unknown: cannot generate schedule
      return NextResponse.json({
        schedule: [],
        error: "자유상환 방식은 상환 일정을 자동 생성할 수 없습니다",
      });
    }

    return NextResponse.json({
      schedule,
      totalInterest: schedule.reduce((s, row) => s + row.interest, 0),
      totalPayment: schedule.reduce((s, row) => s + row.payment, 0),
    });
  } catch (error) {
    console.error("GET /api/loans/[id]/schedule error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
