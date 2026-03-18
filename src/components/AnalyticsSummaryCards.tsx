"use client";

import type { CategoryAnalyticsResponse } from "@/types";

interface AnalyticsSummaryCardsProps {
  summary: CategoryAnalyticsResponse["summary"];
  categoryTrend: CategoryAnalyticsResponse["categoryTrend"];
}

function computePeakMonth(
  categoryTrend: CategoryAnalyticsResponse["categoryTrend"],
): string {
  let maxMonth = "-";
  let maxTotal = 0;
  for (const entry of categoryTrend) {
    let monthTotal = 0;
    for (const [key, val] of Object.entries(entry)) {
      if (key === "month") continue;
      monthTotal += typeof val === "number" ? val : 0;
    }
    if (monthTotal > maxTotal) {
      maxTotal = monthTotal;
      maxMonth = entry.month;
    }
  }
  return maxMonth;
}

function computeMomChange(
  categoryTrend: CategoryAnalyticsResponse["categoryTrend"],
): number | null {
  if (categoryTrend.length < 2) return null;

  function monthTotal(entry: Record<string, string | number>): number {
    let total = 0;
    for (const [key, val] of Object.entries(entry)) {
      if (key === "month") continue;
      total += typeof val === "number" ? val : 0;
    }
    return total;
  }

  const last = monthTotal(categoryTrend[categoryTrend.length - 1]);
  const prev = monthTotal(categoryTrend[categoryTrend.length - 2]);

  if (prev === 0) return null;
  return Math.round(((last - prev) / prev) * 1000) / 10;
}

export default function AnalyticsSummaryCards({
  summary,
  categoryTrend,
}: AnalyticsSummaryCardsProps) {
  const peakMonth = computePeakMonth(categoryTrend);
  const momChange = computeMomChange(categoryTrend);

  const cards = [
    {
      label: "기간 합계",
      value: `${summary.totalAmount.toLocaleString()}원`,
    },
    {
      label: "월평균",
      value: `${summary.avgMonthly.toLocaleString()}원`,
    },
    {
      label: "최고 지출월",
      value: peakMonth !== "-" ? peakMonth.replace("-", ".") : "-",
    },
    {
      label: "MoM 변화율",
      value: momChange !== null ? `${momChange > 0 ? "+" : ""}${momChange}%` : "-",
      color: momChange !== null
        ? momChange > 0
          ? "text-red-600"
          : momChange < 0
            ? "text-green-600"
            : "text-slate-700"
        : "text-slate-700",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-lg shadow p-4"
        >
          <p className="text-xs text-slate-500 mb-1">{card.label}</p>
          <p className={`text-lg font-bold ${card.color ?? "text-slate-900"}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
