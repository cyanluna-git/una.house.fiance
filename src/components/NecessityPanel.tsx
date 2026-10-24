"use client";

import dynamic from "next/dynamic";
import type { DashboardResponse } from "@/types";

const NecessityTrendChart = dynamic(() => import("@/components/NecessityTrendChart"), { ssr: false });

const ITEMS = [
  { key: "essential", label: "필수", color: "text-emerald-600" },
  { key: "discretionary", label: "재량", color: "text-amber-600" },
  { key: "waste", label: "과소비", color: "text-rose-600" },
] as const;

export default function NecessityPanel({ data }: { data: DashboardResponse["necessityTrend"] }) {
  const sum = (k: "essential" | "discretionary" | "waste") => data.reduce((s, r) => s + r[k], 0);
  const total = ITEMS.reduce((s, i) => s + sum(i.key), 0);
  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <h3 className="text-lg font-semibold text-slate-900 mb-4">소비 유형 월별 추이</h3>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {ITEMS.map((i) => {
          const v = sum(i.key);
          return (
            <div key={i.key} className="rounded-lg bg-slate-50 p-3 text-center">
              <p className="text-xs text-slate-500">{i.label}</p>
              <p className={`text-lg font-bold ${i.color}`}>{total > 0 ? ((v / total) * 100).toFixed(0) : 0}%</p>
              <p className="text-xs text-slate-500">{Math.round(v / 10000).toLocaleString()}만원</p>
            </div>
          );
        })}
      </div>
      <NecessityTrendChart data={data} />
    </div>
  );
}
