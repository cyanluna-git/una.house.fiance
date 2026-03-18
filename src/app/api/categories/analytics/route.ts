import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import type { CategoryAnalyticsResponse } from "@/types";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);

    // Default range: 12 months ago → current month
    const now = new Date();
    const defaultFrom = `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const defaultTo = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const from = searchParams.get("from") ?? defaultFrom;
    const to = searchParams.get("to") ?? defaultTo;
    const categoryL1Filter = searchParams.get("categoryL1");

    const monthExpr = `COALESCE(aggregation_month, substr(aggregation_date,1,7), substr(original_date,1,7), substr(date,1,7))`;
    const rangeWhere = `${monthExpr} >= ? AND ${monthExpr} <= ?`;
    const l1Where = categoryL1Filter ? ` AND category_l1 = ?` : "";
    const baseWhere = `WHERE ${rangeWhere}${l1Where}`;
    const baseParams: string[] = categoryL1Filter
      ? [from, to, categoryL1Filter]
      : [from, to];

    // ── 1. Available months ──────────────────────────────────────────────
    const monthRows = sqlite
      .prepare(
        `SELECT DISTINCT ${monthExpr} AS m
         FROM transactions
         WHERE ${monthExpr} >= ? AND ${monthExpr} <= ?
         ORDER BY m`
      )
      .all(from, to) as Array<{ m: string }>;
    const availableMonths = monthRows.filter((r) => r.m).map((r) => r.m);

    // ── 2. Category trend (L1 pivot by month) ────────────────────────────
    type TrendRow = { month: string; categoryL1: string; amount: number };
    const trendRows = sqlite
      .prepare(
        `SELECT
           ${monthExpr} AS month,
           COALESCE(category_l1, '기타') AS categoryL1,
           SUM(ABS(amount)) AS amount
         FROM transactions
         ${baseWhere}
         GROUP BY month, categoryL1
         ORDER BY month`
      )
      .all(...baseParams) as TrendRow[];

    // Pivot: each row = { month, cat1: amount, cat2: amount, ... }
    const trendMap = new Map<string, Record<string, string | number>>();
    const allL1Categories = new Set<string>();
    for (const r of trendRows) {
      if (!r.month) continue;
      allL1Categories.add(r.categoryL1);
      const entry = trendMap.get(r.month) ?? { month: r.month };
      entry[r.categoryL1] = ((entry[r.categoryL1] as number) ?? 0) + r.amount;
      trendMap.set(r.month, entry);
    }
    // Ensure every month has every category key (0 fill)
    const categoryTrend = availableMonths.map((m) => {
      const entry = trendMap.get(m) ?? { month: m };
      for (const cat of allL1Categories) {
        if (!(cat in entry)) entry[cat] = 0;
      }
      return entry as Record<string, string | number> & { month: string };
    });

    // ── 3. L2 breakdown with monthly sub-totals ──────────────────────────
    type L2Row = { categoryL1: string; categoryL2: string; month: string; amount: number; count: number };
    const l2Rows = sqlite
      .prepare(
        `SELECT
           COALESCE(category_l1, '기타') AS categoryL1,
           COALESCE(category_l2, '미분류') AS categoryL2,
           ${monthExpr} AS month,
           SUM(ABS(amount)) AS amount,
           COUNT(*) AS count
         FROM transactions
         ${baseWhere}
         GROUP BY categoryL1, categoryL2, month
         ORDER BY categoryL1, amount DESC`
      )
      .all(...baseParams) as L2Row[];

    // Aggregate into l2Breakdown shape
    const l2Key = (l1: string, l2: string): string => `${l1}|||${l2}`;
    const l2Map = new Map<
      string,
      {
        categoryL1: string;
        categoryL2: string;
        amount: number;
        count: number;
        monthMap: Map<string, number>;
      }
    >();
    for (const r of l2Rows) {
      const key = l2Key(r.categoryL1, r.categoryL2);
      const existing = l2Map.get(key) ?? {
        categoryL1: r.categoryL1,
        categoryL2: r.categoryL2,
        amount: 0,
        count: 0,
        monthMap: new Map<string, number>(),
      };
      existing.amount += r.amount;
      existing.count += r.count;
      existing.monthMap.set(r.month, (existing.monthMap.get(r.month) ?? 0) + r.amount);
      l2Map.set(key, existing);
    }
    const l2Breakdown = Array.from(l2Map.values())
      .sort((a, b) => b.amount - a.amount)
      .map(({ monthMap, ...rest }) => ({
        ...rest,
        months: Array.from(monthMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, amount]) => ({ month, amount })),
      }));

    // ── 4. Necessity trend by month ──────────────────────────────────────
    type NecRow = { month: string; necessity: string; amount: number };
    const necRows = sqlite
      .prepare(
        `SELECT
           ${monthExpr} AS month,
           COALESCE(necessity, 'unset') AS necessity,
           SUM(ABS(amount)) AS amount
         FROM transactions
         ${baseWhere}
         GROUP BY month, necessity
         ORDER BY month`
      )
      .all(...baseParams) as NecRow[];

    const necMap = new Map<string, { essential: number; discretionary: number; waste: number; unset: number }>();
    for (const r of necRows) {
      if (!r.month) continue;
      const entry = necMap.get(r.month) ?? { essential: 0, discretionary: 0, waste: 0, unset: 0 };
      if (r.necessity in entry) {
        entry[r.necessity as keyof typeof entry] += r.amount;
      }
      necMap.set(r.month, entry);
    }
    const necessityTrend = availableMonths.map((m) => ({
      month: m,
      ...(necMap.get(m) ?? { essential: 0, discretionary: 0, waste: 0, unset: 0 }),
    }));

    // ── 5. Family × Category matrix ─────────────────────────────────────
    type FamilyCatRow = { familyMemberId: number | null; categoryL1: string; amount: number };
    const familyCatRows = sqlite
      .prepare(
        `SELECT
           family_member_id AS familyMemberId,
           COALESCE(category_l1, '기타') AS categoryL1,
           SUM(ABS(amount)) AS amount
         FROM transactions
         ${baseWhere}
         GROUP BY family_member_id, categoryL1
         ORDER BY familyMemberId, amount DESC`
      )
      .all(...baseParams) as FamilyCatRow[];

    // Resolve family member names
    type FamilyMemberRow = { id: number; name: string; relation: string };
    const familyMemberRows = sqlite
      .prepare(`SELECT id, name, relation FROM family_members`)
      .all() as FamilyMemberRow[];
    const familyNameMap = new Map<number, string>();
    for (const fm of familyMemberRows) {
      familyNameMap.set(fm.id, `${fm.name} (${fm.relation})`);
    }

    // Pivot: each row = { memberName, cat1: amount, cat2: amount, ... }
    const familyMatrixMap = new Map<string, Record<string, string | number>>();
    for (const r of familyCatRows) {
      const memberName = r.familyMemberId
        ? (familyNameMap.get(r.familyMemberId) ?? `구성원#${r.familyMemberId}`)
        : "미지정";
      const entry = familyMatrixMap.get(memberName) ?? { memberName };
      entry[r.categoryL1] = ((entry[r.categoryL1] as number) ?? 0) + r.amount;
      familyMatrixMap.set(memberName, entry);
    }
    const familyCategoryMatrix = Array.from(familyMatrixMap.values()) as Array<
      Record<string, string | number> & { memberName: string }
    >;

    // ── 6. Summary ───────────────────────────────────────────────────────
    type SummaryRow = { totalAmount: number };
    const summaryRow = sqlite
      .prepare(
        `SELECT SUM(ABS(amount)) AS totalAmount
         FROM transactions
         ${baseWhere}`
      )
      .get(...baseParams) as SummaryRow | undefined;
    const totalAmount = summaryRow?.totalAmount ?? 0;

    type TopL1Row = { categoryL1: string; amount: number };
    const topL1Row = sqlite
      .prepare(
        `SELECT COALESCE(category_l1, '기타') AS categoryL1, SUM(ABS(amount)) AS amount
         FROM transactions
         ${baseWhere}
         GROUP BY categoryL1
         ORDER BY amount DESC
         LIMIT 1`
      )
      .get(...baseParams) as TopL1Row | undefined;

    type TopL2Row = { categoryL2: string; amount: number };
    const topL2Row = sqlite
      .prepare(
        `SELECT COALESCE(category_l2, '미분류') AS categoryL2, SUM(ABS(amount)) AS amount
         FROM transactions
         ${baseWhere}
         GROUP BY categoryL2
         ORDER BY amount DESC
         LIMIT 1`
      )
      .get(...baseParams) as TopL2Row | undefined;

    const monthCount = availableMonths.length || 1;
    const summary = {
      totalAmount,
      topL1: topL1Row?.categoryL1 ?? "없음",
      topL2: topL2Row?.categoryL2 ?? "없음",
      avgMonthly: Math.round(totalAmount / monthCount),
    };

    // ── Assemble response ────────────────────────────────────────────────
    const response: CategoryAnalyticsResponse = {
      availableMonths,
      categoryTrend,
      l2Breakdown,
      necessityTrend,
      familyCategoryMatrix,
      summary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/categories/analytics error:", error);
    return NextResponse.json(
      { error: "카테고리 분석 조회 실패", errorId: crypto.randomUUID() },
      { status: 500 }
    );
  }
}
