import * as XLSX from "xlsx";
import { ParsedTransaction } from "./types";

export function parseHanaCard(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer);
  const transactions: ParsedTransaction[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

    // 하나카드 형식: 거래일자, 가맹점명, 이용금액, 결제원금, 수수료, 혜택금액
    for (const row of rows) {
      const dateStr = row["거래일자"] || row["date"];
      if (!dateStr) continue;

      const formattedDate = formatDateString(dateStr);
      if (!formattedDate) continue;

      const merchant = (row["가맹점명"] || "").toString().trim();
      const amount = parseAmount(row["이용금액"] || row["amount"]);

      if (!merchant || amount === 0) continue;

      // Skip header/footer rows
      if (merchant.includes("합계") || merchant.includes("소계") || merchant.includes("이용상세내역")) {
        continue;
      }

      transactions.push({
        date: formattedDate,
        cardCompany: "하나카드",
        merchant,
        amount,
        paymentAmount: parseAmount(row["결제원금"]),
        fee: parseAmount(row["수수료"]),
        discount: parseAmount(row["혜택금액"]),
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

  // Format: 2025.02.05 -> 2025-02-05
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(str)) {
    return str.replace(/\./g, "-");
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
