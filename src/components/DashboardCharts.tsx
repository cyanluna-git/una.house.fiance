"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  LineChart, Line,
} from "recharts";

interface NecessityItem { name: string; value: number; color: string }
interface FamilySpendItem { name: string; value: number }
interface TrendItem { month: string; [category: string]: string | number }

interface IncomeExpenseItem { month: string; income: number; expense: number }
interface MonthlyItem { month: string; amount: number }
interface CategoryItem { name: string; value: number }

const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
  "#e11d48", "#84cc16", "#0ea5e9", "#a855f7",
];

const formatAmount = (value: number) => {
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(0)}만`;
  return value.toLocaleString();
};

interface DashboardChartsProps {
  incomeExpenseData: IncomeExpenseItem[];
  monthlyData: MonthlyItem[];
  categoryData: CategoryItem[];
  necessityData: NecessityItem[];
  familySpendData: FamilySpendItem[];
  trendData: TrendItem[];
  trendCategories: string[];
  selectedMonth: string;
}

export default function DashboardCharts({
  incomeExpenseData,
  monthlyData,
  categoryData,
  necessityData,
  familySpendData,
  trendData,
  trendCategories,
  selectedMonth,
}: DashboardChartsProps) {
  return (
    <>
      {/* Income vs Expense Chart */}
      {incomeExpenseData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">수입 vs 지출</h3>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={incomeExpenseData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => v.substring(5)}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatAmount} />
              <Tooltip
                formatter={(value, name) => [
                  `${Number(value).toLocaleString()}원`,
                  name === "income" ? "수입" : "지출",
                ]}
              />
              <Legend
                formatter={(value) => (value === "income" ? "수입" : "지출")}
              />
              <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Charts Row 1: Monthly Bar + Category Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">월별 지출</h3>
          {monthlyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12 }}
                  tickFormatter={(v) => v.substring(5)}
                />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={formatAmount} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toLocaleString()}원`, "지출"]}
                />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-12">데이터가 없습니다</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            카테고리별 지출
            {selectedMonth !== "all" && (
              <span className="text-sm font-normal text-slate-500 ml-2">
                ({selectedMonth.replace("-", ".")})
              </span>
            )}
          </h3>
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={{ strokeWidth: 1 }}
                >
                  {categoryData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${Number(value).toLocaleString()}원`]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-12">데이터가 없습니다</p>
          )}
        </div>
      </div>

      {/* Charts Row 2: Necessity Pie + Family Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            필수 / 재량 비율
            {selectedMonth !== "all" && (
              <span className="text-sm font-normal text-slate-500 ml-2">
                ({selectedMonth.replace("-", ".")})
              </span>
            )}
          </h3>
          {necessityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={necessityData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={{ strokeWidth: 1 }}
                >
                  {necessityData.map((item, i) => (
                    <Cell key={i} fill={item.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [`${Number(value).toLocaleString()}원`]}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-12">데이터가 없습니다</p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">
            구성원별 지출
            {selectedMonth !== "all" && (
              <span className="text-sm font-normal text-slate-500 ml-2">
                ({selectedMonth.replace("-", ".")})
              </span>
            )}
          </h3>
          {familySpendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={familySpendData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={formatAmount} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={120} />
                <Tooltip
                  formatter={(value) => [`${Number(value).toLocaleString()}원`, "지출"]}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-center py-12">데이터가 없습니다</p>
          )}
        </div>
      </div>

      {/* Trend Line Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">카테고리별 월별 트렌드</h3>
        {trendData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12 }}
                tickFormatter={(v) => v.substring(5)}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={formatAmount} />
              <Tooltip
                formatter={(value, name) => [`${Number(value).toLocaleString()}원`, name]}
              />
              <Legend />
              {trendCategories.map((cat, i) => (
                <Line
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-slate-500 text-center py-12">데이터가 없습니다</p>
        )}
      </div>
    </>
  );
}
