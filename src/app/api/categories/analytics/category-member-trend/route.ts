import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import type { CategoryMemberTrendResponse } from "@/types";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const categoryL1 = searchParams.get("categoryL1");
    if (!categoryL1) {
      return NextResponse.json(
        { error: "categoryL1 파라미터가 필요합니다" },
        { status: 400 },
      );
    }

    const now = new Date();
    const defaultFrom = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const from = searchParams.get("from") ?? defaultFrom;
    const to = searchParams.get("to") ?? defaultTo;

    const monthExpr = `COALESCE(aggregation_month, substr(aggregation_date,1,7), substr(original_date,1,7), substr(date,1,7))`;

    // Get all months in range
    type MonthRow = { m: string };
    const monthRows = sqlite
      .prepare(
        `SELECT DISTINCT ${monthExpr} AS m
         FROM transactions
         WHERE ${monthExpr} >= ? AND ${monthExpr} <= ?
           AND COALESCE(category_l1, '기타') = ?
         ORDER BY m`,
      )
      .all(from, to, categoryL1) as MonthRow[];
    const months = monthRows.filter((r) => r.m).map((r) => r.m);

    // Get member x month breakdown
    type TrendRow = { familyMemberId: number | null; month: string; amount: number };
    const rows = sqlite
      .prepare(
        `SELECT
           family_member_id AS familyMemberId,
           ${monthExpr} AS month,
           SUM(ABS(amount)) AS amount
         FROM transactions
         WHERE ${monthExpr} >= ? AND ${monthExpr} <= ?
           AND COALESCE(category_l1, '기타') = ?
         GROUP BY familyMemberId, month
         ORDER BY familyMemberId, month`,
      )
      .all(from, to, categoryL1) as TrendRow[];

    // Resolve family member names
    type FamilyMemberRow = { id: number; name: string; relation: string };
    const familyMemberRows = sqlite
      .prepare(`SELECT id, name, relation FROM family_members`)
      .all() as FamilyMemberRow[];
    const familyNameMap = new Map<number, string>();
    for (const fm of familyMemberRows) {
      familyNameMap.set(fm.id, `${fm.name} (${fm.relation})`);
    }

    // Pivot into member -> month -> amount
    const memberMap = new Map<
      number,
      { memberName: string; dataMap: Map<string, number> }
    >();
    for (const r of rows) {
      const memberId = r.familyMemberId ?? 0;
      const memberName = r.familyMemberId
        ? (familyNameMap.get(r.familyMemberId) ?? `구성원#${r.familyMemberId}`)
        : "미지정";
      const existing = memberMap.get(memberId) ?? {
        memberName,
        dataMap: new Map<string, number>(),
      };
      existing.dataMap.set(
        r.month,
        (existing.dataMap.get(r.month) ?? 0) + r.amount,
      );
      memberMap.set(memberId, existing);
    }

    const members = Array.from(memberMap.entries()).map(
      ([memberId, { memberName, dataMap }]) => ({
        memberId,
        memberName,
        data: months.map((m) => ({ month: m, amount: dataMap.get(m) ?? 0 })),
      }),
    );

    const response: CategoryMemberTrendResponse = {
      categoryL1,
      months,
      members,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error(
      "GET /api/categories/analytics/category-member-trend error:",
      error,
    );
    return NextResponse.json(
      { error: "카테고리 멤버 트렌드 조회 실패", errorId: crypto.randomUUID() },
      { status: 500 },
    );
  }
}
