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
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name || !body.category || !body.amount || !body.startDate) {
      return NextResponse.json(
        { error: "필수 정보(항목명, 분류, 금액, 시작일)를 입력하세요" },
        { status: 400 }
      );
    }

    const result = db
      .insert(fixedExpenses)
      .values({
        name: body.name,
        category: body.category,
        amount: Number(body.amount),
        paymentDay: body.paymentDay ? Number(body.paymentDay) : null,
        paymentMethod: body.paymentMethod || null,
        recipient: body.recipient || null,
        familyMemberId: body.familyMemberId ? Number(body.familyMemberId) : null,
        startDate: body.startDate,
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
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
