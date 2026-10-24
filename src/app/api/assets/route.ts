import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assetAccounts, assetSnapshots } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

const TYPES = ["청약", "예적금", "저축", "퇴직연금", "투자", "부동산", "차량", "기타"];

export async function GET() {
  try {
    const accounts = db.select().from(assetAccounts).orderBy(desc(assetAccounts.id)).all();
    const snaps = db.select().from(assetSnapshots).all();
    const data = accounts.map((a) => {
      const mine = snaps.filter((s) => s.accountId === a.id).sort((x, y) => (x.snapshotDate < y.snapshotDate ? 1 : -1));
      return { ...a, latest: mine[0] ?? null, snapshots: mine };
    });
    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/assets error:", error);
    return NextResponse.json({ error: "조회 실패", errorId: crypto.randomUUID() }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.assetType || !body.name) {
      return NextResponse.json({ error: "자산 종류와 이름은 필수입니다" }, { status: 400 });
    }
    if (!TYPES.includes(body.assetType)) {
      return NextResponse.json({ error: `자산 종류는 ${TYPES.join(", ")} 중 하나여야 합니다` }, { status: 400 });
    }
    const result = db
      .insert(assetAccounts)
      .values({
        assetType: body.assetType,
        name: body.name,
        institution: body.institution || null,
        accountNo: body.accountNo || null,
        monthlyDeposit: body.monthlyDeposit ? Number(body.monthlyDeposit) : null,
        depositDay: body.depositDay ? Number(body.depositDay) : null,
        interestRate: body.interestRate ? Number(body.interestRate) : null,
        startDate: body.startDate || null,
        maturityDate: body.maturityDate || null,
        isActive: body.isActive === false ? 0 : 1,
        note: body.note || null,
      })
      .run();
    return NextResponse.json({ success: true, id: Number(result.lastInsertRowid) });
  } catch (error) {
    console.error("POST /api/assets error:", error);
    return NextResponse.json({ error: "저장 실패", errorId: crypto.randomUUID() }, { status: 500 });
  }
}
