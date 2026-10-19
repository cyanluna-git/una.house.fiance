#!/usr/bin/env bash
# 공개 URL 스모크 테스트 (로그인 쿠키 없이 = 처음 방문한 브라우저와 같은 조건)
# 사용: scripts/smoke-public.sh [https://unahouse.cyanluna.com]
# 배포 워크플로 마지막 단계와 로컬 수동 점검에서 같이 쓴다.
set -u
BASE="${1:-https://unahouse.cyanluna.com}"
fail=0

check() { # 이름, 기대, 실제
  if [ "$2" = "$3" ]; then echo "ok   $1: $3"; else echo "FAIL $1: 기대 '$2', 실제 '$3'"; fail=1; fi
}

# 1) 로그인 화면
check "/unlock 상태" "200" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/unlock" || true)"

# 2) 보호 페이지는 같은 공개 도메인의 /unlock 으로 리다이렉트 (localhost 등으로 새면 실패)
for p in / /quick /transactions; do
  out="$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' "$BASE$p" || true)"
  enc="$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1],safe=""))' "$p")"
  check "$p 리다이렉트" "307 $BASE/unlock?next=$enc" "$out"
done

# 3) 리다이렉트를 따라가면 실제로 로그인 화면이 열린다
check "/quick 따라가기" "200 $BASE/unlock" \
  "$(curl -s -o /dev/null -L -w '%{http_code} %{url_effective}' "$BASE/quick" | sed 's/?.*//' || true)"

# 4) API는 리다이렉트가 아니라 401
check "API 무인증" "401" "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/api/dashboard" || true)"

exit $fail
