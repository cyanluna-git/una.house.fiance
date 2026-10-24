import { NextResponse } from "next/server";
import { sqlite } from "@/lib/db";

export const dynamic = "force-dynamic";

interface AssetRow {
  id: number;
  asset_type: string;
  name: string;
  institution: string | null;
  balance: number | null;
  principal: number | null;
  snapshot_date: string | null;
}
interface LoanRow {
  id: number;
  loan_type: string;
  loan_name: string;
  lender: string;
  original_amount: number;
  outstanding_amount: number;
  interest_rate: number;
  rate_type: string;
  monthly_payment: number | null;
  payment_day: number | null;
  end_date: string | null;
}

export async function GET() {
  try {
    // 계좌별 최신 스냅샷
    const assets = sqlite
      .prepare(
        `SELECT a.id, a.asset_type, a.name, a.institution,
                s.balance, s.principal, s.snapshot_date
         FROM asset_accounts a
         LEFT JOIN asset_snapshots s ON s.id = (
           SELECT id FROM asset_snapshots WHERE account_id = a.id
           ORDER BY snapshot_date DESC, id DESC LIMIT 1)
         WHERE a.is_active = 1
         ORDER BY s.balance DESC`
      )
      .all() as AssetRow[];

    const loans = sqlite
      .prepare(
        `SELECT id, loan_type, loan_name, lender, original_amount, outstanding_amount,
                interest_rate, rate_type, monthly_payment, payment_day, end_date
         FROM loans ORDER BY outstanding_amount DESC`
      )
      .all() as LoanRow[];

    const totalAssets = assets.reduce((s, a) => s + (a.balance ?? 0), 0);
    const totalPrincipal = assets.reduce((s, a) => s + (a.principal ?? a.balance ?? 0), 0);
    const totalDebt = loans.reduce((s, l) => s + l.outstanding_amount, 0);
    const monthlyPayment = loans.reduce((s, l) => s + (l.monthly_payment ?? 0), 0);
    const weightedRate =
      totalDebt > 0
        ? loans.reduce((s, l) => s + l.interest_rate * l.outstanding_amount, 0) / totalDebt
        : 0;

    // 종류별 구성
    const byType: Record<string, number> = {};
    for (const a of assets) byType[a.asset_type] = (byType[a.asset_type] ?? 0) + (a.balance ?? 0);
    const assetByType = Object.entries(byType).map(([name, value]) => ({ name, value }));

    const byLoanType: Record<string, number> = {};
    for (const l of loans) byLoanType[l.loan_type] = (byLoanType[l.loan_type] ?? 0) + l.outstanding_amount;
    const debtByType = Object.entries(byLoanType).map(([name, value]) => ({ name, value }));

    // 월별 순자산 추이용: 스냅샷 날짜별 자산 합계
    const history = sqlite
      .prepare(
        `SELECT snapshot_date AS date, SUM(balance) AS total, COUNT(*) AS n
         FROM asset_snapshots GROUP BY snapshot_date ORDER BY snapshot_date`
      )
      .all() as { date: string; total: number; n: number }[];

    return NextResponse.json({
      asOf: assets.map((a) => a.snapshot_date).filter(Boolean).sort().pop() ?? null,
      totalAssets,
      totalPrincipal,
      totalDebt,
      netWorth: totalAssets - totalDebt,
      monthlyPayment,
      weightedRate: Math.round(weightedRate * 100) / 100,
      assets,
      loans,
      assetByType,
      debtByType,
      history,
    });
  } catch (error) {
    console.error("GET /api/dashboard/wealth error:", error);
    return NextResponse.json({ error: "조회 실패", errorId: crypto.randomUUID() }, { status: 500 });
  }
}
