// 영수증 이미지 → 구조화 추출 + 합계 검증 (AI 호출은 ai.ts 추상화 사용)
import { chatJson } from "@/lib/quick-entry/ai";

export interface ReceiptItem {
  name: string;
  amount: number; // 할인은 음수
}

export interface ReceiptExtract {
  store: string | null;
  date: string | null; // YYYY-MM-DD
  time: string | null;
  cardCompany: string | null;
  cardLast4: string | null;
  approvalNo: string | null;
  total: number | null; // 영수증에 인쇄된 합계/결제금액 (품목에서 계산하지 않는다)
  items: ReceiptItem[];
}

export type ReceiptCheck = "ok" | "mismatch" | "missing";

export interface ReceiptValidation {
  check: ReceiptCheck;
  itemsSum: number;
  total: number | null;
  diff: number | null; // total - itemsSum
  warnings: string[];
}

// v2 (2026-10-19 샘플 5장 측정): 합계 줄을 items에서 명시적으로 제외 → 품목합=합계 2/5 → 3/5.
// 3568(종이 잘림)은 total 오독(22,940, 실제 135,980). 품목은 불안정 → 저장 금액은 total 기준, 사람 확인 필수.
export const RECEIPT_PROMPT = `영수증 이미지입니다. 보이는 그대로 JSON만 출력하세요.
- total: 영수증 하단의 최종 결제 합계 한 줄(합계/결제금액/받을금액/카드승인 중 최종 금액)의 숫자. 이 값은 반드시 items에서 계산하지 말고 인쇄된 숫자를 그대로 쓴다.
- items: 실제 상품 줄만 넣는다. 아래 줄은 items에 절대 넣지 않는다: 합계, 결제, 카드승인, 받을금액, 부가세, 할인율, 할부, 면세, 과세, 포인트 합계, 거스름돈, 날짜/시간/번호 줄.
- 할인/쿠폰/포인트 할인 금액은 바로 위 상품의 음수 amount로 기록한다.
- 카드사(cardCompany), 카드번호 끝 4자리(cardLast4), 승인번호(approvalNo)가 보이면 기록한다.
- 날짜 YYYY-MM-DD, 시각 HH:mm. 보이지 않거나 잘리면 null. 추측 금지.`;

export const RECEIPT_SCHEMA = {
  type: "object",
  properties: {
    store: { type: ["string", "null"] },
    date: { type: ["string", "null"] },
    time: { type: ["string", "null"] },
    cardCompany: { type: ["string", "null"] },
    cardLast4: { type: ["string", "null"] },
    approvalNo: { type: ["string", "null"] },
    total: { type: ["number", "null"] },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          amount: { type: "number" },
        },
        required: ["name", "amount"],
      },
    },
  },
  required: ["store", "date", "time", "total", "items"],
};

/** 추출 결과를 정리한다 (타입/범위 보정). 값이 비정상이면 null로 둔다. */
export function normalizeExtract(raw: Partial<ReceiptExtract>): ReceiptExtract {
  const date = typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) ? raw.date : null;
  const time = typeof raw.time === "string" && /^\d{2}:\d{2}$/.test(raw.time) ? raw.time : null;
  const total = Number.isInteger(raw.total) && (raw.total as number) > 0 ? (raw.total as number) : null;
  const items = (Array.isArray(raw.items) ? raw.items : [])
    .filter((it) => it && typeof it.name === "string" && Number.isInteger(it.amount) && it.amount !== 0)
    .map((it) => ({ name: it.name.trim().slice(0, 80), amount: it.amount }));
  return {
    store: typeof raw.store === "string" && raw.store.trim() ? raw.store.trim() : null,
    date,
    time,
    cardCompany: typeof raw.cardCompany === "string" ? raw.cardCompany : null,
    cardLast4: typeof raw.cardLast4 === "string" && /^\d{4}$/.test(raw.cardLast4) ? raw.cardLast4 : null,
    approvalNo: typeof raw.approvalNo === "string" ? raw.approvalNo : null,
    total,
    items,
  };
}

/** 품목 합과 인쇄 합계를 비교한다. */
export function validateReceipt(r: ReceiptExtract): ReceiptValidation {
  const itemsSum = r.items.reduce((s, it) => s + it.amount, 0);
  const warnings: string[] = [];
  if (r.total === null) {
    return { check: "missing", itemsSum, total: null, diff: null, warnings: ["합계를 읽지 못함"] };
  }
  const diff = r.total - itemsSum;
  if (r.items.length === 0) warnings.push("품목을 읽지 못함 (합계만 사용)");
  if (diff !== 0) warnings.push(`품목 합(${itemsSum.toLocaleString()})과 합계(${r.total.toLocaleString()}) 차이 ${diff.toLocaleString()}원`);
  return { check: diff === 0 ? "ok" : "mismatch", itemsSum, total: r.total, diff, warnings };
}

/** 비전 모델로 영수증 1장 분석. 실패 시 throw (호출자가 수동 입력 폴백). */
export async function extractReceipt(imageBase64: string): Promise<ReceiptExtract> {
  const raw = (await chatJson({ prompt: RECEIPT_PROMPT, images: [imageBase64], schema: RECEIPT_SCHEMA })) as Partial<ReceiptExtract>;
  return normalizeExtract(raw);
}
