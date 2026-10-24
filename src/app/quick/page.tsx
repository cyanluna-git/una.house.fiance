"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getL2Categories, getL3Categories } from "@/lib/categories";
import QuickCategoryPicker from "@/components/QuickCategoryPicker";
import type { CardInfo } from "@/types";
import Button from "@/components/Button";

// ---------------------------------------------------------------------------
// 타입 (API 응답 형태)
// ---------------------------------------------------------------------------

type DupLevel = "exact" | "likely" | "possible" | "none";

interface Entry {
  key: string; // 클라이언트 식별자
  date: string;
  merchant: string;
  amount: number | null;
  cardCompany: string | null;
  cardId?: number | null;
  cardName?: string | null;
  cardLast4?: string | null;
  approvalNo?: string | null;
  time?: string | null;
  categoryL1: string;
  categoryL2: string;
  categoryL3: string;
  necessity: string;
  note?: string;
  classifiedBy: "rule" | "ai" | "none";
  aiConfidence: number | null;
  duplicate: { level: DupLevel; reason: string };
  raw?: string;
  /** 결제내역 캡처: 해당 날짜의 읽은 거래 합 vs 화면 상단 일별 합계 */
  dayCheck?: { status: "verified" | "mismatch" | "no_total"; sum: number; expected: number | null };
  receipt?: {
    check: "ok" | "mismatch" | "missing";
    itemsSum: number;
    total: number | null;
    diff: number | null;
    warnings: string[];
    items: { name: string; amount: number }[];
  };
  // 사용자 상태
  selected: boolean;
  amountConfirmed: boolean;
  force: boolean;
  source: "sms" | "receipt";
}

const NON_CARD_METHODS = ["현금", "계좌이체", "자동이체", "수동입력"];
const NECESSITY = [
  { value: "essential", label: "필수" },
  { value: "discretionary", label: "선택" },
  { value: "waste", label: "낭비" },
  { value: "unset", label: "미정" },
];

function won(n: number | null): string {
  return n === null ? "-" : n.toLocaleString() + "원";
}

// 저장 가능 여부: 중복 exact는 불가, 영수증 불일치는 금액 확인 필요
function blockReason(e: Entry): string | null {
  if (e.duplicate.level === "exact") return "이미 저장된 거래";
  if (e.amount === null || e.amount === 0) return "금액 없음";
  if (e.receipt && e.receipt.check !== "ok" && !e.amountConfirmed) return "금액 확인 필요";
  return null;
}

// ---------------------------------------------------------------------------
// 페이지
// ---------------------------------------------------------------------------

