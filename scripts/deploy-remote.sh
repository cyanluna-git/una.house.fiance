#!/usr/bin/env bash
# 서버(Oracle S2)에서 실행되는 배포 스크립트.
# 사용: deploy-remote.sh <아티팩트.tar.gz> <git-sha>
# 코드(.next, node_modules 등)만 교체한다. DB와 .env.production은 shared/에 두고 절대 건드리지 않는다.
set -euo pipefail

ARTIFACT="${1:?artifact path required}"
SHA="${2:?git sha required}"

BASE=/opt/demos/unahouse-finance
APP=unahouse-finance
PORT=3104
KEEP=5
TS="$(date +%Y%m%d-%H%M%S)"
REL="$BASE/releases/$TS-${SHA:0:7}"

cd "$BASE"
[ -d shared ] || { echo "ERROR: $BASE/shared 없음 (Phase 2 서버 전환이 먼저 필요)"; exit 1; }
[ -f shared/finance.db ] || { echo "ERROR: shared/finance.db 없음"; exit 1; }
[ -f shared/.env.production ] || { echo "ERROR: shared/.env.production 없음"; exit 1; }

echo "== [1/6] DB 백업"
mkdir -p shared/backups
BACKUP="shared/backups/finance-$TS-pre-${SHA:0:7}.db"
sqlite3 shared/finance.db ".backup '$BACKUP'"
[ "$(sqlite3 "$BACKUP" 'select count(*) from transactions')" -ge 0 ]
# 백업은 최근 30개만 보관
ls -1t shared/backups/finance-*.db 2>/dev/null | tail -n +31 | xargs -r rm -f

echo "== [2/6] 릴리스 풀기: $REL"
mkdir -p "$REL"
tar -xzf "$ARTIFACT" -C "$REL"
[ -f "$REL/.next/BUILD_ID" ] || { echo "ERROR: 운영 빌드 아님 (.next/BUILD_ID 없음)"; rm -rf "$REL"; exit 1; }
ln -sfn "$BASE/shared/.env.production" "$REL/.env.production"

PREV="$(readlink -f current 2>/dev/null || true)"

echo "== [3/6] 링크 교체 (이전: ${PREV:-없음})"
ln -sfn "$REL" current.new
mv -Tf current.new current

echo "== [4/6] PM2 재시작"
pm2 startOrReload "$BASE/current/ecosystem.config.cjs" --update-env

echo "== [5/6] 헬스 체크"
sleep 3
ok=0
for i in $(seq 1 45); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/unlock" || true)"
  if [ "$code" = "200" ]; then ok=1; break; fi
  sleep 1
done

if [ "$ok" != "1" ]; then
  echo "ERROR: 헬스 체크 실패 (마지막 HTTP $code). 롤백합니다."
  if [ -n "$PREV" ] && [ -d "$PREV" ]; then
    ln -sfn "$PREV" current.new
    mv -Tf current.new current
    pm2 startOrReload "$BASE/current/ecosystem.config.cjs" --update-env
    sleep 3
    echo "롤백 후 HTTP: $(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:$PORT/unlock" || true)"
  fi
  exit 1
fi

echo "== [6/6] 오래된 릴리스 정리 (최근 $KEEP개 유지)"
CUR="$(basename "$(readlink -f current)")"
for d in $(ls -1dt releases/*/ 2>/dev/null | tail -n +$((KEEP + 1))); do
  [ "$(basename "$d")" = "$CUR" ] && continue
  rm -rf "$d"
done
rm -f "$ARTIFACT"
pm2 save >/dev/null
echo "OK: $REL"
