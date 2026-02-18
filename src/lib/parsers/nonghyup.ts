import * as XLSX from "xlsx";
import { ParsedTransaction } from "./types";

export function parseNonghyupCard(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer);
  const transactions: ParsedTransaction[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

    // 농협카드 형식: 이용일자, 이용카드, 이용가맹점, 이용금액, 청구원금, 수수료/이자
    for (const row of rows) {
      const dateStr = row["이용일자"] || row["date"];
      if (!dateStr) continue;

      const formattedDate = formatDateString(dateStr);
      if (!formattedDate) continue;

      const merchant = (row["이용가맹점"] || "").toString().trim();
      const amount = parseAmount(row["이용금액"] || row["amount"]);

      if (!merchant || amount === 0) continue;

      transactions.push({
        date: formattedDate,
        cardCompany: "농협카드",
        cardName: row["이용카드"] || undefined,
        merchant,
        amount,
        paymentAmount: parseAmount(row["청구원금"]),
        fee: parseAmount(row["수수료/이자"] || row["수수료"]),
        discount: 0,
      });
    }
  }

  return transactions;
}

function formatDateString(dateStr: string | number): string | null {
  if (typeof dateStr === "number") {
    const baseDate = new Date("1900-01-01");
    const date = new Date(baseDate.getTime() + (dateStr - 2) * 24 * 60 * 60 * 1000);
    return date.toISOString().split("T")[0];
  }

  const str = String(dateStr).trim();

  // Format: 2025/03/05 -> 2025-03-05
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
    return str.replace(/\//g, "-");
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  return null;
}

function parseAmount(value: string | number | undefined): number {
  if (!value) return 0;
  if (typeof value === "number") return Math.round(value);

  const cleaned = String(value)
    .replace(/[^\d.-]/g, "")
    .trim();
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : Math.round(amount);
}
