# 카테고리 규칙 관리 UI 구현

## 개요
카테고리 규칙(272개)이 `seed-rules.ts`에 하드코딩되어 있던 것을 DB 기반으로 전환하고, 웹에서 직접 규칙을 CRUD할 수 있는 관리 UI를 추가함.

## 변경 사항

### 1. categorizer.ts - DB 기반 전환
- `seed-rules.ts` import 제거 → DB에서 직접 조회
- `categorizeMerchant()` 호출 시 `category_rules` 테이블에서 priority DESC 순으로 읽어 매칭

### 2. DB 자동 시드 (`src/lib/db/index.ts`)
- `category_rules` 테이블이 비어있으면 `seed-rules.ts` 데이터를 자동 INSERT (272개)
- 트랜잭션으로 일괄 적재하여 성능 확보

### 3. API 라우트 (신규 3개)

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/category-rules` | GET | 목록 조회 (search, categoryL1 필터) |
| `/api/category-rules` | POST | 규칙 추가 |
| `/api/category-rules/[id]` | PATCH | 규칙 수정 |
| `/api/category-rules/[id]` | DELETE | 규칙 삭제 |
| `/api/category-rules/test` | POST | 가맹점명 매칭 테스트 |

### 4. UI 페이지 (`/category-rules`)
- 규칙 테이블: keyword, L1/L2/L3, priority 컬럼
- 검색/필터: 키워드 검색 + L1 카테고리 필터
- 인라인 편집/삭제
- 새 규칙 추가 폼 (연쇄 카테고리 드롭다운)
- 매칭 테스트: 가맹점명 입력 → 매칭 결과 실시간 표시

### 5. 사이드바 메뉴 추가
- "데이터 관리" 섹션에 "카테고리 규칙" 항목 추가

### 6. 칸반 DB 로컬 전환 (bonus)
- 전역 `~/.claude/kanban.db` → 프로젝트 로컬 `.claude/kanban.db`로 이동
- SKILL.md, Vite 보드 플러그인, 마이그레이션 스크립트 모두 업데이트

## 수정 파일

| 파일 | 작업 |
|------|------|
| `src/app/api/category-rules/route.ts` | 신규 |
| `src/app/api/category-rules/[id]/route.ts` | 신규 |
| `src/app/api/category-rules/test/route.ts` | 신규 |
| `src/app/category-rules/page.tsx` | 신규 |
| `src/lib/categorizer.ts` | 수정 (DB 기반) |
| `src/lib/db/index.ts` | 수정 (시드 로직) |
| `src/components/Sidebar.tsx` | 수정 (메뉴 추가) |
| `kanban-board/plugins/kanban-api.ts` | 수정 (로컬 DB) |
| `kanban-board/scripts/migrate.ts` | 수정 (로컬 DB) |
| `~/.claude/skills/kanban/SKILL.md` | 수정 (로컬 DB) |

## 빌드 결과

```
✓ Compiled successfully
✓ Generating static pages (25/25)
Seeded 272 category rules
Exit code: 0
```

## 향후 개선
- 규칙 일괄 import/export (JSON/CSV)
- 중복 키워드 경고 UI
- 규칙 변경 시 기존 거래 재분류 기능
