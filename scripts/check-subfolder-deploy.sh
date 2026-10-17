#!/usr/bin/env bash
# Serves the production layout (client/dist/ plus server/ as api/) from a sub-folder of an Apache
# container and checks that the page, its assets, the API and the smoke test work there.
set -euo pipefail

SUBFOLDER=${SUBFOLDER:-handsum}
export APACHE_PORT=${APACHE_PORT:-8089}
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
SITE_DIR=$(mktemp -d)
compose() { docker compose --project-directory "$ROOT_DIR" --profile deploy-check "$@"; }
trap 'compose down --volumes >/dev/null 2>&1 || true; rm -rf "$SITE_DIR"' EXIT

npm --prefix "$ROOT_DIR/client" run build >/dev/null
mkdir -p "$SITE_DIR/$SUBFOLDER/api"
cp -r "$ROOT_DIR"/client/dist/. "$SITE_DIR/$SUBFOLDER/"
cp -r "$ROOT_DIR"/server/. "$SITE_DIR/$SUBFOLDER/api/"
rm -rf "$SITE_DIR/$SUBFOLDER/api/tests"

compose up --detach apache >/dev/null
# Copying into the container instead of bind-mounting keeps file ownership out of the host.
compose cp "$SITE_DIR/." apache:/var/www/html/
compose exec apache chown -R www-data:www-data /var/www/html

BASE="http://127.0.0.1:$APACHE_PORT/$SUBFOLDER"
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
