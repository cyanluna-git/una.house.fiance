"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getL2Categories, getL3Categories } from "@/lib/categories";
import QuickCategoryPicker from "@/components/QuickCategoryPicker";
import { useRecentMerchants } from "@/hooks/useRecentMerchants";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

interface Trip {
  id: number;
  name: string;
}

const PAYMENT_METHODS = [
  { value: "현금", label: "현금" },
  { value: "계좌이체", label: "이체" },
  { value: "카드", label: "카드" },
  { value: "지역상품권", label: "상품권" },
] as const;

const CARD_COMPANIES = [
  "국민카드",
  "신한카드",
  "현대카드",
  "하나카드",
  "우리카드",
  "롯데카드",
  "농협카드",
] as const;

const INCOME_OTHER_TYPES = [
  { value: "salary", label: "월급" },
  { value: "bonus", label: "보너스" },
  { value: "loan-payment", label: "대출금 상환" },
  { value: "insurance", label: "보험료" },
  { value: "utility", label: "공과금" },
  { value: "investment", label: "투자" },
  { value: "savings", label: "저축" },
  { value: "other", label: "기타" },
] as const;

type EntryMode = "expense" | "income-other";

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function todayString(): string {
  return new Date().toISOString().split("T")[0];
}

function formatKoreanDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = today.getTime() - d.getTime();
  const dayMs = 86_400_000;

  if (diff === 0) return "오늘";
  if (diff === dayMs) return "어제";
  if (diff === dayMs * 2) return "그저께";

  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][d.getDay()];
  return `${month}/${day} (${weekday})`;
}

// ---------------------------------------------------------------------------
// Toast component (portaled to document.body)
// ---------------------------------------------------------------------------

