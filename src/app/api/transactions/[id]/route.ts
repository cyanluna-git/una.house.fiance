import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { resolveSelectedCard } from "@/lib/card-selection";
import { eq } from "drizzle-orm";
import { normalizeTransactionDates } from "@/lib/statement-date";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idStr } = await params;
    const id = parseInt(idStr);
    const body = await request.json();

    const {
      categoryL1,
      categoryL2,
      categoryL3,
      necessity,
      familyMemberId,
      tripId,
      isCompanyExpense,
      note,
      merchant,
      date,
      cardId,
      cardCompany,
      cardName,
    } = body;

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
    if (date !== undefined) {
      updates.date = date;
      updates.originalDate = date;

      const existing = db
        .select()
        .from(transactions)
        .where(eq(transactions.id, id))
        .get();

      if (existing) {
        const normalized = normalizeTransactionDates({
          originalDate: date,
          billingMonth: existing.billingMonth,
          paymentMonthCandidate: existing.paymentMonthCandidate,
        });
        updates.aggregationDate = normalized.aggregationDate;
        updates.aggregationMonth = normalized.aggregationMonth;
        updates.aggregationBasis = normalized.aggregationBasis;
      }
    }

    if (cardId !== undefined) {
      if (cardId === null) {
        updates.cardId = null;
        if (cardCompany !== undefined) updates.cardCompany = cardCompany;
        updates.cardName = cardName || cardCompany || null;
      } else {
        const existing = db.select().from(transactions).where(eq(transactions.id, id)).get();
        if (!existing) return NextResponse.json({ error: "거래를 찾을 수 없습니다" }, { status: 404 });
        const selected = resolveSelectedCard(cardId, existing.cardId);
        if (!selected.ok) return NextResponse.json({ error: selected.error }, { status: 400 });
        updates.cardId = selected.card.id;
        updates.cardCompany = selected.card.cardCompany;
        updates.cardName = selected.card.cardName;
      }
    } else {
      if (cardCompany !== undefined) updates.cardCompany = cardCompany;
      if (cardName !== undefined) updates.cardName = cardName;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "수정 항목이 없습니다" }, { status: 400 });
    }

    db.update(transactions).set(updates).where(eq(transactions.id, id)).run();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("PATCH /api/transactions/[id] error:", error);
    if (error?.message?.includes("UNIQUE constraint failed")) {
      return NextResponse.json({ error: "동일한 일자/가맹점/금액/결제수단의 거래가 이미 존재합니다" }, { status: 409 });
    }
    return NextResponse.json({ error: "수정 실패", errorId: crypto.randomUUID() }, { status: 500 });
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
    return NextResponse.json({ error: "삭제 실패" , errorId: crypto.randomUUID() }, { status: 500 });
  }
}
