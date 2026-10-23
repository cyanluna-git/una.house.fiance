// 카드사 앱 "결제 내역 목록" 스크린샷 → 거래 여러 건 추출 + 일별 합계 검증
import { chatJson } from "@/lib/quick-entry/ai";

export interface ListTx {
  date: string; // YYYY-MM-DD
  time: string | null;
  merchant: string;
  card: string | null;
  payType: string | null;
  amount: number; // 취소는 음수
}

export interface DayTotal {
  day: number;
  total: number;
}

export interface ListExtract {
  transactions: ListTx[];
  dayTotals: DayTotal[];
}

export function buildListPrompt(today: string): string {
  return `카드사 앱의 '결제 내역 목록' 화면 스크린샷입니다. 화면에 보이는 모든 결제 건을 보이는 그대로 JSON으로 출력하세요.
- 날짜 구분 줄(예: '10. 22(목)') 아래에 그 날짜의 거래가 묶여 있습니다. 각 거래의 date는 자신이 속한 구분 줄의 날짜(YYYY-MM-DD)입니다. 오늘은 ${today}입니다. 연도는 오늘 기준으로 추정하세요.
- merchant: 가맹점명 전체. 줄바꿈으로 잘려 있어도 이어 붙입니다. 시각·카드·결제방식 줄은 가맹점명이 아닙니다.
- time: 거래 줄에 보이는 HH:mm. card: 카드명(예: M3 BOOST). payType: 일시불/할부 등. 안 보이면 null.
- amount: 거래 오른쪽에 인쇄된 금액 숫자. 취소·환불은 음수. 추측 금지.
- dayTotals: 화면 상단 주간 달력/막대에 일자별 합계 금액이 표시돼 있으면 {day: 일(숫자), total: 금액}으로 모두 기록. 없으면 빈 배열.
- 화면에 보이지 않는 거래를 만들지 마세요.`;
}

export const LIST_SCHEMA = {
  type: "object",
  properties: {
    transactions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string" },
          time: { type: ["string", "null"] },
          merchant: { type: "string" },
          card: { type: ["string", "null"] },
          payType: { type: ["string", "null"] },
          amount: { type: "integer" },
        },
        required: ["date", "time", "merchant", "card", "amount"],
      },
    },
    dayTotals: {
      type: "array",
      items: {
        type: "object",
        properties: { day: { type: "integer" }, total: { type: "integer" } },
        required: ["day", "total"],
      },
    },
  },
  required: ["transactions", "dayTotals"],
};

export function normalizeList(raw: Partial<ListExtract>): ListExtract {
  const transactions = (Array.isArray(raw.transactions) ? raw.transactions : [])
    .filter(
      (t) =>
        t &&
        typeof t.merchant === "string" &&
        t.merchant.trim() &&
        typeof t.date === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(t.date) &&
        Number.isInteger(t.amount) &&
        t.amount !== 0,
    )
    .map((t) => ({
      date: t.date,
      time: typeof t.time === "string" && /^\d{1,2}:\d{2}$/.test(t.time) ? t.time.padStart(5, "0") : null,
      merchant: t.merchant.trim().slice(0, 80),
      card: typeof t.card === "string" && t.card.trim() ? t.card.trim() : null,
      payType: typeof t.payType === "string" && t.payType.trim() ? t.payType.trim() : null,
      amount: t.amount,
    }));
  const dayTotals = (Array.isArray(raw.dayTotals) ? raw.dayTotals : []).filter(
    (d) => d && Number.isInteger(d.day) && d.day >= 1 && d.day <= 31 && Number.isInteger(d.total),
  );
  return { transactions, dayTotals };
}

export interface DayVerdict {
  date: string;
  items: ListTx[];
  sum: number;
  expected: number | null;
  status: "verified" | "mismatch" | "no_total";
}

/** 날짜별로 거래 합과 화면 상단 일별 합계를 비교한다. verified인 날짜만 자동 저장 대상. */
export function verifyByDay(x: ListExtract): DayVerdict[] {
  const byDate = new Map<string, ListTx[]>();
  for (const t of x.transactions) byDate.set(t.date, [...(byDate.get(t.date) ?? []), t]);
  const totalByDay = new Map<number, number>();
  for (const d of x.dayTotals) totalByDay.set(d.day, d.total);

  return Array.from(byDate.entries())
    .sort(([a], [b]) => (a < b ? 1 : -1))
    .map(([date, items]) => {
      const sum = items.reduce((s, t) => s + t.amount, 0);
      const expected = totalByDay.get(Number(date.slice(8, 10))) ?? null;
      const status = expected === null ? "no_total" : expected === sum ? "verified" : "mismatch";
      return { date, items, sum, expected, status } as DayVerdict;
    });
}

export async function extractList(imageBase64: string, today: string): Promise<ListExtract> {
  const raw = (await chatJson({
    prompt: buildListPrompt(today),
    images: [imageBase64],
    schema: LIST_SCHEMA,
  })) as Partial<ListExtract>;
  return normalizeList(raw);
}
