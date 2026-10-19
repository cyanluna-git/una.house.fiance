# 빠른 입력 UI + 영수증 사진 연결 — 상세 구현 계획

작성: 2026-10-19 · 상태: 계획 (구현 전, 결정 필요 항목 있음)

## 0. 목표와 원칙

- 입력 경로 3가지를 **한 화면**에서 처리: ① 카드 문자 붙여넣기 ② 카카오톡 텍스트 붙여넣기 ③ 영수증 사진 업로드
- 흐름: **분석 → 검토(사람이 금액/분류 확인·수정) → 확정 저장**. 확정 전에는 DB에 아무것도 쓰지 않는다.
- 영수증은 **합계 1건 = 거래 1건**으로 저장. 품목은 검토용 참고 정보 (메모에 요약 보관).
- 중복 검사는 분석 시 1회 + 확정 시 서버에서 재검사 (이미 구현됨).
- 이번 3568처럼 품목 합 ≠ 합계면 "검토 필요" 배지를 띄우고, 사람이 최종 금액을 입력.

## 1. 현재 상태 (이미 운영 배포됨, `78303a2`)

| 구성 | 상태 |
|---|---|
| `POST /api/quick-entry/parse` (텍스트 → 후보 + 분류 + 중복판정) | 완료 |
| `POST /api/quick-entry/commit` (서버 재검사 후 저장, `force`, `sourceType`) | 완료 |
| `src/lib/quick-entry/sms-parser.ts`, `dedupe.ts`, `ai.ts`(분류 폴백) | 완료 |
| 화면(UI) | **없음** |
| 영수증 이미지 분석 API | **없음** |

## 2. ⚠️ 먼저 결정할 것: 운영 서버에서 AI를 어떻게 부르나

운영 앱은 Oracle S2(1GB RAM)에서 돈다. 로컬 모델(qwen3.6, Ollama)은 **Mac mini에** 있다.
현재 `AI_BASE_URL` 기본값 `localhost:11434`는 운영 서버에서는 연결되지 않는다 → 지금 운영에서 AI 분류 폴백은 조용히 실패하고 규칙 분류만 동작 중.

| 안 | 방식 | 장점 | 단점 |
|---|---|---|---|
| **A. 터널 (권장)** | Mac mini에 Tailscale 설치, S2도 Tailscale 가입 → S2가 `http://<mac-mini-tailnet>:11434` 호출 | 비용 0, 데이터 외부 전송 없음, 로컬 모델 그대로 | Mac mini가 꺼져 있거나 잠자면 AI 불가 (→ 규칙/수동 입력으로 폴백) |
| B. 클라우드 비전 API | Gemini Flash / GPT-4o-mini 등 | 항상 가용, 빠름(3~5초) | 영수증 이미지 외부 전송, 소액 과금, 키 관리 |
| C. A + B 폴백 | 로컬 우선, 실패 시 클라우드 | 가용성 최고 | 구성 복잡 |

- 권장: **A로 시작**, 필요하면 나중에 C로 확장. `ai.ts`를 provider 추상화(ollama / openai 호환)로 만들어 두면 B/C 전환은 환경변수만 바꾸면 된다.
- A 구성 작업: Mac mini `brew install tailscale` + 로그인, S2 `tailscale up`, Ollama `OLLAMA_HOST=0.0.0.0` (tailnet 인터페이스만 허용), S2 `.env.production`에 `AI_BASE_URL` 추가. 
- 주의: S2에 Tailscale 설치는 kanban-postgres 포트/컨테이너에 영향 없음 (네트워크 인터페이스 추가만).
- Mac mini 잠자기 방지 확인 필요 (`pmset` 설정).

## 3. 영수증 분석 API

