import { NextRequest, NextResponse } from "next/server";
import { parseMessages, type ParsedEntry } from "@/lib/quick-entry/sms-parser";
import { checkDuplicate } from "@/lib/quick-entry/dedupe";
import { categorizeMerchant } from "@/lib/categorizer";
import { saveQuickEntries, type SaveEntry } from "@/lib/quick-entry/save";
import { NECESSITY_DEFAULTS } from "@/lib/categories";

/**
 * POST /api/quick-entry/shortcut  { text: string }
 * 아이폰 단축어 전용. Authorization: Bearer <UNAHOUSE_SHORTCUT_TOKEN>
 * (middleware가 이 경로에 한해서만 토큰을 허용한다.)
 *
 * 금액·날짜·가맹점이 모두 있고, 경고가 없고, 규칙으로 분류되고, 중복이 아닌 건만 바로 저장.
 * 나머지는 저장하지 않고 needsReview로 돌려준다 (웹 /quick 화면에서 확인).
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text : "";
    if (!text.trim()) {
      return NextResponse.json({ status: "error", message: "⚠️ 텍스트가 비어 있습니다" }, { status: 400 });
    }
    if (text.length > 20_000) {
      return NextResponse.json({ status: "error", message: "⚠️ 텍스트가 너무 깁니다" }, { status: 413 });
    }

    const parsed = parseMessages(text);
    if (!parsed.length) {
      return NextResponse.json({ status: "error", message: "⚠️ 거래 문자를 찾지 못했습니다" });
    }

    const candidates: { p: ParsedEntry; save: SaveEntry }[] = [];
    const review: ParsedEntry[] = [];
    let duplicates = 0;

    for (const p of parsed) {
      const cat = p.merchant
        ? categorizeMerchant(p.merchant)
        : { categoryL1: "기타", categoryL2: "미분류", categoryL3: "", necessity: "unset" as const };
      const unclassified = cat.categoryL1 === "기타" && cat.categoryL2 === "미분류";

      // 가맹점명에 금액/할부 문구가 섞였으면 파서가 잘못 자른 것 → 자동 저장하지 않는다
      const merchantPolluted = !!p.merchant && /\d[\d,]*\s*원|일시불|할부|누적|잔여/.test(p.merchant);
      if (p.amount === null || !p.date || !p.merchant || p.warnings.length || unclassified || merchantPolluted) {
        review.push(p);
        continue;
      }
      const dup = checkDuplicate({ date: p.date, merchant: p.merchant, amount: p.amount, cardCompany: p.cardCompany });
      if (dup.level === "exact" || dup.level === "likely") {
        duplicates++;
        continue;
      }
      candidates.push({
        p,
        save: {
          date: p.date,
          merchant: p.merchant,
          amount: p.amount,
          cardCompany: p.cardCompany,
          paymentType: p.paymentType,
          installmentMonths: p.installmentMonths,
          categoryL1: cat.categoryL1,
          categoryL2: cat.categoryL2,
          categoryL3: cat.categoryL3,
          necessity: NECESSITY_DEFAULTS[cat.categoryL1] || "unset",
          note: p.time ? `시각 ${p.time}` : undefined,
        },
      });
    }

    const { savedIds, skipped } = saveQuickEntries(
      candidates.map((c) => c.save),
      "sms",
    );
    const skippedIdx = new Set(skipped.map((s) => s.index));

    const lines: string[] = [];
    candidates.forEach((c, i) => {
      if (!skippedIdx.has(i)) {
        lines.push(`✅ ${c.p.merchant} ${(c.p.amount as number).toLocaleString("ko-KR")}원 저장`);
      }
    });
    if (duplicates) lines.push(`⏭ 중복 ${duplicates}건 건너뜀`);
    if (skipped.length) lines.push(`⏭ 저장 제외 ${skipped.length}건 (DB 중복 또는 형식 오류)`);
    if (review.length) {
      lines.push(`⚠️ 확인 필요 ${review.length}건 — 웹 /quick 에서 확인해 주세요`);
      for (const p of review.slice(0, 3)) {
        const amt = p.amount !== null ? `${p.amount.toLocaleString("ko-KR")}원` : "금액?";
        lines.push(`   · ${p.merchant ?? "가맹점?"} ${amt} (${p.warnings.join(", ") || "분류 불가"})`);
      }
    }

    return NextResponse.json({
      status: review.length ? "needs_review" : "ok",
      saved: savedIds.length,
      savedIds,
      duplicates,
      needsReview: review.map((p) => ({ raw: p.raw, merchant: p.merchant, amount: p.amount, warnings: p.warnings })),
      message: lines.join("\n") || "저장할 거래가 없습니다",
    });
  } catch (error) {
    console.error("POST /api/quick-entry/shortcut error:", error);
    return NextResponse.json({ status: "error", message: "⚠️ 저장 실패 (서버 로그 확인)" }, { status: 500 });
  }
}
