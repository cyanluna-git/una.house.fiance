# 지역화폐(착 Chak) 파서 추가 + 임포트 비밀번호 지원

## 개요
착(Chak) 앱의 지역사랑상품권(아산페이, 천안사랑카드 등) 거래내역 xlsx 파일을 파싱하여 기존 임포트 플로우로 업로드할 수 있도록 파서 추가. 암호화된 xlsx 파일 지원을 위해 `officecrypto-tool` 의존성 추가 및 임포트 페이지에 비밀번호 입력 필드 구현.

## 변경 사항

### 신규 파일
| 파일 | 설명 |
|------|------|
| `src/lib/parsers/chak.ts` | 착(Chak) 지역화폐 파서 (password-protected xlsx 복호화 + 파싱) |

### 수정 파일
| 파일 | 변경 |
|------|------|
| `src/lib/parsers/index.ts` | `chak` 파일명 감지, `parseFile` async 전환, password 파라미터 추가 |
| `src/lib/parsers/types.ts` | `"지역화폐"` CardCompany 타입 추가 |
| `src/app/api/import/route.ts` | password formData 수신, `await parseFile`, card_id 자동 매칭 |
| `src/app/import/page.tsx` | 비밀번호 입력 필드 추가, 지역화폐 안내 |
| `src/app/cards/page.tsx` | 지역화폐 배지 색상(주황), 선불 카드타입, 카드사 목록 |
| `scripts/bulk-import.ts` | `await parseFile` async 반영 |
| `scripts/test-parsers.ts` | async 전환 |

### 의존성
- `officecrypto-tool` 추가 (password-protected xlsx 복호화)

### DB
- cards 테이블에 아산페이 카드 등록 (card_company: 지역화폐, card_type: 선불)

## Chak 파일 구조

```
파일명: chak_이용내역_결제_20260220_164528.xlsx (password-protected)
시트: 상품권 거래내역
Row 0: 지역상품권 거래내역 (타이틀)
Row 2: 회원명, 조회기간
Row 7: 메인 헤더 (순번, 상품권명, 거래일시, 거래구분, 거래방법, 사용처, 거래금액, 잔고, ...)
Row 8: 현금영수증 서브헤더
Row 9+: 데이터
```

| 컬럼 | 내용 | 예시 |
|------|------|------|
| B (1) | 상품권명 | 아산페이 |
| C (2) | 거래일시 | 2026-01-30 19:54:05 |
| D (3) | 거래구분 | 결제완료 |
| F (5) | 사용처 | 해란강 양꼬치 훠궈 |
| G (6) | 거래금액 | 72,900 |

## 주요 구현

### 암호화 파일 복호화
```typescript
// src/lib/parsers/chak.ts
import OfficeCrypto from "officecrypto-tool";

export async function parseChakCard(buffer: Buffer, password?: string): Promise<ParsedTransaction[]> {
  let decryptedBuffer = buffer;
  if (password) {
    const isEncrypted = await OfficeCrypto.isEncrypted(buffer);
    if (isEncrypted) {
      decryptedBuffer = await OfficeCrypto.decrypt(buffer, { password });
    }
  }
  const workbook = XLSX.read(decryptedBuffer);
  // ...
}
```

### parseFile async 전환
```typescript
// src/lib/parsers/index.ts
export async function parseFile(buffer: Buffer, fileName: string, password?: string): Promise<ParsedTransaction[]> {
  // chak 파서만 async이지만 통일성을 위해 전체 async 전환
}
```

### 임포트 시 card_id 자동 매칭
```typescript
// src/app/api/import/route.ts
let cardId: number | null = null;
const card = sqlite
  .prepare("SELECT id FROM cards WHERE card_company = ? AND card_name = ? LIMIT 1")
  .get(t.cardCompany, t.cardName || "");
if (card) cardId = card.id;
```

## 파서 테스트 결과
```
15개 파일 → 126건 파싱 성공
- 중복 파일 2쌍 포함 (실제 고유 약 112건)
- 날짜 범위: 2025-01 ~ 2026-01
- 결제완료 거래만 필터링
```

## 빌드 결과
```
✓ Compiled successfully
✓ Generating static pages (27/27)
```

## 향후 개선
- 천안사랑카드 데이터 추가 시 같은 파서로 처리 (상품권명 컬럼으로 자동 구분)
- 중복 파일 감지 (같은 기간 데이터 중복 임포트 방지)
- 지역화폐 충전 내역 관리 (10% 할인 금액 추적)
