import * as XLSX from "xlsx";
import { ParsedTransaction } from "./types";

export function parseWooriCard(buffer: Buffer): ParsedTransaction[] {
  const workbook = XLSX.read(buffer);
  const transactions: ParsedTransaction[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { defval: "", header: 1 });

    // Find header row containing "이용일" and "가맹점"
    let headerIdx = -1;
    for (let i = 0; i < rows.length; i++) {
      const rowStr = (rows[i] as any[]).map((c: any) => String(c || "").replace(/\s+/g, "")).join("|");
      if (rowStr.includes("이용일") && rowStr.includes("가맹점")) {
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
      else if (h === "이용카드" || h === "이용\n카드") colMap.cardName = c;
      else if (h.includes("가맹점")) colMap.merchant = c;
      else if (h.includes("이용금액")) colMap.amount = c;
      else if (h.includes("매출구분") || h.includes("매출\n구분")) colMap.paymentType = c;
      else if (h.includes("할부개월") || h.includes("할부\n개월")) colMap.installmentMonths = c;
      else if (h.includes("당월결제")) colMap.paymentAmount = c;
    }

    if (colMap.date === undefined || colMap.merchant === undefined) continue;

    // Skip sub-header row(s) after header
    let dataStart = headerIdx + 1;
    // Check if next row is a sub-header (like "회차 | 원금 | 혜택금액...")
    if (dataStart < rows.length) {
      const nextRow = (rows[dataStart] as any[]).map((c: any) => String(c || "").replace(/\s+/g, "")).join("");
      if (nextRow.includes("회차") || nextRow.includes("원금")) {
        dataStart++;
      }
    }

    // Parse data rows
    for (let i = dataStart; i < rows.length; i++) {
      const row = rows[i] as any[];
      const dateStr = row[colMap.date];
      if (!dateStr) continue;

      const formattedDate = formatDateString(dateStr);
      if (!formattedDate) continue;

      const merchant = String(row[colMap.merchant] || "").trim();
      const amount = parseAmount(colMap.amount !== undefined ? row[colMap.amount] : 0);

      if (!merchant || amount === 0) continue;

      // Skip summary rows
      if (merchant.includes("합계") || merchant.includes("소계") || merchant.includes("이하 여백")) continue;

      transactions.push({
        date: formattedDate,
        cardCompany: "우리카드",
        cardName: colMap.cardName !== undefined ? String(row[colMap.cardName] || "").trim() || undefined : undefined,
        merchant,
        amount,
        paymentType: colMap.paymentType !== undefined ? String(row[colMap.paymentType] || "").trim() || undefined : undefined,
        installmentMonths: colMap.installmentMonths !== undefined ? parseInteger(row[colMap.installmentMonths]) : 0,
        paymentAmount: colMap.paymentAmount !== undefined ? parseAmount(row[colMap.paymentAmount]) : 0,
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

  // Format: 01.05 -> MM.DD (year from current year context)
  const match = str.match(/^(\d{2})\.(\d{2})$/);
  if (match) {
    const [, month, day] = match;
    const year = new Date().getFullYear();
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Format: 2025-01-31
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Format: 2025.01.31
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(str)) {
    return str.replace(/\./g, "-");
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
