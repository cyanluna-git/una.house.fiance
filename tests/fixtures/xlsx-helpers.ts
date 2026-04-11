import * as XLSX from "xlsx";

export interface KookminRow {
  date: string;
  cardName?: string;
  type?: string;
  merchant: string;
  amount: number;
  installmentMonths?: number;
  paymentAmount?: number;
}

/** Convert a Node Buffer to a plain ArrayBuffer (safe for Blob constructor in strict TS). */
export function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
}

/**
 * Create a minimal valid Kookmin-format xlsx as an ArrayBuffer.
 * The kookmin parser uses sheet_to_json with defval:"", matching on Korean column headers.
 */
export function createKookminXlsx(rows: KookminRow[]): ArrayBuffer {
  const header = [
    "이용일자",
    "이용카드",
    "구분",
    "이용하신 가맹점",
    "이용금액",
    "할부개월",
    "이번달 결제금액",
  ];

  const dataRows = rows.map((r) => [
    r.date,
    r.cardName ?? "국민카드",
    r.type ?? "일시불",
    r.merchant,
    r.amount,
    r.installmentMonths ?? 0,
    r.paymentAmount ?? r.amount,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return toArrayBuffer(Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" })));
}

/** Create a valid but empty xlsx (header row only, no data rows). */
export function createEmptyKookminXlsx(): ArrayBuffer {
  return createKookminXlsx([]);
}

/** Create a minimal valid xlsx that has no Kookmin-style headers (truly empty sheet). */
export function createBlankXlsx(): ArrayBuffer {
  const ws = XLSX.utils.aoa_to_sheet([["데이터없음"]]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  return toArrayBuffer(Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" })));
}