### `POST /api/quick-entry/receipt` (신규)
- 입력: `multipart/form-data` `image` (최대 8MB, jpeg/png/webp)
- 처리:
  1. 이미지를 **브라우저에서 미리 축소** (긴 변 1600px, JPEG q0.85 → 보통 300~600KB). iPhone 사진(HEIC)은 `<input accept="image/*">`로 고르면 Safari가 JPEG로 변환해 넘겨준다. 서버에서 HEIC 디코딩은 하지 않는다(sharp 기본 빌드는 HEIC 미지원).
  2. 비전 모델 호출 (Ollama `format` = JSON schema, `temperature 0`, `think false`)
  3. 추출 스키마:
     ```
     { store, date, time, cardCompany, cardLast4, approvalNo,
       total,            // 영수증에 인쇄된 결제/합계 금액
       items: [{ name, amount }],   // amount는 할인은 음수
       confidence }
     ```
  4. **검증 로직 (서버)**:
     - `itemsSum = Σ items.amount` 와 `total` 비교 → 일치 `ok` / 불일치 `mismatch(차액)` / 합계 없음 `missing`
     - 날짜 형식/미래 날짜 검사, 금액 0 이하 검사
     - 카드사명 정규화 (기존 카드사 목록과 매칭, 실패 시 null → 사용자 선택)
  5. 가맹점 분류: 기존 `categorizeMerchant(store)` 규칙 → 미분류면 `classifyMerchantsWithAi` 폴백 (기존 로직 재사용)
  6. 중복 판정: `checkDuplicate({date, merchant: store, amount: total, cardCompany})` (기존 로직 재사용)
- 출력: parse API와 **같은 entry 형태** + `receipt: { items, itemsSum, total, check: "ok"|"mismatch"|"missing", diff }`
- 이미지는 **저장하지 않음** (1차). 메모리에서만 처리 후 폐기.
- 타임아웃: 120초 (로컬 모델 장당 ~22초 + 콜드 스타트). nginx `proxy_read_timeout` 확인 필요(기본 60초 → 180초로).
- 실패 시: 200 + `{ entries: [빈 후보 1건], error: "AI 분석 실패" }` → 사용자가 수동으로 채움.

### 프롬프트 개선 포인트 (3568 교훈)
- "할인 줄은 바로 위 상품에 붙은 음수 금액" 명시
- "합계는 '합계/결제금액/받을금액/카드승인' 문구 옆 숫자" 명시, 품목에서 계산하지 말 것
- 동일 이미지 재분석 시 값이 달라졌으므로 `temperature 0`, `seed` 고정

## 4. 화면: `/quick` (신규 페이지)

### 레이아웃 (모바일 우선 — 주로 폰으로 사진/문자 붙여넣기)
```
[ 빠른 입력 ]
 탭: [ 문자/카톡 붙여넣기 ] [ 영수증 사진 ]
 ┌───────────────────────────────┐
 │ textarea (여러 건 한꺼번에)      │   또는  [📷 사진 선택/촬영] (여러 장)
 └───────────────────────────────┘
 [☑ AI 분류 사용]   [ 분석 ]

 ── 검토 목록 ──────────────────────
 ☑ 10/12 트레이더스 천안아산점   135,980  현대  식자재/마트  [⚠ 품목합 불일치 +1,000] [🔁 중복의심]
     ▸ 품목 13개 (펼치기)              금액[135980] 날짜[2026-10-12] 카드[현대▾]
     분류: QuickCategoryPicker        필요도[필수▾]  메모[        ]
 ☐ 10/17 스타벅스  5,600  국민  외식비/카페  [✖ 이미 저장됨]
 ──────────────────────────────────
 [ 선택 3건 저장 ]
```

### 동작 규칙
- 각 행은 편집 가능 (날짜, 가맹점, 금액, 카드사, 할부, 분류 L1/L2/L3, 필요도, 메모)
- 배지:
  - 중복 `exact` → 기본 체크 해제 + 저장 불가 ("이미 저장됨")
  - 중복 `likely` → 기본 체크 해제, 체크하면 `force: true`로 전송
  - 중복 `possible` → 체크 유지, 노란 경고만
  - 영수증 `mismatch`/`missing` → "검토 필요", 금액 칸 강조. 사용자가 금액을 직접 수정하거나 "확인함"을 눌러야 저장 가능
  - 분류 `ai` → "AI(신뢰도 0.8)" 표시, `none` → "미분류" 표시
