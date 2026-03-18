import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import type { FamilyL2BreakdownResponse } from "@/types";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const memberIdParam = searchParams.get("memberId");
    if (memberIdParam === null) {
      return NextResponse.json(
        { error: "memberId 파라미터가 필요합니다" },
        { status: 400 },
      );
    }
    const memberId = parseInt(memberIdParam, 10);
    if (isNaN(memberId)) {
      return NextResponse.json(
        { error: "memberId는 숫자여야 합니다" },
        { status: 400 },
      );
    }

    const now = new Date();
    const defaultFrom = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const from = searchParams.get("from") ?? defaultFrom;
    const to = searchParams.get("to") ?? defaultTo;

    const monthExpr = `COALESCE(aggregation_month, substr(aggregation_date,1,7), substr(original_date,1,7), substr(date,1,7))`;

    // memberId=0 means 미지정 (NULL family_member_id)
    const memberWhere =
      memberId === 0
        ? `AND family_member_id IS NULL`
        : `AND family_member_id = ?`;
    const params =
      memberId === 0 ? [from, to] : [from, to, memberId];

    type L2Row = { categoryL1: string; categoryL2: string; amount: number; count: number };
    const rows = sqlite
      .prepare(
        `SELECT
           COALESCE(category_l1, '기타') AS categoryL1,
           COALESCE(category_l2, '미분류') AS categoryL2,
           SUM(ABS(amount)) AS amount,
           COUNT(*) AS count
         FROM transactions
         WHERE ${monthExpr} >= ? AND ${monthExpr} <= ?
           ${memberWhere}
         GROUP BY categoryL1, categoryL2
         ORDER BY categoryL1, amount DESC`,
      )
      .all(...params) as L2Row[];

    // Resolve member name
    let memberName = "미지정";
    if (memberId !== 0) {
      type MemberRow = { name: string; relation: string };
      const member = sqlite
        .prepare(`SELECT name, relation FROM family_members WHERE id = ?`)
        .get(memberId) as MemberRow | undefined;
      if (member) {
        memberName = `${member.name} (${member.relation})`;
      } else {
        memberName = `구성원#${memberId}`;
      }
    }

    const response: FamilyL2BreakdownResponse = {
      memberId,
      memberName,
      categories: rows,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/categories/analytics/family-l2 error:", error);
    return NextResponse.json(
      { error: "가족 L2 분석 조회 실패", errorId: crypto.randomUUID() },
      { status: 500 },
    );
  }
}
