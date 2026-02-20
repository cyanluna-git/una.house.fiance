"use client";

import { useState, useEffect, useCallback } from "react";

const LOAN_TYPES = ["장기주택", "차량", "학자금", "신용", "마이너스", "기타"];
const RATE_TYPES = ["고정", "변동"];
const REPAY_METHODS = ["원리금균등", "원금균등", "만기일시", "자유상환"];

interface LoanData {
  id: number;
  loan_type: string;
  loan_name: string;
  purpose: string | null;
  lender: string;
  repay_institution: string | null;
  original_amount: number;
  outstanding_amount: number;
  interest_rate: number;
  rate_type: string;
  variable_period_months: number | null;
  variable_next_rate: number | null;
  repay_method: string | null;
  monthly_payment: number | null;
  payment_day: number | null;
  start_date: string | null;
  end_date: string | null;
  note: string | null;
}

const INITIAL_FORM = {
  loanType: "장기주택",
  loanName: "",
  purpose: "",
  lender: "",
  repayInstitution: "",
  originalAmount: "",
  outstandingAmount: "",
  interestRate: "",
  rateType: "고정",
  variablePeriodMonths: "",
  variableNextRate: "",
  repayMethod: "원리금균등",
  monthlyPayment: "",
  paymentDay: "",
  startDate: "",
  endDate: "",
  note: "",
};