- 저장 후: 결과 요약 토스트 (저장 N / 건너뜀 M + 사유), 저장된 행은 목록에서 제거
- 사진 여러 장: 순차 업로드 (서버 1GB/모델 단일 처리), 장별 진행 표시 "2/5 분석 중…"
- 기존 컴포넌트 재사용: `QuickCategoryPicker`, `Button`, `Badge`, `FormField`, `ErrorBanner`, `LoadingSkeleton`
- 사이드바: "입력" 그룹 맨 위 + 모바일 하단 메뉴에 "⚡ 빠른 입력" 추가

### 메모 포맷 (영수증)
`[영수증] 품목 13개: 서울우유 8,580 / 창억 호박인절미 14,780 / … (할인 -10,800)` — 300자 넘으면 앞부분만 + "외 N개"

## 5. 서버 변경 (commit API 보완)

- `sourceType`: `"sms" | "kakao" | "receipt"` 3종으로 확장 (현재 sms/receipt 2종)
- 영수증 확정 시 `receiptCheck` 값을 받아서 `mismatch`인데 사용자 확인 플래그(`amountConfirmed`)가 없으면 400 — UI 우회 방지
- 기존 `POST /api/transactions` 의 `SQLITE_CONSTRAINT_UNIQUE` 500 (운영 로그에 있음) → 409 + "이미 같은 거래가 있습니다"로 수정 (같이 처리)

## 6. 단계별 작업 순서

| # | 작업 | 산출물 | 검증 |
|---|---|---|---|
| 1 | AI provider 추상화 (`ai.ts` → ollama/openai 호환, 텍스트·비전 공용) | `src/lib/quick-entry/ai.ts` | 로컬 단위 호출 |
| 2 | 영수증 추출 + 검증 로직 | `src/lib/quick-entry/receipt.ts` | 샘플 5장(3568~3572) 스크립트로 합계/품목합 비교표 |
| 3 | 영수증 API | `src/app/api/quick-entry/receipt/route.ts` | curl 업로드, 무인증 401 |
| 4 | commit API 보완 + transactions 409 | 기존 route 2개 | API 테스트 추가 |
| 5 | `/quick` 페이지 + 사이드바 | `src/app/quick/page.tsx`, 컴포넌트 2~3개 | 로컬 브라우저: 문자 4건 / 사진 5장 / 중복 / 불일치 |
| 6 | 테스트 | `tests/api/quick-entry.test.ts` (parse·commit·receipt 목킹) | `pnpm test:api` (기존 실패 2건 제외 통과) |
| 7 | AI 연결 (결정 2 반영: Tailscale 등) | 서버 env, nginx timeout | 운영에서 사진 1장 실제 분석 |
| 8 | 배포 | main 푸시 → Actions | 운영 헬스 + 실제 입력 1건 후 삭제 |
| 9 | 문서 | `workthrough/2026-10-19_02_…verification.md` | — |

예상: 1~6 로컬 구현·검증 반나절~하루, 7은 Tailscale 로그인(사용자 1회 필요) 포함 30분.

## 7. 테스트 시나리오

- 카드 문자 4종(현대/국민/하나/신한) 한 번에 붙여넣기 → 4행, 분류/카드사 정확
- 카카오톡 알림 텍스트(카드사 알림톡 형식) → 파싱 (현재 파서에 카카오 형식 샘플 부족 → **실제 샘플 2~3개 필요**)
- 같은 문자 두 번 → 두 번째 `exact` 차단
- 영수증 5장: 3569~3572는 `ok` 기대, 3568은 `mismatch` → 135,980 수동 입력 후 저장
- AI 서버 꺼짐 → 규칙 분류만, 영수증은 "분석 실패 — 직접 입력" 행
- 무인증 → 401, 8MB 초과 → 413, 이미지 아닌 파일 → 400

## 8. 결정 필요 (사용자)

1. **운영 AI 연결 방식**: A(Tailscale로 Mac mini 모델) / B(클라우드 API) / C(둘 다) — 권장 A
2. **영수증 이미지 보관**: 1차는 저장 안 함 (권장). 나중에 원본 보관이 필요하면 `shared/receipts/`에 저장 + 거래 id 연결
3. **카카오톡 텍스트 실제 샘플**: 카드사 알림톡/송금 메시지 2~3개 붙여주면 파서에 반영
4. **품목 저장 수준**: 메모 요약 (권장) vs 별도 `receipt_items` 테이블 (품목별 분석 필요할 때)
