import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fixedExpenses } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const data = db.select().from(fixedExpenses).orderBy(desc(fixedExpenses.createdAt)).all();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/fixed-expenses error:", error);
    return NextResponse.json({ error: "조회 실패" , errorId: crypto.randomUUID() }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name || !body.category || !body.amount) {
      return NextResponse.json(
        { error: "필수 정보(항목명, 분류, 금액)를 입력하세요" },
        { status: 400 }
      );
    }

    const startDate = body.startDate || new Date().toISOString().split("T")[0];
    const frequency = body.frequency || "monthly";

    // Validation: weekly/biweekly require non-empty weekdays
    if (frequency === "weekly" || frequency === "biweekly") {
      const weekdays = body.weekdays
        ? (typeof body.weekdays === "string" ? JSON.parse(body.weekdays) : body.weekdays)
        : [];
      if (!Array.isArray(weekdays) || weekdays.length === 0) {
        return NextResponse.json(
          { error: "주간/격주 항목은 요일을 1개 이상 선택하세요" },
          { status: 400 }
        );
      }
    }

    // Validation: annual requires annualDate in MM-DD format
    if (frequency === "annual") {
      if (!body.annualDate || !/^\d{2}-\d{2}$/.test(body.annualDate)) {
        return NextResponse.json(
          { error: "연간 항목은 날짜(MM-DD)를 입력하세요" },
          { status: 400 }
        );
      }
    }

    const weekdaysStr = body.weekdays
      ? (typeof body.weekdays === "string" ? body.weekdays : JSON.stringify(body.weekdays))
      : null;

    const result = db
      .insert(fixedExpenses)
      .values({
        name: body.name,
        category: body.category,
        amount: Number(body.amount),
        frequency: frequency,
        weekdays: weekdaysStr,
        annualDate: body.annualDate || null,
        paymentDay: body.paymentDay ? Number(body.paymentDay) : null,
        paymentMethod: body.paymentMethod || null,
        recipient: body.recipient || null,
        familyMemberId: body.familyMemberId ? Number(body.familyMemberId) : null,
        startDate: startDate,
        endDate: body.endDate || null,
        isActive: body.endDate ? false : true,
        note: body.note || null,
      })
      .run();

    return NextResponse.json({
      success: true,
      id: Number(result.lastInsertRowid),
    });
  } catch (error) {
    console.error("POST /api/fixed-expenses error:", error);
    return NextResponse.json({ error: "저장 실패" , errorId: crypto.randomUUID() }, { status: 500 });
  }
}
