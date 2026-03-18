import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { desc, and, gte, lte, eq, count, type SQL } from "drizzle-orm";
import { categorizeMerchant } from "@/lib/categorizer";
import { normalizeTransactionDates } from "@/lib/statement-date";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const rawPage = parseInt(searchParams.get("page") ?? "1");
    const rawLimit = parseInt(searchParams.get("limit") ?? "50");
    const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit = Number.isNaN(rawLimit) || rawLimit < 1 ? 50 : Math.min(rawLimit, 200);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const categoryL1 = searchParams.get("categoryL1");
    const categoryL2 = searchParams.get("categoryL2");
    const cardCompany = searchParams.get("card");
    const cardId = searchParams.get("cardId");

    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];
    if (from) conditions.push(gte(transactions.aggregationDate, from));
    if (to) conditions.push(lte(transactions.aggregationDate, to));
    if (categoryL1) conditions.push(eq(transactions.categoryL1, categoryL1));
    if (categoryL2) conditions.push(eq(transactions.categoryL2, categoryL2));
    if (cardId) conditions.push(eq(transactions.cardId, Number(cardId)));
    else if (cardCompany) conditions.push(eq(transactions.cardCompany, cardCompany));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const result = db.select().from(transactions)
      .$dynamic()
      .where(whereClause)
      .orderBy(desc(transactions.aggregationDate), desc(transactions.id))
      .limit(limit)
      .offset(offset)
      .all();

    // Get total count
    const totalRow = db.select({ value: count() }).from(transactions)
      .$dynamic()
      .where(whereClause)
      .get();
    const total = totalRow?.value ?? 0;

    return NextResponse.json({ data: result, total, page, limit });
  } catch (error) {
    console.error("GET /api/transactions error:", error);
    return NextResponse.json({ error: "조회 실패" , errorId: crypto.randomUUID() }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      date,
      merchant,
      amount,
      paymentType = "수동입력",
      categoryL1,
      categoryL2,
      categoryL3,
      note,
      sourceType = "manual",
    } = body;

    if (!date || !merchant || !amount) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다" },
        { status: 400 }
      );
    }

    const cat = categoryL1
      ? { categoryL1, categoryL2: categoryL2 || "", categoryL3: categoryL3 || "", necessity: body.necessity || "unset" }
      : categorizeMerchant(merchant);

    const normalizedDates = normalizeTransactionDates({
      originalDate: date,
    });

    const result = db
      .insert(transactions)
      .values({
        date,
        originalDate: normalizedDates.originalDate,
        billingMonth: normalizedDates.billingMonth,
        paymentMonthCandidate: normalizedDates.paymentMonthCandidate,
        aggregationDate: normalizedDates.aggregationDate,
        aggregationMonth: normalizedDates.aggregationMonth,
        aggregationBasis: normalizedDates.aggregationBasis,
        cardCompany: body.cardCompany || "수동입력",
        merchant,
        amount,
        paymentType,
        categoryL1: cat.categoryL1,
        categoryL2: cat.categoryL2,
        categoryL3: cat.categoryL3,
        necessity: cat.necessity,
        familyMemberId: body.familyMemberId || null,
        tripId: body.tripId || null,
        note,
        sourceType,
        isManual: true,
      })
      .run();

    return NextResponse.json({
      success: true,
      id: result.lastInsertRowid,
    });
  } catch (error) {
    console.error("POST /api/transactions error:", error);
    return NextResponse.json({ error: "저장 실패" , errorId: crypto.randomUUID() }, { status: 500 });
  }
}
