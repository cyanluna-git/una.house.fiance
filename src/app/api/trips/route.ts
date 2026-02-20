import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trips, transactions } from "@/lib/db/schema";
import { desc, eq, sql } from "drizzle-orm";

export async function GET() {
  try {
    const allTrips = db.select().from(trips).orderBy(desc(trips.startDate)).all();

    // Attach expense summary, category breakdown, and transactions per trip
    const data = allTrips.map((trip) => {
      const expenses = db
        .select({ total: sql<number>`COALESCE(SUM(amount), 0)`, count: sql<number>`COUNT(*)` })
        .from(transactions)
        .where(eq(transactions.tripId, trip.id))
        .get();

      const categoryBreakdown = db
        .select({
          category: transactions.categoryL2,
          total: sql<number>`COALESCE(SUM(amount), 0)`,
          count: sql<number>`COUNT(*)`,
        })
        .from(transactions)
        .where(eq(transactions.tripId, trip.id))
        .groupBy(transactions.categoryL2)
        .orderBy(sql`SUM(amount) DESC`)
        .all();

      const txList = db
        .select({
          id: transactions.id,
          date: transactions.date,
          merchant: transactions.merchant,
          amount: transactions.amount,
          categoryL2: transactions.categoryL2,
          cardCompany: transactions.cardCompany,
        })
        .from(transactions)
        .where(eq(transactions.tripId, trip.id))
        .orderBy(desc(transactions.date))
        .all();

      return {
        ...trip,
        totalExpense: expenses?.total ?? 0,
        transactionCount: expenses?.count ?? 0,
        categoryBreakdown,
        transactions: txList,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/trips error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { error: "여행명을 입력하세요" },
        { status: 400 }
      );
    }

    const result = db
      .insert(trips)
      .values({
        name: body.name,
        destination: body.destination || null,
        startDate: body.startDate || null,
        endDate: body.endDate || null,
        budget: body.budget ? Number(body.budget) : null,
        note: body.note || null,
      })
      .run();

    return NextResponse.json({
      success: true,
      id: Number(result.lastInsertRowid),
    });
  } catch (error) {
    console.error("POST /api/trips error:", error);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
