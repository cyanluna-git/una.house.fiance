export interface MatchableCard {
  id: number;
  cardCompany: string;
  cardName: string;
  cardNumber?: string | null;
  isActive: boolean | null;
}
export interface CardHint { cardCompany?: string | null; cardLast4?: string | null; cardName?: string | null }
export type CardMatch = { status: "matched"; card: MatchableCard } | { status: "ambiguous" | "unmatched" };
const normalize = (value: string) => value.replace(/본인/g, "").replace(/\s+/g, "").toUpperCase();

export function matchCard(cards: MatchableCard[], hint: CardHint, includeInactive = false): CardMatch {
  const pool = cards.filter(c => (includeInactive || c.isActive) && (!hint.cardCompany || c.cardCompany === hint.cardCompany));
  const last4 = hint.cardLast4 && /^\d{4}$/.test(hint.cardLast4) ? hint.cardLast4 : null;
  const byNumber = last4 ? pool.filter(c => c.cardNumber?.replace(/\D/g, "").slice(-4) === last4) : [];
  const byName = hint.cardName ? pool.filter(c => normalize(c.cardName) === normalize(hint.cardName!)) : [];
  if (byNumber.length && byName.length && !byNumber.some(c => byName.some(n => n.id === c.id))) return { status: "ambiguous" };
  const candidates = byNumber.length && byName.length ? byNumber.filter(c => byName.some(n => n.id === c.id)) : last4 ? byNumber : byName;
  if (candidates.length === 1) return { status: "matched", card: candidates[0] };
  return { status: candidates.length > 1 ? "ambiguous" : "unmatched" };
}
