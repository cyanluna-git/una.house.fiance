import { NextRequest, NextResponse } from "next/server";
import { parseMessages } from "@/lib/quick-entry/sms-parser";
import { checkDuplicate } from "@/lib/quick-entry/dedupe";
import { categorizeMerchant } from "@/lib/categorizer";
import { classifyMerchantsWithAi } from "@/lib/quick-entry/ai";
import { NECESSITY_DEFAULTS } from "@/lib/categories";

/**
 * POST /api/quick-entry/parse  { text: string, useAi?: boolean }
 * 카드 문자/카카오톡 텍스트 → 거래 후보 + 분류 + 중복 판정 (DB 저장 없음)
 */
export async function POST(request: NextRequest) {
  try {
    const { text, useAi = true } = await request.json();
    if (typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "텍스트를 입력하세요" }, { status: 400 });
    }
    if (text.length > 50_000) {
      return NextResponse.json({ error: "텍스트가 너무 깁니다" }, { status: 413 });
    }

    const parsed = parseMessages(text);

    const entries = parsed.map((p) => {
      const cat = p.merchant
        ? categorizeMerchant(p.merchant)
        : { categoryL1: "기타", categoryL2: "미분류", categoryL3: "", necessity: "unset" as const };
      const unclassified = cat.categoryL1 === "기타" && cat.categoryL2 === "미분류";
      const dup =
        p.date && p.merchant && p.amount !== null
          ? checkDuplicate({ date: p.date, merchant: p.merchant, amount: p.amount, cardCompany: p.cardCompany })
          : { level: "none" as const, reason: "", matches: [] };
      return { ...p, ...cat, classifiedBy: unclassified ? "none" : "rule", aiConfidence: null as number | null, duplicate: dup };
    });

    // 규칙 미분류 건만 AI 폴백
    if (useAi) {
      const targets = entries.filter((e) => e.classifiedBy === "none" && e.merchant).map((e) => e.merchant as string);
      if (targets.length) {
        const ai = await classifyMerchantsWithAi(targets);
        for (const e of entries) {
          const r = e.merchant ? ai.get(e.merchant) : undefined;
          if (r && r.categoryL1 !== "기타") {
            e.categoryL1 = r.categoryL1;
            e.categoryL2 = r.categoryL2;
            e.necessity = NECESSITY_DEFAULTS[r.categoryL1] || "unset";
            e.classifiedBy = "ai";
            e.aiConfidence = r.confidence;
          }
        }
      }
    }

    return NextResponse.json({ entries });
  } catch (error) {
    console.error("POST /api/quick-entry/parse error:", error);
    return NextResponse.json({ error: "파싱 실패", errorId: crypto.randomUUID() }, { status: 500 });
  }
}