export default function QuickEntryPage() {
  const [tab, setTab] = useState<"text" | "receipt" | "list">("text");
  const [text, setText] = useState("");
  const [useAi, setUseAi] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [cardList, setCardList] = useState<CardInfo[]>([]);
  const [cardError, setCardError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/cards").then(async (res) => {
      if (!res.ok) throw new Error("cards");
      const data = await res.json();
      if (!cancelled) setCardList((data.data || []).filter((c: CardInfo) => c.isActive));
    }).catch(() => { if (!cancelled) setCardError(true); });
    return () => { cancelled = true; };
  }, []);
  const [result, setResult] = useState<string | null>(null);

  const update = (key: string, patch: Partial<Entry>) =>
    setEntries((prev) => prev.map((e) => (e.key === key ? { ...e, ...patch } : e)));

  // --- 분석 ---------------------------------------------------------------

  async function analyzeText() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/quick-entry/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, useAi }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "분석 실패");
      const next: Entry[] = (data.entries as Entry[]).map((e: any, i: number) => ({
        ...e,
        key: `t${Date.now()}-${i}`,
        source: "sms",
        selected: e.duplicate?.level !== "exact" && e.amount !== null,
        amountConfirmed: false,
        force: false,
        duplicate: e.duplicate ?? { level: "none", reason: "" },
      }));
      setEntries((prev) => [...next, ...prev]);
      if (!next.length) setError("거래를 찾지 못했습니다");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function analyzeList() {
    setBusy(true);
    setError(null);
    setResult(null);
    const added: Entry[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`${i + 1}/${files.length} 분석 중… (장당 20~40초)`);
        const fd = new FormData();
        fd.append("image", files[i]);
        fd.append("useAi", String(useAi));
        const res = await fetch("/api/quick-entry/list", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok || data.analysisFailed) {
          setError(`${files[i].name}: ${data.error || "분석 실패"}`);
          continue;
        }
        if (!data.entries?.length) {
          setError(`${files[i].name}: 화면에서 결제 내역을 찾지 못했습니다`);
          continue;
        }
        for (const [j, e] of (data.entries as Entry[]).entries()) {
          added.push({
            ...e,
            key: `l${Date.now()}-${i}-${j}`,
            source: "sms",
            // 합계가 맞는 날짜만 기본 선택. 안 맞거나 합계가 없는 날은 사람이 확인 후 선택한다.
            selected: e.duplicate?.level !== "exact" && e.amount !== null && e.dayCheck?.status === "verified",
            amountConfirmed: false,
            force: false,
            duplicate: e.duplicate ?? { level: "none", reason: "" },
          });
        }
      }
      setEntries((prev) => [...added, ...prev]);
    } finally {
      setProgress("");
      setBusy(false);
    }
  }

  async function analyzeReceipts() {
    setBusy(true);
    setError(null);
    setResult(null);
    const added: Entry[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        setProgress(`${i + 1}/${files.length} 분석 중…`);
        const fd = new FormData();
        fd.append("image", files[i]);
        fd.append("useAi", String(useAi));
        const res = await fetch("/api/quick-entry/receipt", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setError(`${files[i].name}: ${data.error || "분석 실패"}`);
          continue;
        }
        if (data.analysisFailed || !data.entries?.length) {
          setError(`${files[i].name}: ${data.error || "AI 분석 실패 — 직접 입력해 주세요"}`);
          continue;
        }
        for (const [j, e] of (data.entries as Entry[]).entries()) {
          added.push({
            ...e,
            key: `r${Date.now()}-${i}-${j}`,
            source: "receipt",
            selected: e.duplicate?.level !== "exact" && e.amount !== null,
            amountConfirmed: false,
            force: false,
            duplicate: e.duplicate ?? { level: "none", reason: "" },
          });
        }
      }
      setEntries((prev) => [...added, ...prev]);
    } finally {
      setProgress("");
      setBusy(false);
    }
  }

  // --- 저장 ---------------------------------------------------------------

  async function commit() {
    const chosen = entries.filter((e) => e.selected && !blockReason(e));
    if (!chosen.length) {
      setError("저장할 항목이 없습니다 (차단된 항목을 확인하세요)");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      // 영수증/문자 구분: 한 요청에 한 sourceType만 보내므로 나눠서 보낸다
      const groups: Record<"sms" | "receipt", Entry[]> = { sms: [], receipt: [] };
      for (const e of chosen) groups[e.source].push(e);

      let saved = 0;
      const skipped: { reason: string }[] = [];
      for (const src of ["sms", "receipt"] as const) {
        if (!groups[src].length) continue;
        const res = await fetch("/api/quick-entry/commit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourceType: src,
            entries: groups[src].map((e) => ({
              date: e.date,
              merchant: e.merchant,
              amount: e.amount,
              cardCompany: e.cardCompany,
              cardId: e.cardId,
              cardName: e.cardName,
              categoryL1: e.categoryL1,
              categoryL2: e.categoryL2,
              categoryL3: e.categoryL3,
              necessity: e.necessity,
              note: e.note,
              approvalNo: e.approvalNo,
              force: e.force,
              receiptCheck: e.receipt?.check,
              amountConfirmed: e.amountConfirmed,
            })),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "저장 실패");
        saved += data.savedCount;
        skipped.push(...(data.skipped ?? []));
      }

      const savedKeys = new Set(chosen.map((e) => e.key));
      setEntries((prev) => prev.filter((e) => !savedKeys.has(e.key)));
      setResult(`저장 ${saved}건 · 건너뜀 ${skipped.length}건${skipped.length ? ` (${skipped[0].reason}${skipped.length > 1 ? " 외" : ""})` : ""}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // --- 렌더링 -------------------------------------------------------------

  const selectedCount = entries.filter((e) => e.selected && !blockReason(e)).length;

  return (
    <div className="mx-auto w-full min-w-0 max-w-3xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">⚡ 빠른 입력</h1>
        <Link href="/manual" className="whitespace-nowrap text-sm text-blue-600 underline-offset-2 hover:underline">
          직접 입력(수동) →
        </Link>
      </div>

      <div className="flex gap-2">
        {(["text", "receipt", "list"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm ${tab === t ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"}`}
          >
            {t === "text" ? "문자/카톡 붙여넣기" : t === "receipt" ? "영수증 사진" : "결제내역 캡처"}
          </button>
        ))}
      </div>

      {tab === "text" ? (
        <div className="space-y-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            placeholder="카드 승인 문자나 카카오톡 결제 알림을 여러 건 붙여넣으세요"
            className="w-full rounded border border-slate-300 p-2 text-sm"
          />
          <Button variant="primary" onClick={analyzeText} disabled={busy || !text.trim()}>
            {busy ? "분석 중…" : "분석"}
          </Button>
        </div>
      ) : tab === "list" ? (
        <div className="space-y-2">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="block w-full text-sm"
          />
          <p className="text-xs text-slate-500">
            카드사 앱의 결제 내역 목록 화면을 캡처해 올리세요. 장당 20~40초 걸립니다.
            화면 상단의 일별 합계와 읽은 거래 합이 맞는 날짜만 자동 선택되고, 안 맞는 날짜는 직접 확인 후 선택합니다.
          </p>
          <Button variant="primary" onClick={analyzeList} disabled={busy || files.length === 0}>
            {busy ? progress || "분석 중…" : `${files.length}장 분석`}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="block w-full text-sm"
          />
          <p className="text-xs text-slate-500">iPhone 사진은 JPEG로 변환해서 올라갑니다. 장당 약 5~10초 걸립니다.</p>
          <Button variant="primary" onClick={analyzeReceipts} disabled={busy || files.length === 0}>
            {busy ? progress || "분석 중…" : `${files.length}장 분석`}
          </Button>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} />
        AI 분류 사용 (규칙으로 못 찾은 가맹점만)
      </label>

      {cardError && <p role="alert" className="text-sm text-red-700">카드 목록을 불러오지 못했습니다. 새로고침 후 다시 시도하세요.</p>}
      {error && <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {result && <div className="rounded bg-emerald-50 p-3 text-sm text-emerald-700">{result}</div>}

      {entries.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">검토 ({entries.length}건)</h2>
            <Button variant="primary" onClick={commit} disabled={busy || selectedCount === 0}>
              선택 {selectedCount}건 저장
            </Button>
          </div>

          {entries.map((e) => (
            <EntryCard
              key={e.key}
              entry={e}
              cards={cardList}
              onChange={(patch) => update(e.key, patch)}
              onRemove={() => setEntries((prev) => prev.filter((x) => x.key !== e.key))}
            />
          ))}
        </section>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 행 카드
// ---------------------------------------------------------------------------

function EntryCard({
  entry: e,
  cards,
  onChange,
  onRemove,
}: {
  entry: Entry;
  cards: CardInfo[];
  onChange: (patch: Partial<Entry>) => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const block = blockReason(e);
  const l2s = getL2Categories(e.categoryL1);
  const l3s = getL3Categories(e.categoryL1, e.categoryL2);

  return (
    <div className={`min-w-0 rounded-lg border p-3 text-sm ${block ? "border-slate-200 bg-slate-50" : "border-slate-300 bg-white"}`}>
      <div className="flex items-start gap-2">
        <input
          type="checkbox"
          className="mt-1"
          checked={e.selected}
          disabled={!!(e.duplicate.level === "exact")}
          onChange={(ev) => onChange({ selected: ev.target.checked })}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="min-w-0 break-words font-medium">{e.merchant || "(가맹점 없음)"}</span>
            <span className="whitespace-nowrap font-semibold tabular-nums">{won(e.amount)}</span>
            <span className="text-slate-500">{e.date || "날짜?"}</span>
            <span className="text-slate-500">{e.cardName || e.cardCompany || "카드?"}</span>
            {e.approvalNo && <span className="whitespace-nowrap text-xs text-slate-400">승인 {e.approvalNo}</span>}
          </div>

          <div className="flex flex-wrap gap-1 text-xs">
            {e.duplicate.level === "exact" && <Tag color="red">이미 저장됨</Tag>}
            {e.duplicate.level === "likely" && <Tag color="amber">중복 의심</Tag>}
            {e.duplicate.level === "possible" && <Tag color="yellow">유사 거래</Tag>}
            {e.receipt?.check === "mismatch" && <Tag color="amber">품목 합 차이 {e.receipt.diff?.toLocaleString()}원</Tag>}
            {e.receipt?.check === "missing" && <Tag color="amber">합계 못 읽음</Tag>}
            {e.dayCheck?.status === "verified" && <Tag color="blue">일 합계 일치</Tag>}
            {e.dayCheck?.status === "mismatch" && (
              <Tag color="amber">일 합계 불일치 (읽은 합 {e.dayCheck.sum.toLocaleString()} / 화면 {e.dayCheck.expected?.toLocaleString()})</Tag>
            )}
            {e.dayCheck?.status === "no_total" && <Tag color="yellow">일 합계 없음</Tag>}
            {e.classifiedBy === "none" && <Tag color="slate">미분류</Tag>}
            {e.classifiedBy === "ai" && <Tag color="blue">AI {Math.round((e.aiConfidence ?? 0) * 100)}%</Tag>}
            {block && <Tag color="slate">저장 차단: {block}</Tag>}
          </div>

          {open && (
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                <label className="min-w-0 text-xs">날짜
                  <input type="date" value={e.date} onChange={(ev) => onChange({ date: ev.target.value })} className="mt-1 w-full min-h-[40px] rounded border px-2 py-1" />
                </label>
                <label className="min-w-0 text-xs">금액
                  <input
                    type="number"
                    value={e.amount ?? ""}
                    onChange={(ev) => onChange({ amount: ev.target.value === "" ? null : Number(ev.target.value), amountConfirmed: true })}
                    className="mt-1 w-full min-h-[40px] rounded border px-2 py-1"
                  />
                </label>
                <label className="min-w-0 text-xs">가맹점
                  <input value={e.merchant} onChange={(ev) => onChange({ merchant: ev.target.value })} className="mt-1 w-full min-h-[40px] rounded border px-2 py-1" />
                </label>
                <label className="min-w-0 text-xs">승인번호
                  <input
                    inputMode="numeric"
                    value={e.approvalNo ?? ""}
                    onChange={(ev) => onChange({ approvalNo: ev.target.value.replace(/[^\d-]/g, "") || null })}
                    placeholder="없으면 비움"
                    className="mt-1 w-full min-h-[40px] rounded border px-2 py-1"
                  />
                </label>
                <label className="min-w-0 text-xs">카드
                  <select aria-label="카드" value={e.cardId ? String(e.cardId) : (NON_CARD_METHODS.includes(e.cardCompany || "") ? e.cardCompany! : "")}
                    onChange={(ev) => {
                      const card = cards.find((c) => String(c.id) === ev.target.value);
                      if (card) onChange({ cardId: card.id, cardCompany: card.cardCompany, cardName: card.cardName });
                      else if (NON_CARD_METHODS.includes(ev.target.value)) onChange({ cardId: null, cardCompany: ev.target.value, cardName: ev.target.value });
                    }} className="mt-1 w-full min-w-0 min-h-[40px] rounded border px-2 py-1 text-base">
                    <option value="" disabled>{e.cardCompany ? `${e.cardCompany} · 카드 미지정` : "카드를 선택하세요"}</option>
                    <optgroup label="활성 카드">
                      {cards.map((c) => <option key={c.id} value={c.id}>{c.cardCompany} · {c.cardName}</option>)}
                    </optgroup>
                    <optgroup label="기타 결제수단">
                      {NON_CARD_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </optgroup>
                  </select>
                </label>
              </div>

              <QuickCategoryPicker
                selectedL1={e.categoryL1}
                selectedL2={e.categoryL2}
                onSelectL1={(l1) => onChange({ categoryL1: l1, categoryL2: getL2Categories(l1)[0] ?? "", categoryL3: "" })}
                onSelectL2={(l2) => onChange({ categoryL2: l2, categoryL3: "" })}
              />
              {l3s.length > 0 && (
                <select value={e.categoryL3} onChange={(ev) => onChange({ categoryL3: ev.target.value })} className="w-full min-h-[40px] rounded border px-2 py-1 text-xs">
                  <option value="">(소분류 없음)</option>
                  {l3s.map((c) => <option key={c}>{c}</option>)}
                </select>
              )}
              {l2s.length === 0 && <p className="text-xs text-slate-400">중분류 없음</p>}

              <label className="block text-xs">필요도
                <select value={e.necessity} onChange={(ev) => onChange({ necessity: ev.target.value })} className="mt-1 w-full min-h-[40px] rounded border px-2 py-1">
                  {NECESSITY.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
                </select>
              </label>

              {e.receipt && (
                <div className="rounded bg-slate-50 p-2 text-xs text-slate-600">
                  <div>영수증 합계 {won(e.receipt.total)} · 품목 합 {won(e.receipt.itemsSum)}</div>
                  {e.receipt.warnings.map((w) => <div key={w}>⚠ {w}</div>)}
                  <details className="pt-1">
                    <summary className="cursor-pointer">품목 {e.receipt.items.length}개 보기 (참고용)</summary>
                    <ul className="list-disc pl-4">
                      {e.receipt.items.map((it, i) => <li key={i}>{it.name} {it.amount.toLocaleString()}</li>)}
                    </ul>
                  </details>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={e.amountConfirmed} onChange={(ev) => onChange({ amountConfirmed: ev.target.checked })} />
                금액을 확인했습니다
              </label>
              {e.duplicate.level === "likely" && (
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={e.force} onChange={(ev) => onChange({ force: ev.target.checked })} />
                  중복 의심이지만 그래도 저장
                </label>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-1 text-sm">
            <button className="min-h-[40px] px-2 text-blue-600" onClick={() => setOpen(!open)}>{open ? "접기" : "수정"}</button>
            <button className="min-h-[40px] px-2 text-slate-500" onClick={onRemove}>목록에서 빼기</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tag({ children, color }: { children: React.ReactNode; color: "red" | "amber" | "yellow" | "blue" | "slate" }) {
  const cls = {
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-800",
    yellow: "bg-yellow-100 text-yellow-800",
    blue: "bg-blue-100 text-blue-700",
    slate: "bg-slate-200 text-slate-700",
  }[color];
  return <span className={`rounded px-1.5 py-0.5 ${cls}`}>{children}</span>;
}
