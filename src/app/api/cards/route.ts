import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";
import { cards } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

// GET /api/cards
export async function GET(request: NextRequest) {
  try {
    // Ensure unlinked transactions are matched to registered cards
    try {
      sqlite
        .prepare(
          `UPDATE transactions
           SET card_id = (
             SELECT c.id FROM cards c
             WHERE c.card_company = transactions.card_company
               AND (
                 transactions.card_name = c.card_name
                 OR REPLACE(REPLACE(transactions.card_name, '본인', ''), ' ', '') = REPLACE(REPLACE(c.card_name, '본인', ''), ' ', '')
                 OR (c.card_number IS NOT NULL AND transactions.card_name LIKE '%' || REPLACE(c.card_number, '''', '') || '%')
               )
             LIMIT 1
           )
           WHERE card_id IS NULL
             AND EXISTS (
               SELECT 1 FROM cards c
               WHERE c.card_company = transactions.card_company
                 AND (
                   transactions.card_name = c.card_name
                   OR REPLACE(REPLACE(transactions.card_name, '본인', ''), ' ', '') = REPLACE(REPLACE(c.card_name, '본인', ''), ' ', '')
                   OR (c.card_number IS NOT NULL AND transactions.card_name LIKE '%' || REPLACE(c.card_number, '''', '') || '%')
                 )
             )`
        )
        .run();
    } catch (autoMatchErr) {
      console.warn("Auto-match card_id error:", autoMatchErr);
    }

    const data = db.select().from(cards).orderBy(desc(cards.createdAt)).all();

    // Available months with card transactions
    const availableMonthRows = sqlite
      .prepare(
        `SELECT DISTINCT substr(date, 1, 7) as m
         FROM transactions
         WHERE card_id IS NOT NULL AND date IS NOT NULL AND date != ''
         ORDER BY m DESC`
      )
      .all() as { m: string }[];
    const availableMonths = availableMonthRows.map((r) => r.m).filter(Boolean);

    // Determine target month: query param > current month (if has data) > latest month with data
    const queryMonth = request.nextUrl.searchParams.get("month");
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    let monthPrefix = currentMonth;
    if (queryMonth && /^\d{4}-\d{2}$/.test(queryMonth)) {
      monthPrefix = queryMonth;
    } else if (availableMonths.includes(currentMonth)) {
      monthPrefix = currentMonth;
    } else if (availableMonths.length > 0) {
      monthPrefix = availableMonths[0];
    }

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

    return NextResponse.json({
      data: result,
      usageMonth: monthPrefix,
      availableMonths,
    });
  } catch (error) {
    console.error("GET /api/cards error:", error);
    return NextResponse.json({ error: "조회 실패", errorId: crypto.randomUUID() }, { status: 500 });
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

    // Auto-match existing transactions by cardCompany + cardName (exact or normalized)
    const cardId = Number(result.lastInsertRowid);
    const matched = sqlite
      .prepare(
        `UPDATE transactions SET card_id = ?
         WHERE card_company = ? AND card_id IS NULL AND (
           card_name = ?
           OR REPLACE(REPLACE(card_name, '본인', ''), ' ', '') = REPLACE(REPLACE(?, '본인', ''), ' ', '')
           OR (? IS NOT NULL AND card_name LIKE '%' || REPLACE(?, '''', '') || '%')
         )`
      )
      .run(cardId, cardCompany, cardName, cardName, body.cardNumber || null, body.cardNumber || null);

    return NextResponse.json({
      success: true,
      id: cardId,
      matchedTransactions: matched.changes,
    });
  } catch (error) {
    console.error("POST /api/cards error:", error);
    return NextResponse.json({ error: "등록 실패", errorId: crypto.randomUUID() }, { status: 500 });
  }
}
