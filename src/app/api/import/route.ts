import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { parseFile } from "@/lib/parsers";
import { categorizeMerchant } from "@/lib/categorizer";
import {
  normalizeTransactionDates,
  parseStatementMonthFromFileName,
} from "@/lib/statement-date";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const password = formData.get("password") as string | null;

    if (!file) {
      return NextResponse.json({ error: "파일을 선택하세요" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const parsedTransactions = await parseFile(
      Buffer.from(buffer),
      file.name,
      password || undefined
    );

    if (parsedTransactions.length === 0) {
      return NextResponse.json(
        { error: "파일에서 거래 내역을 찾을 수 없습니다" },
        { status: 400 }
      );
    }

    // Save to database
    let savedCount = 0;
    let duplicateCount = 0;
    const statementMonth = parseStatementMonthFromFileName(file.name);

    const transactionsToSave = parsedTransactions.map((t) => {
      const cat = categorizeMerchant(t.merchant);
      const originalDate = t.originalDate || t.date;
      const normalizedDates = normalizeTransactionDates({
        originalDate,
        billingMonth: t.billingMonth || statementMonth,
        paymentMonthCandidate: t.paymentMonthCandidate || null,
      });

      // Auto-link card_id if a matching card exists
      let cardId: number | null = null;
      try {
        const card = sqlite
          .prepare(
            "SELECT id FROM cards WHERE card_company = ? AND card_name = ? LIMIT 1"
          )
          .get(t.cardCompany, t.cardName || "") as { id: number } | undefined;
        if (card) cardId = card.id;
      } catch {
        // cards table might not exist yet
      }

      return {
        date: originalDate,
        originalDate: normalizedDates.originalDate,
        billingMonth: normalizedDates.billingMonth,
        paymentMonthCandidate: normalizedDates.paymentMonthCandidate,
        aggregationDate: normalizedDates.aggregationDate,
        aggregationMonth: normalizedDates.aggregationMonth,
        aggregationBasis: normalizedDates.aggregationBasis,
        cardCompany: t.cardCompany,
        cardName: t.cardName,
        merchant: t.merchant,
        amount: t.amount,
        paymentType: t.paymentType,
        installmentMonths: t.installmentMonths || 0,
        installmentSeq: t.installmentSeq || 0,
        paymentAmount: t.paymentAmount || 0,
        fee: t.fee || 0,
        discount: t.discount || 0,
        categoryL1: cat.categoryL1,
        categoryL2: cat.categoryL2,
        categoryL3: cat.categoryL3,
        necessity: cat.necessity,
        sourceFile: file.name,
        sourceType: "card" as const,
        isManual: false,
        cardId,
      };
    });

    try {
      const insertOne = sqlite.prepare(`
        INSERT INTO transactions (
          date, original_date, billing_month, payment_month_candidate,
          aggregation_date, aggregation_month, aggregation_basis,
          card_company, card_name, merchant, amount, payment_type,
          installment_months, installment_seq, payment_amount, fee, discount,
          category_l1, category_l2, category_l3, necessity,
          source_file, source_type, is_manual, card_id
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?
        )
        ON CONFLICT(date, merchant, amount, card_company) DO NOTHING
      `);

      const runAll = sqlite.transaction((rows: typeof transactionsToSave) => {
        for (const t of rows) {
          const result = insertOne.run(
            t.date, t.originalDate, t.billingMonth, t.paymentMonthCandidate,
            t.aggregationDate, t.aggregationMonth, t.aggregationBasis,
            t.cardCompany, t.cardName, t.merchant, t.amount, t.paymentType,
            t.installmentMonths, t.installmentSeq, t.paymentAmount, t.fee, t.discount,
            t.categoryL1, t.categoryL2, t.categoryL3, t.necessity,
            t.sourceFile, t.sourceType, t.isManual ? 1 : 0, t.cardId,
          );
          if (result.changes > 0) {
            savedCount++;
          } else {
            duplicateCount++;
          }
        }
      });

      runAll(transactionsToSave);
    } catch (dbError) {
      console.error("DB insert error:", dbError);
    }

    return NextResponse.json({
      success: true,
      savedCount,
      duplicateCount,
      fileName: file.name,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "임포트 중 오류 발생" }, { status: 500 });
  }
}
