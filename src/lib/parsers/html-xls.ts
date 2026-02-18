import { ParsedTransaction } from "./types";

export function parseHtmlXls(buffer: Buffer, cardCompany: string): ParsedTransaction[] {
  const html = buffer.toString("utf-8", 0, Math.min(buffer.length, 1000000));
  const transactions: ParsedTransaction[] = [];

  // Extract all tables
  const tableMatches = html.matchAll(/<table[^>]*>(.*?)<\/table>/gis);

  for (const [, tableContent] of tableMatches) {
    // Extract rows
    const rowMatches = tableContent.matchAll(/<tr[^>]*>(.*?)<\/tr>/gis);

    let isTransactionTable = false;
    const rows: string[][] = [];

    for (const [, rowContent] of rowMatches) {
      // Extract cells
      const cells = rowContent
        .matchAll(/<t[dh][^>]*>(.*?)<\/t[dh]>/gis);

      const row: string[] = [];
      for (const [, cellContent] of cells) {
        const text = cellContent
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .trim();
        row.push(text);
      }

      if (row.length > 0) {
        rows.push(row);
      }

      // Check if this is a transaction table
      const firstCellText = row[0]?.toLowerCase() || "";
      if (
        firstCellText.includes("이용일") ||
        firstCellText.includes("거래일") ||
        firstCellText.includes("사용일")
      ) {
        isTransactionTable = true;
      }
    }

    if (!isTransactionTable || rows.length < 2) continue;

    // Parse header
    const headers = rows[0].map((h) => h.toLowerCase());
    const dateIdx = headers.findIndex((h) => h.includes("이용일") || h.includes("거래일"));
    const merchantIdx = headers.findIndex((h) => h.includes("가맹점"));
    const amountIdx = headers.findIndex((h) => h.includes("금액") && !h.includes("회차"));
    const feeIdx = headers.findIndex((h) => h.includes("수수료") || h.includes("이자"));
    const discountIdx = headers.findIndex((h) => h.includes("할인") || h.includes("혜택"));

    if (dateIdx === -1 || merchantIdx === -1 || amountIdx === -1) continue;

    // Parse transactions
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row.length <= Math.max(dateIdx, merchantIdx, amountIdx)) continue;

      const dateStr = row[dateIdx]?.trim();
      const merchant = row[merchantIdx]?.trim();
      const amountStr = row[amountIdx]?.trim();

      if (!dateStr || !merchant || !amountStr) continue;

      const formattedDate = formatDateString(dateStr);
      const amount = parseAmount(amountStr);

      if (!formattedDate || amount === 0) continue;

      // Skip header rows and summary rows
      if (
        merchant.includes("합계") ||
        merchant.includes("소계") ||
        merchant.includes("합계") ||
        merchant.includes("이용내역")
      ) {
        continue;
      }

      transactions.push({
        date: formattedDate,
        cardCompany,
        merchant,
        amount,
        fee: feeIdx >= 0 ? parseAmount(row[feeIdx]) : undefined,
        discount: discountIdx >= 0 ? parseAmount(row[discountIdx]) : undefined,
      });
    }
  }

  return transactions;
}

function formatDateString(dateStr: string): string | null {
  const str = dateStr.trim();

  // Format: 2025년 01월 28일 -> 2025-01-28
  const match = str.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (match) {
    const [_, year, month, day] = match;
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  // Format: 2025-01-28
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  // Format: 2025.01.28
  if (/^\d{4}\.\d{2}\.\d{2}$/.test(str)) {
    return str.replace(/\./g, "-");
  }

  return null;
}

function parseAmount(value: string | undefined): number {
  if (!value) return 0;

  const cleaned = String(value)
    .replace(/[^\d.-]/g, "")
    .trim();
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : Math.round(amount);
}
