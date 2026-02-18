import * as XLSX from "xlsx";
import { ParsedTransaction } from "./types";

export function parseNonghyupCard(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer);
  const transactions: ParsedTransaction[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { defval: "", header: 1 });

    // Find header row by scanning for "이용" in first cell
    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      const firstCell = String(rows[i][0] || "").replace(/\s+/g, "");
      if (firstCell.includes("이용일") || firstCell.includes("이용일자")) {
        headerIdx = i;
        break;
      }
    }

    if (headerIdx === -1) continue;

    // Build column index map from header row
    const headerRow = (rows[headerIdx] as any[]).map((h: any) =>
      String(h || "").replace(/\s+/g, "")
    );

    const colMap: Record<string, number> = {};
    for (let c = 0; c < headerRow.length; c++) {
      const h = headerRow[c];
      if (h.includes("이용일")) colMap.date = c;
      else if (h.includes("이용카드") || h.includes("카드")) colMap.cardName = c;
      else if (h.includes("이용가맹점") || h.includes("가맹점")) colMap.merchant = c;
      else if (h.includes("이용금액")) colMap.amount = c;
      else if (h.includes("청구원금")) colMap.paymentAmount = c;
      else if (h.includes("수수료") || h.includes("이자")) colMap.fee = c;
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

      // Skip summary rows
      if (merchant.includes("합계") || merchant.includes("소계")) continue;

      transactions.push({
        date: formattedDate,
        cardCompany: "농협카드",
        cardName: colMap.cardName !== undefined ? String(row[colMap.cardName] || "").trim() || undefined : undefined,
        merchant,
        amount,
        paymentAmount: colMap.paymentAmount !== undefined ? parseAmount(row[colMap.paymentAmount]) : 0,
        fee: colMap.fee !== undefined ? parseAmount(row[colMap.fee]) : 0,
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
