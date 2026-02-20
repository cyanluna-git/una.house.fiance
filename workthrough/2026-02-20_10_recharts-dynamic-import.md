# Recharts 동적 임포트 + optimizePackageImports

## Overview

대시보드(`/`)와 여행(`/trips`) 페이지의 Recharts 차트 코드를 별도 컴포넌트로 추출하고 `next/dynamic`으로 lazy load 처리하여, 메인 번들 사이즈를 약 50% 절감했습니다. 추가로 `next.config.ts`에 `optimizePackageImports`를 설정하여 recharts tree-shaking을 활성화했습니다.

## Context

- 대시보드 페이지 First Load JS: **229 kB**, 여행 페이지: **216 kB**
- Recharts 라이브러리가 메인 번들에 포함되어 초기 로드 시간 증가
- SSR에서 불필요한 Recharts 코드가 서버 번들에도 포함
- 칸반 #30 (높음 우선순위) 태스크로 등록되어 있었음

## Changes Made

### 1. next.config.ts - optimizePackageImports 추가

Recharts barrel import에 대한 tree-shaking 최적화 활성화:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["recharts"],
  },
};
```

### 2. DashboardCharts 컴포넌트 추출 (`src/components/DashboardCharts.tsx`)

`src/app/page.tsx`에 인라인으로 있던 차트 6종을 별도 컴포넌트로 추출:

- 수입 vs 지출 BarChart
- 월별 지출 BarChart
- 카테고리별 지출 PieChart
- 필수/재량 비율 PieChart
- 구성원별 지출 수평 BarChart
- 카테고리별 월별 트렌드 LineChart

Props 인터페이스로 필요한 데이터만 전달:

```typescript
interface DashboardChartsProps {
  incomeExpenseData: IncomeExpenseItem[];
  monthlyData: MonthlyItem[];
  categoryData: CategoryItem[];
  necessityData: NecessityItem[];
  familySpendData: FamilySpendItem[];
  trendData: TrendItem[];
  trendCategories: string[];
  selectedMonth: string;
}
```

### 3. 대시보드 페이지 수정 (`src/app/page.tsx`)

- `recharts` 직접 import 제거
- `next/dynamic`으로 `DashboardCharts` lazy load (ssr: false)
- 미사용 `COLORS` 상수 제거 (차트 컴포넌트로 이동)
- `NECESSITY_COLORS`, `formatAmount`는 페이지 내에서도 사용되므로 유지

```typescript
import dynamic from "next/dynamic";

const DashboardCharts = dynamic(() => import("@/components/DashboardCharts"), {
  ssr: false,
  loading: () => (
    <div className="text-center py-12 text-slate-400">차트 로딩 중...</div>
  ),
});
```

### 4. TripCategoryChart 컴포넌트 추출 (`src/components/TripCategoryChart.tsx`)

`src/app/trips/page.tsx`의 `renderCategoryChart` 함수를 별도 컴포넌트로 추출:

- 여행 카테고리별 수평 BarChart
- 카테고리 클릭 시 콜백으로 디테일 모달 연결

```typescript
interface TripCategoryChartProps {
  categoryBreakdown: CategoryBreakdown[];
  onCategoryClick: (category: string) => void;
}
```

### 5. 여행 페이지 수정 (`src/app/trips/page.tsx`)

- `recharts` 직접 import 제거
- `next/dynamic`으로 `TripCategoryChart` lazy load (ssr: false)
- `TRIP_COLORS` 상수, `renderCategoryChart` 함수 제거

```typescript
const TripCategoryChart = dynamic(
  () => import("@/components/TripCategoryChart"),
  {
    ssr: false,
    loading: () => (
      <div className="text-center py-6 text-slate-400 text-sm">차트 로딩 중...</div>
    ),
  }
);
```

## 수정 파일 요약

| 파일 | 변경 내용 |
|------|-----------|
| `next.config.ts` | `optimizePackageImports: ["recharts"]` 추가 |
| `src/app/page.tsx` | recharts import 제거 → DashboardCharts dynamic import |
| `src/app/trips/page.tsx` | recharts import 제거 → TripCategoryChart dynamic import |
| `src/components/DashboardCharts.tsx` | **신규** - 대시보드 차트 6종 컴포넌트 |
| `src/components/TripCategoryChart.tsx` | **신규** - 여행 카테고리 바차트 컴포넌트 |

## Verification Results

### Build

```
> pnpm build
▲ Next.js 15.5.12
- Experiments (use with caution):
  · optimizePackageImports

✓ Compiled successfully in 6.0s
✓ Generating static pages (27/27)

Route (app)                    Size  First Load JS
┌ ○ /                        5.4 kB         108 kB
└ ○ /trips                   4.02 kB        106 kB

Exit code: 0
```

### 번들 사이즈 비교

| 페이지 | Before | After | 절감 |
|--------|--------|-------|------|
| `/` (대시보드) | 229 kB | **108 kB** | -121 kB (-53%) |
| `/trips` (여행) | 216 kB | **106 kB** | -110 kB (-51%) |

### 코드 리뷰 결과

- 리뷰 에이전트: **Approved**
- 지적사항 (비차단): `formatAmount` 함수 중복 → 추후 공용 utils 추출 시 통합 예정

## 주요 설계 결정

1. **`next/dynamic` + `ssr: false`**: Recharts는 DOM API를 사용하므로 SSR 불필요. code splitting으로 별도 chunk 분리
2. **`optimizePackageImports`**: barrel import(`from "recharts"`)에서 사용하는 컴포넌트만 tree-shake
3. **로딩 fallback**: 차트 로딩 중 한국어 텍스트로 UX 유지
4. **props 기반 데이터 전달**: 차트 컴포넌트가 순수 렌더링만 담당, 데이터 로직은 페이지에 유지
