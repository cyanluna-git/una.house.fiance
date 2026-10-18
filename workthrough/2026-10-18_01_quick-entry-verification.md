# 문자/영수증 빠른 입력 — 검증 가이드 (자가 검증용)

대상 기능: 카드 승인 문자, 카카오톡 결제 알림 텍스트를 붙여넣어 거래 후보를 만들고, 기존 거래와 중복을 검사한 뒤 확정 저장.
대상 커밋: 이 문서가 포함된 커밋의 직전 작업 트리 (`src/lib/quick-entry/`, `src/app/api/quick-entry/`).

## 1. 범위

| 구분 | 포함 | 제외 (이번 단계) |
|---|---|---|
| 입력 | 카드 승인 문자, 카카오톡 복사 텍스트 | 영수증 사진 OCR, 음성 |
| 파싱 | 날짜, 시간, 가맹점, 금액, 카드사, 할부, 취소 | 영수증 품목 단위 파싱 |
| 분류 | 기존 규칙(`categorizeMerchant`) 우선, 미분류만 로컬 LLM | 자동 학습 |
| 중복 | 날짜·가맹점·금액·카드사 기준 4단계 | 임포트 파일 전체 재검사 |
| UI | 없음 (API만) | 검토 화면 |

## 2. 구성 파일

- `src/lib/quick-entry/sms-parser.ts` — 문자 분리, 필드 추출
- `src/lib/quick-entry/dedupe.ts` — 중복 판정
- `src/lib/quick-entry/ai.ts` — Ollama(`AI_BASE_URL`, `AI_MODEL`) 분류 폴백
- `src/app/api/quick-entry/parse/route.ts` — POST, 저장 안 함
- `src/app/api/quick-entry/commit/route.ts` — POST, 저장 (서버에서 중복 재검사)

## 3. 사전 준비

1. Node 22 사용. Node 26에서는 `better-sqlite3` 빌드가 실패합니다.
   `brew install node@22` 후 `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"`
2. `pnpm install --frozen-lockfile`
3. `.env`에 `UNAHOUSE_ACCESS_KEY_BASE64` 설정 (값은 문서에 쓰지 않습니다)
4. 로컬 LLM 사용 시 Ollama 실행 및 `qwen3.6:35b-a3b` 모델 준비. 없으면 `useAi: false`로 호출하면 됩니다.

## 4. 자동 검증 (순서대로)

```bash
pnpm build                 # 새 라우트 2개가 목록에 있어야 함
pnpm test:api              # 현재 기준 85개 중 83 통과, 2 실패가 정상 (아래 참고)
```

`pnpm test:api`의 기존 실패 2건 (새 기능과 무관, HEAD에서도 동일하게 실패 확인됨):
- `IMP-01: 51MB 파일 → 413` (500 반환)
- `ANL-02: 단일 카테고리 월 → categoryBreakdown length=1`

이 2건을 고치는 것은 별도 작업입니다. 이번 기능 때문에 깨진 것이 아닙니다.

## 5. 수동 API 검증

서버 실행: `pnpm start -p 3104 -H 127.0.0.1`

인증 쿠키 얻기 (키 값은 `.env`에서 읽어서 넣습니다):

```bash
KEY=$(grep '^UNAHOUSE_ACCESS_KEY_BASE64=' .env | cut -d= -f2- | tr -d '"')
curl -s -c /tmp/ck.txt -X POST http://127.0.0.1:3104/api/auth/unlock \
  -H 'Content-Type: application/json' \
  -d "$(python3 -c 'import json,sys;print(json.dumps({"key":sys.argv[1]}))' "$KEY")"
```

### 5-1. 파싱 (저장 없음)

```bash
curl -s -b /tmp/ck.txt -X POST http://127.0.0.1:3104/api/quick-entry/parse \
  -H 'Content-Type: application/json' \
  -d '{"text":"[Web발신] 현대카드 승인 21,100원 일시불 10/17 14:32 성심당 본점 누적 1,234,000원\n\n[Web발신] 신한카드(1234)승인 김*나 12,900원(3개월) 10/18 19:20 쿠팡(쿠페이)","useAi":false}'
```

