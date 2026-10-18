# GitHub Actions 배포 파이프라인 계획 — unahouse.finance

작성일: 2026-10-18
대상: `cyanluna-git/una.house.fiance` → Oracle S2 `demo-server` (168.138.52.26), `unahouse.cyanluna.com`

---

## 1. 현재 상태 (2026-10-18 서버 직접 확인)

### 서버 (S2, `ssh oci-s2`)
| 항목 | 값 |
|---|---|
| OS / 사양 | Ubuntu 24.04, 1GB RAM (사용 가능 약 630MB) + swap 2GB, 디스크 45GB 중 25GB 여유 |
| Node / pnpm | Node v22.23.3 / pnpm은 corepack이 12.14.0을 내려받음 (로컬은 9.15.9) |
| 앱 경로 | `/opt/demos/unahouse-finance` |
| 실행 | PM2 `unahouse-finance` — `bash -c "pnpm start -p 3104"`, `pm2-ubuntu` systemd 활성 |
| Nginx | `unahouse.cyanluna.com` → `127.0.0.1:3104`, Cloudflare 프록시 경유 |
| 소스 관리 | **git 저장소 아님** — 파일 복사 방식으로 배포된 상태 |
| 마지막 배포 | 2026-04-11 (`.next`, `package.json` 날짜 기준) |
| 환경변수 | `.env.production`에 `UNAHOUSE_ACCESS_KEY_BASE64` |
| 크기 | `node_modules` 813MB, `.next` 270MB |

### 운영 DB (가장 중요)
- `finance.db` + WAL. **운영 거래 2,230건**, 마지막 입력 2026-10-18 12:05 (오늘도 사용 중).
- 로컬 Mac mini DB는 1,774건으로 **운영보다 오래됨**. 로컬 DB를 서버로 올리면 데이터가 사라집니다.
- 기존 백업: `backups/`, `tmp-db-backups/` (마지막 2026-04-01). 정기 백업 없음 (crontab 비어 있음).
- PM2 에러 로그에 `SQLITE_CONSTRAINT_UNIQUE` (POST `/api/transactions`) — 수동 입력 중복 시 500이 나는 것으로 추정. 별도 확인 필요.

### 저장소
- `main` = `origin/main` (`fae5fb6`), 워크플로 없음.
- `.gitignore`에 DB, `.env*` 제외되어 있음 (정상).
- 미커밋: `src/lib/quick-entry/`, `src/app/api/quick-entry/`, 검증 문서.

---

## 2. 설계 원칙

1. **DB는 절대 배포 대상이 아니다.** 코드만 바꾸고 `finance.db*`, `.env.production`, `backups/`는 건드리지 않는다.
2. **빌드는 GitHub Actions에서 한다.** 서버는 RAM 1GB라 `next build`가 메모리 부족이나 swap 과다로 느려지거나 실패할 수 있다.
3. **원자적 교체 + 즉시 롤백.** 릴리스 디렉터리를 새로 만들고 심볼릭 링크를 바꾼다. 실패 시 이전 링크로 되돌린다.
4. **배포 전 DB 백업 필수.** SQLite online backup으로 WAL 포함 일관된 스냅샷을 만든다.
5. **배포 전용 키.** 개인 키 대신 배포 전용 키를 쓰고, 서버에서 권한을 제한한다.

---

## 3. 목표 구조

### 서버 디렉터리 (전환 후)
```
/opt/demos/unahouse-finance/
├── current -> releases/20261018-1530-abc1234   # PM2 cwd
├── releases/
│   ├── 20261018-1530-abc1234/   # .next, node_modules, package.json, public ...
│   └── ... (최근 5개 보관)
├── shared/
│   ├── finance.db, finance.db-wal, finance.db-shm   # 운영 DB (이동)
│   ├── .env.production
│   └── backups/                  # 배포 전 자동 백업
└── deploy.sh                     # 서버측 배포 스크립트
```

- 각 릴리스에서 `finance.db*`, `.env.production`을 `shared/`로 심볼릭 링크.
- DB 경로는 `UNAHOUSE_DB_PATH=/opt/demos/unahouse-finance/shared/finance.db`로 직접 지정 (앱이 이미 지원함 — `src/lib/db/index.ts:10`). 심볼릭 링크보다 안전하므로 이 방식을 기본으로 한다.

