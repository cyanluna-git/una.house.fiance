export const COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#f97316", "#6366f1", "#14b8a6",
  "#e11d48", "#84cc16", "#0ea5e9", "#a855f7",
];

export const CHART_HEIGHT = 350;

export const formatAmount = (value: number): string => {
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(0)}만`;
  return value.toLocaleString();
};
