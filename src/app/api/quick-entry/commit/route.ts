import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { normalizeTransactionDates } from "@/lib/statement-date";
import { checkDuplicate } from "@/lib/quick-entry/dedupe";

interface CommitEntry {
  date: string;
  merchant: string;
  amount: number;
  cardCompany?: string | null;
  paymentType?: string;
  installmentMonths?: number;
  categoryL1: string;
  categoryL2?: string;
  categoryL3?: string;
  necessity?: string;
  note?: string;
  /** 사용자가 중복 경고를 확인하고 그래도 저장하겠다고 한 경우 */
  force?: boolean;
}

/**
 * POST /api/quick-entry/commit  { entries: CommitEntry[], sourceType?: "sms" | "receipt" }
 * 검토 화면에서 확정한 항목을 저장. 서버에서 중복을 다시 검사한다.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entries: CommitEntry[] = body.entries;
    const sourceType: string = body.sourceType === "receipt" ? "receipt" : "sms";
    if (!Array.isArray(entries) || !entries.length) {
      return NextResponse.json({ error: "저장할 항목이 없습니다" }, { status: 400 });
    }

    const cardRows = sqlite
      .prepare("SELECT id, card_company FROM cards ORDER BY id")
      .all() as { id: number; card_company: string }[];
    const cardIdByCompany = new Map<string, number>();
    for (const c of cardRows) if (!cardIdByCompany.has(c.card_company)) cardIdByCompany.set(c.card_company, c.id);

    const insert = sqlite.prepare(`
      INSERT INTO transactions (
        date, original_date, billing_month, payment_month_candidate,
        aggregation_date, aggregation_month, aggregation_basis,
        card_company, merchant, amount, payment_type, installment_months,
        category_l1, category_l2, category_l3, necessity,
        note, source_type, is_manual, card_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      ON CONFLICT(date, merchant, amount, card_company) DO NOTHING
    `);

    const saved: number[] = [];
    const skipped: { index: number; reason: string }[] = [];

    const run = sqlite.transaction(() => {
      entries.forEach((e, index) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date || "") || !e.merchant?.trim() || !Number.isInteger(e.amount) || e.amount === 0 || !e.categoryL1) {
          skipped.push({ index, reason: "필수값 누락 또는 형식 오류" });
          return;
        }
        const cardCompany = e.cardCompany || "수동입력";
        const dup = checkDuplicate({ date: e.date, merchant: e.merchant, amount: e.amount, cardCompany });
        if (dup.level === "exact" || (dup.level === "likely" && !e.force)) {
          skipped.push({ index, reason: `중복: ${dup.reason}` });
          return;
        }
        const d = normalizeTransactionDates({ originalDate: e.date });
        const r = insert.run(
          e.date, d.originalDate, d.billingMonth, d.paymentMonthCandidate,
          d.aggregationDate, d.aggregationMonth, d.aggregationBasis,
          cardCompany, e.merchant.trim(), e.amount, e.paymentType || "일시불", e.installmentMonths || 0,
          e.categoryL1, e.categoryL2 || "", e.categoryL3 || "", e.necessity || "unset",
          e.note || null, sourceType, cardIdByCompany.get(cardCompany) ?? null,
        );
        if (r.changes > 0) saved.push(Number(r.lastInsertRowid));
        else skipped.push({ index, reason: "중복: 동일 거래가 이미 존재합니다" });
      });
    });
    run();

    return NextResponse.json({ success: true, savedCount: saved.length, savedIds: saved, skipped });
  } catch (error) {
    console.error("POST /api/quick-entry/commit error:", error);
    return NextResponse.json({ error: "저장 실패", errorId: crypto.randomUUID() }, { status: 500 });
  }
}
