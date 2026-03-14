"use client";

import { useRef, useEffect } from "react";
import { getL1Categories, getL2Categories } from "@/lib/categories";

const L1_EMOJI: Record<string, string> = {
  "식자재": "🛒",
  "외식비": "🍽️",
  "생활용품": "🧹",
  "공과금": "🏠",
  "구독": "📱",
  "교육": "📚",
  "보험": "🛡️",
  "대출": "🏦",
  "교통": "🚌",
  "의료": "🏥",
  "취미": "🎯",
  "여행": "✈️",
  "쇼핑": "🛍️",
  "금융": "💰",
  "기부": "❤️",
  "기타": "📦",
};

interface QuickCategoryPickerProps {
  selectedL1: string;
  selectedL2: string;
  onSelectL1: (l1: string) => void;
  onSelectL2: (l2: string) => void;
}

export default function QuickCategoryPicker({
  selectedL1,
  selectedL2,
  onSelectL1,
  onSelectL2,
}: QuickCategoryPickerProps) {
  const l1ScrollRef = useRef<HTMLDivElement>(null);
  const l2ScrollRef = useRef<HTMLDivElement>(null);
  const selectedL1Ref = useRef<HTMLButtonElement>(null);

  const l1Categories = getL1Categories();
  const l2Categories = getL2Categories(selectedL1);

  useEffect(() => {
    if (selectedL1Ref.current && l1ScrollRef.current) {
      const container = l1ScrollRef.current;
      const chip = selectedL1Ref.current;
      const chipLeft = chip.offsetLeft;
      const chipWidth = chip.offsetWidth;
      const containerWidth = container.offsetWidth;
      const scrollTarget = chipLeft - containerWidth / 2 + chipWidth / 2;
      container.scrollTo({ left: scrollTarget, behavior: "smooth" });
    }
  }, [selectedL1]);

  useEffect(() => {
    if (l2ScrollRef.current) {
      l2ScrollRef.current.scrollTo({ left: 0 });
    }
  }, [selectedL1]);

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-slate-500">
        카테고리
      </label>

      {/* L1 horizontal scroll */}
      <div
        ref={l1ScrollRef}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {l1Categories.map((cat) => {
          const isSelected = selectedL1 === cat;
          return (
            <button
              key={cat}
              ref={isSelected ? selectedL1Ref : undefined}
              type="button"
              onClick={() => onSelectL1(cat)}
              className={`flex-shrink-0 min-h-[44px] px-3 rounded-full border text-sm font-medium transition-colors ${
                isSelected
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-slate-200 bg-white text-slate-600 active:bg-slate-100"
              }`}
            >
              <span className="mr-1">{L1_EMOJI[cat] || "📦"}</span>
              {cat}
            </button>
          );
        })}
      </div>

      {/* L2 horizontal scroll */}
      {l2Categories.length > 0 && (
        <div
          ref={l2ScrollRef}
          className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {l2Categories.map((cat) => {
            const isSelected = selectedL2 === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onSelectL2(cat)}
                className={`flex-shrink-0 min-h-[44px] px-3 rounded-full border text-sm transition-colors ${
                  isSelected
                    ? "border-blue-500 bg-blue-100 text-blue-700 font-medium"
                    : "border-slate-200 bg-slate-50 text-slate-500 active:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
