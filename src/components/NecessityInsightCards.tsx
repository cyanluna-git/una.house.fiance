"use client";

import type { CategoryAnalyticsResponse } from "@/types";

interface NecessityInsightCardsProps {
  necessityTrend: CategoryAnalyticsResponse["necessityTrend"];
  necessityByCategory: CategoryAnalyticsResponse["necessityByCategory"];
}

function computeTotals(
  trend: CategoryAnalyticsResponse["necessityTrend"],
): { essential: number; discretionary: number; waste: number; unset: number; total: number } {
  const result = { essential: 0, discretionary: 0, waste: 0, unset: 0, total: 0 };
  for (const row of trend) {
    result.essential += row.essential;
    result.discretionary += row.discretionary;
    result.waste += row.waste;
    result.unset += row.unset;
  }
  result.total = result.essential + result.discretionary + result.waste + result.unset;
  return result;
}

function computeWasteTrendArrow(
  trend: CategoryAnalyticsResponse["necessityTrend"],
): "up" | "down" | "flat" {
  if (trend.length < 2) return "flat";
  const last = trend[trend.length - 1].waste;
  const prev = trend[trend.length - 2].waste;
  if (last > prev) return "up";
  if (last < prev) return "down";
  return "flat";
}

function findTopWasteCategory(
  byCategory: CategoryAnalyticsResponse["necessityByCategory"],
): string {
  if (byCategory.length === 0) return "-";
  let topCat = "-";
  let topWaste = 0;
  for (const row of byCategory) {
    if (row.waste > topWaste) {
      topWaste = row.waste;
      topCat = row.categoryL1;
    }
  }
  return topCat;
}

export default function NecessityInsightCards({
  necessityTrend,
  necessityByCategory,
}: NecessityInsightCardsProps) {
  const totals = computeTotals(necessityTrend);
  const wasteTrend = computeWasteTrendArrow(necessityTrend);
  const topWasteCat = findTopWasteCategory(necessityByCategory);

  const pct = (val: number): string =>
    totals.total > 0 ? ((val / totals.total) * 100).toFixed(1) : "0.0";

  const trendArrow = wasteTrend === "up" ? " ↑" : wasteTrend === "down" ? " ↓" : "";
  const trendColor =
    wasteTrend === "up" ? "text-red-600" : wasteTrend === "down" ? "text-green-600" : "text-slate-700";

  const cards = [
    {
      label: "필수 지출 비율",
      value: `${pct(totals.essential)}%`,
      sub: `${totals.essential.toLocaleString()}원`,
      color: "text-emerald-600",
    },
    {
      label: "낭비 비율",
      value: `${pct(totals.waste)}%${trendArrow}`,
      sub: `${totals.waste.toLocaleString()}원`,
      color: trendColor,
    },
    {
      label: "미설정 비율",
      value: `${pct(totals.unset)}%`,
      sub: `${totals.unset.toLocaleString()}원`,
      color: totals.unset > 0 ? "text-slate-500" : "text-slate-700",
    },
    {
      label: "최다 낭비 카테고리",
      value: topWasteCat,
      sub: null,
      color: "text-red-600",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg shadow p-4">
          <p className="text-xs text-slate-500 mb-1">{card.label}</p>
          <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
          {card.sub && (
            <p className="text-xs text-slate-400 mt-0.5">{card.sub}</p>
          )}
        </div>
      ))}
    </div>
  );
}
