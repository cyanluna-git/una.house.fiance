"use client";

import type { CategoryAnalyticsResponse } from "@/types";

interface TopWasteCategoriesProps {
  data: CategoryAnalyticsResponse["necessityByCategory"];
}

export default function TopWasteCategories({ data }: TopWasteCategoriesProps) {
  const wasteItems = data
    .filter((row) => row.waste > 0)
    .sort((a, b) => b.waste - a.waste)
    .slice(0, 5);

  if (wasteItems.length === 0) {
    return (
      <div className="text-slate-500 text-center py-8 text-sm">
        낭비로 분류된 지출이 없습니다
      </div>
    );
  }

  return (
    <div className="divide-y divide-slate-100">
      {wasteItems.map((item, i) => {
        const wastePct = item.total > 0
          ? ((item.waste / item.total) * 100).toFixed(1)
          : "0.0";
        return (
          <div key={item.categoryL1} className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-400 w-5 text-right">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-800">{item.categoryL1}</p>
                <p className="text-xs text-slate-500">
                  전체 {item.total.toLocaleString()}원 중 낭비 {wastePct}%
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-red-600">
                {item.waste.toLocaleString()}원
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
