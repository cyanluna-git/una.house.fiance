"use client";

interface PeriodFilterProps {
  years: string[];
  months: string[]; // all available YYYY-MM
  year: string; // "all" | YYYY
  month: string; // "all" | YYYY-MM
  onChange: (next: { year: string; month: string }) => void;
  compact?: boolean;
}

const selectCls =
  "border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[44px] lg:min-h-0";

export default function PeriodFilter({ years, months, year, month, onChange }: PeriodFilterProps) {
  const monthsInYear = year === "all" ? [] : months.filter((m) => m.startsWith(`${year}-`));
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label="연도"
        value={year}
        onChange={(e) => onChange({ year: e.target.value, month: "all" })}
        className={selectCls}
      >
        <option value="all">전체 기간</option>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}년
          </option>
        ))}
      </select>
      {year !== "all" && (
        <select
          aria-label="월"
          value={month}
          onChange={(e) => onChange({ year, month: e.target.value })}
          className={selectCls}
        >
          <option value="all">연간</option>
          {monthsInYear.map((m) => (
            <option key={m} value={m}>
              {Number(m.slice(5, 7))}월
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
