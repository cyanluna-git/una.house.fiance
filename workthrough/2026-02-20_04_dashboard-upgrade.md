# 대시보드 고도화

## 개요
기존 4개 요약카드 + 4개 차트 구성의 대시보드를 8개 요약카드 + 6개 차트로 확장. 회사경비 분리, 저축률, 전월대비, 필수/재량 비율, 구성원별 지출 등 실질적 재무 분석 위젯 추가.

## 변경 사항

### 수정 파일: `src/app/page.tsx`

### 1. Transaction interface 확장
- `necessity`, `isCompanyExpense`, `familyMemberId` 필드 추가
- 추가 데이터 타입: `NecessityItem`, `FamilySpendItem`, `FixedExpense`, `FamilyMember`

### 2. 데이터 fetch 병렬화
- 기존: 순차적 fetch (transactions → income)
- 변경: `Promise.all()` 4개 병렬 호출 (transactions, income, fixed-expenses, family)

### 3. 요약 카드 (4개 → 8개)

**1행 (핵심 지표 - 그라디언트 배경)**
| 총 수입 | 순수 가계지출 | 저축률 | 전월 대비 |
|---------|-------------|--------|----------|

**2행 (보조 지표 - 화이트 배경)**
| 총 카드지출 | 고정지출 (월) | 회사경비 | 거래 건수 |
|-----------|-------------|---------|----------|

### 4. 차트 (4개 → 6개)

| 차트 | 타입 | 설명 |
|------|------|------|
| 수입 vs 지출 | BarChart | 기존 유지 |
| 월별 지출 | BarChart | 기존 유지 |
| 카테고리별 지출 | PieChart | 기존 유지 |
| **필수/재량 비율** | PieChart | **신규** - necessity 기반 (초록/노랑/빨강/회색) |
| **구성원별 지출** | BarChart (가로) | **신규** - familyMemberId 별 횡막대 |
| 카테고리 트렌드 | LineChart | 기존 유지 |

### 5. 계산 로직

- **순수 가계지출**: `isCompanyExpense=false` 거래만 합산
- **저축률**: `(총수입 - (순수지출 + 고정지출×월수)) / 총수입 × 100`
- **전월 대비**: 최근 2개월 카드지출 차이 (금액 + %)
- **고정지출**: 활성(`isActive`) 항목의 월합계

## 빌드 결과
```
✓ Compiled successfully
✓ Generating static pages (25/25)
/ page: 124 kB → 227 kB (First Load JS)
```

## 향후 개선
- 월 선택기 (현재 전체 기간 집계)
- 고정지출도 월별 차트에 포함
- 예산 대비 실적 비교 (월별 예산 기능 구현 후)
