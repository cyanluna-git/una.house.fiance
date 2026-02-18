import { ParsedTransaction } from "./types";

interface CellInfo {
  text: string;
  colspan: number;
}

export function parseHtmlXls(buffer: Buffer, cardCompany: string): ParsedTransaction[] {
  const html = buffer.toString("utf-8", 0, Math.min(buffer.length, 1000000));
  const transactions: ParsedTransaction[] = [];

  // Extract all tables
  const tableMatches = html.matchAll(/<table[^>]*>([\s\S]*?)<\/table>/gi);

  for (const [, tableContent] of tableMatches) {
    // Extract rows
    const rowMatches = tableContent.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi);

    let headerRowIdx = -1;
    const rows: CellInfo[][] = [];

    for (const [, rowContent] of rowMatches) {
      // Extract cells with colspan info
      const cellRegex = /<(t[dh])([^>]*)>([\s\S]*?)<\/\1>/gi;
      let cellMatch;
      const row: CellInfo[] = [];

      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        const attrs = cellMatch[2];
        const content = cellMatch[3];
        const text = content
          .replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/\s+/g, " ")
          .trim();

        const colspanMatch = attrs.match(/colspan\s*=\s*["']?(\d+)/i);
        const colspan = colspanMatch ? parseInt(colspanMatch[1]) : 1;

        row.push({ text, colspan });
      }

      if (row.length > 0) {
        rows.push(row);
      }

      // Check if this row contains transaction headers
      const firstCellText = row[0]?.text.toLowerCase() || "";
      if (
        (firstCellText.includes("이용일") || firstCellText.includes("거래일") || firstCellText.includes("사용일")) &&
        row.some(c => c.text.includes("가맹점"))
      ) {
        headerRowIdx = rows.length - 1;
      }
    }

    if (headerRowIdx === -1 || rows.length < headerRowIdx + 2) continue;

    // Build column map from header row
    const headerRow = rows[headerRowIdx];
    const headerTexts: string[] = [];
    for (const cell of headerRow) {
      headerTexts.push(cell.text.toLowerCase());
      // Add empty strings for extra colspan
      for (let c = 1; c < cell.colspan; c++) {
        headerTexts.push("");
      }
    }

    const dateIdx = headerTexts.findIndex(h => h.includes("이용일") || h.includes("거래일"));
    const cardNameIdx = headerTexts.findIndex(h => h.includes("이용카드") || h.includes("카드"));
    const merchantIdx = headerTexts.findIndex(h => h.includes("가맹점"));
    const amountIdx = headerTexts.findIndex(h => h.includes("이용금액") || (h.includes("금액") && !h.includes("결제") && !h.includes("회차") && !h.includes("내실") && !h.includes("취소")));
    const paymentIdx = headerTexts.findIndex(h => h.includes("결제원금") || h.includes("내실금액"));
    const feeIdx = headerTexts.findIndex(h => h.includes("수수료") || h.includes("이자"));
    const discountIdx = headerTexts.findIndex(h => h.includes("할인") || h.includes("혜택") || h.includes("적립/할인"));

    if (dateIdx === -1 || merchantIdx === -1) continue;

    // Parse data rows (skip sub-header rows)
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];

      // Flatten cells (expand colspan)
      const cellTexts: string[] = [];
      for (const cell of row) {
        cellTexts.push(cell.text);
        for (let c = 1; c < cell.colspan; c++) {
          cellTexts.push("");
        }
      }

      // Skip rows with too few cells or summary rows
      if (cellTexts.length < 3) continue;

      const dateStr = cellTexts[dateIdx]?.trim();
      if (!dateStr) continue;

      const formattedDate = formatDateString(dateStr);
      if (!formattedDate) continue;

      let merchant = cellTexts[merchantIdx]?.trim() || "";
      let amount = 0;

      // Handle 현대카드 where merchant and amount are combined in one cell
      // Pattern: "가맹점명 금액" e.g. "엄청난해장국 26,000"
      if (amountIdx >= 0 && cellTexts[amountIdx]?.trim()) {
        amount = parseAmount(cellTexts[amountIdx]);
      } else if (merchant) {
        // Try to extract amount from end of merchant string
        const amountMatch = merchant.match(/\s+([\d,]+)\s*$/);
        if (amountMatch) {
          amount = parseAmount(amountMatch[1]);
          merchant = merchant.substring(0, merchant.lastIndexOf(amountMatch[0])).trim();
          // Also remove "NNNN건" pattern before the amount
          merchant = merchant.replace(/\s+\d+건\s*$/, "").trim();
        }
      }

      // Fallback: try payment amount column
      if (amount === 0 && paymentIdx >= 0) {
        amount = parseAmount(cellTexts[paymentIdx]);
      }

      if (!merchant || amount === 0) continue;

      // Skip summary rows
      if (
        merchant.includes("합계") || merchant.includes("소계") ||
        merchant.includes("이용내역") || merchant.includes("없습니다")
      ) {
        continue;
      }

      transactions.push({
        date: formattedDate,
        cardCompany,
        cardName: cardNameIdx >= 0 ? cellTexts[cardNameIdx]?.trim() || undefined : undefined,
        merchant,
        amount,
        fee: feeIdx >= 0 ? parseAmount(cellTexts[feeIdx]) : undefined,
        discount: discountIdx >= 0 ? parseAmount(cellTexts[discountIdx]) : undefined,
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
    const [, year, month, day] = match;
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
