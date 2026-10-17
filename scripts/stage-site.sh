#!/usr/bin/env bash
# Assembles the deployable site in the given directory: client/dist/ with the server as api/.
# Usage: scripts/stage-site.sh <target-dir> [--with-smoke-test]
set -euo pipefail

TARGET_DIR=${1:?usage: stage-site.sh <target-dir> [--with-smoke-test]}
ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
# vendor/, tests/ and the Composer and PHPUnit files are for development and never belong on the host.
SERVER_ENTRIES=(.htaccess index.php src)
if [[ "${2:-}" == "--with-smoke-test" ]]; then
  SERVER_ENTRIES+=(smoke-test.php)
fi

mkdir -p "$TARGET_DIR/api"
cp -r "$ROOT_DIR"/client/dist/. "$TARGET_DIR/"
for entry in "${SERVER_ENTRIES[@]}"; do
  cp -r "$ROOT_DIR/server/$entry" "$TARGET_DIR/api/"
done
