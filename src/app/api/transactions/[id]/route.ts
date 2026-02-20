import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();

    const { categoryL1, categoryL2, categoryL3, necessity, familyMemberId, tripId, isCompanyExpense, note, merchant } = body;

    const updates: Record<string, any> = {};
    if (categoryL1 !== undefined) updates.categoryL1 = categoryL1;
    if (categoryL2 !== undefined) updates.categoryL2 = categoryL2;
    if (categoryL3 !== undefined) updates.categoryL3 = categoryL3;
    if (necessity !== undefined) updates.necessity = necessity;
    if (familyMemberId !== undefined) updates.familyMemberId = familyMemberId;
    if (tripId !== undefined) updates.tripId = tripId;
    if (isCompanyExpense !== undefined) updates.isCompanyExpense = isCompanyExpense;
    if (note !== undefined) updates.note = note;
    if (merchant !== undefined) updates.merchant = merchant;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "수정 항목이 없습니다" }, { status: 400 });
    }

    db.update(transactions).set(updates).where(eq(transactions.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/transactions/[id] error:", error);
    return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);

    db.delete(transactions).where(eq(transactions.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/transactions/[id] error:", error);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
