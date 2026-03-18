"use client";

import React, { useState, useEffect, useCallback } from "react";

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

interface RepaymentData {
  id: number;
  loanId: number;
  date: string;
  principalAmount: number;
  interestAmount: number;
  memo: string | null;
  linkedTransactionId: number | null;
  remainingPrincipal: number;
}

interface MatchedTransaction {
  id: number;
  date: string;
  merchant: string;
  amount: number;
  cardCompany: string;
}

interface ScheduleRow {
  month: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  remaining: number;
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

const INITIAL_REPAYMENT_FORM = {
  date: new Date().toISOString().slice(0, 10),
  principalAmount: "",
  interestAmount: "",
  memo: "",
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

  // Repayment states
  const [repayments, setRepayments] = useState<Record<number, RepaymentData[]>>({});
  const [repaymentForm, setRepaymentForm] = useState(INITIAL_REPAYMENT_FORM);
  const [showRepayments, setShowRepayments] = useState<number | null>(null);
  const [repaymentSubmitting, setRepaymentSubmitting] = useState(false);

  // Transaction matching states
  const [matchedTxns, setMatchedTxns] = useState<Record<number, MatchedTransaction[]>>({});
  const [matchLoading, setMatchLoading] = useState<number | null>(null);

  // Schedule states
  const [schedule, setSchedule] = useState<Record<number, { rows: ScheduleRow[]; error?: string; totalInterest?: number; totalPayment?: number }>>({});
  const [showSchedule, setShowSchedule] = useState<number | null>(null);

  const fetchLoans = useCallback(async () => {
    try {
      const res = await fetch("/api/loans");
      const data = await res.json();
      setLoans(data.data || []);
    } catch {
      setMessage({ type: "error", text: "오류가 발생했습니다. 다시 시도해 주세요." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const fetchRepayments = useCallback(async (loanId: number) => {
    try {
      const res = await fetch(`/api/loans/${loanId}/repayments`);
      const data = await res.json();
      setRepayments((prev) => ({ ...prev, [loanId]: data.data || [] }));
    } catch {
      setMessage({ type: "error", text: "오류가 발생했습니다. 다시 시도해 주세요." });
    }
  }, []);

  const fetchMatchedTransactions = useCallback(async (loanId: number) => {
    setMatchLoading(loanId);
    try {
      const res = await fetch(`/api/loans/${loanId}/match-transactions`);
      const data = await res.json();
      setMatchedTxns((prev) => ({ ...prev, [loanId]: data.data || [] }));
    } catch {
      setMessage({ type: "error", text: "오류가 발생했습니다. 다시 시도해 주세요." });
    } finally {
      setMatchLoading(null);
    }
  }, []);

  const fetchSchedule = useCallback(async (loanId: number) => {
    try {
      const res = await fetch(`/api/loans/${loanId}/schedule`);
      const data = await res.json();
      setSchedule((prev) => ({
        ...prev,
        [loanId]: {
          rows: data.schedule || [],
          error: data.error,
          totalInterest: data.totalInterest,
          totalPayment: data.totalPayment,
        },
      }));
    } catch {
      setMessage({ type: "error", text: "오류가 발생했습니다. 다시 시도해 주세요." });
    }
  }, []);

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

  const handleRepaymentSubmit = async (e: React.FormEvent, loanId: number) => {
    e.preventDefault();
    setRepaymentSubmitting(true);

    try {
      const res = await fetch(`/api/loans/${loanId}/repayments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(repaymentForm),
      });
      const result = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: result.error });
        return;
      }

      setMessage({ type: "success", text: "상환내역이 등록되었습니다" });
      setRepaymentForm(INITIAL_REPAYMENT_FORM);
      fetchRepayments(loanId);
      fetchLoans(); // Refresh outstanding_amount
    } catch {
      setMessage({ type: "error", text: "상환내역 저장 실패" });
    } finally {
      setRepaymentSubmitting(false);
    }
  };

  const handleRepaymentDelete = async (loanId: number, repaymentId: number) => {
    if (!confirm("이 상환내역을 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/loans/${loanId}/repayments/${repaymentId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMessage({ type: "success", text: "상환내역이 삭제되었습니다" });
        fetchRepayments(loanId);
        fetchLoans(); // Refresh outstanding_amount
      }
    } catch {
      setMessage({ type: "error", text: "삭제 실패" });
    }
  };

  const handleMatchRegister = async (loanId: number, txn: MatchedTransaction) => {
    // Pre-fill the repayment form from matched transaction
    setRepaymentForm({
      date: txn.date,
      principalAmount: String(txn.amount),
      interestAmount: "0",
      memo: `${txn.merchant} (${txn.cardCompany})`,
    });
    setShowRepayments(loanId);
  };

  const toggleRepayments = (loanId: number) => {
    if (showRepayments === loanId) {
      setShowRepayments(null);
    } else {
      setShowRepayments(loanId);
      fetchRepayments(loanId);
      fetchMatchedTransactions(loanId);
    }
  };

  const toggleSchedule = (loanId: number) => {
    if (showSchedule === loanId) {
      setShowSchedule(null);
    } else {
      setShowSchedule(loanId);
      if (!schedule[loanId]) {
        fetchSchedule(loanId);
      }
    }
  };

  const renderFormFields = (
    data: typeof INITIAL_FORM,
    setData: React.Dispatch<React.SetStateAction<typeof INITIAL_FORM>>
  ) => (
    <>
      {/* 기본 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">대출 유형 *</label>
          <select
            value={data.loanType}
            onChange={(e) => setData(prev => ({ ...prev, loanType: e.target.value }))}
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
            onChange={(e) => setData(prev => ({ ...prev, loanName: e.target.value }))}
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
            onChange={(e) => setData(prev => ({ ...prev, purpose: e.target.value }))}
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
            onChange={(e) => setData(prev => ({ ...prev, lender: e.target.value }))}
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
            onChange={(e) => setData(prev => ({ ...prev, repayInstitution: e.target.value }))}
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
            onChange={(e) => setData(prev => ({ ...prev, originalAmount: e.target.value }))}
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
            onChange={(e) => setData(prev => ({ ...prev, outstandingAmount: e.target.value }))}
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
            onChange={(e) => setData(prev => ({ ...prev, interestRate: e.target.value }))}
            placeholder="예: 3.5"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">금리 유형 *</label>
          <select
            value={data.rateType}
            onChange={(e) => setData(prev => ({ ...prev, rateType: e.target.value }))}
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
              onChange={(e) => setData(prev => ({ ...prev, variablePeriodMonths: e.target.value }))}
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
              onChange={(e) => setData(prev => ({ ...prev, variableNextRate: e.target.value }))}
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
            onChange={(e) => setData(prev => ({ ...prev, repayMethod: e.target.value }))}
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
            onChange={(e) => setData(prev => ({ ...prev, monthlyPayment: e.target.value }))}
            placeholder="원"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">월 상환일</label>
          <select
            value={data.paymentDay}
            onChange={(e) => setData(prev => ({ ...prev, paymentDay: e.target.value }))}
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
            onChange={(e) => setData(prev => ({ ...prev, startDate: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">대출 만기일</label>
          <input
            type="date"
            value={data.endDate}
            onChange={(e) => setData(prev => ({ ...prev, endDate: e.target.value }))}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 메모 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">메모</label>
        <textarea
          value={data.note}
          onChange={(e) => setData(prev => ({ ...prev, note: e.target.value }))}
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

  // Overpayment check for repayment form
  const getOverpaymentWarning = (loanId: number): string | null => {
    const loan = loans.find((l) => l.id === loanId);
    if (!loan) return null;
    const principalVal = Number(repaymentForm.principalAmount || 0);
    if (principalVal > loan.outstanding_amount) {
      return `원금상환액(${principalVal.toLocaleString()}원)이 잔여원금(${loan.outstanding_amount.toLocaleString()}원)을 초과합니다`;
    }
    return null;
  };

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
            role="status"
            aria-live="polite"
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
                const isRepaymentsOpen = showRepayments === loan.id;
                const isScheduleOpen = showSchedule === loan.id;
                const repaidPct =
                  loan.original_amount > 0
                    ? Math.round(
                        ((loan.original_amount - loan.outstanding_amount) /
                          loan.original_amount) *
                          100
                      )
                    : 0;
                const loanRepayments = repayments[loan.id] || [];
                const loanMatches = matchedTxns[loan.id] || [];
                const loanSchedule = schedule[loan.id];
                const overpayWarning = isRepaymentsOpen ? getOverpaymentWarning(loan.id) : null;

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
                        <div className="flex gap-3 flex-wrap">
                          <button
                            onClick={() => toggleRepayments(loan.id)}
                            className={`px-4 py-2 text-sm rounded-lg transition font-medium ${
                              isRepaymentsOpen
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            }`}
                          >
                            상환이력 {isRepaymentsOpen ? "접기" : "보기"}
                          </button>
                          {(loan.repay_method === "원리금균등" || loan.repay_method === "원금균등" || loan.repay_method === "만기일시") && (
                            <button
                              onClick={() => toggleSchedule(loan.id)}
                              className={`px-4 py-2 text-sm rounded-lg transition font-medium ${
                                isScheduleOpen
                                  ? "bg-purple-600 text-white hover:bg-purple-700"
                                  : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                              }`}
                            >
                              상환일정표 {isScheduleOpen ? "접기" : "보기"}
                            </button>
                          )}
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

                        {/* ===== Repayments Section ===== */}
                        {isRepaymentsOpen && (
                          <div className="mt-6">
                            <h3 className="text-base font-semibold text-slate-900 mb-3">상환이력</h3>

                            {/* Transaction Matching Banner */}
                            {loanMatches.length > 0 && (
                              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <p className="text-sm font-medium text-blue-800 mb-2">
                                  거래내역에서 매칭 가능한 항목이 {loanMatches.length}건 발견되었습니다
                                </p>
                                <div className="flex gap-2 flex-wrap">
                                  {loanMatches.slice(0, 5).map((txn) => (
                                    <button
                                      key={txn.id}
                                      onClick={() => handleMatchRegister(loan.id, txn)}
                                      className="flex items-center gap-2 px-3 py-2 bg-white border border-blue-200 rounded-lg text-sm hover:bg-blue-100 transition"
                                    >
                                      <span className="text-slate-500">{txn.date}</span>
                                      <span className="font-medium">{txn.merchant}</span>
                                      <span className="text-blue-700">{txn.amount.toLocaleString()}원</span>
                                      <span className="text-xs text-blue-500">등록?</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {matchLoading === loan.id && (
                              <div className="mb-4 text-sm text-slate-500">매칭 거래 검색 중...</div>
                            )}

                            {/* Repayment Entry Form */}
                            <form
                              onSubmit={(e) => handleRepaymentSubmit(e, loan.id)}
                              className="mb-4 p-4 bg-white border border-slate-200 rounded-lg"
                            >
                              <p className="text-sm font-medium text-slate-700 mb-3">새 상환내역 입력</p>
                              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                <div>
                                  <label className="block text-xs text-slate-500 mb-1">날짜</label>
                                  <input
                                    type="date"
                                    value={repaymentForm.date}
                                    onChange={(e) =>
                                      setRepaymentForm(prev => ({ ...prev, date: e.target.value }))
                                    }
                                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    required
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-500 mb-1">원금상환액</label>
                                  <input
                                    type="number"
                                    value={repaymentForm.principalAmount}
                                    onChange={(e) =>
                                      setRepaymentForm(prev => ({ ...prev, principalAmount: e.target.value }))
                                    }
                                    placeholder="원"
                                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-500 mb-1">이자납입액</label>
                                  <input
                                    type="number"
                                    value={repaymentForm.interestAmount}
                                    onChange={(e) =>
                                      setRepaymentForm(prev => ({ ...prev, interestAmount: e.target.value }))
                                    }
                                    placeholder="원"
                                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-slate-500 mb-1">메모</label>
                                  <input
                                    type="text"
                                    value={repaymentForm.memo}
                                    onChange={(e) =>
                                      setRepaymentForm(prev => ({ ...prev, memo: e.target.value }))
                                    }
                                    placeholder="메모 (선택)"
                                    className="w-full px-2 py-1.5 border border-slate-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  />
                                </div>
                                <div className="flex items-end">
                                  <button
                                    type="submit"
                                    disabled={repaymentSubmitting || !!overpayWarning}
                                    className="w-full px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-slate-400 transition font-medium"
                                  >
                                    {repaymentSubmitting ? "저장..." : "추가"}
                                  </button>
                                </div>
                              </div>
                              {/* Overpayment Warning */}
                              {overpayWarning && (
                                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                                  {overpayWarning}
                                </div>
                              )}
                            </form>

                            {/* Repayments Table */}
                            {loanRepayments.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead>
                                    <tr className="bg-slate-100">
                                      <th className="px-3 py-2 text-left font-medium text-slate-600">날짜</th>
                                      <th className="px-3 py-2 text-right font-medium text-slate-600">원금상환</th>
                                      <th className="px-3 py-2 text-right font-medium text-slate-600">이자납입</th>
                                      <th className="px-3 py-2 text-right font-medium text-slate-600">합계</th>
                                      <th className="px-3 py-2 text-right font-medium text-slate-600">잔여원금</th>
                                      <th className="px-3 py-2 text-left font-medium text-slate-600">메모</th>
                                      <th className="px-3 py-2 text-center font-medium text-slate-600">삭제</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y">
                                    {loanRepayments.map((r) => (
                                      <tr key={r.id} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 text-slate-700">{r.date}</td>
                                        <td className="px-3 py-2 text-right text-slate-900">
                                          {r.principalAmount.toLocaleString()}원
                                        </td>
                                        <td className="px-3 py-2 text-right text-slate-600">
                                          {r.interestAmount.toLocaleString()}원
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium text-slate-900">
                                          {(r.principalAmount + r.interestAmount).toLocaleString()}원
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium text-red-600">
                                          {r.remainingPrincipal.toLocaleString()}원
                                        </td>
                                        <td className="px-3 py-2 text-slate-500 max-w-[150px] truncate">
                                          {r.memo || "-"}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                          <button
                                            onClick={() => handleRepaymentDelete(loan.id, r.id)}
                                            className="text-red-500 hover:text-red-700 text-xs"
                                          >
                                            삭제
                                          </button>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="bg-slate-100 font-medium">
                                      <td className="px-3 py-2 text-slate-700">합계</td>
                                      <td className="px-3 py-2 text-right text-slate-900">
                                        {loanRepayments
                                          .reduce((s, r) => s + r.principalAmount, 0)
                                          .toLocaleString()}
                                        원
                                      </td>
                                      <td className="px-3 py-2 text-right text-slate-600">
                                        {loanRepayments
                                          .reduce((s, r) => s + r.interestAmount, 0)
                                          .toLocaleString()}
                                        원
                                      </td>
                                      <td className="px-3 py-2 text-right text-slate-900">
                                        {loanRepayments
                                          .reduce((s, r) => s + r.principalAmount + r.interestAmount, 0)
                                          .toLocaleString()}
                                        원
                                      </td>
                                      <td className="px-3 py-2" colSpan={3}></td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500 py-4 text-center">
                                등록된 상환이력이 없습니다
                              </p>
                            )}
                          </div>
                        )}

                        {/* ===== Amortization Schedule Section ===== */}
                        {isScheduleOpen && (
                          <div className="mt-6">
                            <h3 className="text-base font-semibold text-slate-900 mb-3">상환 일정표</h3>
                            {loanSchedule?.error ? (
                              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                                {loanSchedule.error}
                              </div>
                            ) : loanSchedule?.rows && loanSchedule.rows.length > 0 ? (
                              <>
                                {/* Summary */}
                                <div className="flex gap-4 mb-3 text-sm">
                                  <span className="text-slate-600">
                                    총 이자: <strong className="text-slate-900">{(loanSchedule.totalInterest || 0).toLocaleString()}원</strong>
                                  </span>
                                  <span className="text-slate-600">
                                    총 상환액: <strong className="text-slate-900">{(loanSchedule.totalPayment || 0).toLocaleString()}원</strong>
                                  </span>
                                </div>
                                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                                  <table className="w-full text-sm">
                                    <thead className="sticky top-0">
                                      <tr className="bg-purple-50">
                                        <th className="px-3 py-2 text-left font-medium text-purple-700">회차</th>
                                        <th className="px-3 py-2 text-left font-medium text-purple-700">날짜</th>
                                        <th className="px-3 py-2 text-right font-medium text-purple-700">상환액</th>
                                        <th className="px-3 py-2 text-right font-medium text-purple-700">원금</th>
                                        <th className="px-3 py-2 text-right font-medium text-purple-700">이자</th>
                                        <th className="px-3 py-2 text-right font-medium text-purple-700">잔여원금</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                      {loanSchedule.rows.map((row) => (
                                        <tr key={row.month} className="hover:bg-purple-50/50">
                                          <td className="px-3 py-1.5 text-slate-700">{row.month}</td>
                                          <td className="px-3 py-1.5 text-slate-700">{row.date}</td>
                                          <td className="px-3 py-1.5 text-right text-slate-900">
                                            {row.payment.toLocaleString()}원
                                          </td>
                                          <td className="px-3 py-1.5 text-right text-slate-900">
                                            {row.principal.toLocaleString()}원
                                          </td>
                                          <td className="px-3 py-1.5 text-right text-slate-600">
                                            {row.interest.toLocaleString()}원
                                          </td>
                                          <td className="px-3 py-1.5 text-right font-medium text-purple-700">
                                            {row.remaining.toLocaleString()}원
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-slate-500 py-4 text-center">
                                상환 일정을 불러오는 중...
                              </p>
                            )}
                          </div>
                        )}
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
