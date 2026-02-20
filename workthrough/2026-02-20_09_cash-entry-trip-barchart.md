# 현금/이체 지출 입력 + 여행 카테고리 바차트 + 디테일 모달

## Overview

카드 지출 외에 현금/계좌이체/자동이체 지출을 수동 입력할 수 있는 시스템을 구축하고, 여행 상세 페이지에 카테고리별 지출 바차트와 클릭 시 거래 내역을 보여주는 디테일 모달을 구현했습니다.

## Context

- 기존에는 카드 명세서 임포트만 가능했고 현금/이체 지출은 기록할 수 없었음
- 여행 페이지에서 총 지출 금액만 보였고, 어떤 항목(숙박, 교통, 식비 등)에 얼마를 썼는지 파악이 어려웠음
- 카드 사용 내역의 월 표시가 현재 월에 데이터가 없으면 "0원"으로 표시되는 문제 존재

## Changes Made

### 1. 카드 월별 사용금액 폴백 (`src/app/api/cards/route.ts`)
- 현재 월에 데이터가 없으면 가장 최근 데이터가 있는 월로 자동 폴백
- `usageMonth` 필드를 응답에 추가하여 어떤 월의 데이터인지 표시
- 카드 페이지에서 "이번달" 대신 실제 월 표시 ("1월" 등)

### 2. 카드 폼 원화 쉼표 포맷팅 (`src/app/cards/page.tsx`)
- 연회비, 월 실적 기준, 월 할인한도 3개 필드에 쉼표 구분 표시 적용
- `type="number"` → `type="text" inputMode="numeric"` 전환
- `formatCurrency()` / `rawNumber()` 헬퍼 함수 추가

### 3. 트래블로그카드 임포트
- 하나카드사 트래블로그 체크카드 생성 (card_id=12)
- 37건 해외결제 거래 임포트 (2,044,247원, 2026-02-11~15)
- 전 거래를 오사카 여행(trip_id=1)에 연결, 카테고리 여행>해외여행 자동 분류

### 4. 현금/이체 지출 수동입력 시스템

**핵심 설계**: `cardCompany` 필드를 결제수단 식별자로 재사용 → 스키마 변경 없이 구현

#### API 변경 (`src/app/api/transactions/route.ts`)
- POST: `cardCompany: body.cardCompany || "수동입력"` 으로 1줄 수정

#### 수동입력 폼 (`src/app/manual/page.tsx`)
- 탭 기반 UI: "지출 입력" / "수입/기타 입력" 전환
- 지출 모드: 현금/계좌이체/자동이체 버튼 선택 (색상 구분)
- 여행 연결 드롭다운 추가 (API에서 여행 목록 fetch)

#### 거래 내역 필터 (`src/app/transactions/page.tsx`)
- optgroup으로 결제수단(현금/계좌이체/자동이체/수동입력)과 카드 그룹 분리
- 비카드 결제수단 색상 배지: 현금(초록), 계좌이체(파랑), 자동이체(보라), 수동입력(회색)
- 헤더 "카드" → "결제수단" 변경

### 5. 거래 날짜 수정 기능 (`src/app/api/transactions/[id]/route.ts`)
- PATCH: `date` 필드 수정 지원 추가
- 거래 목록에서 편집 모드 시 날짜 input 표시

### 6. 여행 카테고리 바차트 + 디테일 모달

#### API 확장 (`src/app/api/trips/route.ts`)

```typescript
// 카테고리별 집계 (categoryL2 기준)
const categoryBreakdown = db
  .select({
    category: transactions.categoryL2,
    total: sql<number>`COALESCE(SUM(amount), 0)`,
    count: sql<number>`COUNT(*)`,
  })
  .from(transactions)
  .where(eq(transactions.tripId, trip.id))
  .groupBy(transactions.categoryL2)
  .orderBy(sql`SUM(amount) DESC`)
  .all();

// 개별 거래 목록
const txList = db
  .select({
    id: transactions.id, date: transactions.date,
    merchant: transactions.merchant, amount: transactions.amount,
    categoryL2: transactions.categoryL2, cardCompany: transactions.cardCompany,
  })
  .from(transactions)
  .where(eq(transactions.tripId, trip.id))
  .orderBy(desc(transactions.date))
  .all();
```

#### 여행 페이지 (`src/app/trips/page.tsx`)

Recharts 수평 바차트 (`layout="vertical"`) + Cell 색상 + 클릭 핸들러:

```typescript
function renderCategoryChart(trip: Trip) {
  const chartData = trip.categoryBreakdown.map((b) => ({
    name: b.category || "미분류",
    amount: b.total,
    count: b.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <BarChart data={chartData} layout="vertical">
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={80} />
        <Tooltip formatter={(value) => [`${Number(value).toLocaleString()}원`, "금액"]} />
        <Bar dataKey="amount" cursor="pointer"
          onClick={(_data, index) => openCategoryModal(trip, chartData[index].name)}
          label={{ position: "right", formatter: (value) => `${Number(value).toLocaleString()}원` }}>
          {chartData.map((_entry, index) => (
            <Cell key={index} fill={TRIP_COLORS[index % TRIP_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
```

디테일 모달: ESC/배경 클릭으로 닫기, 스크롤 가능 테이블, 하단 합계 표시

### 7. 대시보드 라벨 변경 (`src/app/page.tsx`)
- "총 카드지출" → "총 지출" (현금/이체 포함)

## Verification Results

### Build
```
> pnpm build
✓ Compiled successfully in 2.2s
✓ Generating static pages (27/27)
○ /trips  3.36 kB  216 kB
Exit code: 0
```

### 빌드 중 수정한 타입 에러
- Recharts `Tooltip` formatter: `(value: number)` → `(value)` + `Number(value)` 캐스팅
- Recharts `Bar` label formatter: 동일 패턴 적용

## 수정 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `src/app/api/cards/route.ts` | 월별 사용금액 폴백 + usageMonth 반환 |
| `src/app/cards/page.tsx` | 원화 쉼표 포맷팅, 월 라벨 표시 |
| `src/app/api/transactions/route.ts` | POST에 cardCompany 파라미터 지원 |
| `src/app/api/transactions/[id]/route.ts` | PATCH에 date 필드 수정 지원 |
| `src/app/manual/page.tsx` | 탭 UI, 결제수단 버튼, 여행 연결 |
| `src/app/transactions/page.tsx` | optgroup 필터, 비카드 배지, 날짜 편집 |
| `src/app/page.tsx` | "총 카드지출" → "총 지출" |
| `src/app/api/trips/route.ts` | categoryBreakdown + transactions 반환 |
| `src/app/trips/page.tsx` | Recharts 바차트 + 디테일 모달 |

## 주요 설계 결정

1. **Zero-migration 접근**: `cardCompany` 필드를 결제수단 식별자로 재사용 → ALTER TABLE 불필요
2. **`method:` prefix 컨벤션**: 필터 드롭다운에서 cardCompany 필터와 cardId 필터를 하나의 select로 구분
3. **서버 사이드 집계**: 여행별 카테고리 집계를 DB에서 직접 수행 (클라이언트 메모리 절약)
