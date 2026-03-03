import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fixedExpenses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const expenseId = Number(id);

    const existing = db.select().from(fixedExpenses).where(eq(fixedExpenses.id, expenseId)).get();
    if (!existing) {
      return NextResponse.json({ error: "항목을 찾을 수 없습니다" }, { status: 404 });
    }

    const frequency = body.frequency !== undefined ? body.frequency : existing.frequency;

    // Validation: weekly/biweekly require non-empty weekdays
    if (frequency === "weekly" || frequency === "biweekly") {
      const weekdaysRaw = body.weekdays !== undefined ? body.weekdays : existing.weekdays;
      const weekdays = weekdaysRaw
        ? (typeof weekdaysRaw === "string" ? JSON.parse(weekdaysRaw) : weekdaysRaw)
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
      const annualDate = body.annualDate !== undefined ? body.annualDate : existing.annualDate;
      if (!annualDate || !/^\d{2}-\d{2}$/.test(annualDate)) {
        return NextResponse.json(
          { error: "연간 항목은 날짜(MM-DD)를 입력하세요" },
          { status: 400 }
        );
      }
    }

    const weekdaysStr = body.weekdays !== undefined
      ? (body.weekdays ? (typeof body.weekdays === "string" ? body.weekdays : JSON.stringify(body.weekdays)) : null)
      : existing.weekdays;

    db.update(fixedExpenses)
      .set({
        name: body.name ?? existing.name,
        category: body.category ?? existing.category,
        amount: body.amount !== undefined ? Number(body.amount) : existing.amount,
        frequency: frequency ?? "monthly",
        weekdays: weekdaysStr,
        annualDate: body.annualDate !== undefined ? (body.annualDate || null) : existing.annualDate,
        paymentDay: body.paymentDay !== undefined ? (body.paymentDay ? Number(body.paymentDay) : null) : existing.paymentDay,
        paymentMethod: body.paymentMethod !== undefined ? body.paymentMethod : existing.paymentMethod,
        recipient: body.recipient !== undefined ? body.recipient : existing.recipient,
        familyMemberId: body.familyMemberId !== undefined ? (body.familyMemberId ? Number(body.familyMemberId) : null) : existing.familyMemberId,
        startDate: body.startDate ?? existing.startDate,
        endDate: body.endDate !== undefined ? body.endDate : existing.endDate,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
        note: body.note !== undefined ? body.note : existing.note,
      })
      .where(eq(fixedExpenses.id, expenseId))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/fixed-expenses/[id] error:", error);
    return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const expenseId = Number(id);

    const existing = db.select().from(fixedExpenses).where(eq(fixedExpenses.id, expenseId)).get();
    if (!existing) {
      return NextResponse.json({ error: "항목을 찾을 수 없습니다" }, { status: 404 });
    }

    db.delete(fixedExpenses).where(eq(fixedExpenses.id, expenseId)).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/fixed-expenses/[id] error:", error);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
