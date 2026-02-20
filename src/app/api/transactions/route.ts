import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { desc, and, gte, lte, eq } from "drizzle-orm";
import { categorizeMerchant } from "@/lib/categorizer";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const categoryL1 = searchParams.get("categoryL1");
    const categoryL2 = searchParams.get("categoryL2");
    const cardCompany = searchParams.get("card");

    const offset = (page - 1) * limit;

    const conditions: any[] = [];
    if (from) conditions.push(gte(transactions.date, from));
    if (to) conditions.push(lte(transactions.date, to));
    if (categoryL1) conditions.push(eq(transactions.categoryL1, categoryL1));
    if (categoryL2) conditions.push(eq(transactions.categoryL2, categoryL2));
    if (cardCompany) conditions.push(eq(transactions.cardCompany, cardCompany));

    let query = db.select().from(transactions);
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }

    const result = query
      .orderBy(desc(transactions.date))
      .limit(limit)
      .offset(offset)
      .all();

    // Get total count
    const allData = conditions.length > 0
      ? (db.select().from(transactions).where(and(...conditions)) as any).all()
      : db.select().from(transactions).all();

    const total = allData.length;

    return NextResponse.json({ data: result, total, page, limit });
  } catch (error) {
    console.error("GET /api/transactions error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
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

    const result = db
      .insert(transactions)
      .values({
        date,
        cardCompany: "수동입력",
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
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
