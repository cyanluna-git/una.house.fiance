import { NextResponse } from "next/server";
import { db, sqlite } from "@/lib/db";
import { salaryStatements, salaryItems } from "@/lib/db/schema";
import { parseSalaryPdf } from "@/lib/parsers/salary";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];
    const password = (formData.get("password") as string) || "";

    if (files.length === 0) {
      return NextResponse.json({ error: "파일을 선택하세요" }, { status: 400 });
    }

    const results: Array<{
      fileName: string;
      success: boolean;
      error?: string;
      statementId?: number;
    }> = [];

    for (const file of files) {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const parsed = parseSalaryPdf(buffer, password);

        if (!parsed.payDate || !parsed.grossPay) {
          results.push({
            fileName: file.name,
            success: false,
            error: "급여 명세서 형식을 인식할 수 없습니다",
          });
          continue;
        }

        // Check for duplicate
        const existing = sqlite
          .prepare(
            "SELECT id FROM salary_statements WHERE pay_date = ? AND gross_pay = ? AND net_pay = ?"
          )
          .get(parsed.payDate, parsed.grossPay, parsed.netPay) as
          | { id: number }
          | undefined;

        if (existing) {
          results.push({
            fileName: file.name,
            success: false,
            error: `이미 등록된 명세서입니다 (${parsed.payDate})`,
          });
          continue;
        }

        // Insert statement
        const stmt = db
          .insert(salaryStatements)
          .values({
            payDate: parsed.payDate,
            employeeName: parsed.employeeName,
            employeeId: parsed.employeeId,
            position: parsed.position,
            department: parsed.department,
            companyName: parsed.companyName,
            grossPay: parsed.grossPay,
            totalDeductions: parsed.totalDeductions,
            netPay: parsed.netPay,
            sourceFile: file.name,
          })
          .run();

        const statementId = Number(stmt.lastInsertRowid);

        // Insert items
        for (const item of parsed.items) {
          db.insert(salaryItems)
            .values({
              statementId,
              type: item.type,
              name: item.name,
              amount: item.amount,
            })
            .run();
        }

        results.push({
          fileName: file.name,
          success: true,
          statementId,
        });
      } catch (err) {
        console.error(`Failed to parse ${file.name}:`, err);
        results.push({
          fileName: file.name,
          success: false,
          error: err instanceof Error ? err.message : "파싱 실패",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    return NextResponse.json({ results, successCount, totalCount: files.length });
  } catch (error) {
    console.error("POST /api/income/import error:", error);
    return NextResponse.json({ error: "업로드 실패" }, { status: 500 });
  }
}
