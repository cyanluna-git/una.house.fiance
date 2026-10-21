import { NextRequest, NextResponse } from "next/server";
import { categorizeMerchant } from "@/lib/categorizer";
import { classifyMerchantsWithAi } from "@/lib/quick-entry/ai";
import { checkDuplicate } from "@/lib/quick-entry/dedupe";
import { extractReceipt, validateReceipt, type ReceiptValidation } from "@/lib/quick-entry/receipt";
import { NECESSITY_DEFAULTS } from "@/lib/categories";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * POST /api/quick-entry/receipt  (multipart/form-data: image, useAi?)
 * 영수증 사진 1장을 분석해 검토용 후보 1건을 돌려준다. DB에 저장하지 않는다.
 * 이미지는 메모리에서만 처리하고 버린다.
 */
export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("image");
    const useAi = form.get("useAi") !== "false";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "image 파일이 필요합니다" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: "jpeg/png/webp만 지원합니다 (iPhone은 사진을 JPEG로 변환해 올려 주세요)" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "이미지가 8MB를 넘습니다" }, { status: 413 });
    }

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

    let extract;
    try {
      extract = await extractReceipt(base64);
    } catch (e) {
      // AI 불가 → 빈 후보로 돌려 주고 사용자가 직접 입력하게 한다
      console.warn("receipt extract failed:", (e as Error).message);
      return NextResponse.json({
        entries: [],
        error: "AI 분석 실패 — 직접 입력해 주세요",
        analysisFailed: true,
      });
    }

    const validation: ReceiptValidation = validateReceipt(extract);

    const merchant = extract.store ?? "";
    let cat = merchant
      ? categorizeMerchant(merchant)
      : { categoryL1: "기타", categoryL2: "미분류", categoryL3: "", necessity: "unset" as const };
    let classifiedBy: "rule" | "ai" | "none" = cat.categoryL1 === "기타" && cat.categoryL2 === "미분류" ? "none" : "rule";
    let aiConfidence: number | null = null;

    if (useAi && classifiedBy === "none" && merchant) {
      const ai = await classifyMerchantsWithAi([merchant]);
      const r = ai.get(merchant);
      if (r && r.categoryL1 !== "기타") {
        cat = {
          categoryL1: r.categoryL1,
          categoryL2: r.categoryL2,
          categoryL3: "",
          necessity: (NECESSITY_DEFAULTS[r.categoryL1] || "unset") as typeof cat.necessity,
        };
        classifiedBy = "ai";
        aiConfidence = r.confidence;
      }
    }

    // 합계를 못 읽었으면 중복 판정도 하지 않는다 (금액 불명)
    const dup =
      extract.date && merchant && extract.total !== null
        ? checkDuplicate({ date: extract.date, merchant, amount: extract.total, cardCompany: extract.cardCompany ?? "수동입력", approvalNo: extract.approvalNo })
        : { level: "none" as const, reason: "", matches: [] };

    // 메모: 품목은 참고용으로 요약 (300자 상한)
    const itemText = extract.items
      .map((it) => `${it.name} ${it.amount.toLocaleString()}`)
      .join(" / ");
    const memo = `[영수증] 품목 ${extract.items.length}개: ${itemText}`.slice(0, 300);

    const entry = {
      date: extract.date ?? "",
      merchant,
      amount: extract.total,
      cardCompany: extract.cardCompany,
      cardLast4: extract.cardLast4,
      approvalNo: extract.approvalNo,
      time: extract.time,
      categoryL1: cat.categoryL1,
      categoryL2: cat.categoryL2,
      categoryL3: cat.categoryL3,
      necessity: cat.necessity,
      note: memo,
      classifiedBy,
      aiConfidence,
      duplicate: dup,
      receipt: {
        check: validation.check,
        itemsSum: validation.itemsSum,
        total: validation.total,
        diff: validation.diff,
        warnings: validation.warnings,
        items: extract.items,
      },
      // 검토 화면에서 사람이 확인해야 저장 가능 (mismatch/missing은 기본 확인 필요)
      requiresReview: validation.check !== "ok" || classifiedBy === "none" || dup.level !== "none",
    };

    return NextResponse.json({ entries: [entry] });
  } catch (error) {
    console.error("POST /api/quick-entry/receipt error:", error);
    return NextResponse.json({ error: "분석 실패", errorId: crypto.randomUUID() }, { status: 500 });
  }
}
