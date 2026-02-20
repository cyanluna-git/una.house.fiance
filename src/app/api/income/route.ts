import { NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

export async function GET() {
  try {
    const statements = sqlite
      .prepare(
        `SELECT * FROM salary_statements ORDER BY pay_date DESC`
      )
      .all();

    // Fetch items for each statement
    const stmtItems = sqlite.prepare(
      `SELECT * FROM salary_items WHERE statement_id = ? ORDER BY type, id`
    );

    const data = (statements as any[]).map((s) => ({
      ...s,
      items: stmtItems.all(s.id),
    }));

    return NextResponse.json({ data });
  } catch (error) {
    console.error("GET /api/income error:", error);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}
