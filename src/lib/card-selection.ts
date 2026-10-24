import { sqlite } from "@/lib/db";

export interface SelectedCard {
  id: number;
  cardCompany: string;
  cardName: string;
}

export type CardSelectionResult =
  | { ok: true; card: SelectedCard }
  | { ok: false; error: string };

/** 명시적으로 넘어온 카드 id를 양의 정수로 해석한다. 아니면 null. */
export function parseCardId(value: unknown): number | null {
  if (typeof value === "number") return Number.isSafeInteger(value) && value > 0 ? value : null;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) {
    const n = Number(value.trim());
    return Number.isSafeInteger(n) && n > 0 ? n : null;
  }
  return null;
}

/**
 * 명시적 카드 선택을 검증한다. 존재하고 사용 중인 카드만 허용한다.
 * allowInactiveId: 거래에 이미 연결된 (지금은 해지된) 카드를 그대로 유지할 때만 허용.
 */
export function resolveSelectedCard(value: unknown, allowInactiveId?: number | null): CardSelectionResult {
  const id = parseCardId(value);
  if (id === null) return { ok: false, error: "유효하지 않은 카드입니다" };
  const row = sqlite
    .prepare("SELECT id, card_company, card_name, is_active FROM cards WHERE id = ?")
    .get(id) as { id: number; card_company: string; card_name: string; is_active: number | null } | undefined;
  if (!row) return { ok: false, error: "등록되지 않은 카드입니다" };
  if (row.is_active === 0 && row.id !== allowInactiveId) return { ok: false, error: "사용 중지된 카드는 선택할 수 없습니다" };
  return { ok: true, card: { id: row.id, cardCompany: row.card_company, cardName: row.card_name } };
}
