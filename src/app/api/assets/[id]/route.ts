import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assetAccounts, assetSnapshots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const accountId = Number(id);
    const existing = db.select().from(assetAccounts).where(eq(assetAccounts.id, accountId)).get();
    if (!existing) return NextResponse.json({ error: "자산을 찾을 수 없습니다" }, { status: 404 });
    const body = await request.json();
    db.update(assetAccounts)
      .set({
        assetType: body.assetType ?? existing.assetType,
        name: body.name ?? existing.name,
        institution: body.institution !== undefined ? body.institution || null : existing.institution,
        accountNo: body.accountNo !== undefined ? body.accountNo || null : existing.accountNo,
        monthlyDeposit: body.monthlyDeposit !== undefined ? (body.monthlyDeposit ? Number(body.monthlyDeposit) : null) : existing.monthlyDeposit,
        depositDay: body.depositDay !== undefined ? (body.depositDay ? Number(body.depositDay) : null) : existing.depositDay,
        interestRate: body.interestRate !== undefined ? (body.interestRate ? Number(body.interestRate) : null) : existing.interestRate,
        startDate: body.startDate !== undefined ? body.startDate || null : existing.startDate,
        maturityDate: body.maturityDate !== undefined ? body.maturityDate || null : existing.maturityDate,
        isActive: body.isActive !== undefined ? (body.isActive ? 1 : 0) : existing.isActive,
        note: body.note !== undefined ? body.note || null : existing.note,
      })
      .where(eq(assetAccounts.id, accountId))
      .run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PUT /api/assets/[id] error:", error);
    return NextResponse.json({ error: "수정 실패", errorId: crypto.randomUUID() }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const accountId = Number(id);
    const existing = db.select().from(assetAccounts).where(eq(assetAccounts.id, accountId)).get();
    if (!existing) return NextResponse.json({ error: "자산을 찾을 수 없습니다" }, { status: 404 });
    db.delete(assetSnapshots).where(eq(assetSnapshots.accountId, accountId)).run();
    db.delete(assetAccounts).where(eq(assetAccounts.id, accountId)).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/assets/[id] error:", error);
    return NextResponse.json({ error: "삭제 실패", errorId: crypto.randomUUID() }, { status: 500 });
  }
}
