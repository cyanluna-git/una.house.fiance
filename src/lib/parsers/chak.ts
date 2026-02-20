import * as XLSX from "xlsx";
import { ParsedTransaction } from "./types";
// @ts-ignore - no types available
import OfficeCrypto from "officecrypto-tool";

/**
 * 착(Chak) 지역화폐 거래내역 파서
 * - 파일: password-protected xlsx
 * - 시트: "상품권 거래내역"
 * - 컬럼: 순번(0), 상품권명(1), 거래일시(2), 거래구분(3), 거래방법(4), 사용처(5), 거래금액(6), 잔고(7)
 * - 데이터 시작: row index 9 (0-based)
 */
export async function parseChakCard(buffer: Buffer, password?: string): Promise<ParsedTransaction[]> {
  let decryptedBuffer = buffer;

  if (password) {
    const isEncrypted = await OfficeCrypto.isEncrypted(buffer);
    if (isEncrypted) {
      decryptedBuffer = await OfficeCrypto.decrypt(buffer, { password });
    }
  }

  const workbook = XLSX.read(decryptedBuffer);
  const transactions: ParsedTransaction[] = [];

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1 });

  // Data starts at row 9 (0-based), skip header rows
  for (let i = 9; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0]) continue;

    const voucherName = String(row[1] || "").trim(); // 상품권명 (e.g., "아산페이")
    const dateTimeStr = String(row[2] || "").trim(); // "2026-01-30 19:54:05"
    const txType = String(row[3] || "").trim(); // 거래구분 (e.g., "결제완료")
    const merchant = String(row[5] || "").trim(); // 사용처
    const amountStr = String(row[6] || "").trim(); // "72,900"

    if (!dateTimeStr || !merchant) continue;
    if (txType !== "결제완료") continue; // 결제완료만 처리

    const date = dateTimeStr.split(" ")[0]; // "YYYY-MM-DD"
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

    const amount = parseAmount(amountStr);
    if (amount === 0) continue;

    transactions.push({
      date,
      cardCompany: "지역화폐",
      cardName: voucherName || "지역화폐",
      merchant,
      amount,
      paymentType: "지역화폐",
    });
  }

  return transactions;
}

function parseAmount(value: string): number {
  const cleaned = String(value).replace(/[^\d.-]/g, "").trim();
  const amount = parseInt(cleaned, 10);
  return isNaN(amount) ? 0 : amount;
}
