import { sqlite } from "@/lib/db";

export type DupLevel = "exact" | "likely" | "possible" | "none";

export interface DupMatch {
  id: number;
  date: string;
  merchant: string;
  amount: number;
  cardCompany: string;
  sourceType: string | null;
}

export interface DupResult {
  level: DupLevel;
  reason: string;
  matches: DupMatch[];
}

function norm(s: string) {
  return s.toLowerCase().replace(/[\s()\[\]_\-.·*]/g, "").replace(/\(주\)|주식회사/g, "");
}

/** 0~1 문자 bigram 유사도 */
export function similarity(a: string, b: string): number {
  const x = norm(a), y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.85;
  const grams = (s: string) => {
    const set = new Map<string, number>();
    for (let i = 0; i < s.length - 1; i++) {
      const g = s.slice(i, i + 2);
      set.set(g, (set.get(g) || 0) + 1);
    }
    return set;
  };
  const gx = grams(x), gy = grams(y);
  let inter = 0, total = 0;
  gx.forEach((c, g) => { inter += Math.min(c, gy.get(g) || 0); total += c; });
  gy.forEach((c) => { total += c; });
  return total ? (2 * inter) / total : 0;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * 기존 거래와 중복 여부 판정.
 *  exact    : 날짜·가맹점·금액·카드사 동일 (DB unique 인덱스와 동일 기준)
 *  likely   : 날짜·금액 동일 + (카드사 동일 또는 가맹점 유사) — 카드 명세서 임포트의 수동입력 중복 기준과 동일
 *  possible : 날짜 ±1일, 금액 동일, 가맹점 유사 (결제일/승인일 차이)
 */
export function checkDuplicate(entry: {
  date: string;
  merchant: string;
  amount: number;
  cardCompany?: string | null;
}): DupResult {
  const rows = sqlite
    .prepare(
      `SELECT id, date, merchant, amount, card_company AS cardCompany, source_type AS sourceType
       FROM transactions WHERE amount = ? AND date BETWEEN ? AND ?`,
    )
    .all(entry.amount, shiftDate(entry.date, -1), shiftDate(entry.date, 1)) as DupMatch[];

  const exact: DupMatch[] = [];
  const likely: DupMatch[] = [];
  const possible: DupMatch[] = [];

  for (const r of rows) {
    const sim = similarity(entry.merchant, r.merchant);
    const sameCard = !!entry.cardCompany && r.cardCompany === entry.cardCompany;
    if (r.date === entry.date) {
      if (r.merchant === entry.merchant && (sameCard || !entry.cardCompany)) exact.push(r);
      else if (sameCard || sim >= 0.5) likely.push(r);
      else possible.push(r);
    } else if (sim >= 0.5 || sameCard) {
      possible.push(r);
    }
  }

  if (exact.length) return { level: "exact", reason: "날짜·가맹점·금액·카드사 동일", matches: exact };
  if (likely.length) return { level: "likely", reason: "같은 날 같은 금액 (카드사 또는 가맹점 유사)", matches: likely };
  if (possible.length) return { level: "possible", reason: "±1일 내 같은 금액·유사 가맹점", matches: possible };
  return { level: "none", reason: "", matches: [] };
}
