# 카드 관리 테이블 + 거래 연동

## 개요
개별 카드 단위로 실적 기준, 할인한도, 연회비, 주요 혜택 등 메타정보를 관리하고, 거래 데이터와 연동하여 이번달 카드별 실적 현황을 추적할 수 있는 기능 추가. 기존 거래 데이터에서 카드를 자동 생성하고 거래 내역 페이지에서도 연결된 카드 정보를 표시하도록 수정.

## 변경 사항

### 신규 파일
| 파일 | 설명 |
|------|------|
| `src/app/api/cards/route.ts` | GET (목록+이번달 사용액) / POST (등록+자동 거래 매칭) |
| `src/app/api/cards/[id]/route.ts` | PUT (수정) / DELETE (삭제+거래 연결 해제) |
| `src/app/cards/page.tsx` | 카드 관리 UI (확장형 카드, 실적 프로그레스바) |

### 수정 파일
| 파일 | 변경 |
|------|------|
| `src/lib/db/schema.ts` | `cards` 테이블 정의 + `transactions.cardId` 추가 |
| `src/lib/db/index.ts` | cards CREATE TABLE + card_id ALTER TABLE 마이그레이션 |
| `src/components/Sidebar.tsx` | "소비" 섹션에 "카드 관리" 메뉴 추가 |
| `src/app/transactions/page.tsx` | 카드 필터 및 카드명 표시로 변경 |
| `src/app/api/transactions/route.ts` | `cardId` 쿼리 파라미터 지원 추가 |

### DB 스키마
- `cards` 테이블: cardCompany, cardName, cardNumber, cardType, isActive, annualFee, issueDate, expiryDate, monthlyTarget, monthlyDiscountLimit, mainBenefits, familyMemberId, note
- `transactions` 테이블: `card_id` 컬럼 추가 (마이그레이션)

### 주요 기능
1. **카드 CRUD**: 등록/수정/비활성화/삭제
2. **자동 거래 매칭**: 카드 등록 시 `cardCompany + cardName` 일치하는 기존 거래에 `card_id` 자동 연결
3. **실적 프로그레스바**: 이번달 사용금액 / monthlyTarget (80%↑ 초록, 50~80% 노랑, 50%↓ 빨강)
4. **요약 카드**: 활성 카드 수, 총 연회비, 이번달 총 사용액
5. **카드사별 배지 색상**: 7개 카드사별 고유 색상
6. **기존 데이터 자동 카드 생성**: 거래 데이터에서 DISTINCT(card_company, card_name) 조합으로 10개 카드 자동 등록
7. **거래 내역 카드 표시**: 거래 내역 페이지에서 카드사가 아닌 연결된 카드명 표시

## 기존 데이터 카드 생성 및 연동

### 자동 카드 생성
기존 거래 데이터에서 10개의 고유 카드사+카드명 조합을 발견하여 일괄 등록:
```sql
INSERT INTO cards (card_company, card_name, card_type)
SELECT DISTINCT card_company, card_name, '신용'
FROM transactions
WHERE card_name IS NOT NULL AND card_name != ''
```

### 거래 연결
1,717건의 전체 거래를 해당 카드에 100% 연결:
```sql
UPDATE transactions SET card_id = (
  SELECT id FROM cards
  WHERE cards.card_company = transactions.card_company
    AND cards.card_name = transactions.card_name
)
WHERE card_name IS NOT NULL AND card_name != ''
```

### 생성된 카드 목록 (10개)
| 카드사 | 카드명 |
|--------|--------|
| 국민카드 | 탄탄대로 올쏘 톡톡 |
| 국민카드 | 톡톡i Easy |
| 국민카드 | 글로벌 ONE |
| 농협카드 | NH올원파이 VISA |
| 신한카드 | Mr.Life |
| 신한카드 | Deep Dream |
| 신한카드 | Deep On Platinum+ |
| 현대카드 | M포인트 |
| 롯데카드 | 롯데 아멕스 카드 |
| 우리카드 | 가나다라 |

## 거래 내역 페이지 수정

### 카드 표시 변경
- 기존: `cardCompany` (카드사명)만 표시
- 변경: 연결된 카드의 `cardName` (굵은 글씨) + `cardCompany` (회색 작은 글씨)

```typescript
// src/app/transactions/page.tsx
function getCardDisplayName(tx: Transaction) {
  if (tx.cardId) {
    const card = cardList.find((c) => c.id === tx.cardId);
    if (card) return { company: card.cardCompany, name: card.cardName };
  }
  return { company: tx.cardCompany, name: tx.cardName || tx.cardCompany };
}
```

### 필터 변경
- 기존: 카드사(cardCompany) 기반 드롭다운 필터
- 변경: 카드(cardId) 기반 드롭다운 필터 (카드사 · 카드명 형식)

```typescript
// 필터 파라미터 전송
...(filters.card && { cardId: filters.card }),

// 카드 드롭다운
{cardList.map((card) => (
  <option key={card.id} value={card.id}>
    {card.cardCompany} · {card.cardName}
  </option>
))}
```

### API `cardId` 파라미터 추가
```typescript
// src/app/api/transactions/route.ts
const cardId = searchParams.get("cardId");
if (cardId) conditions.push(eq(transactions.cardId, Number(cardId)));
else if (cardCompany) conditions.push(eq(transactions.cardCompany, cardCompany));
```
- `cardId` 파라미터가 있으면 `card_id` 기준 필터
- 없으면 기존 `card` (cardCompany) 기준 필터 유지 (하위 호환)

## 빌드 결과
```
✓ Compiled successfully
✓ Generating static pages (27/27)
/cards: 3.48 kB → 106 kB (First Load JS)
```

## 향후 개선
- 임포트 시 파서에서 자동 card_id 매칭
- 카드별 월간 리포트 (사용 카테고리 분포)
- 카드 추천 (혜택 기반 최적 카드 제안)
