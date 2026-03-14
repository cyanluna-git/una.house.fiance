# Reimport Guide

OneDrive 원본 명세서에서 전체 데이터를 다시 적재해야 할 때 사용하는 절차입니다.

## Source Path

기본 경로:

```bash
/Users/cyanluna-pro16/Library/CloudStorage/OneDrive-개인/Cyanluna/02_금융/unahouse_finance/raw
```

경로가 다르면 `UNAHOUSE_IMPORT_ROOT` 환경변수나 첫 번째 인자로 덮어쓸 수 있습니다.

## Safe Reimport

기존 DB를 보관한 뒤 비운 상태에서 재임포트합니다.

```bash
mkdir -p backups
cp finance.db "backups/finance.db.$(date +%Y%m%d-%H%M%S).bak"
rm -f finance.db finance.db-shm finance.db-wal
UNAHOUSE_IMPORT_ROOT="/Users/cyanluna-pro16/Library/CloudStorage/OneDrive-개인/Cyanluna/02_금융/unahouse_finance/raw" pnpm import
pnpm verify:aggregation
```

## Notes

- `pnpm import`는 `originalDate`, `billingMonth`, `paymentMonthCandidate`, `aggregationDate`, `aggregationMonth`, `aggregationBasis`를 함께 채웁니다.
- 표준 집계월은 `청구월 우선, 없으면 결제월 fallback` 규칙을 따릅니다.
- `pnpm verify:aggregation`는 과거 왜곡 월(`2022-06`, `2024-06`)과 이동된 샘플 월(`2026-02`)을 점검합니다.
