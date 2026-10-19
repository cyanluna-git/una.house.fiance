/**
 * 금액 표시 공통 컴포넌트.
 * - 줄바꿈 금지 (좁은 화면에서 "8,433,986\n원"처럼 꺾이지 않게)
 * - 숫자 폭 고정(tabular-nums)으로 세로 정렬
 * - sign: "auto"는 음수에 "-", "minus"는 항상 "-" (공제 등), "plus"는 양수에 "+"
 */
interface MoneyProps {
  value: number;
  sign?: "auto" | "minus" | "plus";
  unit?: string;
  className?: string;
}

export function formatMoney(value: number, sign: MoneyProps["sign"] = "auto", unit = "원"): string {
  const abs = Math.abs(value).toLocaleString("ko-KR");
  let prefix = "";
  if (sign === "minus") prefix = value === 0 ? "" : "-";
  else if (value < 0) prefix = "-";
  else if (sign === "plus" && value > 0) prefix = "+";
  return `${prefix}${abs}${unit}`;
}

export default function Money({ value, sign = "auto", unit = "원", className = "" }: MoneyProps) {
  return (
    <span className={`whitespace-nowrap tabular-nums ${className}`}>{formatMoney(value, sign, unit)}</span>
  );
}
