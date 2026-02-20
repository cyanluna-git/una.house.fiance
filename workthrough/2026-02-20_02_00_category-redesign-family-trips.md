# 소비 카테고리 재설계 + 가족/여행 관리 + 필수/재량 태그

## 개요
소비 카테고리 체계를 전면 재설계하여 재무 건전성 분석이 가능하도록 했다. 16개 대분류 + 50개 중분류 체계로 전환, 200개+ 가맹점 규칙 적용, 가족 구성원/여행 관리 테이블 추가, 필수/재량 태그 시스템 및 거래 분할 기능을 구현했다.

## 핵심 성과
- **미분류 비율 62.6% → 13.6%** (1,074건 → 233건)
- 식자재/외식비 정확 분리 (식자재 192건, 외식비 526건)
- 구독(85건), 공과금(99건), 교통(88건) 독립 분류

## 변경사항

### 1. 카테고리 체계 전면 재작성

**`src/lib/categories.ts`**
- 16개 L1 대분류: 식자재, 외식비, 생활용품, 공과금, 구독, 교육, 보험, 대출, 교통, 의료, 취미, 여행, 쇼핑, 금융, 기부, 기타
- 50개+ L2 중분류
- `NECESSITY_DEFAULTS` 매핑: L1 → essential/discretionary
- `MIGRATION_MAP`: 구 카테고리 → 신 카테고리 매핑

### 2. 가맹점 규칙 대폭 확대

**`src/lib/db/seed-rules.ts`**
- 72개 → **200개+** 규칙
- 주요 추가:
  - 카페 브랜드 (스타벅스, 컴포즈, 메가커피, 빽다방, 투썸, 이디야 등)
  - 패스트푸드 (맥도날드, 버거킹, 맘스터치, 서브웨이)
  - 구독 서비스 (넷플릭스, 디즈니+, 유튜브프리미엄, CURSOR, iCloud 등)
  - 배달 앱 (배달의민족, 쿠팡이츠, 요기요)
  - 온라인 쇼핑 (알리익스프레스, 테무, G마켓, 11번가)
  - 주유소 (SK에너지, GS칼텍스, S-OIL)
  - 여행 (Agoda, 에어비앤비, 야놀자)
  - 미분류 상위 가맹점 타겟 규칙

### 3. categorizer.ts 업데이트

**`src/lib/categorizer.ts`**
- `CategoryResult`에 `necessity` 필드 추가
- 가맹점 분류 시 L1 카테고리 기반 자동 necessity 매핑
- 규칙 사전 정렬 (모듈 로드 시 1회)

### 4. DB 스키마 확장

**`src/lib/db/schema.ts`**
- `transactions` 테이블: `necessity`, `familyMemberId`, `tripId` 컬럼 추가
- `family_members` 테이블 신규 (name, relation, birthYear, note)
- `trips` 테이블 신규 (name, destination, startDate, endDate, budget, note)
- `transaction_splits` 테이블 신규 (transactionId, categoryL1/L2/L3, amount, necessity, note)
- 8개 타입 export (FamilyMember, Trip, TransactionSplit 등)

**`src/lib/db/index.ts`**
- CREATE TABLE IF NOT EXISTS: family_members, trips, transaction_splits
- ALTER TABLE 마이그레이션: 개별 try-catch로 중복 에러 무시

### 5. API 엔드포인트

| 엔드포인트 | 메서드 | 기능 |
|---|---|---|
| `/api/family` | GET, POST | 가족 구성원 목록/등록 |
| `/api/trips` | GET, POST | 여행 목록(지출 합계 포함)/등록 |
| `/api/trips/[id]` | PUT, DELETE | 여행 수정/삭제 |
| `/api/transactions/[id]/splits` | GET, POST, DELETE | 거래 분할 조회/생성/삭제 |

- POST splits: 합계 검증 (분할 합 = 원거래 금액), 최소 2개 항목
- GET trips: 여행별 총 지출액/건수 자동 집계

### 6. UI 페이지

**`src/app/trips/page.tsx`** (신규)
- 요약 카드 3개 (전체 여행 수, 총 예산, 총 지출)
- 접이식 여행 등록 폼
- 여행 목록: 예산 대비 진행률 바, 클릭 펼침 상세
- 인라인 수정 폼 (amber 배경)

**`src/app/family/page.tsx`** (신규)
- 가족 구성원 등록 폼 (이름, 관계, 출생연도, 메모)
- 관계별 색상 뱃지 (본인=파랑, 배우자=핑크, 자녀=초록/노랑)

**`src/app/transactions/page.tsx`** (개선)
- "분류" 열 추가: necessity 뱃지 (필수=초록, 재량=노랑, 과소비=빨강)
- 편집 모드: necessity 드롭다운, 구성원 드롭다운, 여행 드롭다운
- 가족/여행 데이터를 별도 fetch로 로드

**`src/components/Sidebar.tsx`** (개선)
- "생활" 메뉴 섹션 추가: 여행, 가족 구성원

### 7. 임포트 파이프라인 업데이트

**`src/app/api/import/route.ts`**, **`scripts/bulk-import.ts`**
- 임포트 시 `necessity` 필드도 함께 저장

**`src/app/api/transactions/route.ts`**
- POST: `necessity`, `familyMemberId`, `tripId` 지원

**`src/app/api/transactions/[id]/route.ts`**
- PATCH: `necessity`, `familyMemberId`, `tripId` 업데이트 지원

## 분류 결과

| 카테고리 | 건수 | 비율 |
|---|---|---|
| 외식비 | 526 | 30.6% |
| 쇼핑 | 330 | 19.2% |
| 기타(미분류) | 233 | 13.6% |
| 식자재 | 192 | 11.2% |
| 공과금 | 99 | 5.8% |
| 교통 | 88 | 5.1% |
| 구독 | 85 | 5.0% |
| 보험 | 84 | 4.9% |
| 기부 | 22 | 1.3% |
| 금융 | 20 | 1.2% |
| 의료 | 13 | 0.8% |
| 교육 | 7 | 0.4% |
| 취미 | 6 | 0.3% |
| 여행 | 6 | 0.3% |
| 생활용품 | 6 | 0.3% |

## 빌드 결과

```
Route (app)                                 Size  First Load JS
├ ○ /family                               1.5 kB         104 kB
├ ○ /trips                               2.27 kB         104 kB
├ ○ /transactions                        4.07 kB         106 kB
├ ƒ /api/family                            154 B         102 kB
├ ƒ /api/trips                             154 B         102 kB
├ ƒ /api/trips/[id]                        154 B         102 kB
├ ƒ /api/transactions/[id]/splits          154 B         102 kB
```

## 다음 단계

- 대시보드에 필수/재량/과소비 파이차트 추가
- 구성원별 지출 합계 분석 차트
- 여행 상세 페이지: 연결된 거래 내역 + 카테고리별 소계
- 거래 목록에서 분할 UI (인라인 분할 편집)
- 남은 미분류 233건 추가 규칙으로 감소 (목표 10% 이하)
