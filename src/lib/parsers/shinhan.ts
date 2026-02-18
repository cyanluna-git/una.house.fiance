import { parseHtmlXls } from "./html-xls";
import { ParsedTransaction } from "./types";

export function parseShinhanCard(buffer: Buffer): ParsedTransaction[] {
  return parseHtmlXls(buffer, "신한카드");
}
