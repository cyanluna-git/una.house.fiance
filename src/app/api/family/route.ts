import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { familyMembers } from "@/lib/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const data = db.select().from(familyMembers).orderBy(desc(familyMembers.createdAt)).all();
    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/family error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (!body.name || !body.relation) {
      return NextResponse.json(
        { error: "이름과 관계를 입력하세요" },
        { status: 400 }
      );
    }

    const result = db
      .insert(familyMembers)
      .values({
        name: body.name,
        relation: body.relation,
        birthYear: body.birthYear ? Number(body.birthYear) : null,
        note: body.note || null,
      })
      .run();

    return NextResponse.json({
      success: true,
      id: Number(result.lastInsertRowid),
    });
  } catch (error) {
    console.error("POST /api/family error:", error);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
