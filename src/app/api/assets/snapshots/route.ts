import { NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";
import { assetAccounts, assetSnapshots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accountId = Number(body.accountId);
    if (!accountId || !DATE_RE.test(body.snapshotDate || "") || body.balance === undefined || body.balance === "") {
      return NextResponse.json({ error: "계좌, 기준일(YYYY-MM-DD), 평가금액은 필수입니다" }, { status: 400 });
    }
    const balance = Number(body.balance);
    if (!Number.isFinite(balance) || balance < 0) {
      return NextResponse.json({ error: "평가금액이 올바르지 않습니다" }, { status: 400 });
    }
    const account = db.select().from(assetAccounts).where(eq(assetAccounts.id, accountId)).get();
    if (!account) return NextResponse.json({ error: "자산을 찾을 수 없습니다" }, { status: 404 });

    const dup = sqlite
      .prepare("SELECT id FROM asset_snapshots WHERE account_id = ? AND snapshot_date = ?")
      .get(accountId, body.snapshotDate) as { id: number } | undefined;
    if (dup) {
      return NextResponse.json({ error: "같은 계좌·기준일의 스냅샷이 이미 있습니다" }, { status: 409 });
    }

    const result = db
      .insert(assetSnapshots)
      .values({
        accountId,
        snapshotDate: body.snapshotDate,
        balance,
        principal: body.principal !== undefined && body.principal !== "" ? Number(body.principal) : null,
        memo: body.memo || null,
      })
      .run();
    return NextResponse.json({ success: true, id: Number(result.lastInsertRowid) });
  } catch (error) {
    console.error("POST /api/assets/snapshots error:", error);
    return NextResponse.json({ error: "저장 실패", errorId: crypto.randomUUID() }, { status: 500 });
  }
}
