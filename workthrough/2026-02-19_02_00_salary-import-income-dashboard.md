# 급여 명세서 PDF 임포트 + 수입/지출 비교 대시보드

## 개요
비밀번호 보호된 급여 명세서 PDF를 업로드하면 자동으로 파싱하여 세전/세후/공제 항목을 분류 저장하고, 대시보드에 수입 vs 지출 비교 차트를 추가했다.

## Context
- 기존에는 카드 지출만 관리 가능했고, 수입(월급) 데이터가 없었음
- 사용자가 매월 급여 명세서 PDF를 받고 있음 (에드워드코리아, 비밀번호 보호)
- PDF 내부는 2컬럼 레이아웃: 좌측 지급내역, 우측 공제내역

## Changes Made

### 1. DB 스키마 확장

**`src/lib/db/schema.ts`** - 2개 테이블 추가:
- `salary_statements`: 명세서 헤더 (지급일, 성명, 사번, 직급, 부서, 세전/공제/세후 금액)
- `salary_items`: 개별 항목 (type: payment/deduction, 항목명, 금액)

**`src/lib/db/index.ts`** - CREATE TABLE IF NOT EXISTS 추가

### 2. 급여 명세서 PDF 파서

**`src/lib/parsers/salary.ts`** (신규)
- `qpdf`로 비밀번호 해제 → `pdftotext -layout`으로 텍스트 추출
- 2컬럼 레이아웃 파싱: 들여쓰기 30자 이상 = 공제 전용 라인
- 헤더 정보 추출: 지급일자, 성명, 사번, 직급, 부서, 회사명
- 합계 추출: 지급합계, 공제합계, 실지급액

핵심 로직:
```typescript
// 들여쓰기로 지급/공제 구분
const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
const isDeductionOnlyLine = leadingSpaces > 30;

if (isDeductionOnlyLine) {
  // 공제 항목
} else if (matches.length >= 2) {
  // 첫 번째 = 지급, 나머지 = 공제
} else {
  // 단독 = 지급
}
```

### 3. 수입 API 엔드포인트

**`src/app/api/income/import/route.ts`** (신규)
- POST: 다중 PDF 업로드 + 비밀번호 처리
- 중복 체크: pay_date + gross_pay + net_pay 조합

**`src/app/api/income/route.ts`** (신규)
- GET: 급여 명세서 목록 + 항목 조회

### 4. 수입 페이지 UI

**`src/app/income/page.tsx`** - placeholder에서 완전한 기능 페이지로 개편
- PDF 비밀번호 입력 + 다중 파일 업로드
- 명세서 목록: 날짜, 세전, 공제, 실수령 요약
- 클릭하면 상세 펼침: 지급내역/공제내역 2컬럼 표시
- 직원 정보(성명, 직급, 부서) 표시

### 5. 대시보드 수입/지출 비교

**`src/app/page.tsx`** - 3개 추가/수정:
- 요약 카드: 3개 → 4개 (총 수입, 총 지출, 수지 차액, 거래 건수)
- 수지 차액 카드: 흑자=초록, 적자=빨강 동적 색상
- **수입 vs 지출 비교 바 차트**: 월별 수입(초록) + 지출(파랑) 나란히

## 파서 테스트 결과

```
=== File 1 (월급) ===
Pay date: 2026-01-23 | Gross: 8,433,986 | Deductions: 1,590,898 | Net: 6,843,088
Payments: 기본급, 휴일근로수당, Valued 포상금, 명절격려금
Deductions: 건강보험, 국민연금, 고용보험, 장기요양보험료, 사우회, 소득세, 지방소득세 등

=== File 2 (연차수당) ===
Pay date: 2026-01-23 | Gross: 134,240 | Deductions: 1,200 | Net: 133,040
Payments: 연차수당
Deductions: 고용보험
```

## 결과

빌드 성공 (15개 페이지)

```
Route (app)                                 Size  First Load JS
├ ○ /                                     123 kB         226 kB
├ ƒ /api/income                            143 B         102 kB
├ ƒ /api/income/import                     143 B         102 kB
├ ○ /income                              2.25 kB         104 kB
```

## 의존성

- 외부 도구: `qpdf` (PDF 비밀번호 해제), `pdftotext` (poppler, 텍스트 추출)
- 설치: `brew install qpdf poppler` (로컬 개발 환경)

## 다음 단계

- 급여 명세서 삭제 기능
- 월별 수입 추이 차트 (수입 페이지 내)
- 세전/세후 비교 차트
- 다른 회사 급여 명세서 형식 지원
- 수입 데이터를 대시보드 월평균에 반영
