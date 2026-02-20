import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactionSplits, transactions } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

// GET splits for a transaction
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const txId = Number(id);

    const splits = db
      .select()
      .from(transactionSplits)
      .where(eq(transactionSplits.transactionId, txId))
      .all();

    return NextResponse.json({ data: splits });
  } catch (error) {
    console.error("GET splits error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

// POST: create/replace splits for a transaction
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const txId = Number(id);
    const body = await request.json();

    // Validate transaction exists
    const tx = db.select().from(transactions).where(eq(transactions.id, txId)).get();
    if (!tx) {
      return NextResponse.json({ error: "거래를 찾을 수 없습니다" }, { status: 404 });
    }

    const splits = body.splits as Array<{
      categoryL1: string;
      categoryL2?: string;
      categoryL3?: string;
      amount: number;
      necessity?: string;
      note?: string;
    }>;

    if (!splits || splits.length < 2) {
      return NextResponse.json(
        { error: "분할은 최소 2개 항목이 필요합니다" },
        { status: 400 }
      );
    }

    // Validate total matches
    const splitTotal = splits.reduce((s, sp) => s + Number(sp.amount), 0);
    if (splitTotal !== tx.amount) {
      return NextResponse.json(
        { error: `분할 합계(${splitTotal.toLocaleString()}원)가 원거래 금액(${tx.amount.toLocaleString()}원)과 일치하지 않습니다` },
        { status: 400 }
      );
    }

    // Delete existing splits and insert new ones
    db.delete(transactionSplits).where(eq(transactionSplits.transactionId, txId)).run();

    for (const sp of splits) {
      db.insert(transactionSplits)
        .values({
          transactionId: txId,
          categoryL1: sp.categoryL1,
          categoryL2: sp.categoryL2 || "",
          categoryL3: sp.categoryL3 || "",
          amount: Number(sp.amount),
          necessity: sp.necessity || "unset",
          note: sp.note || null,
        })
        .run();
    }

    return NextResponse.json({ success: true, count: splits.length });
  } catch (error) {
    console.error("POST splits error:", error);
    return NextResponse.json({ error: "분할 저장 실패" }, { status: 500 });
  }
}

// DELETE: remove all splits for a transaction
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const txId = Number(id);

    db.delete(transactionSplits).where(eq(transactionSplits.transactionId, txId)).run();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE splits error:", error);
    return NextResponse.json({ error: "분할 삭제 실패" }, { status: 500 });
  }
}
