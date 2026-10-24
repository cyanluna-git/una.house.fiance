import { expect, test } from "vitest";
import { matchCard } from "../../src/lib/card-matcher";
const cards = [
  { id: 1, cardCompany: "현대카드", cardName: "M3 BOOST", cardNumber: "1234", isActive: true },
  { id: 2, cardCompany: "현대카드", cardName: "ZERO", cardNumber: "5678", isActive: true },
  { id: 3, cardCompany: "현대카드", cardName: "Old", cardNumber: "9999", isActive: false },
];
test("issuer alone never guesses a product", () => expect(matchCard(cards, { cardCompany: "현대카드" }).status).toBe("unmatched"));
test("unique last four selects canonical card", () => expect(matchCard(cards, { cardCompany: "현대카드", cardLast4: "1234" })).toMatchObject({ status: "matched", card: { id: 1 } }));
test("exact normalized product name matches", () => expect(matchCard(cards, { cardCompany: "현대카드", cardName: "본인 M3 BOOST" })).toMatchObject({ status: "matched", card: { id: 1 } }));
test("conflicting identity never auto selects", () => expect(matchCard(cards, { cardCompany: "현대카드", cardLast4: "1234", cardName: "ZERO" }).status).toBe("ambiguous"));
test("duplicate last four is ambiguous", () => expect(matchCard([...cards, { ...cards[0], id: 4 }], { cardCompany: "현대카드", cardLast4: "1234" }).status).toBe("ambiguous"));
test("inactive excluded for quick entries, allowed for historical import", () => {
  const hint = { cardCompany: "현대카드", cardLast4: "9999" };
  expect(matchCard(cards, hint).status).toBe("unmatched");
  expect(matchCard(cards, hint, true)).toMatchObject({ status: "matched", card: { id: 3 } });
});