기대 결과 (확인된 값, 2026-10-18 기준):
- 1번: date `2026-10-17`, time `14:32`, merchant `성심당 본점`, amount `21100`, cardCompany `현대카드`, paymentType `일시불`, categoryL1 `외식비`
- 2번: date `2026-10-18`, merchant `쿠팡(쿠페이)`, amount `12900`, cardCompany `신한카드`, cardLast4 `1234`, paymentType `할부`, installmentMonths `3`, categoryL1 `쇼핑`

### 5-2. 저장과 중복 차단

같은 요청을 두 번 저장해서 두 번째가 막히는지 봅니다.

```bash
B='{"entries":[{"date":"2026-10-17","merchant":"성심당 본점","amount":21100,"cardCompany":"현대카드","categoryL1":"외식비","categoryL2":"베이커리"}]}'
curl -s -b /tmp/ck.txt -X POST http://127.0.0.1:3104/api/quick-entry/commit -H 'Content-Type: application/json' -d "$B"
curl -s -b /tmp/ck.txt -X POST http://127.0.0.1:3104/api/quick-entry/commit -H 'Content-Type: application/json' -d "$B"
```

기대 결과: 첫 번째 `savedCount: 1`, 두 번째 `savedCount: 0` + `skipped`에 `중복: 날짜·가맹점·금액·카드사 동일`.

검증 후 테스트 데이터 삭제 (운영 DB를 쓰는 경우 반드시 실행):

```bash
sqlite3 finance.db "DELETE FROM transactions WHERE source_type='sms' AND merchant='성심당 본점' AND amount=21100 AND date='2026-10-17';"
```

### 5-3. 인증 확인

`/api/quick-entry/parse`를 쿠키 없이 호출하면 `401 Unauthorized`가 나와야 합니다.

## 6. 실데이터 검증 (사용자 제공 문자)

아직 실제 카드사 문자 샘플이 없어서 합성 문자로만 확인했습니다. 실제 문자로 아래를 확인해 주세요.

- 문자 한 건당 `entries` 한 개가 나오는가
- 취소 문자가 음수 금액으로 나오는가
- 카드사가 `null`로 나오는 경우가 있는가 (나오면 `CARD_PATTERNS`에 패턴 추가 필요)
- 가맹점에 "누적", "잔여" 같은 잡음이 섞이지 않는가
- 날짜가 1월 붙여넣기 시 전년도로 잘 잡히는가

문제가 있으면 원문(`raw` 필드)과 기대값을 같이 기록해 주세요.

## 7. 알려진 한계

- 날짜 연도는 실행 시점 기준으로 추정합니다. 연도가 없는 문자를 연말에 붙이면 틀릴 수 있습니다.
- 카드사 판별은 키워드 기반이라 새 카드사나 문구 변경에 약합니다.
- `dedupe`의 `likely`/`possible` 판정은 임포트 파일과 수동입력 사이의 가맹점명 차이를 완전히 잡지 못합니다. 경고로만 쓰고 자동 차단은 `exact`만 합니다.
- 영수증 이미지 입력은 아직 연결하지 않았습니다. 합계 불일치 사례 (IMG_3568, 품목 합 103,940원 vs 모델 합계 31,870원)가 해결되지 않은 상태입니다.

## 8. 완료 기준

- [ ] `pnpm build` 성공, 새 라우트 2개 존재
- [ ] `pnpm test:api`에서 신규 실패 없음 (기존 2건 외)
- [ ] 5-1 파싱 결과가 기대값과 일치
- [ ] 5-2 두 번째 저장이 중복으로 차단됨
- [ ] 5-3 인증 없이 401
- [ ] 실제 문자 샘플 10건 이상에서 6번 항목 확인
