import { NextRequest, NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { parseFile } from "@/lib/parsers";
import { categorizeMerchant } from "@/lib/categorizer";

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
    const savedCount = parsedTransactions.length;
    const duplicateCount = 0;

    const transactionsToSave = parsedTransactions.map((t) => {
      const cat = categorizeMerchant(t.merchant);

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
        date: t.date,
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
      db.insert(transactions).values(transactionsToSave).run();
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
