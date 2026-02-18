# 7개 카드사 파서 수정 & 전체 데이터 임포트

## 개요
카드 명세서 임포트 시 발생한 2가지 에러(DB 테이블 미생성, macOS 한글 유니코드 NFD 이슈)를 수정하고, 5개 카드사 파서의 실제 데이터 구조 불일치를 해결하여 전체 66개 파일(1,717건)을 성공적으로 임포트했다.

## 주요 변경사항
- **수정**: DB 테이블 자동 생성 - `sqlite.exec(CREATE TABLE IF NOT EXISTS ...)` 추가
- **수정**: macOS NFD 유니코드 정규화 - `fileName.normalize("NFC")` 적용
- **수정**: 농협카드 파서 - `header: 1` 모드로 변경, 동적 헤더 행 탐색
- **수정**: 현대/신한카드 HTML 파서 - 헤더 행 인덱스 추적, colspan 처리, 가맹점+금액 결합 셀 분리
- **수정**: 하나/우리카드 OLE-XLS 파서 - `header: 1` 모드로 변경, 동적 헤더 행 탐색

## 핵심 코드 (필요시만)

```typescript
// macOS NFD → NFC 유니코드 정규화 (parsers/index.ts)
const lower = fileName.normalize("NFC").toLowerCase();

// HTML 파서: 헤더 행 인덱스 추적 + colspan 확장 (html-xls.ts)
if ((firstCellText.includes("이용일") || ...) && row.some(c => c.text.includes("가맹점"))) {
  headerRowIdx = rows.length - 1;
}

// XLSX 파서: 동적 헤더 행 탐색 패턴 (nonghyup/hana/woori.ts)
const rows = XLSX.utils.sheet_to_json<any[]>(worksheet, { defval: "", header: 1 });
for (let i = 0; i < rows.length; i++) {
  if (rowStr.includes("거래일자") && rowStr.includes("가맹점")) { headerIdx = i; break; }
}
```

## 결과
- ✅ 빌드 성공 (9개 페이지 정상 컴파일)
- ✅ 7/7 카드사 파서 테스트 통과
- ✅ 66개 파일 중 65개 임포트 성공, 1개 스킵(신한카드 3월 = 연회비만)
- ✅ 총 1,717건 거래 DB 저장 완료
- ✅ API 정상 동작 확인

## 다음 단계
- 중복 임포트 방지 (UNIQUE 제약조건 또는 사전 중복 체크)
- 대시보드 통계 쿼리 최적화 (현재 1000건 제한 → DB GROUP BY 집계로 변경)
- 카테고리 분류 정확도 개선 (미분류 거래 줄이기)
- 현대카드 금액 파싱 정밀화 (현재 가맹점 셀에서 추출 → 결제원금 컬럼 우선 사용)