### 파이프라인 흐름
```
push to main (또는 수동 실행)
  └─ job: test
       ├─ pnpm install --frozen-lockfile (Node 22)
       ├─ pnpm lint
       ├─ pnpm build
       └─ pnpm test:api
  └─ job: deploy (test 성공 + main 브랜치 + environment: production 승인)
       ├─ pnpm build (production)
       ├─ pnpm prune --prod (devDependencies 제거)
       ├─ tar: .next, node_modules, public, package.json, next.config.ts, pnpm-lock.yaml
       ├─ scp → 서버 /tmp/unahouse-<sha>.tar.gz
       └─ ssh → deploy.sh <sha>
            ├─ DB 백업 (sqlite3 .backup)
            ├─ releases/<ts-sha> 에 압축 해제, shared 링크
            ├─ current 링크 교체
            ├─ pm2 reload unahouse-finance
            ├─ 헬스 체크: curl 127.0.0.1:3104/unlock → 200 (최대 30초)
            ├─ 실패 시: current 이전 링크로 복구 + pm2 reload + 실패 종료
            └─ 오래된 릴리스 정리 (5개 유지)
  └─ 배포 후: https://unahouse.cyanluna.com/unlock 200 확인
```

### 네이티브 모듈 주의
- `better-sqlite3`는 네이티브 빌드. GitHub `ubuntu-24.04` 러너(x64, glibc)와 서버(Ubuntu 24.04 x64)가 같으므로 러너에서 빌드한 `node_modules`를 그대로 쓸 수 있다.
- Node 버전을 둘 다 **22**로 고정 (`.nvmrc` 추가, 워크플로 `node-version-file`).
- 서버의 pnpm은 corepack이 12.x를 내려받고 있음. 런타임에는 pnpm 불필요하도록 PM2 실행을 `node node_modules/next/dist/bin/next start -p 3104`로 바꾸는 것을 권장 (`package.json`에 `packageManager: pnpm@9.15.9` 추가로 버전 고정도 함께).

---

## 4. GitHub 설정

### Secrets (Repository → Settings → Secrets and variables → Actions)
| 이름 | 내용 |
|---|---|
| `DEPLOY_SSH_KEY` | 배포 전용 개인키 (새로 생성, ed25519) |
| `DEPLOY_HOST` | `168.138.52.26` |
| `DEPLOY_USER` | `ubuntu` |
| `DEPLOY_KNOWN_HOSTS` | `ssh-keyscan 168.138.52.26` 결과 (호스트 키 고정, MITM 방지) |

- 빌드 시 앱 비밀값은 필요 없음. `UNAHOUSE_ACCESS_KEY_BASE64`는 서버 `shared/.env.production`에만 둔다.

### Environment
- `production` 환경 생성, main 브랜치만 허용.
- 필요하면 required reviewer(본인) 설정 → 배포 전 승인 버튼. 개인 프로젝트라 처음엔 켜 두고 안정되면 끄는 것을 권장.

### 배포 전용 키
- 로컬에서 생성: `ssh-keygen -t ed25519 -f ~/.ssh/unahouse_gha -C gha-deploy -N ""`
- 서버 `~/.ssh/authorized_keys`에 제한 옵션과 함께 추가:
  `restrict,from="<GitHub 러너는 IP 고정이 안 되므로 생략>" ssh-ed25519 AAAA... gha-deploy`
  → 실제로는 `restrict` + 별도 배포 사용자(`deploy`)를 두는 것이 더 안전. 1단계는 `ubuntu` 사용, 2단계에서 분리 검토.
- 앞서 만든 `~/.ssh/oracle_unahouse`는 서버에 등록되지 않았음 (현재 접속은 Mac mini 기본 키). 이 키를 배포용으로 재사용하거나 삭제 — 결정 필요.

---

## 5. 단계별 실행 계획

### Phase 0 — 사전 정리 (로컬, 서버 변경 없음)
- [ ] 미커밋 `quick-entry` 작업 커밋 (기능 브랜치 → main)
- [ ] 기존 실패 테스트 2건 처리 결정 (`IMP-01`, `ANL-02`). CI에서 막히므로 수정하거나 임시 skip + 이슈 기록
- [ ] `.nvmrc`(22), `package.json`에 `packageManager`, `engines.node` 추가
- [ ] `.git/index.lock` (5월 생성, 남은 락) 제거 여부 결정

