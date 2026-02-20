# 대시보드 월별 필터 + 카테고리 상세 테이블

## 개요
대시보드에 월별 선택기를 추가하여 특정 월의 재무 현황을 상세하게 분석할 수 있도록 개선. 월 선택 시 L1→L2 카테고리 드릴다운 테이블을 함께 표시.

## 컨텍스트
- 기존 대시보드는 전체 기간 집계만 가능하여 월별 상세 분석이 불가능했음
- 대시보드 고도화(workthrough #04) 이후 향후 개선 항목으로 "월 선택기" 기재됨
- 사용자 요청: "대시보드에 월별필터를 추가해서 월별 상세 카테고리를 볼수있게 해줘"

## 변경 사항

### 수정 파일: `src/app/page.tsx`

### 1. 데이터 흐름 리팩토링 (아키텍처 변경)

**기존 구조** — `useEffect` 내에서 fetch + 집계를 한 번에 처리, 개별 `useState` 20개+
```typescript
// 기존: 각 집계값마다 개별 state
const [monthlyData, setMonthlyData] = useState<MonthlyItem[]>([]);
const [categoryData, setCategoryData] = useState<CategoryItem[]>([]);
const [totalIncome, setTotalIncome] = useState(0);
// ... 15개 이상의 useState
```

**변경 구조** — 원시 데이터 4개 state + `useMemo` 1개로 모든 파생 데이터 계산
```typescript
// 변경: 원시 데이터만 state로 관리
const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
const [allSalaries, setAllSalaries] = useState<SalaryStatement[]>([]);
const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
const [selectedMonth, setSelectedMonth] = useState<string>("all");

// 모든 파생 데이터를 useMemo로 계산
const dash = useMemo(() => {
  const txs = selectedMonth === "all"
    ? allTransactions
    : allTransactions.filter(t => t.date.startsWith(selectedMonth));
  // ... 모든 집계를 하나의 객체로 반환
  return { totalIncome, totalCardSpend, categoryData, ... };
}, [allTransactions, allSalaries, fixedExpenses, familyMembers, selectedMonth]);
```

**장점**: 월 변경 시 re-fetch 없이 `useMemo`가 즉시 재계산. 코드 구조도 더 명확.

### 2. 월별 필터 (Month Selector)

```typescript
// file: src/app/page.tsx - 헤더 영역
<div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
  <div>
    <h1 className="text-3xl font-bold text-slate-900 mb-2">대시보드</h1>
    <p className="text-slate-600">개인 재무 현황을 한눈에 파악하세요</p>
  </div>
  <div className="flex items-center gap-2">
    <label className="text-sm text-slate-600 whitespace-nowrap">기간</label>
    <select
      value={selectedMonth}
      onChange={(e) => {
        setSelectedMonth(e.target.value);
        setExpandedL1(new Set()); // 아코디언 상태 초기화
      }}
      className="border border-slate-300 rounded-lg px-3 py-2 text-sm ..."
    >
      <option value="all">전체 기간</option>
      {availableMonths.map((m) => (
        <option key={m} value={m}>{m.replace("-", "년 ")}월</option>
      ))}
    </select>
  </div>
</div>
```

- `availableMonths`: 거래/수입 데이터에 존재하는 모든 월 목록 (내림차순 정렬)
- 표시 형식: `2025년 01월`

### 3. 스냅샷 vs 시계열 데이터 분리

핵심 설계 결정: 시계열 차트는 항상 전체 데이터를 보여주고, 스냅샷 지표만 월 필터 적용.

| 데이터 | 월 필터 적용 | 설명 |
|--------|:----------:|------|
| 요약 카드 8개 | O | 선택 월의 수입/지출/저축률/전월대비 등 |
| 카테고리 파이 | O | 선택 월의 카테고리 분포 |
| 필수/재량 파이 | O | 선택 월의 necessity 분포 |
| 구성원별 지출 | O | 선택 월의 구성원별 합계 |
| **카테고리 상세 테이블** | O | **신규** - 선택 월의 L1→L2 드릴다운 |
| 수입 vs 지출 | X | 항상 전체 12개월 시계열 |
| 월별 지출 바차트 | X | 항상 전체 12개월 시계열 |
| 카테고리 트렌드 | X | 항상 전체 12개월 시계열 |

**이유**: 월별 지출 바차트나 트렌드 라인은 단일 월 데이터 포인트로는 의미가 없음. 시계열 차트는 흐름을 보여주는 것이 본질적 가치.

### 4. 카테고리 상세 테이블 (신규 위젯)

특정 월 선택 시에만 요약카드 아래에 표시되는 L1→L2 드릴다운 테이블:

```typescript
// file: src/app/page.tsx - CategoryDetail 인터페이스
interface CategoryDetail {
  l1: string;
  l2Items: { name: string; amount: number; count: number }[];
  total: number;
  count: number;
}
```

**기능:**
- L1 카테고리 행 클릭 → L2 서브카테고리 접기/펼치기 (아코디언)
- 컬럼: 카테고리명, 건수, 금액, 비율(%)
- L1 비율: 전체 카드지출 대비
- L2 비율: 해당 L1 내 비율
- 하단 합계 행 포함
- `expandedL1` state로 아코디언 상태 관리

```typescript
// 아코디언 토글 함수
const toggleL1 = (l1: string) => {
  setExpandedL1(prev => {
    const next = new Set(prev);
    if (next.has(l1)) next.delete(l1); else next.add(l1);
    return next;
  });
};
```

### 5. Transaction interface 확장

```typescript
// 기존
interface Transaction {
  id: number;
  date: string;
  cardCompany: string;
  amount: number;
  categoryL1: string;
  necessity: string | null;
  isCompanyExpense: boolean;
  familyMemberId: number | null;
}

// 변경 (2개 필드 추가)
interface Transaction {
  // ... 기존 필드 유지
  merchant: string;     // 추가: 거래처명
  categoryL2: string;   // 추가: L2 서브카테고리
}
```

### 6. 전월 대비 계산 개선

```typescript
// 특정 월 선택 시: 선택 월 vs 직전 월 비교
if (selectedMonth !== "all") {
  const idx = sortedAllMonths.indexOf(selectedMonth);
  if (idx > 0) {
    const prev = sortedAllMonths[idx - 1];
    const curAmt = allMonthlyMap.get(selectedMonth) || 0;
    const prevAmt = allMonthlyMap.get(prev) || 0;
    const diff = curAmt - prevAmt;
    momChange = { amount: diff, percent: prevAmt > 0 ? Math.round((diff / prevAmt) * 100) : null };
  }
}
```

### 7. 기타 개선
- `formatAmount()`: `Math.abs(value) >= 10000` 으로 음수값 정상 처리
- 월 선택 변경 시 `setExpandedL1(new Set())` 으로 아코디언 상태 초기화
- 필터 적용 차트 제목에 선택 월 표시: `(2025.01)` 부제

## 빌드 결과

```
> next build

✓ Compiled successfully in 3.2s
✓ Linting and checking validity of types
✓ Generating static pages (25/25)

Route (app)               Size   First Load JS
┌ ○ /                    126 kB     228 kB
└ ... (25 routes total)

Exit code: 0
```

## 알려진 이슈

### Next.js 15 Devtools 오류 (우리 코드와 무관)
```
⨯ Error: Could not find the module "...segment-explorer-node.js#SegmentViewNode"
in the React Client Manifest.
```
- Next.js 15.5의 알려진 devtools 버그
- 실제 페이지 렌더링에는 영향 없음 (`GET / 200 in 53ms` 정상)
- `.next` 캐시 삭제 후 재시작으로 해결: `rm -rf .next && pnpm dev`

## 향후 개선
- 월별 바차트에서 선택 월 하이라이트 표시
- 카테고리 상세 테이블에서 특정 카테고리 클릭 시 거래 목록 모달
- 기간 범위 선택 (단일 월이 아닌 시작~종료 월)
- 카테고리 상세 테이블 "전체 기간" 모드에서도 표시 (토글 옵션)