function Toast({ message, visible }: { message: string; visible: boolean }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      aria-live="polite"
      className={`fixed left-1/2 top-12 z-[9999] -translate-x-1/2 transition-all duration-200 ${
        visible
          ? "opacity-100 translate-y-0"
          : "opacity-0 -translate-y-2 pointer-events-none"
      }`}
    >
      <div className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white shadow-lg">
        {message}
      </div>
    </div>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function ManualPage() {
  // --- mode ---
  const [entryMode, setEntryMode] = useState<EntryMode>("expense");

  // --- form state (retained fields persist across saves) ---
  const [date, setDate] = useState(todayString);
  const [paymentMethod, setPaymentMethod] = useState("현금");
  const [cardCompany, setCardCompany] = useState<string>(CARD_COMPANIES[0]);
  const [transactionType, setTransactionType] = useState("salary");
  const [categoryL1, setCategoryL1] = useState("기타");
  const [categoryL2, setCategoryL2] = useState("미분류");
  const [categoryL3, setCategoryL3] = useState("");

  // --- form state (cleared after save) ---
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [note, setNote] = useState("");

  // --- ui state ---
  const [submitting, setSubmitting] = useState(false);
  const [tripList, setTripList] = useState<Trip[]>([]);
  const [tripId, setTripId] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // --- refs ---
  const amountRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // --- recent merchants ---
  const { merchants: recentMerchants, addMerchant } = useRecentMerchants();

  // --- init ---
  useEffect(() => {
    fetch("/api/trips")
      .then((r) => r.json())
      .then((d) => setTripList(d.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    amountRef.current?.focus();
  }, []);

  // --- toast helper ---
  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 1500);
  }, []);

  // --- mode switching ---
  function switchMode(mode: EntryMode) {
    setEntryMode(mode);
    if (mode === "expense") {
      setCategoryL1("기타");
      setCategoryL2("미분류");
      setCategoryL3("");
    } else {
      setCategoryL1("수입");
      setCategoryL2("급여");
      setCategoryL3("");
    }
  }

  // --- category handlers ---
  function handleL1Select(l1: string) {
    setCategoryL1(l1);
    const l2s = getL2Categories(l1);
    setCategoryL2(l2s.length > 0 ? l2s[0] : "");
    setCategoryL3("");
  }

  function handleL2Select(l2: string) {
    setCategoryL2(l2);
    setCategoryL3("");
  }

  // --- submit ---
  const handleSubmit = async (
    e: React.FormEvent | React.MouseEvent
  ) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const parsedAmount = parseInt(amount);
      if (!date || !merchant.trim() || !parsedAmount) {
        showToast("필수 정보를 입력하세요");
        setSubmitting(false);
        return;
      }

      const body: Record<string, unknown> = {
        date,
        merchant: merchant.trim(),
        amount: parsedAmount,
        categoryL1,
        categoryL2,
        categoryL3,
        note,
        sourceType: "manual",
        tripId: tripId ? Number(tripId) : null,
      };

      if (entryMode === "expense") {
        body.paymentType = paymentMethod;
        body.cardCompany =
          paymentMethod === "카드" ? cardCompany : paymentMethod;
      } else {
        body.paymentType = transactionType;
      }

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        addMerchant(merchant.trim());
        showToast("저장완료");

        // Clear transient fields, retain date/paymentMethod/category
        setAmount("");
        setMerchant("");
        setNote("");

        // Refocus amount for rapid re-entry
        requestAnimationFrame(() => {
          amountRef.current?.focus();
        });
      } else {
        showToast("저장 실패");
      }
    } catch (error) {
      showToast("오류 발생");
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // --- L3 options ---
  const l3Options = getL3Categories(categoryL1, categoryL2);

  return (
    <>
      <Toast message={toastMessage} visible={toastVisible} />

      {/* Scrollable form area -- padded at bottom for sticky CTA */}
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 px-4 pt-3 pb-[120px] max-w-[390px] mx-auto"
      >
        {/* Mode toggle (de-emphasized text link for income) */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-slate-900">
            {entryMode === "expense" ? "지출 입력" : "수입/기타"}
          </span>
          <button
            type="button"
            onClick={() =>
              switchMode(entryMode === "expense" ? "income-other" : "expense")
            }
            className="min-h-[44px] px-3 text-sm text-blue-600 font-medium"
          >
            {entryMode === "expense" ? "수입/기타 입력" : "지출 입력"}
          </button>
        </div>

        {/* 1. Amount (first, most important) */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            금액 (원)
          </label>
          <input
            ref={amountRef}
            type="number"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            autoComplete="off"
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-2xl font-bold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            required
          />
        </div>

        {/* 2. Date -- tap button to reveal native picker */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            날짜
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setShowDatePicker(true);
                requestAnimationFrame(() => {
                  dateInputRef.current?.showPicker?.();
                  dateInputRef.current?.focus();
                });
              }}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-left text-sm font-medium text-slate-700 active:bg-slate-100"
            >
              {formatKoreanDate(date)}
            </button>
            <input
              ref={dateInputRef}
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value || todayString());
                setShowDatePicker(false);
              }}
              onBlur={() => setShowDatePicker(false)}
              inputMode="none"
              className={`absolute inset-0 opacity-0 ${
                showDatePicker ? "pointer-events-auto" : "pointer-events-none"
              }`}
              tabIndex={-1}
            />
          </div>
        </div>

        {/* 3. Merchant + recent merchants chips */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            {entryMode === "expense" ? "사용처" : "내용"}
          </label>
          <input
            type="text"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            placeholder={
              entryMode === "expense"
                ? "예: 마트, 병원, 관리비"
                : "예: 월급, 보험료"
            }
            autoComplete="off"
            enterKeyHint="next"
            className="w-full min-h-[44px] rounded-xl border border-slate-300 px-4 py-2.5 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            required
          />
          {recentMerchants.length > 0 && (
            <div className="flex gap-2 mt-2 overflow-x-auto scrollbar-hide pb-1">
              {recentMerchants.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMerchant(m)}
                  className={`flex-shrink-0 min-h-[44px] rounded-full border px-3 text-sm transition-colors ${
                    merchant === m
                      ? "border-blue-400 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-500 active:bg-slate-100"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 4. Payment method chips (expense) / transaction type select (income) */}
        {entryMode === "expense" ? (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              결제수단
            </label>
            <div className="flex gap-2">
              {PAYMENT_METHODS.map((method) => {
                const isActive = paymentMethod === method.value;
                return (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(method.value);
                      if (method.value !== "카드") {
                        setCardCompany(CARD_COMPANIES[0]);
                      }
                    }}
                    className={`flex-1 min-h-[44px] rounded-xl border text-sm font-medium transition-colors ${
                      isActive
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 bg-white text-slate-500 active:bg-slate-100"
                    }`}
                  >
                    {method.label}
                  </button>
                );
              })}
            </div>
            {paymentMethod === "카드" && (
              <select
                value={cardCompany}
                onChange={(e) => setCardCompany(e.target.value)}
                className="mt-2 w-full min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                {CARD_COMPANIES.map((company) => (
                  <option key={company} value={company}>
                    {company}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              거래 유형
            </label>
            <select
              value={transactionType}
              onChange={(e) => setTransactionType(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              required
            >
              {INCOME_OTHER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 5. Category picker -- chip-based for expense, select for income */}
        {entryMode === "expense" ? (
          <QuickCategoryPicker
            selectedL1={categoryL1}
            selectedL2={categoryL2}
            onSelectL1={handleL1Select}
            onSelectL2={handleL2Select}
          />
        ) : (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              카테고리
            </label>
            <select
              value={categoryL2}
              onChange={(e) => setCategoryL2(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="급여">급여</option>
              <option value="보너스">보너스</option>
              <option value="투자수익">투자수익</option>
              <option value="기타수입">기타수입</option>
            </select>
          </div>
        )}

        {/* 6. Category L3 (if available) */}
        {l3Options.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              소분류
            </label>
            <select
              value={categoryL3}
              onChange={(e) => setCategoryL3(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="">선택안함</option>
              {l3Options.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 7. Trip (only if trips exist) */}
        {tripList.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              여행
            </label>
            <select
              value={tripId}
              onChange={(e) => setTripId(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="">없음</option>
              {tripList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 8. Note (optional, collapsed feel) */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            메모
          </label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="메모 (선택)"
            autoComplete="off"
            className="w-full min-h-[44px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
          />
        </div>
      </form>

      {/* Sticky save CTA -- above bottom nav */}
      <div
        className="fixed inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-slate-200 px-4 py-2 md:hidden"
        style={{
          bottom: "calc(3.5rem + env(safe-area-inset-bottom))",
        }}
      >
        <div className="max-w-[390px] mx-auto">
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="w-full min-h-[44px] rounded-xl bg-blue-600 px-6 py-3 text-base font-bold text-white shadow-sm transition-colors active:bg-blue-700 disabled:bg-slate-400"
          >
            {submitting ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {/* Desktop save button (non-fixed) */}
      <div className="hidden md:block px-4 pb-8 max-w-[390px] mx-auto">
        <button
          type="button"
          disabled={submitting}
          onClick={handleSubmit}
          className="w-full min-h-[44px] rounded-xl bg-blue-600 px-6 py-3 text-base font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:bg-slate-400"
        >
          {submitting ? "저장 중..." : "저장"}
        </button>
      </div>
    </>
  );
}
