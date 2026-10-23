"use client";

import React, { useState, useEffect, useCallback } from "react";

const ASSET_TYPES = ["청약", "예적금", "저축", "퇴직연금", "투자", "기타"];

interface Snapshot {
  id: number;
  snapshotDate: string;
  balance: number;
  principal: number | null;
  memo: string | null;
}

interface AssetAccount {
  id: number;
  assetType: string;
  name: string;
  institution: string | null;
  accountNo: string | null;
  monthlyDeposit: number | null;
  depositDay: number | null;
  interestRate: number | null;
  startDate: string | null;
  maturityDate: string | null;
  isActive: number | null;
  note: string | null;
  latest: Snapshot | null;
  snapshots: Snapshot[];
}

const today = () => new Date().toISOString().slice(0, 10);
const won = (n: number | null | undefined) => (n == null ? "-" : `${n.toLocaleString()}원`);
const inputCls = "w-full px-3 py-2 border border-slate-300 rounded-lg text-sm";

const emptyAccount = {
  assetType: "청약",
  name: "",
  institution: "",
  accountNo: "",
  monthlyDeposit: "",
  depositDay: "",
  interestRate: "",
  startDate: "",
  maturityDate: "",
  note: "",
};

export default function AssetsPage() {
  const [accounts, setAccounts] = useState<AssetAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAccountForm, setShowAccountForm] = useState(false);
  const [accountForm, setAccountForm] = useState(emptyAccount);
  const [snapTarget, setSnapTarget] = useState<number | null>(null);
  const [snapForm, setSnapForm] = useState({ snapshotDate: today(), balance: "", principal: "", memo: "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/assets");
      const json = await res.json();
      setAccounts(json.data || []);
    } catch {
      setError("불러오기 실패");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "저장 실패");
      setShowAccountForm(false);
      setAccountForm(emptyAccount);
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitSnapshot = async (e: React.FormEvent, accountId: number) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/assets/snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, ...snapForm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "저장 실패");
      setSnapTarget(null);
      setSnapForm({ snapshotDate: today(), balance: "", principal: "", memo: "" });
      await load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const removeAccount = async (id: number, name: string) => {
    if (!window.confirm(`"${name}" 자산과 모든 스냅샷을 삭제할까요?`)) return;
    await fetch(`/api/assets/${id}`, { method: "DELETE" });
    await load();
  };

  const active = accounts.filter((a) => a.isActive !== 0);
  const total = active.reduce((sum, a) => sum + (a.latest?.balance ?? 0), 0);
  const byType = ASSET_TYPES.map((t) => ({
    type: t,
    sum: active.filter((a) => a.assetType === t).reduce((s, a) => s + (a.latest?.balance ?? 0), 0),
  })).filter((x) => x.sum > 0);

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">자산</h1>
        <p className="text-slate-600 mb-6">저축·청약·퇴직연금·투자 평가금액을 시점별로 기록합니다</p>

        {error && <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">{error}</div>}

        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="text-sm text-slate-500">총 자산 (계좌별 최신 평가금액 합계)</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">{won(total)}</div>
          {byType.length > 0 && (
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
              {byType.map((x) => (
                <div key={x.type} className="p-3 rounded bg-slate-50">
                  <div className="text-xs text-slate-500">{x.type}</div>
                  <div className="font-semibold">{won(x.sum)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end mb-4">
          <button
            onClick={() => setShowAccountForm((v) => !v)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
          >
            {showAccountForm ? "닫기" : "+ 자산 추가"}
          </button>
        </div>

        {showAccountForm && (
          <form onSubmit={submitAccount} className="bg-white rounded-lg shadow p-6 mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            <select className={inputCls} value={accountForm.assetType} onChange={(e) => setAccountForm({ ...accountForm, assetType: e.target.value })}>
              {ASSET_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
            <input className={inputCls} placeholder="이름 (예: 주택청약종합저축)" required value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} />
            <input className={inputCls} placeholder="금융기관 (예: 하나은행)" value={accountForm.institution} onChange={(e) => setAccountForm({ ...accountForm, institution: e.target.value })} />
            <input className={inputCls} placeholder="계좌번호" value={accountForm.accountNo} onChange={(e) => setAccountForm({ ...accountForm, accountNo: e.target.value })} />
            <input className={inputCls} type="number" placeholder="월 납입액" value={accountForm.monthlyDeposit} onChange={(e) => setAccountForm({ ...accountForm, monthlyDeposit: e.target.value })} />
            <input className={inputCls} type="number" placeholder="납입일 (1~31)" value={accountForm.depositDay} onChange={(e) => setAccountForm({ ...accountForm, depositDay: e.target.value })} />
            <input className={inputCls} type="number" step="0.001" placeholder="금리(%)" value={accountForm.interestRate} onChange={(e) => setAccountForm({ ...accountForm, interestRate: e.target.value })} />
            <input className={inputCls} type="date" title="시작일" value={accountForm.startDate} onChange={(e) => setAccountForm({ ...accountForm, startDate: e.target.value })} />
            <input className={inputCls} type="date" title="만기일" value={accountForm.maturityDate} onChange={(e) => setAccountForm({ ...accountForm, maturityDate: e.target.value })} />
            <input className={inputCls} placeholder="메모" value={accountForm.note} onChange={(e) => setAccountForm({ ...accountForm, note: e.target.value })} />
            <button disabled={saving} className="md:col-span-2 px-6 py-3 bg-blue-600 text-white rounded-lg disabled:bg-slate-400">
              {saving ? "저장 중..." : "자산 등록"}
            </button>
          </form>
        )}

        {loading ? (
          <div className="p-8 text-center text-slate-600">로딩 중...</div>
        ) : accounts.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-slate-600">등록된 자산이 없습니다</div>
        ) : (
          <div className="space-y-4">
            {accounts.map((a) => (
              <div key={a.id} className={`bg-white rounded-lg shadow p-5 ${a.isActive === 0 ? "opacity-60" : ""}`}>
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="inline-block px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 mr-2">{a.assetType}</span>
                    <span className="font-semibold text-slate-900">{a.name}</span>
                    <div className="text-xs text-slate-500 mt-1">
                      {[a.institution, a.accountNo, a.monthlyDeposit != null ? `월 ${won(a.monthlyDeposit)}` : null, a.depositDay ? `매월 ${a.depositDay}일` : null, a.interestRate ? `금리 ${a.interestRate}%` : null, a.maturityDate ? `만기 ${a.maturityDate}` : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold">{won(a.latest?.balance)}</div>
                    <div className="text-xs text-slate-500">{a.latest ? `기준 ${a.latest.snapshotDate}` : "스냅샷 없음"}</div>
                  </div>
                </div>

                {a.snapshots.length > 0 && (
                  <div className="mt-3 border-t pt-3 text-sm">
                    {a.snapshots.slice(0, 6).map((s) => (
                      <div key={s.id} className="flex justify-between py-0.5 text-slate-600">
                        <span>
                          {s.snapshotDate}
                          {s.memo ? ` · ${s.memo}` : ""}
                        </span>
                        <span>
                          {won(s.balance)}
                          {s.principal != null && <span className="text-slate-400"> (원금 {won(s.principal)})</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex gap-2 text-sm">
                  <button onClick={() => setSnapTarget(snapTarget === a.id ? null : a.id)} className="px-3 py-1.5 border rounded hover:bg-slate-50">
                    {snapTarget === a.id ? "닫기" : "평가금액 기록"}
                  </button>
                  <button onClick={() => removeAccount(a.id, a.name)} className="px-3 py-1.5 border rounded text-red-600 hover:bg-red-50">
                    삭제
                  </button>
                </div>

                {snapTarget === a.id && (
                  <form onSubmit={(e) => submitSnapshot(e, a.id)} className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <input type="date" className={inputCls} required value={snapForm.snapshotDate} onChange={(e) => setSnapForm({ ...snapForm, snapshotDate: e.target.value })} />
                    <input type="number" className={inputCls} required placeholder="평가금액(원)" value={snapForm.balance} onChange={(e) => setSnapForm({ ...snapForm, balance: e.target.value })} />
                    <input type="number" className={inputCls} placeholder="누적 납입원금(선택)" value={snapForm.principal} onChange={(e) => setSnapForm({ ...snapForm, principal: e.target.value })} />
                    <input className={inputCls} placeholder="메모(선택)" value={snapForm.memo} onChange={(e) => setSnapForm({ ...snapForm, memo: e.target.value })} />
                    <button disabled={saving} className="md:col-span-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:bg-slate-400">
                      {saving ? "저장 중..." : "스냅샷 저장"}
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
