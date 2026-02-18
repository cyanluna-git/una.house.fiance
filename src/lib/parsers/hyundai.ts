import { parseHtmlXls } from "./html-xls";
import { ParsedTransaction } from "./types";

export function parseHyundaiCard(buffer: Buffer): ParsedTransaction[] {
  return parseHtmlXls(buffer, "현대카드");
}
