import * as XLSX from "xlsx";
import { ParsedTransaction } from "./types";

export function parseKookminCard(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer);
  const transactions: ParsedTransaction[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

    // 국민카드 형식: 이용일자, 이용카드, 구분, 이용하신 가맹점, 이용금액, 할부개월, 이번달 결제금액
    for (const row of rows) {
      const dateStr = row["이용일자"] || row["date"];
      if (!dateStr) continue;

      const formattedDate = formatDateString(dateStr);
      if (!formattedDate) continue;

      const amount = parseAmount(row["이용금액"] || row["amount"]);
      const merchant = (row["이용하신 가맹점"] || row["merchant"] || "").toString().trim();

      if (!merchant || amount === 0) continue;

      transactions.push({
        date: formattedDate,
        cardCompany: "국민카드",
        cardName: row["이용카드"] || undefined,
        merchant,
        amount,
        paymentType: row["구분"] || undefined,
        installmentMonths: parseInteger(row["할부개월"]),
        paymentAmount: parseAmount(row["이번달 결제금액"]),
      });
    }
  }

  return transactions;
}

function formatDateString(dateStr: string | number): string | null {
  if (typeof dateStr === "number") {
    // Excel serial date (days since 1900-01-01)
    const baseDate = new Date("1900-01-01");
    const date = new Date(baseDate.getTime() + (dateStr - 2) * 24 * 60 * 60 * 1000);
    return date.toISOString().split("T")[0];
  }

  const str = String(dateStr).trim();

  // Try format: 25.01.31 -> 2025-01-31
  const match = str.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (match) {
    const [_, year, month, day] = match;
    return `20${year}-${month}-${day}`;
  }

  // Try format: 2025-01-31
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Try format: 2025/01/31
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
    return str.replace(/\//g, "-");
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

function parseInteger(value: string | number | undefined): number {
  if (!value) return 0;
  if (typeof value === "number") return Math.round(value);

  const cleaned = String(value).replace(/[^\d-]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}
