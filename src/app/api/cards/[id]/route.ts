import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";
import { cards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// PUT /api/cards/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = db
      .select()
      .from(cards)
      .where(eq(cards.id, Number(id)))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "카드를 찾을 수 없습니다" }, { status: 404 });
    }

    const body = await request.json();

    db.update(cards)
      .set({
        cardCompany: body.cardCompany ?? existing.cardCompany,
        cardName: body.cardName ?? existing.cardName,
        cardNumber: body.cardNumber !== undefined ? body.cardNumber || null : existing.cardNumber,
        cardType: body.cardType ?? existing.cardType,
        isActive: body.isActive !== undefined ? body.isActive : existing.isActive,
        annualFee: body.annualFee !== undefined ? Number(body.annualFee) : existing.annualFee,
        issueDate: body.issueDate !== undefined ? body.issueDate || null : existing.issueDate,
        expiryDate: body.expiryDate !== undefined ? body.expiryDate || null : existing.expiryDate,
        monthlyTarget: body.monthlyTarget !== undefined
          ? (body.monthlyTarget ? Number(body.monthlyTarget) : null)
          : existing.monthlyTarget,
        monthlyDiscountLimit: body.monthlyDiscountLimit !== undefined
          ? (body.monthlyDiscountLimit ? Number(body.monthlyDiscountLimit) : null)
          : existing.monthlyDiscountLimit,
        mainBenefits: body.mainBenefits !== undefined ? body.mainBenefits || null : existing.mainBenefits,
        familyMemberId: body.familyMemberId !== undefined
          ? (body.familyMemberId ? Number(body.familyMemberId) : null)
          : existing.familyMemberId,
        note: body.note !== undefined ? body.note || null : existing.note,
      })
      .where(eq(cards.id, Number(id)))
      .run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/cards error:", error);
    return NextResponse.json({ error: "수정 실패" }, { status: 500 });
  }
}

// DELETE /api/cards/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const existing = db
      .select()
      .from(cards)
      .where(eq(cards.id, Number(id)))
      .get();

    if (!existing) {
      return NextResponse.json({ error: "카드를 찾을 수 없습니다" }, { status: 404 });
    }

    // Unlink transactions that reference this card
    sqlite
      .prepare("UPDATE transactions SET card_id = NULL WHERE card_id = ?")
      .run(Number(id));

    db.delete(cards).where(eq(cards.id, Number(id))).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/cards error:", error);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
