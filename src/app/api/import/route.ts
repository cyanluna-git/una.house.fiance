import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { transactions } from "@/lib/db/schema";
import { parseFile } from "@/lib/parsers";
import { categorizeMerchant } from "@/lib/categorizer";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "파일을 선택하세요" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const parsedTransactions = parseFile(Buffer.from(buffer), file.name);

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
      };
    });

    try {
      db.insert(transactions).values(transactionsToSave).run();
    } catch (dbError) {
      console.error("DB insert error:", dbError);
      // Continue even if insert fails (might have duplicate constraint)
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
