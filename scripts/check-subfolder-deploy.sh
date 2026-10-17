#!/usr/bin/env bash
# Serves the production layout (dist/ plus server/ as api/) from a sub-folder of an Apache
# container and checks that the page, its assets, the API and the smoke test work there.
set -euo pipefail

SUBFOLDER=${SUBFOLDER:-handsum}
PORT=${PORT:-8089}
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
SITE_DIR=$(mktemp -d)
CONTAINER=handsum-subfolder-check
trap 'podman rm -f "$CONTAINER" >/dev/null 2>&1 || true; podman unshare rm -rf "$SITE_DIR"' EXIT

npm --prefix "$ROOT_DIR" run build >/dev/null
mkdir -p "$SITE_DIR/$SUBFOLDER/api"
cp -r "$ROOT_DIR"/dist/. "$SITE_DIR/$SUBFOLDER/"
cp -r "$ROOT_DIR"/server/. "$SITE_DIR/$SUBFOLDER/api/"
rm -rf "$SITE_DIR/$SUBFOLDER/api/tests"
chmod -R a+rwX "$SITE_DIR"

# Host networking lets the smoke test call its own public URL from inside the container.
podman run -d --name "$CONTAINER" --network host \
  -v "$SITE_DIR:/var/www/html:Z" php:8.4-apache sh -c \
  "sed -i 's/AllowOverride None/AllowOverride All/' /etc/apache2/apache2.conf && sed -i 's/Listen 80/Listen $PORT/' /etc/apache2/ports.conf && apache2-foreground" >/dev/null

BASE="http://127.0.0.1:$PORT/$SUBFOLDER"
for _ in $(seq 30); do curl -s -o /dev/null "$BASE/" && break; sleep 1; done

failures=0
check() {
  local name=$1 actual=$2 expected=$3
  if [[ "$actual" == *"$expected"* ]]; then echo "ok   $name"; else echo "FAIL $name (got: $actual)"; failures=$((failures + 1)); fi
}
status() { curl -s -o /dev/null -w '%{http_code}' "$@"; }

ROOM=$(printf 'ABCDEF' | sha256sum | cut -d' ' -f1)
PAGE=$(curl -s "$BASE/")

check "page without trailing slash redirects into the sub-folder" "$(curl -s -o /dev/null -w '%{redirect_url}' "$BASE")" "$BASE/"
check "page loads" "$PAGE" '<div id="app">'
check "page uses no absolute asset paths" "$(grep -cE '(src|href)="/' <<<"$PAGE" || true)" "0"
for asset in $(grep -oE '(src|href)="\./[^"]+"' <<<"$PAGE" | sed -E 's/.*"\.\/([^"]+)"/\1/'); do
  check "asset $asset" "$(status "$BASE/$asset")" "200"
done
check "API answers below the sub-folder" "$(curl -s -H "X-Room: $ROOM" "$BASE/api/index.php?since=0")" '"moves":[]'
check "API rejects requests without a room" "$(status "$BASE/api/index.php")" "400"
check "sources are not served" "$(status "$BASE/api/src/Config.php")" "403"
SMOKE=$(curl -s "$BASE/api/smoke-test.php")
check "smoke test passes in the sub-folder" "$SMOKE" "All OK means"
check "smoke test reports no failure" "$(grep -c '^FAIL' <<<"$SMOKE" || true)" "0"
echo "$SMOKE" | grep "^FAIL" || true

exit $((failures > 0))
