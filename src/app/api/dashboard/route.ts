import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { calcMonthlyAmount } from "@/lib/fixed-expense-calc";
import type { DashboardResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawMonth = searchParams.get("month"); // YYYY-MM or null
    const rawYear = searchParams.get("year"); // YYYY or null (all-time)
    const month = rawMonth && /^\d{4}-\d{2}$/.test(rawMonth) ? rawMonth : null;
    const year = !month && rawYear && /^\d{4}$/.test(rawYear) ? rawYear : null;

    // ── 1. Available months ────────────────────────────────────────────────
    const txMonthRows = sqlite
      .prepare(
        `SELECT DISTINCT
           COALESCE(aggregation_month, substr(aggregation_date,1,7), substr(original_date,1,7), substr(date,1,7)) AS m
         FROM transactions`
      )
      .all() as Array<{ m: string }>;

    const salMonthRows = sqlite
      .prepare(`SELECT DISTINCT substr(pay_date,1,7) AS m FROM salary_statements`)
      .all() as Array<{ m: string }>;

    const monthSet = new Set<string>();
    for (const r of txMonthRows) if (r.m) monthSet.add(r.m);
    for (const r of salMonthRows) if (r.m) monthSet.add(r.m);
    const availableMonths = Array.from(monthSet).sort().reverse();

    // ── 2. Snapshot metrics ───────────────────────────────────────────────
    // Build aggregation month expression for filtering
    const monthExpr = `COALESCE(aggregation_month, substr(aggregation_date,1,7), substr(original_date,1,7), substr(date,1,7))`;

    // Period scope: a single month wins over a year; neither = all-time
    const txWhereClause = month
      ? `WHERE ${monthExpr} = ?`
      : year
        ? `WHERE ${monthExpr} LIKE ?`
        : "";
    const salWhereClause = month
      ? "WHERE substr(pay_date,1,7) = ?"
      : year
        ? "WHERE substr(pay_date,1,7) LIKE ?"
        : "";
    const txParams: string[] = month ? [month] : year ? [`${year}-%`] : [];
    const salParams: string[] = month ? [month] : year ? [`${year}-%`] : [];

    // Transaction aggregates
    type TxAgg = { totalSpend: number; pureSpend: number; companySpend: number; totalCount: number };
    const txAgg = sqlite
      .prepare(
        `SELECT
           SUM(ABS(amount)) AS totalSpend,
           SUM(CASE WHEN is_company_expense = 0 THEN ABS(amount) ELSE 0 END) AS pureSpend,
           SUM(CASE WHEN is_company_expense = 1 THEN ABS(amount) ELSE 0 END) AS companySpend,
           COUNT(*) AS totalCount
         FROM transactions
         ${txWhereClause}`
      )
      .get(...txParams) as TxAgg;

    // Salary aggregates
    type SalAgg = { incomeTotal: number; grossIncome: number; totalDeductions: number };
    const salAgg = sqlite
      .prepare(
        `SELECT
           SUM(net_pay) AS incomeTotal,
           SUM(gross_pay) AS grossIncome,
           SUM(total_deductions) AS totalDeductions
         FROM salary_statements
         ${salWhereClause}`
      )
      .get(...salParams) as SalAgg;

    const incomeTotal = salAgg?.incomeTotal ?? 0;
    const grossIncome = salAgg?.grossIncome ?? 0;
    const totalDeductions = salAgg?.totalDeductions ?? 0;
    const totalSpend = txAgg?.totalSpend ?? 0;
    const pureHouseholdSpend = txAgg?.pureSpend ?? 0;
    const companyExpenseTotal = txAgg?.companySpend ?? 0;
    const totalCount = txAgg?.totalCount ?? 0;

    // ── 3. Fixed expenses (frequency-aware) ───────────────────────────────
    type FixedExpRow = {
      amount: number;
      frequency: string | null;
      weekdays: string | null;
      annual_date: string | null;
      start_date: string;
    };
    const activeFixed = sqlite
      .prepare(
        `SELECT amount, frequency, weekdays, annual_date, start_date
         FROM fixed_expenses WHERE is_active = 1`
      )
      .all() as FixedExpRow[];

    const now = new Date();
    const calcYear = month
      ? Number(month.slice(0, 4))
      : year
        ? Number(year)
        : now.getFullYear();
    const calcMonth = month ? Number(month.slice(5, 7)) : now.getMonth() + 1;

    const fixedExpenseMonthly = activeFixed.reduce(
      (sum, fe) =>
        sum +
        calcMonthlyAmount(
          {
            amount: fe.amount,
            frequency: fe.frequency,
            weekdays: fe.weekdays,
            annualDate: fe.annual_date,
            startDate: fe.start_date,
          },
          calcYear,
          calcMonth
        ),
      0
    );

    // ── 4. Savings rate ───────────────────────────────────────────────────
    // Only months that actually have salary data are compared, so a period that
    // starts before the first payslip does not distort the rate.
    const incomeMonthRows = sqlite
      .prepare(
        `SELECT DISTINCT substr(pay_date,1,7) AS m FROM salary_statements ${salWhereClause}`
      )
      .all(...salParams) as Array<{ m: string }>;
    const incomeMonths = incomeMonthRows.map((r) => r.m).filter(Boolean);
    let spendInIncomeMonths = 0;
    if (incomeMonths.length > 0) {
      const ph = incomeMonths.map(() => "?").join(",");
      const row = sqlite
        .prepare(
          `SELECT SUM(CASE WHEN is_company_expense = 0 THEN ABS(amount) ELSE 0 END) AS s
           FROM transactions WHERE ${monthExpr} IN (${ph})`
        )
        .get(...incomeMonths) as { s: number | null };
      spendInIncomeMonths = row?.s ?? 0;
    }
    const totalSpendWithFixed = spendInIncomeMonths + fixedExpenseMonthly * incomeMonths.length;
    const savingsRate =
      incomeTotal > 0
        ? Math.round(((incomeTotal - totalSpendWithFixed) / incomeTotal) * 100)
        : null;

    // ── 5. MoM change ─────────────────────────────────────────────────────
    type MonthlySpendRow = { m: string; amount: number };
    const monthlySpendRows = sqlite
      .prepare(
        `SELECT ${monthExpr} AS m, SUM(ABS(amount)) AS amount
         FROM transactions
         GROUP BY ${monthExpr}
         ORDER BY m`
      )
      .all() as MonthlySpendRow[];

    const allMonthlyMap = new Map<string, number>();
    for (const r of monthlySpendRows) if (r.m) allMonthlyMap.set(r.m, r.amount);
    const sortedAllMonths = Array.from(allMonthlyMap.keys()).sort();

    let momChange: { amount: number; percent: number | null } | null = null;
    if (!month) {
      if (sortedAllMonths.length >= 2) {
        const cur = sortedAllMonths[sortedAllMonths.length - 1];
        const prev = sortedAllMonths[sortedAllMonths.length - 2];
        const diff = (allMonthlyMap.get(cur) ?? 0) - (allMonthlyMap.get(prev) ?? 0);
        const prevAmt = allMonthlyMap.get(prev) ?? 0;
        momChange = {
          amount: diff,
          percent: prevAmt > 0 ? Math.round((diff / prevAmt) * 100) : null,
        };
      }
    } else {
      const idx = sortedAllMonths.indexOf(month);
      if (idx > 0) {
        const prev = sortedAllMonths[idx - 1];
        const curAmt = allMonthlyMap.get(month) ?? 0;
        const prevAmt = allMonthlyMap.get(prev) ?? 0;
        const diff = curAmt - prevAmt;
        momChange = {
          amount: diff,
          percent: prevAmt > 0 ? Math.round((diff / prevAmt) * 100) : null,
        };
      }
    }

    // ── 6. Category breakdown ─────────────────────────────────────────────
    type CatRow = { category: string; amount: number; count: number };
    const categoryBreakdown = sqlite
      .prepare(
        `SELECT
           COALESCE(category_l1,'기타') AS category,
           SUM(ABS(amount)) AS amount,
           COUNT(*) AS count
         FROM transactions
         ${txWhereClause}
         GROUP BY COALESCE(category_l1,'기타')
         ORDER BY amount DESC`
      )
      .all(...txParams) as CatRow[];

    // ── 7. Necessity breakdown ────────────────────────────────────────────
    type NecRow = { necessity: string; amount: number };
    const necRows = sqlite
      .prepare(
        `SELECT
           COALESCE(necessity,'unset') AS necessity,
           SUM(ABS(amount)) AS amount
         FROM transactions
         ${txWhereClause}
         GROUP BY COALESCE(necessity,'unset')`
      )
      .all(...txParams) as NecRow[];

    const NECESSITY_LABELS: Record<string, string> = {
      essential: "필수",
      discretionary: "재량",
      waste: "과소비",
      unset: "미분류",
    };
    const necessityBreakdown = necRows.map((r) => ({
      label: NECESSITY_LABELS[r.necessity] ?? r.necessity,
      amount: r.amount,
    }));

    // ── 7b. Necessity monthly trend (year filter applies; month filter -> whole year/all) ──
    const necTrendWhere = year ? `WHERE ${monthExpr} LIKE ?` : "";
    const necTrendParams: string[] = year ? [`${year}-%`] : [];
    type NecTrendRow = { month: string; necessity: string; amount: number };
    const necTrendRows = sqlite
      .prepare(
        `SELECT ${monthExpr} AS month,
                COALESCE(necessity,'unset') AS necessity,
                SUM(ABS(amount)) AS amount
         FROM transactions
         ${necTrendWhere}
         GROUP BY month, COALESCE(necessity,'unset')
         ORDER BY month`
      )
      .all(...necTrendParams) as NecTrendRow[];
    const necTrendMap = new Map<string, { month: string; essential: number; discretionary: number; waste: number; unset: number }>();
    for (const r of necTrendRows) {
      if (!r.month) continue;
      const row = necTrendMap.get(r.month) ?? { month: r.month, essential: 0, discretionary: 0, waste: 0, unset: 0 };
      if (r.necessity in row) (row as Record<string, number | string>)[r.necessity] = r.amount;
      necTrendMap.set(r.month, row);
    }
    const necessityTrend = Array.from(necTrendMap.values()).sort((x, y) => x.month.localeCompare(y.month));

    // ── 8. Family breakdown ───────────────────────────────────────────────
    type FamilyRow = { familyMemberId: number | null; amount: number };
    const familyRows = sqlite
      .prepare(
        `SELECT
           family_member_id AS familyMemberId,
           SUM(ABS(amount)) AS amount
         FROM transactions
         ${txWhereClause}
         GROUP BY family_member_id
         ORDER BY amount DESC`
      )
      .all(...txParams) as FamilyRow[];

    type FamilyMemberRow = { id: number; name: string; relation: string };
    const familyMemberRows = sqlite
      .prepare(`SELECT id, name, relation FROM family_members`)
      .all() as FamilyMemberRow[];
    const familyNameMap = new Map<number, string>();
    for (const fm of familyMemberRows) {
      familyNameMap.set(fm.id, `${fm.name} (${fm.relation})`);
    }
    const familyBreakdown = familyRows.map((r) => ({
      name: r.familyMemberId
        ? (familyNameMap.get(r.familyMemberId) ?? `구성원#${r.familyMemberId}`)
        : "미지정",
      amount: r.amount,
    }));

    // ── 9. Time-series: income vs expense (last 12 months, always all data) ──
    type MonthlyIncomeRow = { m: string; income: number };
    const incomeRows = sqlite
      .prepare(
        `SELECT substr(pay_date,1,7) AS m, SUM(net_pay) AS income
         FROM salary_statements
         GROUP BY substr(pay_date,1,7)
         ORDER BY m`
      )
      .all() as MonthlyIncomeRow[];

    const allIncomeMap = new Map<string, number>();
    for (const r of incomeRows) if (r.m) allIncomeMap.set(r.m, r.income);

    const allMonthKeysSet = new Set([...allMonthlyMap.keys(), ...allIncomeMap.keys()]);
    const incomeExpenseData = Array.from(allMonthKeysSet)
      .sort()
      .slice(-12)
      .map((m) => ({
        month: m,
        income: allIncomeMap.get(m) ?? 0,
        expense: allMonthlyMap.get(m) ?? 0,
      }));

    // ── 10. Trend data (last 12 months spend total per month) ─────────────
    const trendData = monthlySpendRows
      .slice(-12)
      .map((r) => ({ month: r.m, amount: r.amount }));

    // Category x month trend (same 12-month window), L1 pivot, top 5 by total
    const trendMonths = trendData.map((r) => r.month);
    const catMonthRows = trendMonths.length
      ? (sqlite
          .prepare(
            `SELECT ${monthExpr} AS m, COALESCE(category_l1, '기타') AS l1, SUM(ABS(amount)) AS amount
             FROM transactions
             WHERE ${monthExpr} >= ? AND ${monthExpr} <= ?
             GROUP BY m, l1`
          )
          .all(trendMonths[0], trendMonths[trendMonths.length - 1]) as Array<{
          m: string;
          l1: string;
          amount: number;
        }>)
      : [];
    const l1Totals = new Map<string, number>();
    for (const r of catMonthRows) l1Totals.set(r.l1, (l1Totals.get(r.l1) ?? 0) + r.amount);
    const trendCategories = Array.from(l1Totals.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([l1]) => l1);
    const categoryTrendData = trendMonths.map((m): Record<string, string | number> & { month: string } => {
      const point: Record<string, string | number> & { month: string } = { month: m };
      for (const c of trendCategories) point[c] = 0;
      for (const r of catMonthRows) {
        if (r.m === m && trendCategories.includes(r.l1)) point[r.l1] = r.amount;
      }
      return point;
    });

    // ── 10b. Year-over-year (always all data) ─────────────────────────────
    const availableYears = Array.from(
      new Set(Array.from(allMonthlyMap.keys()).map((m) => m.slice(0, 4)))
    )
      .filter((y) => /^\d{4}$/.test(y))
      .sort()
      .reverse();
    const yearlyData = availableYears
      .slice()
      .reverse()
      .map((y) => {
        const ms = Array.from(allMonthlyMap.keys()).filter((m) => m.startsWith(`${y}-`));
        const spend = ms.reduce((a, m) => a + (allMonthlyMap.get(m) ?? 0), 0);
        const incMs = Array.from(allIncomeMap.keys()).filter((m) => m.startsWith(`${y}-`));
        const income = incMs.reduce((a, m) => a + (allIncomeMap.get(m) ?? 0), 0);
        return { year: y, spend, income, months: ms.length };
      });
    const yoyMonthlyData = Array.from({ length: 12 }, (_, i) => {
      const mm = String(i + 1).padStart(2, "0");
      const point: Record<string, string | number> & { month: string } = { month: `${i + 1}월` };
      for (const y of availableYears) {
        const v = allMonthlyMap.get(`${y}-${mm}`);
        if (v !== undefined) point[y] = v;
      }
      return point;
    });

    // ── 11. Category table (L1 → L2) ─────────────────────────────────────
    type CatTableRow = {
      categoryL1: string;
      categoryL2: string;
      amount: number;
      count: number;
    };
    const catTableRows = sqlite
      .prepare(
        `SELECT
           COALESCE(category_l1,'기타') AS categoryL1,
           COALESCE(category_l2,'미분류') AS categoryL2,
           SUM(ABS(amount)) AS amount,
           COUNT(*) AS count
         FROM transactions
         ${txWhereClause}
         GROUP BY COALESCE(category_l1,'기타'), COALESCE(category_l2,'미분류')
         ORDER BY categoryL1, amount DESC`
      )
      .all(...txParams) as CatTableRow[];

    // Roll up into L1 with L2 children
    const l1Map = new Map<
      string,
      { amount: number; count: number; children: { categoryL2: string; amount: number; count: number }[] }
    >();
    for (const row of catTableRows) {
      const existing = l1Map.get(row.categoryL1) ?? { amount: 0, count: 0, children: [] };
      existing.amount += row.amount;
      existing.count += row.count;
      existing.children.push({
        categoryL2: row.categoryL2,
        amount: row.amount,
        count: row.count,
      });
      l1Map.set(row.categoryL1, existing);
    }
    const categoryTable = Array.from(l1Map.entries())
      .map(([categoryL1, data]) => ({ categoryL1, ...data }))
      .sort((a, b) => b.amount - a.amount);

    // ── Assemble response ─────────────────────────────────────────────────
    const response: DashboardResponse = {
      availableMonths,
      availableYears,
      yearlyData,
      yoyMonthlyData,
      incomeTotal,
      grossIncome,
      totalDeductions,
      totalSpend,
      pureHouseholdSpend,
      companyExpenseTotal,
      totalCount,
      fixedExpenseMonthly,
      savingsRate,
      momChange,
      categoryBreakdown,
      necessityBreakdown,
      necessityTrend,
      familyBreakdown,
      incomeExpenseData,
      trendData,
      categoryTrendData,
      trendCategories,
      categoryTable,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json(
      { error: "대시보드 조회 실패", errorId: crypto.randomUUID() },
      { status: 500 }
    );
  }
}
