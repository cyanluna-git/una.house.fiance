import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { familyMembers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    db.delete(familyMembers).where(eq(familyMembers.id, Number(id))).run();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/family/[id] error:", error);
    return NextResponse.json(
      { error: "삭제 실패", errorId: crypto.randomUUID() },
      { status: 500 }
    );
  }
}
