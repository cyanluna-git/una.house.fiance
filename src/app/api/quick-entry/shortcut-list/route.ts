import { NextRequest, NextResponse } from "next/server";
import { extractList, verifyByDay } from "@/lib/quick-entry/history-list";
import { checkDuplicate } from "@/lib/quick-entry/dedupe";
import { categorizeMerchant } from "@/lib/categorizer";
import { saveQuickEntries, type SaveEntry } from "@/lib/quick-entry/save";
import { NECESSITY_DEFAULTS } from "@/lib/categories";
import { cardCompanyFromCardName } from "@/lib/quick-entry/card-name";

const MAX_BYTES = 12 * 1024 * 1024;

function kstToday(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

/**
 * POST /api/quick-entry/shortcut-list  (이미지 본문 또는 multipart image)
 * 카드사 앱 결제 내역 목록 스크린샷 → 여러 건. Authorization: Bearer <UNAHOUSE_SHORTCUT_TOKEN>
 *
 * 날짜별로 "거래 합 = 화면 상단 일별 합계"가 맞는 날짜만 저장한다.
 * 합계가 안 맞거나 없는 날짜, 카드를 모르는 건, 분류 불가 건, 중복 건은 저장하지 않고 요약에 적는다.
 */
export async function POST(request: NextRequest) {
  try {
    let bytes: Buffer;
    const ctype = request.headers.get("content-type") ?? "";
    if (ctype.startsWith("multipart/form-data")) {
      const form = await request.formData();
      const f = form.get("image") ?? form.get("file");
      if (!(f instanceof File)) {
        return NextResponse.json({ status: "error", message: "⚠️ image 파일이 필요합니다" }, { status: 400 });
      }
      bytes = Buffer.from(await f.arrayBuffer());
    } else {
      bytes = Buffer.from(await request.arrayBuffer());
    }
    if (!bytes.length) {
      return NextResponse.json({ status: "error", message: "⚠️ 이미지가 비어 있습니다" }, { status: 400 });
    }
    if (bytes.length > MAX_BYTES) {
      return NextResponse.json({ status: "error", message: "⚠️ 이미지가 12MB를 넘습니다" }, { status: 413 });
    }

    let extract;
    try {
      extract = await extractList(bytes.toString("base64"), kstToday());
    } catch (e) {
      console.warn("shortcut-list extract failed:", (e as Error).message);
      return NextResponse.json({ status: "error", message: "⚠️ 분석 서버 응답 실패 — 잠시 후 다시 시도" }, { status: 502 });
    }
    if (!extract.transactions.length) {
      return NextResponse.json({ status: "error", message: "⚠️ 화면에서 결제 내역을 찾지 못했습니다" });
    }

    const verdicts = verifyByDay(extract);
    const candidates: { label: string; save: SaveEntry }[] = [];
    const hold: string[] = [];
    let duplicates = 0;

    for (const v of verdicts) {
      const md = v.date.slice(5).replace("-", "/");
      if (v.status !== "verified") {
        const why = v.status === "mismatch"
          ? `합계 불일치 (읽은 합 ${v.sum.toLocaleString("ko-KR")} / 화면 ${v.expected!.toLocaleString("ko-KR")})`
          : "일별 합계 없음";
        hold.push(`${md} ${v.items.length}건 보류 — ${why}`);
        continue;
      }
      for (const t of v.items) {
        const cardCompany = cardCompanyFromCardName(t.card);
        const cat = categorizeMerchant(t.merchant);
        const unclassified = cat.categoryL1 === "기타" && cat.categoryL2 === "미분류";
        if (!cardCompany || unclassified) {
          hold.push(`${md} ${t.merchant} ${t.amount.toLocaleString("ko-KR")}원 보류 — ${!cardCompany ? "카드 불명" : "분류 불가"}`);
          continue;
        }
        const dup = checkDuplicate({ date: t.date, merchant: t.merchant, amount: t.amount, cardCompany });
        if (dup.level === "exact" || dup.level === "likely") {
          duplicates++;
          continue;
        }
        candidates.push({
          label: `${md} ${t.merchant} ${t.amount.toLocaleString("ko-KR")}원`,
          save: {
            date: t.date,
            merchant: t.merchant,
            amount: t.amount,
            cardCompany,
            paymentType: t.payType && /할부/.test(t.payType) ? "할부" : "일시불",
            categoryL1: cat.categoryL1,
            categoryL2: cat.categoryL2,
            categoryL3: cat.categoryL3,
            necessity: NECESSITY_DEFAULTS[cat.categoryL1] || "unset",
            note: [t.time ? `시각 ${t.time}` : null, "목록화면"].filter(Boolean).join(" · "),
          },
        });
      }
    }

    const { savedIds, skipped } = saveQuickEntries(candidates.map((c) => c.save), "sms");
    const skippedIdx = new Set(skipped.map((s) => s.index));

    const lines: string[] = [];
    if (savedIds.length) lines.push(`✅ ${savedIds.length}건 저장`);
    candidates.forEach((c, i) => {
      if (!skippedIdx.has(i)) lines.push(`  · ${c.label}`);
    });
    const dupTotal = duplicates + skipped.length;
    if (dupTotal) lines.push(`⏭ 중복/제외 ${dupTotal}건`);
    if (hold.length) {
      lines.push(`⚠️ 보류 ${hold.length}건 (웹에서 확인)`);
      for (const h of hold.slice(0, 6)) lines.push(`  · ${h}`);
    }

    return NextResponse.json({
      status: hold.length ? "needs_review" : "ok",
      saved: savedIds.length,
      savedIds,
      duplicates: dupTotal,
      hold,
      message: lines.join("\n") || "저장할 거래가 없습니다",
    });
  } catch (error) {
    console.error("POST /api/quick-entry/shortcut-list error:", error);
    return NextResponse.json({ status: "error", message: "⚠️ 저장 실패 (서버 로그 확인)" }, { status: 500 });
  }
}
