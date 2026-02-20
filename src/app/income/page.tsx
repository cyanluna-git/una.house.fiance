"use client";

import { useState, useEffect, useCallback } from "react";

interface SalaryItemData {
  id: number;
  statement_id: number;
  type: "payment" | "deduction";
  name: string;
  amount: number;
}

interface SalaryStatementData {
  id: number;
  pay_date: string;
  employee_name: string;
  employee_id: string;
  position: string;
  department: string;
  company_name: string;
  gross_pay: number;
  total_deductions: number;
  net_pay: number;
  source_file: string;
  items: SalaryItemData[];
}

export default function IncomePage() {
  const [statements, setStatements] = useState<SalaryStatementData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const fetchStatements = useCallback(async () => {
    try {
      const res = await fetch("/api/income");
      const data = await res.json();
      setStatements(data.data || []);
    } catch (error) {
      console.error("Failed to fetch:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatements();
  }, [fetchStatements]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }
      formData.append("password", password);

      const res = await fetch("/api/income/import", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: result.error || "업로드 실패" });
        return;
      }

      const msgs: string[] = [];
      for (const r of result.results) {
        if (r.success) {
          msgs.push(`${r.fileName}: 성공`);
        } else {
          msgs.push(`${r.fileName}: ${r.error}`);
        }
      }

      setMessage({
        type: result.successCount > 0 ? "success" : "error",
        text: `${result.successCount}/${result.totalCount}건 처리\n${msgs.join("\n")}`,
      });

      if (result.successCount > 0) {
        fetchStatements();
      }
    } catch (error) {
      setMessage({ type: "error", text: "업로드 중 오류 발생" });
      console.error(error);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">수입</h1>
        <p className="text-slate-600 mb-8">
          급여 명세서를 업로드하여 수입을 관리하세요
        </p>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">
            급여 명세서 업로드
          </h2>
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                PDF 비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호 입력"
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <label className="inline-block">
              <input
                type="file"
                accept=".pdf"
                multiple
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
              <span className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-400 cursor-pointer transition font-medium">
                {uploading ? "처리 중..." : "PDF 선택"}
              </span>
            </label>
          </div>
          <p className="text-sm text-slate-500 mt-3">
            지원 형식: 급여 명세서 PDF (비밀번호 보호 파일 지원). 여러 파일 동시
            선택 가능.
          </p>

          {message && (
            <div
              className={`mt-4 p-4 rounded-lg whitespace-pre-line ${
                message.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        {/* Statements List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b bg-slate-50">
            <h2 className="text-lg font-semibold text-slate-900">
              급여 내역 ({statements.length}건)
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-600">로딩 중...</div>
          ) : statements.length === 0 ? (
            <div className="p-8 text-center text-slate-600">
              등록된 급여 명세서가 없습니다
            </div>
          ) : (
            <div className="divide-y">
              {statements.map((stmt) => {
                const payments = stmt.items.filter(
                  (i) => i.type === "payment"
                );
                const deductions = stmt.items.filter(
                  (i) => i.type === "deduction"
                );
                const isExpanded = expandedId === stmt.id;

                return (
                  <div key={stmt.id}>
                    {/* Summary Row */}
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : stmt.id)
                      }
                      className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition text-left"
                    >
                      <div className="flex items-center gap-6">
                        <div>
                          <span className="text-lg font-semibold text-slate-900">
                            {stmt.pay_date}
                          </span>
                          {stmt.company_name && (
                            <span className="ml-3 text-sm text-slate-500">
                              {stmt.company_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-xs text-slate-500">세전</div>
                          <div className="font-medium text-slate-700">
                            {stmt.gross_pay.toLocaleString()}원
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">공제</div>
                          <div className="font-medium text-red-600">
                            -{stmt.total_deductions.toLocaleString()}원
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500">실수령</div>
                          <div className="text-lg font-bold text-blue-600">
                            {stmt.net_pay.toLocaleString()}원
                          </div>
                        </div>
                        <span className="text-slate-400 text-lg">
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                    </button>

                    {/* Expanded Detail */}
                    {isExpanded && (
                      <div className="px-6 pb-6 bg-slate-50">
                        {/* Employee Info */}
                        {stmt.employee_name && (
                          <div className="mb-4 text-sm text-slate-600 flex gap-6">
                            <span>
                              <strong>성명:</strong> {stmt.employee_name}
                            </span>
                            {stmt.position && (
                              <span>
                                <strong>직급:</strong> {stmt.position}
                              </span>
                            )}
                            {stmt.department && (
                              <span>
                                <strong>부서:</strong> {stmt.department}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* Payments */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-2 border-b pb-1">
                              지급 내역
                            </h4>
                            {payments.length > 0 ? (
                              <div className="space-y-1">
                                {payments.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex justify-between text-sm"
                                  >
                                    <span className="text-slate-600">
                                      {item.name}
                                    </span>
                                    <span className="font-medium text-slate-900">
                                      {item.amount.toLocaleString()}원
                                    </span>
                                  </div>
                                ))}
                                <div className="flex justify-between text-sm font-semibold border-t pt-1 mt-2">
                                  <span>합계</span>
                                  <span>
                                    {stmt.gross_pay.toLocaleString()}원
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">
                                항목 없음
                              </p>
                            )}
                          </div>

                          {/* Deductions */}
                          <div>
                            <h4 className="text-sm font-semibold text-slate-700 mb-2 border-b pb-1">
                              공제 내역
                            </h4>
                            {deductions.length > 0 ? (
                              <div className="space-y-1">
                                {deductions.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex justify-between text-sm"
                                  >
                                    <span className="text-slate-600">
                                      {item.name}
                                    </span>
                                    <span className="font-medium text-red-600">
                                      -{item.amount.toLocaleString()}원
                                    </span>
                                  </div>
                                ))}
                                <div className="flex justify-between text-sm font-semibold border-t pt-1 mt-2 text-red-700">
                                  <span>합계</span>
                                  <span>
                                    -{stmt.total_deductions.toLocaleString()}원
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">
                                항목 없음
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
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
