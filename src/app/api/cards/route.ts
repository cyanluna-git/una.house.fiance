import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";
import { cards } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

// GET /api/cards
export async function GET() {
  try {
    const data = db.select().from(cards).orderBy(desc(cards.createdAt)).all();

    // Get current month usage per card (by card_id)
    const now = new Date();
    const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const usageRows = sqlite
      .prepare(
        `SELECT card_id, SUM(ABS(amount)) as total
         FROM transactions
         WHERE card_id IS NOT NULL AND date LIKE ?
         GROUP BY card_id`
      )
      .all(`${monthPrefix}%`) as { card_id: number; total: number }[];

    const usageMap = new Map<number, number>();
    for (const row of usageRows) {
      usageMap.set(row.card_id, row.total);
    }

    const result = data.map((card) => ({
      ...card,
      monthlyUsage: usageMap.get(card.id) || 0,
    }));

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error("GET /api/cards error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

// POST /api/cards
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cardCompany, cardName } = body;

    if (!cardCompany || !cardName) {
      return NextResponse.json(
        { error: "카드사와 카드명은 필수입니다" },
        { status: 400 }
      );
    }

    const result = db
      .insert(cards)
      .values({
        cardCompany,
        cardName,
        cardNumber: body.cardNumber || null,
        cardType: body.cardType || "신용",
        isActive: body.isActive !== false,
        annualFee: body.annualFee ? Number(body.annualFee) : 0,
        issueDate: body.issueDate || null,
        expiryDate: body.expiryDate || null,
        monthlyTarget: body.monthlyTarget ? Number(body.monthlyTarget) : null,
        monthlyDiscountLimit: body.monthlyDiscountLimit
          ? Number(body.monthlyDiscountLimit)
          : null,
        mainBenefits: body.mainBenefits || null,
        familyMemberId: body.familyMemberId
          ? Number(body.familyMemberId)
          : null,
        note: body.note || null,
      })
      .run();

    // Auto-match existing transactions by cardCompany + cardName
    const cardId = Number(result.lastInsertRowid);
    const matched = sqlite
      .prepare(
        `UPDATE transactions SET card_id = ?
         WHERE card_company = ? AND card_name = ? AND card_id IS NULL`
      )
      .run(cardId, cardCompany, cardName);

    return NextResponse.json({
      success: true,
      id: cardId,
      matchedTransactions: matched.changes,
    });
  } catch (error) {
    console.error("POST /api/cards error:", error);
    return NextResponse.json({ error: "등록 실패" }, { status: 500 });
  }
}