### Phase 1 — CI만 (배포 없음)
- [ ] `.github/workflows/ci.yml`: PR/푸시 시 install, lint, build, test:api
- [ ] 한 번 돌려서 러너에서 `better-sqlite3` 빌드와 테스트가 통과하는지 확인

### Phase 2 — 서버 구조 전환 (수동, 1회, 점검 시간에)
- [ ] 운영 DB 백업: `sqlite3 finance.db ".backup shared/backups/pre-migration-<ts>.db"` + 로컬로도 복사 (scp)
- [ ] `shared/`, `releases/` 생성, DB와 `.env.production`을 `shared/`로 이동
- [ ] 현재 실행 중인 코드를 `releases/legacy-20260411`로 이동, `current` 링크 생성
- [ ] PM2를 `current` 기준으로 재등록, `pm2 save`
- [ ] 헬스 체크 + 실제 로그인/거래 조회 확인
- [ ] 롤백 절차 리허설: `current`를 legacy로 돌렸다가 복귀

### Phase 3 — 배포 자동화
- [ ] `scripts/deploy-remote.sh` (서버측 deploy.sh) 저장소에 추가, 첫 배포 때 서버에 복사
- [ ] `.github/workflows/deploy.yml`: main 푸시 + `workflow_dispatch`, `production` environment
- [ ] 배포 전용 키 생성 및 등록, Secrets 설정
- [ ] 첫 자동 배포 (quick-entry 기능 포함) → 헬스 체크 → 수동 기능 확인

### Phase 4 — 운영 보강
- [ ] 정기 DB 백업 cron (일 1회, 14일 보관) + 주 1회 로컬/외부 복사
- [ ] 배포 실패 알림 (GitHub 기본 메일, 필요 시 Slack webhook)
- [ ] `SQLITE_CONSTRAINT_UNIQUE` 500 에러 원인 수정 (중복 시 409 반환)
- [ ] 로컬 개발 DB를 운영 DB 사본으로 갱신하는 스크립트 (`scripts/pull-prod-db.sh`, 읽기 전용 사본)

---

## 6. 롤백 절차

자동 (deploy.sh 헬스 체크 실패 시): 이전 릴리스로 링크 복구 후 `pm2 reload`.

수동:
```bash
ssh oci-s2
cd /opt/demos/unahouse-finance
ls -1t releases | head           # 이전 릴리스 확인
ln -sfn releases/<이전> current
pm2 reload unahouse-finance
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3104/unlock
```

DB 복구 (스키마 변경 등으로 데이터 문제가 생긴 경우만):
```bash
pm2 stop unahouse-finance
cp shared/backups/<배포 직전>.db shared/finance.db && rm -f shared/finance.db-wal shared/finance.db-shm
pm2 start unahouse-finance
```
주의: 백업 이후 입력된 거래는 사라짐. 실행 전 현재 DB도 따로 백업.

---

## 7. 리스크

| 리스크 | 영향 | 대응 |
|---|---|---|
| 로컬 DB를 서버에 덮어씀 | 운영 거래 456건 이상 손실 | 아티팩트에 DB 포함 금지 (tar 목록 명시), `.gitignore` 유지 |
| 스키마 자동 변경 (`CREATE TABLE IF NOT EXISTS`/ALTER) | 되돌리기 어려움 | 배포 전 자동 백업, 스키마 변경 커밋은 별도 표시 |
| 서버 메모리 부족 | 앱 다운 | 서버에서 빌드 안 함, `pm2 reload` 시 메모리 모니터 |
| 네이티브 모듈 불일치 | 기동 실패 | 러너/서버 OS·Node 동일 고정, 실패 시 자동 롤백 |
| 배포 키 유출 | 서버 장악 | 전용 키, `production` environment 보호, 필요 시 별도 사용자 |
| kanban-postgres 영향 | 사용 중 서비스 장애 | 배포 스크립트는 `/opt/demos/unahouse-finance`와 PM2 앱 하나만 다룸 |

---

## 8. 결정이 필요한 사항

1. 기존 실패 테스트 2건: 이번에 수정 / 임시 skip
2. `production` 배포 승인 단계: 켬 / 끔
3. 배포 사용자: 1단계 `ubuntu` 유지 / 처음부터 `deploy` 사용자 분리
4. `~/.ssh/oracle_unahouse` 키: 배포용 재사용 / 삭제
5. Phase 2 서버 전환 시점 (짧은 중단 발생, 1~2분 예상)
