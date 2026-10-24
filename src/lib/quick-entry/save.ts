import { sqlite } from "@/lib/db";
import { normalizeTransactionDates } from "@/lib/statement-date";
import { checkDuplicate } from "@/lib/quick-entry/dedupe";
import { normalizeApprovalNo } from "@/lib/quick-entry/receipt";
import { resolveSelectedCard } from "@/lib/card-selection";

export interface SaveEntry {
  date: string;
  merchant: string;
  amount: number;
  cardCompany?: string | null;
  cardName?: string | null;
  /** 등록된 사용 중 카드 id. 서버에서 검증 후 카드사/카드명을 카드 정보로 덮어쓴다. */
  cardId?: number | string | null;
  paymentType?: string;
  installmentMonths?: number;
  categoryL1: string;
  categoryL2?: string;
  categoryL3?: string;
  necessity?: string;
  note?: string;
  approvalNo?: string | null;
  force?: boolean;
  receiptCheck?: "ok" | "mismatch" | "missing";
  amountConfirmed?: boolean;
}

export interface SaveResult {
  savedIds: number[];
  skipped: { index: number; reason: string }[];
}

/** 검토 완료된 거래를 저장한다. 서버에서 중복을 다시 검사한다. */
export function saveQuickEntries(entries: SaveEntry[], sourceType: "sms" | "receipt"): SaveResult {
  const insert = sqlite.prepare(`
      INSERT INTO transactions (
        date, original_date, billing_month, payment_month_candidate,
        aggregation_date, aggregation_month, aggregation_basis,
        card_company, card_name, merchant, amount, payment_type, installment_months,
        category_l1, category_l2, category_l3, necessity,
        note, source_type, is_manual, card_id, approval_no
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(date, merchant, amount, card_company) DO NOTHING
    `);

  const savedIds: number[] = [];
  const skipped: { index: number; reason: string }[] = [];

  const run = sqlite.transaction(() => {
    entries.forEach((e, index) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(e.date || "") || !e.merchant?.trim() || !Number.isInteger(e.amount) || e.amount === 0 || !e.categoryL1) {
        skipped.push({ index, reason: "필수값 누락 또는 형식 오류" });
        return;
      }
      if (e.receiptCheck && e.receiptCheck !== "ok" && !e.amountConfirmed) {
        skipped.push({ index, reason: "영수증 합계 검증 불일치 — 금액을 확인한 뒤 저장하세요" });
        return;
      }

      // 카드 id가 없으면(기존 카드사만 아는 항목) 카드를 추측해 연결하지 않는다.
      let finalCardId: number | null = null;
      let cardCompany = e.cardCompany || "수동입력";
      let cardName = e.cardName || null;
      if (e.cardId !== undefined && e.cardId !== null) {
        const selected = resolveSelectedCard(e.cardId);
        if (!selected.ok) {
          skipped.push({ index, reason: `카드 선택 오류: ${selected.error}` });
          return;
        }
        finalCardId = selected.card.id;
        cardCompany = selected.card.cardCompany;
        cardName = selected.card.cardName;
      }

      const approvalNo = normalizeApprovalNo(e.approvalNo);
      const dup = checkDuplicate({ date: e.date, merchant: e.merchant, amount: e.amount, cardCompany, approvalNo });
      if (dup.level === "exact" || (dup.level === "likely" && !e.force)) {
        skipped.push({ index, reason: `중복: ${dup.reason}` });
        return;
      }
      const d = normalizeTransactionDates({ originalDate: e.date });
      const r = insert.run(
        e.date, d.originalDate, d.billingMonth, d.paymentMonthCandidate,
        d.aggregationDate, d.aggregationMonth, d.aggregationBasis,
        cardCompany, cardName, e.merchant.trim(), e.amount, e.paymentType || "일시불", e.installmentMonths || 0,
        e.categoryL1, e.categoryL2 || "", e.categoryL3 || "", e.necessity || "unset",
        e.note || null, sourceType, finalCardId, approvalNo,
      );
      if (r.changes > 0) savedIds.push(Number(r.lastInsertRowid));
      else skipped.push({ index, reason: "중복: 동일 거래가 이미 존재합니다" });
    });
  });
  run();

  return { savedIds, skipped };
}
