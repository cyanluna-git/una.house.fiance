import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categoryRules } from "@/lib/db/schema";
import { invalidateRulesCache } from "@/lib/categorizer";
import { eq } from "drizzle-orm";

// PATCH /api/category-rules/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (body.keyword !== undefined) updates.keyword = body.keyword;
  if (body.categoryL1 !== undefined) updates.categoryL1 = body.categoryL1;
  if (body.categoryL2 !== undefined) updates.categoryL2 = body.categoryL2;
  if (body.categoryL3 !== undefined) updates.categoryL3 = body.categoryL3;
  if (body.priority !== undefined) updates.priority = body.priority;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "수정할 필드가 없습니다" }, { status: 400 });
  }

  db.update(categoryRules)
    .set(updates)
    .where(eq(categoryRules.id, Number(id)))
    .run();

  invalidateRulesCache();
  return NextResponse.json({ success: true });
}

// DELETE /api/category-rules/[id]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  db.delete(categoryRules)
    .where(eq(categoryRules.id, Number(id)))
    .run();

  invalidateRulesCache();
  return NextResponse.json({ success: true });
}
