import { NextRequest, NextResponse } from "next/server";
import { matchCard } from "@/lib/card-matcher";
import { sqlite } from "@/lib/db";
import { parseFile } from "@/lib/parsers";
import { categorizeMerchant } from "@/lib/categorizer";
import {
  normalizeTransactionDates,
  parseStatementMonthFromFileName,
} from "@/lib/statement-date";

export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get("content-length")) > 52 * 1024 * 1024) {
      return NextResponse.json({ error: "요청 크기가 너무 큽니다" }, { status: 413 });
    }
    let formData: FormData;
    try { formData = await request.formData(); }
    catch { return NextResponse.json({ error: "올바른 multipart 파일 요청이 아닙니다" }, { status: 400 }); }
    const file = formData.get("file") as File;
    const password = formData.get("password") as string | null;

    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "파일을 선택하세요" }, { status: 400 });
    }

    // File size validation (50MB limit)
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json(
        { error: "파일 크기가 50MB를 초과합니다" },
        { status: 413 }
      );
    }

    // File type validation (.xlsx, .xls only)
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext !== "xlsx" && ext !== "xls") {
      return NextResponse.json(
        { error: "xlsx 또는 xls 파일만 지원합니다" },
        { status: 400 }
      );
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
    let skippedManualDuplicates = 0;
    const statementMonth = parseStatementMonthFromFileName(file.name);

    // Batch-load all cards to avoid N+1 queries
    interface CardRow { id: number; card_company: string; card_name: string; card_number: string | null }
    let allCards: CardRow[] = [];
    try {
      allCards = sqlite
        .prepare("SELECT id, card_company, card_name, card_number FROM cards")
        .all() as CardRow[];
    } catch {
      // cards table might not exist yet
    }

    function findCardId(company: string, cardName: string | null | undefined): number | null {
      const match = matchCard(allCards.map(c => ({ id: c.id, cardCompany: c.card_company, cardName: c.card_name, cardNumber: c.card_number, isActive: true })), { cardCompany: company, cardName, cardLast4: cardName?.match(/(?:^|\D)(\d{4})(?:\D|$)/)?.[1] }, true);
      return match.status === "matched" ? match.card.id : null;
    }

    const transactionsToSave = parsedTransactions.map((t) => {
      const cat = categorizeMerchant(t.merchant);
      const originalDate = t.originalDate || t.date;
      const normalizedDates = normalizeTransactionDates({
        originalDate,
        billingMonth: t.billingMonth || statementMonth,
        paymentMonthCandidate: t.paymentMonthCandidate || null,
      });

      // Auto-link card_id from pre-loaded card list
      const cardId = findCardId(t.cardCompany, t.cardName);

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
      const checkManualDuplicate = sqlite.prepare(`
        SELECT 1 FROM transactions
        WHERE source_type = 'manual' AND date = ? AND amount = ? AND card_company = ?
        LIMIT 1
      `);

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
          // Skip if a manually entered transaction exists with same date/amount/cardCompany.
          // Merchant names differ between manual input and card statements, so we match on 3-tuple.
          if (t.cardCompany) {
            const manualMatch = checkManualDuplicate.get(t.date, t.amount, t.cardCompany);
            if (manualMatch) {
              skippedManualDuplicates++;
              continue;
            }
          }

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
      skippedManualDuplicates,
      fileName: file.name,
    });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "임포트 중 오류 발생" , errorId: crypto.randomUUID() }, { status: 500 });
  }
}
