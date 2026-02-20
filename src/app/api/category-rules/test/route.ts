import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { categoryRules } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { NECESSITY_DEFAULTS } from "@/lib/categories";

// POST /api/category-rules/test
export async function POST(request: NextRequest) {
  const { merchant } = await request.json();

  if (!merchant) {
    return NextResponse.json({ error: "merchant는 필수입니다" }, { status: 400 });
  }

  const rules = db
    .select()
    .from(categoryRules)
    .orderBy(desc(categoryRules.priority))
    .all();

  const lowerMerchant = merchant.toLowerCase();

  for (const rule of rules) {
    if (lowerMerchant.includes(rule.keyword.toLowerCase())) {
      return NextResponse.json({
        matched: true,
        rule,
        result: {
          categoryL1: rule.categoryL1,
          categoryL2: rule.categoryL2 || "",
          categoryL3: rule.categoryL3 || "",
          necessity: NECESSITY_DEFAULTS[rule.categoryL1] || "unset",
        },
      });
    }
  }

  return NextResponse.json({
    matched: false,
    result: {
      categoryL1: "기타",
      categoryL2: "미분류",
      categoryL3: "",
      necessity: "unset",
    },
  });
}
