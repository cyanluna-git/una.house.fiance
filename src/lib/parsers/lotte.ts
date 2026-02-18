import { parseHtmlXls } from "./html-xls";
import { ParsedTransaction } from "./types";

export function parseLotteCard(buffer: Buffer): ParsedTransaction[] {
  return parseHtmlXls(buffer, "롯데카드");
}
