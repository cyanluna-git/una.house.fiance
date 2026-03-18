import { NextRequest, NextResponse } from "next/server";
import { sqlite } from "@/lib/db";
import { calcMonthlyAmount } from "@/lib/fixed-expense-calc";
import type { DashboardResponse } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // YYYY-MM or null (all-time)

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

    const txWhereClause = month ? `WHERE ${monthExpr} = ?` : "";
    const salWhereClause = month ? "WHERE substr(pay_date,1,7) = ?" : "";
    const txParams: string[] = month ? [month] : [];
    const salParams: string[] = month ? [month] : [];

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
    const calcYear = month ? Number(month.slice(0, 4)) : now.getFullYear();
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
    let monthsInView = 1;
    if (!month) {
      const cntRow = sqlite
        .prepare(
          `SELECT COUNT(DISTINCT ${monthExpr}) AS cnt FROM transactions`
        )
        .get() as { cnt: number };
      monthsInView = Math.max(cntRow?.cnt ?? 1, 1);
    }
    const totalSpendWithFixed = pureHouseholdSpend + fixedExpenseMonthly * monthsInView;
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
      familyBreakdown,
      incomeExpenseData,
      trendData,
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
