import { ParsedTransaction } from "./types";
import { parseKookminCard } from "./kookmin";
import { parseNonghyupCard } from "./nonghyup";
import { parseHyundaiCard } from "./hyundai";
import { parseLotteCard } from "./lotte";
import { parseShinhanCard } from "./shinhan";
import { parseHanaCard } from "./hana";
import { parseWooriCard } from "./woori";

export type CardCompany = "국민카드" | "농협카드" | "현대카드" | "롯데카드" | "신한카드" | "하나카드" | "우리카드";

export function detectCardCompany(fileName: string): CardCompany {
  const lower = fileName.toLowerCase();

  if (lower.includes("국민")) return "국민카드";
  if (lower.includes("농협")) return "농협카드";
  if (lower.includes("현대")) return "현대카드";
  if (lower.includes("롯데")) return "롯데카드";
  if (lower.includes("신한")) return "신한카드";
  if (lower.includes("하나")) return "하나카드";
  if (lower.includes("우리")) return "우리카드";

  throw new Error(`카드사를 인식할 수 없음: ${fileName}`);
}

export function parseFile(buffer: Buffer, fileName: string): ParsedTransaction[] {
  const cardCompany = detectCardCompany(fileName);

  try {
    switch (cardCompany) {
      case "국민카드":
        return parseKookminCard(buffer);
      case "농협카드":
        return parseNonghyupCard(buffer);
      case "현대카드":
        return parseHyundaiCard(buffer);
      case "롯데카드":
        return parseLotteCard(buffer);
      case "신한카드":
        return parseShinhanCard(buffer);
      case "하나카드":
        return parseHanaCard(buffer);
      case "우리카드":
        return parseWooriCard(buffer);
      default:
        return [];
    }
  } catch (error) {
    console.error(`[${cardCompany}] 파싱 에러:`, error);
    return [];
  }
}

export * from "./types";
