# 3단계 카테고리 + 사이드바 네비게이션 + Recharts 대시보드

## 개요
카테고리를 단일 필드에서 3단계(대분류/중분류/소분류)로 세분화하고, 사이드바 네비게이션을 추가하여 홈파이낸스 앱 구조를 갖추었다. 대시보드를 테이블 요약에서 Recharts 차트(바/파이/라인)로 전면 개편했다.

## 주요 변경사항

### 1. 3단계 카테고리 시스템

- **`src/lib/categories.ts`** (신규) - 카테고리 계층 정의 (14개 대분류)
  - `getL1Categories()`, `getL2Categories()`, `getL3Categories()` 헬퍼 함수
  - `MIGRATION_MAP` - 기존 단일 카테고리를 3단계로 매핑
- **`src/lib/db/schema.ts`** - `category` 컬럼 → `category_l1`, `category_l2`, `category_l3` 3개로 분리
- **`src/lib/db/index.ts`** - `PRAGMA table_info` 기반 자동 마이그레이션 로직 추가
- **`src/lib/db/seed-rules.ts`** - 40개 분류 규칙을 3단계 형식으로 확장
- **`src/lib/categorizer.ts`** - `CategoryResult { categoryL1, categoryL2, categoryL3 }` 반환
- **API 전체 수정** - import, transactions, transactions/[id] 라우트 3단계 대응
- **UI 전체 수정** - 거래내역 페이지 캐스케이딩 필터/편집, 수동입력 페이지 3단계 선택

### 2. 사이드바 네비게이션

- **`src/components/Sidebar.tsx`** (신규) - 좌측 고정 사이드바 (w-60, bg-slate-800)
  - 메뉴 구조: 대시보드 / 소비(거래내역, 카테고리분석) / 재무(수입, 자산, 대출) / 데이터관리(임포트, 수동입력)
  - `usePathname()` 기반 현재 페이지 하이라이트
- **`src/app/layout.tsx`** - flex 레이아웃으로 Sidebar + main 영역 통합
- **기존 4개 페이지** - Link import, "← 뒤로가기" 링크, `<main>` 래퍼 제거

### 3. Recharts 대시보드

- **`src/app/page.tsx`** - 전면 개편
  - 요약 카드 3개: 총 지출액, 거래 건수, 월 평균 지출
  - 월별 지출 BarChart (최근 12개월)
  - 카테고리별 PieChart (상위 8개 + 기타)
  - 카테고리별 월별 트렌드 LineChart (상위 5개 카테고리)

### 4. Placeholder 페이지 4개

- `src/app/analytics/page.tsx` - 카테고리 분석 (준비 중)
- `src/app/income/page.tsx` - 수입 (준비 중)
- `src/app/assets/page.tsx` - 자산 (준비 중)
- `src/app/loans/page.tsx` - 대출 (준비 중)

## 핵심 코드

### 카테고리 계층 구조
```typescript
// src/lib/categories.ts
export const CATEGORY_HIERARCHY: Record<string, Record<string, string[]>> = {
  "식비": { "외식": ["한식", "중식", ...], "배달": ["배달앱"], ... },
  "교통": { "대중교통": [...], "자동차": [...] },
  // 14개 대분류
};
```

### DB 자동 마이그레이션
```typescript
// src/lib/db/index.ts
const hasOldCategory = tableInfo.some((col) => col.name === "category");
const hasNewCategory = tableInfo.some((col) => col.name === "category_l1");
if (hasOldCategory && !hasNewCategory) {
  sqlite.exec(`ALTER TABLE transactions ADD COLUMN category_l1 TEXT DEFAULT '기타'`);
  // category_l2, category_l3 추가 + 기존 데이터 마이그레이션
}
```

### 사이드바 메뉴 정의
```typescript
// src/components/Sidebar.tsx
const MENU: MenuSection[] = [
  { items: [{ label: "대시보드", href: "/", icon: "📊" }] },
  { title: "소비", items: [
    { label: "거래 내역", href: "/transactions", icon: "💳" },
    { label: "카테고리 분석", href: "/analytics", icon: "📈" },
  ]},
  // ...
];
```

## 결과

- 빌드 성공 (13개 페이지 정상 컴파일)
- 의존성 추가: `recharts@^2.15.3`

```
Route (app)                                 Size  First Load JS
┌ ○ /                                     123 kB         225 kB
├ ○ /analytics                             141 B         102 kB
├ ○ /assets                                141 B         102 kB
├ ○ /import                              1.46 kB         104 kB
├ ○ /income                                141 B         102 kB
├ ○ /loans                                 141 B         102 kB
├ ○ /manual                               3.1 kB         105 kB
└ ○ /transactions                         3.3 kB         105 kB
```

## 다음 단계

- 사이드바 모바일 반응형 (햄버거 메뉴 토글)
- 카테고리 분석 페이지 실제 구현 (L1→L2 드릴다운 차트)
- 수입/자산/대출 페이지 실제 기능 구현
- 대시보드 날짜 범위 필터 추가
- DB 집계 쿼리 최적화 (현재 클라이언트 측 집계)
- 중복 임포트 방지 (UNIQUE 제약조건)
