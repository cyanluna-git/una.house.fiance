export const CARD_COMPANY_COLORS: Record<string, string> = {
  "국민카드": "bg-amber-100 text-amber-700",
  "현대카드": "bg-slate-200 text-slate-700",
  "신한카드": "bg-blue-100 text-blue-700",
  "롯데카드": "bg-red-100 text-red-700",
  "농협카드": "bg-green-100 text-green-700",
  "하나카드": "bg-teal-100 text-teal-700",
  "우리카드": "bg-indigo-100 text-indigo-700",
  "지역화폐": "bg-orange-100 text-orange-700",
};

export const RELATION_COLORS: Record<string, string> = {
  "본인": "bg-blue-100 text-blue-700",
  "배우자": "bg-pink-100 text-pink-700",
  "자녀1": "bg-emerald-100 text-emerald-700",
  "자녀2": "bg-amber-100 text-amber-700",
  "자녀3": "bg-purple-100 text-purple-700",
  "부모": "bg-slate-100 text-slate-700",
};

export const FIXED_EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  "적금": "bg-blue-100 text-blue-700",
  "용돈": "bg-emerald-100 text-emerald-700",
  "회비": "bg-purple-100 text-purple-700",
  "보험": "bg-amber-100 text-amber-700",
  "공과금": "bg-slate-100 text-slate-700",
  "교육": "bg-cyan-100 text-cyan-700",
  "기부": "bg-pink-100 text-pink-700",
};

export const LOAN_TYPE_COLORS: Record<string, string> = {
  "장기주택": "bg-blue-100 text-blue-700",
  "차량": "bg-green-100 text-green-700",
  "학자금": "bg-purple-100 text-purple-700",
  "신용": "bg-orange-100 text-orange-700",
  "마이너스": "bg-red-100 text-red-700",
};

export const NECESSITY_COLORS: Record<string, string> = {
  "필수": "bg-emerald-100 text-emerald-700",
  "재량": "bg-amber-100 text-amber-700",
  "과소비": "bg-red-100 text-red-700",
};

const DEFAULT_COLOR = "bg-slate-100 text-slate-700";

const SHAPE_CLASSES: Record<NonNullable<BadgeProps["shape"]>, string> = {
  pill: "px-2.5 py-0.5 rounded-full text-xs font-medium",
  rounded: "px-2 py-1 rounded text-xs font-medium",
};

const SIZE_CLASSES: Record<NonNullable<BadgeProps["size"]>, string> = {
  xs: "text-[10px]",
  sm: "text-xs",
};

interface BadgeProps {
  label: string;
  colorMap?: Record<string, string>;
  color?: string;
  shape?: "pill" | "rounded";
  size?: "xs" | "sm";
}

export default function Badge({
  label,
  colorMap,
  color,
  shape = "pill",
  size = "sm",
}: BadgeProps) {
  const resolvedColor = color ?? colorMap?.[label] ?? DEFAULT_COLOR;

  return (
    <span className={`${SHAPE_CLASSES[shape]} ${SIZE_CLASSES[size]} ${resolvedColor}`}>
      {label}
    </span>
  );
}
