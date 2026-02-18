import * as XLSX from "xlsx";
import { ParsedTransaction } from "./types";

export function parseWooriCard(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer);
  const transactions: ParsedTransaction[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

    // 우리카드 형식: 이용일자, 이용카드, 이용가맹점, 이용금액, 할부개월, 당월결제하실금액
    for (const row of rows) {
      const dateStr = row["이용일자"] || row["date"];
      if (!dateStr) continue;

      const formattedDate = formatDateString(dateStr);
      if (!formattedDate) continue;

      const merchant = (row["이용가맹점(은행)명"] || row["이용가맹점"] || "").toString().trim();
      const amount = parseAmount(row["이용금액(해외현지/체크카드)"] || row["이용금액"]);

      if (!merchant || amount === 0) continue;

      transactions.push({
        date: formattedDate,
        cardCompany: "우리카드",
        cardName: row["이용카드"] || undefined,
        merchant,
        amount,
        paymentType: row["매출구분"] || undefined,
        installmentMonths: parseInteger(row["할부개월"]),
        paymentAmount: parseAmount(row["당월결제하실금액"]),
        fee: parseAmount(row["수수료"]),
      });
    }
  }

  return transactions;
}

function formatDateString(dateStr: string | number): string | null {
  if (typeof dateStr === "number") {
    // Handle as Excel serial date if needed
    const baseDate = new Date("1900-01-01");
    const date = new Date(baseDate.getTime() + (dateStr - 2) * 24 * 60 * 60 * 1000);
    return date.toISOString().split("T")[0];
  }

  const str = String(dateStr).trim();

  // Format: 01.05 -> convert with year context (assume current/last year)
  const match = str.match(/^(\d{2})\.(\d{2})$/);
  if (match) {
    const [_, month, day] = match;
    const year = new Date().getFullYear();
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Format: 2025-01-31
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

function parseInteger(value: string | number | undefined): number {
  if (!value) return 0;
  if (typeof value === "number") return Math.round(value);

  const cleaned = String(value).replace(/[^\d-]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}
