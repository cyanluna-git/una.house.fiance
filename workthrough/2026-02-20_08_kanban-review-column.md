# Kanban 보드 Review 컬럼 + 카드 라이프사이클 기록

## 개요

Kanban 보드에 **Review 컬럼**을 추가하고, 카드 하나에 **요구사항 → 계획 → 구현 → 리뷰** 전체 라이프사이클을 마크다운으로 기록하는 시스템을 구현했습니다. 카드를 클릭하면 모달에서 프로그레스 바와 함께 4단계 전 과정을 한눈에 확인할 수 있습니다.

## 주요 변경사항

- **DB 스키마 확장**: `plan`, `implementation_notes`, `review_comments`, `reviewed_at` 컬럼 추가
- **4컬럼 보드**: To Do → In Progress → Review → Done (보라색 테마)
- **카드 라이프사이클 모달**: 프로그레스 바 + 4단계 섹션 (요구사항/계획/구현/리뷰)
- **리뷰 워크플로우**: 서브에이전트 자동 리뷰, 승인→Done / 수정필요→In Progress 자동 전환
- **SKILL.md**: 에이전트가 각 단계에서 `plan`, `implementation_notes`를 기록하는 가이드

## 수정 파일

| 파일 | 변경 내용 |
|------|----------|
| `kanban-board/plugins/kanban-api.ts` | DB 마이그레이션, Task/Board 인터페이스, PATCH 필드, POST review 엔드포인트 |
| `kanban-board/src/main.ts` | 라이프사이클 모달 (프로그레스 바 + 4섹션), 리뷰 배지 |
| `kanban-board/src/style.css` | 4컬럼 그리드, 프로그레스 바, 라이프사이클 섹션 스타일 |
| `~/.claude/skills/kanban/SKILL.md` | 스키마, 라이프사이클 문서, 에이전트 기록 가이드 |
| `kanban-board/scripts/migrate.ts` | 새 컬럼 반영 |

## 결과

- 카드 클릭 시 `📋 요구사항 → 🗺️ 계획 → 🔨 구현 → 🔍 리뷰` 전 과정 확인
- AI가 채팅으로 출력하는 내용을 정리해서 SQLite에 마크다운으로 기록
- 리뷰 결과에 따른 자동 상태 전환

## 다음 단계

- 실제 작업에서 라이프사이클 기록 워크플로우 테스트
- git diff 자동 연동으로 구현 기록 자동 생성
- 리뷰 통계 (승인율, 평균 리뷰 횟수)
