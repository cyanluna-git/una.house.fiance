// 카드사 앱 화면에 보이는 카드명(예: "M3 BOOST(메탈)") → 카드사
// 지금은 현대카드 표기만 안다. 다른 카드는 스크린샷 샘플을 받으면 추가한다. 모르면 null.
const RULES: [string, RegExp][] = [["현대카드", /\bM\d?\b|BOOST|현대|HYUNDAI|ZERO/i]];

export function cardCompanyFromCardName(card: string | null | undefined): string | null {
  if (!card) return null;
  for (const [company, re] of RULES) if (re.test(card)) return company;
  return null;
}
