# 대출 관리 기능 - 수동 입력 폼 + 목록 관리

## 개요
대출 페이지를 placeholder에서 완전한 기능 페이지로 전환. 장기주택, 차량, 학자금, 신용, 마이너스 등 다양한 가계대출을 등록/수정/삭제할 수 있는 입력 폼과 목록 화면을 구현했다. 변동금리 대출의 경우 변동 주기 및 예상 금리까지 관리 가능.

## 변경사항

### 1. DB 스키마 추가

**`src/lib/db/schema.ts`**
- `loans` 테이블 추가 (Drizzle ORM 정의)
- 18개 컬럼: loan_type, loan_name, purpose, lender, repay_institution, original_amount, outstanding_amount, interest_rate(REAL), rate_type, variable_period_months, variable_next_rate(REAL), repay_method, monthly_payment, payment_day, start_date, end_date, note, created_at
- `real()` 타입 사용 (금리 소수점 지원)
- `Loan`, `NewLoan` 타입 export

**`src/lib/db/index.ts`**
- CREATE TABLE IF NOT EXISTS loans 추가

### 2. API 엔드포인트

**`src/app/api/loans/route.ts`** (신규)
- GET: 전체 대출 목록 (생성일 역순)
- POST: 대출 등록 (필수: loanType, loanName, lender, originalAmount)

**`src/app/api/loans/[id]/route.ts`** (신규)
- PUT: 대출 정보 수정 (기존값 유지 fallback)
- DELETE: 대출 삭제

### 3. 대출 페이지 UI

**`src/app/loans/page.tsx`** - placeholder → 완전한 기능 페이지

#### 요약 카드 (3개)
- 총 대출 원금 (slate)
- 잔여 원금 (red)
- 월 총 상환액 (amber)

#### 대출 등록 폼 (접이식)
6개 섹션, 변동금리 조건부 필드:

```
기본 정보: 대출유형(select) | 대출명(text) | 대출목적(text)
금융기관:  금융기관(text) | 상환기관(text)
금액:      대출원금(number) | 잔여원금(number)
금리:      금리%(number) | 금리유형(select: 고정/변동)
  └ 변동금리 시: 변동주기(개월) | 변동후 예상금리(%)  ← 조건부 표시
상환조건:  상환방식(select) | 월상환액(number) | 월상환일(select 1~31)
기간:      시작일(date) | 만기일(date)
메모:      textarea
```

#### 대출 목록
- 유형 뱃지 (색상 구분: 장기주택=파랑, 차량=초록, 학자금=보라 등)
- 금리 + 잔액 표시
- 상환 진행률 바 (%)
- 클릭 펼침 상세 (모든 필드 그리드 표시)
- 인라인 수정 폼 (amber 배경 구분)
- 삭제 (confirm 확인)

## 핵심 코드

### 변동금리 조건부 필드
```tsx
{data.rateType === "변동" && (
  <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
    <input placeholder="변동 주기 (개월)" />
    <input placeholder="변동 후 예상 금리 (%)" />
  </div>
)}
```

### 상환 진행률 바
```tsx
const repaidPct = Math.round(
  ((loan.original_amount - loan.outstanding_amount) / loan.original_amount) * 100
);
<div className="bg-slate-200 rounded-full h-2">
  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${repaidPct}%` }} />
</div>
```

### 폼 재사용
등록/수정 폼에서 동일한 `renderFormFields()` 함수를 공유하여 코드 중복 방지.

## 결과

빌드 성공 (16개 페이지)

```
Route (app)                                 Size  First Load JS
├ ƒ /api/loans                             144 B         102 kB
├ ƒ /api/loans/[id]                        144 B         102 kB
├ ○ /loans                               3.75 kB         106 kB
```

## 대출 유형 지원

| 유형 | 뱃지 색상 | 예시 |
|------|-----------|------|
| 장기주택 | 파랑 | 주택담보대출, 전세자금대출 |
| 차량 | 초록 | 자동차 할부 |
| 학자금 | 보라 | 학자금 대출 |
| 신용 | 주황 | 신용대출 |
| 마이너스 | 빨강 | 마이너스 통장 |
| 기타 | 회색 | 기타 대출 |

## 다음 단계

- 대출 상환 이력 추적 (loan_payments 테이블)
- 월 상환 알림 기능
- 대출 잔액 변동 그래프
- 대시보드에 총 대출 잔액 카드 추가
- 이자 계산기 (원리금균등/원금균등 시뮬레이션)
