"use client";

import { useState, useEffect } from "react";
import { getL1Categories, getL2Categories, getL3Categories } from "@/lib/categories";

interface Trip {
  id: number;
  name: string;
}

const PAYMENT_METHODS = [
  { value: "현금", label: "현금" },
  { value: "계좌이체", label: "계좌이체" },
  { value: "자동이체", label: "자동이체" },
];

const INCOME_OTHER_TYPES = [
  { value: "salary", label: "월급" },
  { value: "bonus", label: "보너스" },
  { value: "loan-payment", label: "대출금 상환" },
  { value: "insurance", label: "보험료" },
  { value: "utility", label: "공과금" },
  { value: "investment", label: "투자" },
  { value: "savings", label: "저축" },
  { value: "other", label: "기타" },
];

type EntryMode = "expense" | "income-other";

export default function ManualPage() {
  const [entryMode, setEntryMode] = useState<EntryMode>("expense");
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    paymentMethod: "현금",
    transactionType: "salary",
    amount: "",
    merchant: "",
    categoryL1: "기타",
    categoryL2: "미분류",
    categoryL3: "",
    note: "",
    tripId: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [tripList, setTripList] = useState<Trip[]>([]);

  useEffect(() => {
    fetch("/api/trips").then((r) => r.json()).then((d) => setTripList(d.data || []));
  }, []);

  function switchMode(mode: EntryMode) {
    setEntryMode(mode);
    setMessage(null);
    if (mode === "expense") {
      setFormData((f) => ({ ...f, categoryL1: "기타", categoryL2: "미분류", categoryL3: "" }));
    } else {
      setFormData((f) => ({ ...f, categoryL1: "수입", categoryL2: "급여", categoryL3: "" }));
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const amount = parseInt(formData.amount);
      if (!formData.date || !formData.merchant || !amount) {
        setMessage({ type: "error", text: "필수 정보를 입력하세요" });
        setSubmitting(false);
        return;
      }

      const body: Record<string, unknown> = {
        date: formData.date,
        merchant: formData.merchant,
        amount,
        categoryL1: formData.categoryL1,
        categoryL2: formData.categoryL2,
        categoryL3: formData.categoryL3,
        note: formData.note,
        sourceType: "manual",
        tripId: formData.tripId ? Number(formData.tripId) : null,
      };

      if (entryMode === "expense") {
        body.cardCompany = formData.paymentMethod;
        body.paymentType = formData.paymentMethod;
      } else {
        body.paymentType = formData.transactionType;
      }

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        setMessage({ type: "success", text: "저장되었습니다" });
        setFormData({
          date: new Date().toISOString().split("T")[0],
          paymentMethod: "현금",
          transactionType: "salary",
          amount: "",
          merchant: "",
          categoryL1: entryMode === "expense" ? "기타" : "수입",
          categoryL2: entryMode === "expense" ? "미분류" : "급여",
          categoryL3: "",
          note: "",
          tripId: "",
        });
      } else {
        setMessage({ type: "error", text: "저장 실패" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "오류 발생" });
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">수동 거래 입력</h1>
        <p className="text-slate-600 mb-6">
          현금·이체 지출이나 수입 등 비카드 거래를 기록하세요
        </p>

        {/* Tab Switcher */}
        <div className="flex mb-6 bg-slate-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => switchMode("expense")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-md transition ${
              entryMode === "expense"
                ? "bg-white text-slate-900 shadow"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            지출 입력
          </button>
          <button
            type="button"
            onClick={() => switchMode("income-other")}
            className={`flex-1 py-2.5 text-sm font-medium rounded-md transition ${
              entryMode === "income-other"
                ? "bg-white text-slate-900 shadow"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            수입/기타 입력
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-8">
          {/* Date */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              거래 날짜 *
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Payment Method (expense) or Transaction Type (income-other) */}
          {entryMode === "expense" ? (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                결제수단 *
              </label>
              <div className="flex gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, paymentMethod: method.value })
                    }
                    className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition ${
                      formData.paymentMethod === method.value
                        ? method.value === "현금"
                          ? "border-green-500 bg-green-50 text-green-700"
                          : method.value === "계좌이체"
                            ? "border-blue-500 bg-blue-50 text-blue-700"
                            : "border-purple-500 bg-purple-50 text-purple-700"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                거래 유형 *
              </label>
              <select
                value={formData.transactionType}
                onChange={(e) =>
                  setFormData({ ...formData, transactionType: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          {/* Amount */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              금액 (원) *
            </label>
            <input
              type="number"
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              placeholder="0"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Merchant/Description */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {entryMode === "expense" ? "사용처/내용 *" : "내용/설명 *"}
            </label>
            <input
              type="text"
              value={formData.merchant}
              onChange={(e) =>
                setFormData({ ...formData, merchant: e.target.value })
              }
              placeholder={
                entryMode === "expense"
                  ? "예: 마트, 병원비, 관리비, 학원비"
                  : "예: 1월 월급, 연금보험료, 전기요금"
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Category L1 */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              대분류
            </label>
            <select
              value={formData.categoryL1}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  categoryL1: e.target.value,
                  categoryL2: "",
                  categoryL3: "",
                })
              }
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {getL1Categories().map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Category L2 */}
          {getL2Categories(formData.categoryL1).length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                중분류
              </label>
              <select
                value={formData.categoryL2}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    categoryL2: e.target.value,
                    categoryL3: "",
                  })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">선택안함</option>
                {getL2Categories(formData.categoryL1).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category L3 */}
          {formData.categoryL2 &&
            getL3Categories(formData.categoryL1, formData.categoryL2).length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  소분류
                </label>
                <select
                  value={formData.categoryL3}
                  onChange={(e) =>
                    setFormData({ ...formData, categoryL3: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">선택안함</option>
                  {getL3Categories(formData.categoryL1, formData.categoryL2).map(
                    (cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    )
                  )}
                </select>
              </div>
            )}

          {/* Trip */}
          {tripList.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                여행 연결
              </label>
              <select
                value={formData.tripId}
                onChange={(e) =>
                  setFormData({ ...formData, tripId: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          {/* Note */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              메모
            </label>
            <textarea
              value={formData.note}
              onChange={(e) =>
                setFormData({ ...formData, note: e.target.value })
              }
              placeholder="추가 정보나 메모를 입력하세요"
              rows={3}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Message */}
          {message && (
            <div
              className={`mb-6 p-4 rounded-lg ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition font-medium"
          >
            {submitting ? "저장 중..." : "저장"}
          </button>
        </form>

        {/* Help */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">
            {entryMode === "expense" ? "지출 입력 안내" : "수입/기타 입력 안내"}
          </h3>
          <ul className="text-sm text-blue-800 space-y-2">
            {entryMode === "expense" ? (
              <>
                <li>- 카드 외 현금, 계좌이체, 자동이체 지출을 기록합니다</li>
                <li>- 금액은 양수로 입력하세요 (예: 관리비 150,000원)</li>
                <li>- 입력된 거래는 카드 지출과 함께 대시보드에 통합 집계됩니다</li>
                <li>- 거래 내역 페이지에서 결제수단별 필터링이 가능합니다</li>
              </>
            ) : (
              <>
                <li>- 월급, 보너스 등 수익은 양수로 입력하세요</li>
                <li>- 대출금 상환, 보험료 등 지출은 음수로 입력할 수 있습니다</li>
                <li>- 카테고리는 대분류 &gt; 중분류 &gt; 소분류 3단계로 선택 가능합니다</li>
                <li>- 입력된 거래는 &quot;거래 내역&quot; 페이지에서 관리할 수 있습니다</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}
