import * as XLSX from "xlsx";
import { ParsedTransaction } from "./types";

export function parseHanaCard(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer);
  const transactions: ParsedTransaction[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { defval: "", header: 1 });

    // Find header row by scanning for "거래일자" and "가맹점"
    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      const rowStr = (rows[i] as any[]).map((c: any) => String(c || "").replace(/\s+/g, "")).join("|");
      if (rowStr.includes("거래일자") && rowStr.includes("가맹점")) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) continue;

    // Build column index map
    const headerRow = (rows[headerIdx] as any[]).map((h: any) =>
      String(h || "").replace(/\s+/g, "")
    );

    const colMap: Record<string, number> = {};
    for (let c = 0; c < headerRow.length; c++) {
      const h = headerRow[c];
      if (h.includes("거래일자")) colMap.date = c;
      else if (h.includes("가맹점")) colMap.merchant = c;
      else if (h.includes("이용금액")) colMap.amount = c;
      else if (h.includes("결제원금")) colMap.paymentAmount = c;
      else if (h === "수수료") colMap.fee = c;
      else if (h.includes("혜택금액")) colMap.discount = c;
    }

    if (colMap.date === undefined || colMap.merchant === undefined) continue;

    // Parse data rows after header
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i] as any[];
      const dateStr = row[colMap.date];
      if (!dateStr) continue;

      const formattedDate = formatDateString(dateStr);
      if (!formattedDate) continue;

      const merchant = String(row[colMap.merchant] || "").trim();
      const amount = parseAmount(colMap.amount !== undefined ? row[colMap.amount] : 0);

      if (!merchant || amount === 0) continue;

      // Skip summary/card-name/footer rows
      if (merchant.includes("합계") || merchant.includes("소계") ||
          merchant.includes("이용상세내역") || merchant.includes("이하 여백") ||
          merchant.includes("카드소계")) {
        continue;
      }

      transactions.push({
        date: formattedDate,
        cardCompany: "하나카드",
        merchant,
        amount,
        paymentAmount: colMap.paymentAmount !== undefined ? parseAmount(row[colMap.paymentAmount]) : 0,
        fee: colMap.fee !== undefined ? parseAmount(row[colMap.fee]) : 0,
        discount: colMap.discount !== undefined ? parseAmount(row[colMap.discount]) : 0,
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
