import { NextRequest, NextResponse } from "next/server";
import { extractList, verifyByDay } from "@/lib/quick-entry/history-list";
import { checkDuplicate } from "@/lib/quick-entry/dedupe";
import { categorizeMerchant } from "@/lib/categorizer";
import { classifyMerchantsWithAi } from "@/lib/quick-entry/ai";
import { NECESSITY_DEFAULTS } from "@/lib/categories";
import { cardCompanyFromCardName } from "@/lib/quick-entry/card-name";

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

/**
 * POST /api/quick-entry/list  (multipart/form-data: image, useAi?)
 * 결제 내역 목록 스크린샷 1장 → 검토용 후보 여러 건. DB에 저장하지 않는다. (쿠키 인증)
 * 각 후보에 일별 합계 검증 결과(dayCheck)를 붙여서, 화면에서 합계가 안 맞는 날을 표시한다.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("image");
    const useAi = form.get("useAi") !== "false";
    if (!(file instanceof File)) return NextResponse.json({ error: "image 파일이 필요합니다" }, { status: 400 });
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "jpeg/png/webp만 지원합니다" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "이미지가 12MB를 넘습니다" }, { status: 413 });

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    let extract;
    try {
      extract = await extractList(base64, kstToday());
    } catch (e) {
      console.warn("list extract failed:", (e as Error).message);
      return NextResponse.json({ entries: [], analysisFailed: true, error: "AI 분석 실패 — 잠시 후 다시 시도해 주세요" });
    }

    const verdicts = verifyByDay(extract);
    const entries = verdicts.flatMap((v) =>
      v.items.map((t) => {
        const cardCompany = cardCompanyFromCardName(t.card);
        const cat = categorizeMerchant(t.merchant);
        const unclassified = cat.categoryL1 === "기타" && cat.categoryL2 === "미분류";
        const dup = checkDuplicate({ date: t.date, merchant: t.merchant, amount: t.amount, cardCompany });
        return {
          date: t.date,
          merchant: t.merchant,
          amount: t.amount,
          cardCompany,
          cardName: t.card,
          time: t.time,
          note: [t.time ? `시각 ${t.time}` : null, "목록화면"].filter(Boolean).join(" · "),
          ...cat,
          classifiedBy: unclassified ? "none" : "rule",
          aiConfidence: null as number | null,
          duplicate: dup,
          dayCheck: {
            status: v.status,
            sum: v.sum,
            expected: v.expected,
          },
        };
      }),
    );

    if (useAi) {
      const targets = entries.filter((e) => e.classifiedBy === "none").map((e) => e.merchant);
      if (targets.length) {
        const ai = await classifyMerchantsWithAi(targets);
        for (const e of entries) {
          const r = ai.get(e.merchant);
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

    return NextResponse.json({ entries, dayTotals: extract.dayTotals });
  } catch (error) {
    console.error("POST /api/quick-entry/list error:", error);
    return NextResponse.json({ error: "분석 실패", errorId: crypto.randomUUID() }, { status: 500 });
  }
}
