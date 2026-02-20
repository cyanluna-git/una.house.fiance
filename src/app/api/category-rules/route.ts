import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categoryRules } from "@/lib/db/schema";
import { invalidateRulesCache } from "@/lib/categorizer";
import { and, desc, like, eq } from "drizzle-orm";

// GET /api/category-rules?search=xxx&categoryL1=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search");
  const categoryL1 = searchParams.get("categoryL1");

  const conditions = [];
  if (search) {
    conditions.push(like(categoryRules.keyword, `%${search}%`));
  }
  if (categoryL1) {
    conditions.push(eq(categoryRules.categoryL1, categoryL1));
  }

  const results = conditions.length > 0
    ? db.select().from(categoryRules).where(and(...conditions)).orderBy(desc(categoryRules.priority)).all()
    : db.select().from(categoryRules).orderBy(desc(categoryRules.priority)).all();

  return NextResponse.json({ data: results, total: results.length });
}

// POST /api/category-rules
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { keyword, categoryL1: l1, categoryL2: l2, categoryL3: l3, priority } = body;

  if (!keyword || !l1) {
    return NextResponse.json({ error: "keyword와 categoryL1은 필수입니다" }, { status: 400 });
  }

  const result = db.insert(categoryRules).values({
    keyword,
    categoryL1: l1,
    categoryL2: l2 || "",
    categoryL3: l3 || "",
    priority: priority ?? 10,
  }).returning().get();

  invalidateRulesCache();
  return NextResponse.json(result, { status: 201 });
}
