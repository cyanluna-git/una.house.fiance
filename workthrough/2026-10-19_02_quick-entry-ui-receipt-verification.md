# 빠른 입력 화면 + 영수증 사진 분석 — 검증 결과 (자가 검증용)

계획 문서: `2026-10-19_01_quick-entry-ui-receipt-plan.md` (1~9단계 중 9단계에 해당)

## 배포 이력

| 커밋 | 내용 | Actions |
|---|---|---|
| `5de32f6` | 운영 AI 엔드포인트를 Mac mini(Tailscale) Ollama로 지정 | 성공 |
| `8a541de` | `/quick` 화면 + `POST /api/quick-entry/receipt` + 409 처리 + 테스트 | 성공 (2m42s) |
| `2444642` | 로그인 리다이렉트가 `https://localhost:3104`로 가던 문제 수정 | 성공 (3m20s) |

## 결정 사항 반영

1. 운영 AI 연결: **A안 (Tailscale → Mac mini Ollama `qwen3.6:35b-a3b`)**
   - S2 `AI_BASE_URL=http://100.112.139.36:11434`, `AI_TIMEOUT_MS=120000` (ecosystem.config)
   - Mac mini는 `tailscale serve --tcp 11434`로만 노출, 공인 인터넷 노출 없음
2. 영수증 이미지: 저장하지 않음 (분석 후 메모리에서 폐기)
3. 카카오톡 실제 샘플: 아직 받지 않음 → 파서 미반영
4. 품목: 메모 요약만, 별도 테이블 없음

## 구현 요약

- `src/lib/quick-entry/ai.ts`: ollama / openai 호환 provider, 텍스트·비전 공용, 타임아웃
- `src/lib/quick-entry/receipt.ts`: 구조화 출력(JSON schema) 추출 → 합계/품목합 검증 `ok | mismatch | missing`
- `POST /api/quick-entry/receipt`: 이미지 1장 → 검토 후보 (저장 안 함). 무인증 401, 8MB 초과 413, 비이미지 400
- `POST /api/quick-entry/commit`: `sourceType` sms/kakao/receipt, `mismatch`는 `amountConfirmed` 없으면 저장 거부
- `POST /api/transactions`: UNIQUE 위반 500 → 409 "이미 같은 거래가 있습니다" (에러 로그 제외)
- `/quick` 화면 + 사이드바 메뉴: 텍스트 붙여넣기 / 사진 업로드 → 중복·검증 배지 → 수정 → 확정
- `src/middleware.ts`: 리다이렉트 주소를 `X-Forwarded-Host`/`Host`, `X-Forwarded-Proto`로 생성

## 검증 결과

### 영수증 샘플 5장 (로컬, 모델 직접 호출)

| 파일 | 가맹점 | 인식 합계 | 실제 | 검증 |
|---|---|---|---|---|
| IMG_3568 | 트레이더스 | 22,940 | 135,980 | mismatch (영수증 잘림) → 수동 확인 필요, 의도대로 |
| IMG_3569 | 모다아울렛 | 65,100 | 65,100 | 합계 정확 (품목 추출은 불완전) |
| IMG_3570 | 하나로마트 | 7,730 | 7,730 | ok |
| IMG_3571 | 모다아울렛(ARTBOX) | 3,500 | 3,500 | ok |
| IMG_3572 | 모다아울렛 | 3,500 | 3,500 | ok |

- 소요 5~11초/장 (로컬, 모델 로드 후)
- 운영에서 IMG_3570 실제 업로드: 200, 23.8초 (첫 호출 모델 로드 포함 추정), 결과 정확, 저장 안 함 → 운영 DB 2,230건 유지
- 사용자 실사용: 영수증 여러 장 + 카드사 앱 푸시 캡처 인식 양호 (사용자 확인)

### 자동 테스트 (`pnpm test:api`)

- 91 통과 / 2 실패. 실패 2건(IMP-01, ANL-02)은 HEAD에서도 동일하게 실패하는 기존 실패
- 신규 QE-01~08 전부 통과: 무인증 401(parse/receipt), 문자 파싱, 빈 입력 400, commit 중복 skip, mismatch 저장 거부, amountConfirmed 저장, 수동 입력 중복 409
- TXN-05 기대값을 500 → 409로 수정

### 운영 장애 1건: 로그인 리다이렉트 깨짐

- 증상: 로그인 쿠키가 없는 브라우저에서 사이트가 열리지 않음
- 원인: 새 배포 구조에서 `next start -H 127.0.0.1`로 띄우면서 `request.nextUrl` host가 `localhost:3104`가 됨 → `Location: https://localhost:3104/unlock?...`
- 조치: `2444642`. 배포 후 `/`, `/quick`, `/transactions` 모두 `https://unahouse.cyanluna.com/unlock?next=...`, 따라가면 200
- 교훈: 배포 검증에 "무쿠키 공개 URL → 리다이렉트 Location 도메인" 확인을 넣어야 함 (기존 검증은 인증 쿠키로만 확인해서 놓침)

## 남은 것 / 위험

- Mac mini가 꺼지거나 잠들면 운영 영수증 분석 실패 (텍스트는 규칙 분류로 동작). 현재 시스템 잠자기는 디스플레이가 켜져 있을 때만 막힘 → `pmset` 설정 필요
- Tailscale ACL 미설정 (tailnet 내 모든 기기가 Mac mini 11434 접근 가능)
- 카카오톡 알림톡 실제 샘플 미반영
- 카드사 앱 푸시 캡처는 품목이 없어 `missing`으로 분류될 수 있음 → 사용자 판단으로 현재 그대로 유지
- 배포 스모크 테스트에 무쿠키 리다이렉트 검사 미추가
