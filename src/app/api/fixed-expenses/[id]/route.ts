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

    db.update(fixedExpenses)
      .set({
        name: body.name ?? existing.name,
        category: body.category ?? existing.category,
        amount: body.amount !== undefined ? Number(body.amount) : existing.amount,
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
