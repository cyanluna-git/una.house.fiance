"use client";

import { useState, useMemo } from "react";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { COLORS, formatAmount } from "@/lib/chart-utils";
import type { CategoryAnalyticsResponse } from "@/types";
import FamilyL2DrilldownModal from "./FamilyL2DrilldownModal";
import CategoryMemberTrendModal from "./CategoryMemberTrendModal";

interface FamilyCategoryTableProps {
  data: CategoryAnalyticsResponse["familyCategoryMatrix"];
  from: string;
  to: string;
}

function heatmapBg(value: number, colMax: number): string {
  if (colMax <= 0 || value <= 0) return "";
  const intensity = Math.min(value / colMax, 1);
  // Light blue gradient: transparent -> blue-100
  const alpha = Math.round(intensity * 40);
  return `rgba(59, 130, 246, ${alpha / 100})`;
}

export default function FamilyCategoryTable({ data, from, to }: FamilyCategoryTableProps) {
  const [selectedMember, setSelectedMember] = useState<{ memberId: number; memberName: string } | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Extract all L1 category keys (exclude memberName and memberId)
  const categories = useMemo(() => {
    const cats = new Set<string>();
    for (const row of data) {
      for (const key of Object.keys(row)) {
        if (key !== "memberName" && key !== "memberId") cats.add(key);
      }
    }
    return Array.from(cats).sort();
  }, [data]);

  // Compute per-member totals, column totals, column maxes, and grand total
  const { memberTotals, colTotals, colMaxes, grandTotal } = useMemo(() => {
    const mTotals = new Map<number, number>();
    const cTotals = new Map<string, number>();
    const cMaxes = new Map<string, number>();
    let total = 0;

    for (const row of data) {
      const memberId = row.memberId as number;
      let memberSum = 0;
      for (const cat of categories) {
        const val = (row[cat] as number) ?? 0;
        memberSum += val;
        cTotals.set(cat, (cTotals.get(cat) ?? 0) + val);
        cMaxes.set(cat, Math.max(cMaxes.get(cat) ?? 0, val));
      }
      mTotals.set(memberId, memberSum);
      total += memberSum;
    }

    return { memberTotals: mTotals, colTotals: cTotals, colMaxes: cMaxes, grandTotal: total };
  }, [data, categories]);

  // Pie chart data: member share of total spending
  const pieData = useMemo(() => {
    return data.map((row) => ({
      name: row.memberName as string,
      value: memberTotals.get(row.memberId as number) ?? 0,
    })).filter((d) => d.value > 0);
  }, [data, memberTotals]);

  if (data.length === 0 || categories.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        가족 구성원 또는 카테고리 데이터가 없습니다
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cross table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left font-semibold text-slate-700 min-w-[120px]">
                  구성원
                </th>
                {categories.map((cat) => (
                  <th
                    key={cat}
                    className="px-3 py-3 text-right font-semibold text-slate-700 min-w-[100px] cursor-pointer hover:bg-blue-50 transition-colors"
                    onClick={() => setSelectedCategory(cat)}
                    title={`${cat} 클릭: 구성원별 월간 트렌드`}
                  >
                    <span className="underline decoration-dotted decoration-slate-400">
                      {cat}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-3 text-right font-semibold text-slate-900 min-w-[100px] bg-slate-100">
                  합계
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const memberId = row.memberId as number;
                const memberName = row.memberName as string;
                const memberTotal = memberTotals.get(memberId) ?? 0;

                return (
                  <tr key={memberId} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td
                      className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-slate-800 cursor-pointer hover:text-blue-600 transition-colors"
                      onClick={() => setSelectedMember({ memberId, memberName })}
                      title={`${memberName} 클릭: L2 카테고리 상세`}
                    >
                      <span className="underline decoration-dotted decoration-slate-400">
                        {memberName}
                      </span>
                    </td>
                    {categories.map((cat) => {
                      const val = (row[cat] as number) ?? 0;
                      const pct = memberTotal > 0 ? ((val / memberTotal) * 100).toFixed(1) : "0.0";
                      const colMax = colMaxes.get(cat) ?? 0;
                      return (
                        <td
                          key={cat}
                          className="px-3 py-3 text-right tabular-nums"
                          style={{ backgroundColor: heatmapBg(val, colMax) }}
                        >
                          {val > 0 ? (
                            <>
                              <div className="text-slate-800">{formatAmount(val)}</div>
                              <div className="text-[10px] text-slate-500">{pct}%</div>
                            </>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-3 text-right tabular-nums font-semibold text-slate-900 bg-slate-50">
                      {formatAmount(memberTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-slate-300">
                <td className="sticky left-0 z-10 bg-slate-100 px-4 py-3 font-semibold text-slate-700">
                  합계
                </td>
                {categories.map((cat) => {
                  const colTotal = colTotals.get(cat) ?? 0;
                  return (
                    <td key={cat} className="px-3 py-3 text-right tabular-nums font-semibold text-slate-800">
                      {colTotal > 0 ? formatAmount(colTotal) : "-"}
                    </td>
                  );
                })}
                <td className="px-3 py-3 text-right tabular-nums font-bold text-slate-900">
                  {formatAmount(grandTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Pie chart: member share */}
      {pieData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-1">구성원별 지출 비중</h3>
          <p className="text-xs text-slate-500 mb-4">전체 지출에서 각 구성원이 차지하는 비율</p>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={100}
                dataKey="value"
                label={({ name, percent }) =>
                  `${name ?? ""} ${((percent ?? 0) * 100).toFixed(1)}%`
                }
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => [`${Number(value).toLocaleString()}원`, "금액"]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Row click modal: L2 breakdown for a member */}
      <FamilyL2DrilldownModal
        open={selectedMember !== null}
        onClose={() => setSelectedMember(null)}
        memberId={selectedMember?.memberId ?? null}
        memberName={selectedMember?.memberName ?? ""}
        from={from}
        to={to}
      />

      {/* Column click modal: member x month trend for a category */}
      <CategoryMemberTrendModal
        open={selectedCategory !== null}
        onClose={() => setSelectedCategory(null)}
        categoryL1={selectedCategory}
        from={from}
        to={to}
      />
    </div>
  );
}
