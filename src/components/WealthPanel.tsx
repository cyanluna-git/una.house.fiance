"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Money from "@/components/Money";

interface Wealth {
  asOf: string | null;
  totalAssets: number;
  totalPrincipal: number;
  totalDebt: number;
  netWorth: number;
  monthlyPayment: number;
  weightedRate: number;
  assets: { id: number; asset_type: string; name: string; institution: string | null; balance: number | null; principal: number | null; snapshot_date: string | null }[];
  loans: { id: number; loan_type: string; loan_name: string; lender: string; original_amount: number; outstanding_amount: number; interest_rate: number; rate_type: string; monthly_payment: number | null; payment_day: number | null; end_date: string | null }[];
  assetByType: { name: string; value: number }[];
  debtByType: { name: string; value: number }[];
  history: { date: string; total: number; n: number }[];
}

function Bar({ items, total, color }: { items: { name: string; value: number }[]; total: number; color: string }) {
  return (
    <div className="space-y-2">
      {items.map((i) => (
        <div key={i.name}>
          <div className="flex justify-between text-sm">
            <span className="text-slate-700">{i.name}</span>
            <span className="text-slate-900 tabular-nums">
              <Money value={i.value} /> <span className="text-slate-400 text-xs">({total > 0 ? Math.round((i.value / total) * 100) : 0}%)</span>
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className={`h-full ${color}`} style={{ width: `${total > 0 ? (i.value / total) * 100 : 0}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WealthPanel() {
  const [d, setD] = useState<Wealth | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard/wealth")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setD)
      .catch(() => setErr(true));
  }, []);

  if (err) return <p className="text-sm text-red-600 p-4">자산·대출 정보를 불러오지 못했습니다.</p>;
  if (!d) return <p className="text-sm text-slate-500 p-4">로딩 중...</p>;

  const gain = d.totalAssets - d.totalPrincipal;
  const stale = d.asOf ? Math.floor((Date.now() - new Date(d.asOf).getTime()) / 86400000) : null;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
        <p className="text-sm opacity-80">순자산 (자산 − 대출)</p>
        <p className="whitespace-nowrap tabular-nums text-3xl font-bold mt-1"><Money value={d.netWorth} /></p>
        <p className="text-xs opacity-80 mt-2">
          기준일 {d.asOf ?? "-"}
          {stale !== null && stale > 35 && " · 갱신한 지 한 달이 넘었습니다"}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl p-4 bg-white shadow border border-slate-200">
          <p className="text-xs text-slate-500">총 자산</p>
          <p className="text-lg font-bold text-slate-900 tabular-nums"><Money value={d.totalAssets} /></p>
          <p className="text-xs text-slate-400">평가손익 <Money value={gain} /></p>
        </div>
        <div className="rounded-xl p-4 bg-white shadow border border-slate-200">
          <p className="text-xs text-slate-500">대출 잔액</p>
          <p className="text-lg font-bold text-rose-600 tabular-nums"><Money value={d.totalDebt} /></p>
          <p className="text-xs text-slate-400">가중평균 금리 {d.weightedRate}%</p>
        </div>
        <div className="rounded-xl p-4 bg-white shadow border border-slate-200">
          <p className="text-xs text-slate-500">월 상환액</p>
          <p className="text-lg font-bold text-slate-900 tabular-nums"><Money value={d.monthlyPayment} /></p>
        </div>
        <div className="rounded-xl p-4 bg-white shadow border border-slate-200">
          <p className="text-xs text-slate-500">부채비율</p>
          <p className="text-lg font-bold text-slate-900">{d.totalAssets > 0 ? Math.round((d.totalDebt / d.totalAssets) * 100) : "-"}%</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <section className="bg-white rounded-xl shadow border border-slate-200 p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-slate-900">자산 구성</h2>
            <Link href="/assets" className="text-xs text-blue-600">관리·입력</Link>
          </div>
          <Bar items={d.assetByType} total={d.totalAssets} color="bg-indigo-500" />
          <ul className="mt-4 divide-y divide-slate-100 text-sm">
            {d.assets.map((a) => (
              <li key={a.id} className="py-2 flex justify-between gap-2">
                <span className="text-slate-700 truncate">{a.name}<span className="text-slate-400 text-xs"> {a.institution}</span></span>
                <span className="tabular-nums text-slate-900 whitespace-nowrap"><Money value={a.balance ?? 0} /></span>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-xl shadow border border-slate-200 p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-slate-900">대출 현황</h2>
            <Link href="/loans" className="text-xs text-blue-600">관리</Link>
          </div>
          <Bar items={d.debtByType} total={d.totalDebt} color="bg-rose-500" />
          <ul className="mt-4 divide-y divide-slate-100 text-sm">
            {d.loans.map((l) => {
              const paid = l.original_amount > 0 ? Math.round(((l.original_amount - l.outstanding_amount) / l.original_amount) * 100) : 0;
              return (
                <li key={l.id} className="py-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-700 truncate">{l.loan_name}</span>
                    <span className="tabular-nums text-slate-900 whitespace-nowrap"><Money value={l.outstanding_amount} /></span>
                  </div>
                  <div className="text-xs text-slate-400">
                    {l.lender} · {l.interest_rate}% {l.rate_type} · 월 {(l.monthly_payment ?? 0).toLocaleString()}원 · 상환 {paid}%{l.end_date ? ` · ~${l.end_date}` : ""}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="bg-white rounded-xl shadow border border-slate-200 p-4">
        <h2 className="font-semibold text-slate-900 mb-2">자산 추이</h2>
        {d.history.length < 2 ? (
          <p className="text-sm text-slate-500">
            기록이 {d.history.length}회뿐이라 추이를 그릴 수 없습니다. 월 1회 <Link href="/assets" className="text-blue-600">자산 화면</Link>에서 평가금액을 입력하면 이곳에 쌓입니다.
          </p>
        ) : (
          <ul className="text-sm divide-y divide-slate-100">
            {d.history.map((h) => (
              <li key={h.date} className="py-1.5 flex justify-between">
                <span className="text-slate-600">{h.date}</span>
                <span className="tabular-nums"><Money value={h.total} /></span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