export default function LoansPage() {
  const [loans, setLoans] = useState<LoanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(INITIAL_FORM);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState(INITIAL_FORM);

  const fetchLoans = useCallback(async () => {
    try {
      const res = await fetch("/api/loans");
      const data = await res.json();
      setLoans(data.data || []);
    } catch (error) {
      console.error("Failed to fetch loans:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      setMessage({ type: "success", text: "대출이 등록되었습니다" });
      setForm(INITIAL_FORM);
      setShowForm(false);
      fetchLoans();
    } catch {
      setMessage({ type: "error", text: "저장 중 오류 발생" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("이 대출을 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/loans/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchLoans();
        setMessage({ type: "success", text: "삭제되었습니다" });
      }
    } catch {
      setMessage({ type: "error", text: "삭제 실패" });
    }
  };

  const startEdit = (loan: LoanData) => {
    setEditingId(loan.id);
    setEditForm({
      loanType: loan.loan_type,
      loanName: loan.loan_name,
      purpose: loan.purpose || "",
      lender: loan.lender,
      repayInstitution: loan.repay_institution || "",
      originalAmount: String(loan.original_amount),
      outstandingAmount: String(loan.outstanding_amount),
      interestRate: String(loan.interest_rate),
      rateType: loan.rate_type,
      variablePeriodMonths: loan.variable_period_months ? String(loan.variable_period_months) : "",
      variableNextRate: loan.variable_next_rate ? String(loan.variable_next_rate) : "",
      repayMethod: loan.repay_method || "원리금균등",
      monthlyPayment: loan.monthly_payment ? String(loan.monthly_payment) : "",
      paymentDay: loan.payment_day ? String(loan.payment_day) : "",
      startDate: loan.start_date || "",
      endDate: loan.end_date || "",
      note: loan.note || "",
    });
    setExpandedId(loan.id);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    try {
      const res = await fetch(`/api/loans/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        setEditingId(null);
        setMessage({ type: "success", text: "수정되었습니다" });
        fetchLoans();
      }
    } catch {
      setMessage({ type: "error", text: "수정 실패" });
    }
  };

  const renderFormFields = (
    data: typeof INITIAL_FORM,
    setData: (d: typeof INITIAL_FORM) => void
  ) => (
    <>
      {/* 기본 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">대출 유형 *</label>
          <select
            value={data.loanType}
            onChange={(e) => setData({ ...data, loanType: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {LOAN_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">대출명 *</label>
          <input
            type="text"
            value={data.loanName}
            onChange={(e) => setData({ ...data, loanName: e.target.value })}
            placeholder="예: 주택담보대출"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">대출 목적</label>
          <input
            type="text"
            value={data.purpose}
            onChange={(e) => setData({ ...data, purpose: e.target.value })}
            placeholder="예: 장기주택이자상환"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 금융기관 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">금융기관 *</label>
          <input
            type="text"
            value={data.lender}
            onChange={(e) => setData({ ...data, lender: e.target.value })}
            placeholder="예: 국민은행"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">상환기관</label>
          <input
            type="text"
            value={data.repayInstitution}
            onChange={(e) => setData({ ...data, repayInstitution: e.target.value })}
            placeholder="금융기관과 다를 경우 입력"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 금액 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">대출 원금 *</label>
          <input
            type="number"
            value={data.originalAmount}
            onChange={(e) => setData({ ...data, originalAmount: e.target.value })}
            placeholder="원"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">잔여 원금</label>
          <input
            type="number"
            value={data.outstandingAmount}
            onChange={(e) => setData({ ...data, outstandingAmount: e.target.value })}
            placeholder="미입력 시 대출 원금과 동일"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 금리 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">금리 (%) *</label>
          <input
            type="number"
            step="0.01"
            value={data.interestRate}
            onChange={(e) => setData({ ...data, interestRate: e.target.value })}
            placeholder="예: 3.5"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">금리 유형 *</label>
          <select
            value={data.rateType}
            onChange={(e) => setData({ ...data, rateType: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {RATE_TYPES.map((t) => (
              <option key={t} value={t}>{t}금리</option>
            ))}
          </select>
        </div>
      </div>

      {/* 변동금리 추가 필드 */}
      {data.rateType === "변동" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-amber-50 rounded-lg border border-amber-200">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">변동 주기 (개월)</label>
            <input
              type="number"
              value={data.variablePeriodMonths}
              onChange={(e) => setData({ ...data, variablePeriodMonths: e.target.value })}
              placeholder="예: 6"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">변동 후 예상 금리 (%)</label>
            <input
              type="number"
              step="0.01"
              value={data.variableNextRate}
              onChange={(e) => setData({ ...data, variableNextRate: e.target.value })}
              placeholder="예: 4.2"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* 상환 조건 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">상환 방식</label>
          <select
            value={data.repayMethod}
            onChange={(e) => setData({ ...data, repayMethod: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {REPAY_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">월 상환액</label>
          <input
            type="number"
            value={data.monthlyPayment}
            onChange={(e) => setData({ ...data, monthlyPayment: e.target.value })}
            placeholder="원"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">월 상환일</label>
          <select
            value={data.paymentDay}
            onChange={(e) => setData({ ...data, paymentDay: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">선택</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>{d}일</option>
            ))}
          </select>
        </div>
      </div>

      {/* 기간 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">대출 시작일</label>
          <input
            type="date"
            value={data.startDate}
            onChange={(e) => setData({ ...data, startDate: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">대출 만기일</label>
          <input
            type="date"
            value={data.endDate}
            onChange={(e) => setData({ ...data, endDate: e.target.value })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 메모 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">메모</label>
        <textarea
          value={data.note}
          onChange={(e) => setData({ ...data, note: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="추가 메모"
        />
      </div>
    </>
  );

  const loanTypeBadgeColor = (type: string) => {
    const colors: Record<string, string> = {
      "장기주택": "bg-blue-100 text-blue-700",
      "차량": "bg-green-100 text-green-700",
      "학자금": "bg-purple-100 text-purple-700",
      "신용": "bg-orange-100 text-orange-700",
      "마이너스": "bg-red-100 text-red-700",
      "기타": "bg-slate-100 text-slate-700",
    };
    return colors[type] || "bg-slate-100 text-slate-700";
  };

  // Summary stats
  const totalOriginal = loans.reduce((s, l) => s + l.original_amount, 0);
  const totalOutstanding = loans.reduce((s, l) => s + l.outstanding_amount, 0);
  const totalMonthly = loans.reduce((s, l) => s + (l.monthly_payment || 0), 0);

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">대출</h1>
        <p className="text-slate-600 mb-8">대출 현황 및 상환 조건을 관리하세요</p>

        {/* Summary Cards */}
        {loans.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gradient-to-r from-slate-700 to-slate-800 rounded-lg shadow p-5 text-white">
              <p className="text-sm opacity-80">총 대출 원금</p>
              <p className="text-2xl font-bold mt-1">{totalOriginal.toLocaleString()}원</p>
            </div>
            <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-lg shadow p-5 text-white">
              <p className="text-sm opacity-80">잔여 원금</p>
              <p className="text-2xl font-bold mt-1">{totalOutstanding.toLocaleString()}원</p>
            </div>
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg shadow p-5 text-white">
              <p className="text-sm opacity-80">월 총 상환액</p>
              <p className="text-2xl font-bold mt-1">{totalMonthly.toLocaleString()}원</p>
            </div>
          </div>
        )}

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

        {/* Add Loan Button / Form */}
        <div className="bg-white rounded-lg shadow mb-8 overflow-hidden">
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition text-left"
          >
            <span className="text-lg font-semibold text-slate-900">
              {showForm ? "대출 등록 접기" : "새 대출 등록"}
            </span>
            <span className="text-slate-400 text-lg">{showForm ? "▲" : "▼"}</span>
          </button>

          {showForm && (
            <form onSubmit={handleSubmit} className="px-6 pb-6 border-t">
              <div className="pt-6">
                {renderFormFields(form, setForm)}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 transition font-medium"
                >
                  {submitting ? "저장 중..." : "대출 등록"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Loans List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900">
              대출 목록 ({loans.length}건)
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-600">로딩 중...</div>
          ) : loans.length === 0 ? (
            <div className="p-8 text-center text-slate-600">등록된 대출이 없습니다</div>
          ) : (
            <div className="divide-y">
              {loans.map((loan) => {
                const isExpanded = expandedId === loan.id;
                const isEditing = editingId === loan.id;
                const repaidPct =
                  loan.original_amount > 0
                    ? Math.round(
                        ((loan.original_amount - loan.outstanding_amount) /
                          loan.original_amount) *
                          100
                      )
                    : 0;

                return (
                  <div key={loan.id}>
                    {/* Summary Row */}
                    <button
                      onClick={() => {
                        if (isEditing) return;
                        setExpandedId(isExpanded ? null : loan.id);
                      }}
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition text-left"
                    >
                      <div className="flex items-center gap-4">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium ${loanTypeBadgeColor(loan.loan_type)}`}
                        >
                          {loan.loan_type}
                        </span>
                        <div>
                          <span className="font-semibold text-slate-900">{loan.loan_name}</span>
                          <span className="ml-2 text-sm text-slate-500">{loan.lender}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-xs text-slate-500">{loan.interest_rate}% {loan.rate_type}</div>
                          <div className="font-medium text-slate-900">
                            {loan.outstanding_amount.toLocaleString()}원
                          </div>
                        </div>
                        {/* Repayment progress */}
                        <div className="w-20">
                          <div className="text-xs text-slate-500 text-right mb-1">{repaidPct}% 상환</div>
                          <div className="w-full bg-slate-200 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-2 rounded-full"
                              style={{ width: `${repaidPct}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-slate-400 text-lg">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && !isEditing && (
                      <div className="px-6 pb-6 bg-slate-50">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-4">
                          {loan.purpose && (
                            <div>
                              <span className="text-slate-500">대출 목적</span>
                              <p className="font-medium">{loan.purpose}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-500">대출 원금</span>
                            <p className="font-medium">{loan.original_amount.toLocaleString()}원</p>
                          </div>
                          <div>
                            <span className="text-slate-500">잔여 원금</span>
                            <p className="font-medium text-red-600">{loan.outstanding_amount.toLocaleString()}원</p>
                          </div>
                          {loan.repay_institution && (
                            <div>
                              <span className="text-slate-500">상환기관</span>
                              <p className="font-medium">{loan.repay_institution}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-slate-500">금리</span>
                            <p className="font-medium">
                              {loan.interest_rate}% ({loan.rate_type})
                              {loan.rate_type === "변동" && loan.variable_period_months && (
                                <span className="text-amber-600 ml-1">
                                  {loan.variable_period_months}개월 주기
                                  {loan.variable_next_rate && ` / 다음 ${loan.variable_next_rate}%`}
                                </span>
                              )}
                            </p>
                          </div>
                          {loan.repay_method && (
                            <div>
                              <span className="text-slate-500">상환 방식</span>
                              <p className="font-medium">{loan.repay_method}</p>
                            </div>
                          )}
                          {loan.monthly_payment && (
                            <div>
                              <span className="text-slate-500">월 상환액</span>
                              <p className="font-medium">{loan.monthly_payment.toLocaleString()}원</p>
                            </div>
                          )}
                          {loan.payment_day && (
                            <div>
                              <span className="text-slate-500">상환일</span>
                              <p className="font-medium">매월 {loan.payment_day}일</p>
                            </div>
                          )}
                          {loan.start_date && (
                            <div>
                              <span className="text-slate-500">시작일</span>
                              <p className="font-medium">{loan.start_date}</p>
                            </div>
                          )}
                          {loan.end_date && (
                            <div>
                              <span className="text-slate-500">만기일</span>
                              <p className="font-medium">{loan.end_date}</p>
                            </div>
                          )}
                          {loan.note && (
                            <div className="col-span-2 md:col-span-3">
                              <span className="text-slate-500">메모</span>
                              <p className="font-medium">{loan.note}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => startEdit(loan)}
                            className="px-4 py-2 text-sm bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                          >
                            수정
                          </button>
                          <button
                            onClick={() => handleDelete(loan.id)}
                            className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Edit Form */}
                    {isExpanded && isEditing && (
                      <form onSubmit={handleUpdate} className="px-6 pb-6 bg-amber-50 border-t border-amber-200">
                        <div className="pt-4">
                          {renderFormFields(editForm, setEditForm)}
                          <div className="flex gap-3">
                            <button
                              type="submit"
                              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
