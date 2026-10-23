/**
 * PARSE-01~04: html-xls 파서 — 번호 보조 행이 금액으로 읽히지 않아야 한다.
 * 회귀: 롯데카드 2026.04 명세서의 "항공권 번호: 9490085089"가 9,490,085,089원 거래로 들어간 사고.
 */
import { describe, test, expect } from "vitest";
import { parseHtmlXls, isIdentifierText } from "../../src/lib/parsers/html-xls";

function statement(rows: string[][]): Buffer {
  const head = ["이용일", "이용카드", "이용하신 곳(가맹점)", "이용금액"];
  const tr = (cells: string[]) => `<tr>${cells.map((c) => `<td>${c}</td>`).join("")}</tr>`;
  return Buffer.from(`<html><body><table>${tr(head)}${rows.map(tr).join("")}</table></body></html>`, "utf-8");
}

describe("html-xls 파서", () => {
  test("PARSE-01 금액 칸이 빈 '항공권 번호: N' 행은 거래로 만들지 않는다", () => {
    const list = parseHtmlXls(
      statement([
        ["2026.03.24", "본인", "아시아나항공(BSP-WON)", "1,622,900원"],
        ["2026.03.24", "본인", "항공권 번호: 9490085089", ""],
      ]),
      "롯데카드"
    );
    expect(list.map((t) => t.merchant)).toEqual(["아시아나항공(BSP-WON)"]);
    expect(list.every((t) => Math.abs(t.amount) < 100_000_000)).toBe(true);
  });

  test("PARSE-02 승인번호/예약번호 보조 행도 제외", () => {
    expect(isIdentifierText("항공권 번호: 9490085089")).toBe(true);
    expect(isIdentifierText("승인번호: 12345678")).toBe(true);
    expect(isIdentifierText("예약번호：5566778899")).toBe(true);
    expect(isIdentifierText("엄청난해장국 26,000")).toBe(false);
  });

  test("PARSE-03 가맹점 끝 숫자가 금액인 기존 형식(현대카드)은 그대로 읽는다", () => {
    const list = parseHtmlXls(statement([["2026.03.20", "본인", "엄청난해장국 26,000", ""]]), "현대카드");
    expect(list).toHaveLength(1);
    expect(list[0].merchant).toBe("엄청난해장국");
    expect(list[0].amount).toBe(26000);
  });

  test("PARSE-04 1억 원 이상 금액은 거부", () => {
    const list = parseHtmlXls(statement([["2026.03.24", "본인", "이상한가맹점", "9,490,085,089원"]]), "롯데카드");
    expect(list).toHaveLength(0);
  });
});
