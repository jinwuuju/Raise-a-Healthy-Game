#!/bin/sh
# Prefer the installed tools; fall back to the verified desktop runtime on this Mac.
set -eu
if command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1; then
  exec npm "$@"
fi
mq_node="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node"
mq_npm="$HOME/.cache/medical-quest/npm-12.2.0/bin/npm-cli.js"
if [ ! -x "$mq_node" ] || [ ! -f "$mq_npm" ]; then
  echo 'Node 24.19.0 / npm 12.2.0을 설치한 뒤 npm 명령을 사용하세요.' >&2
  exit 1
fi
PATH="$(dirname "$mq_node"):$HOME/.cache/medical-quest/bin:$PATH"
export PATH
exec "$mq_node" "$mq_npm" "$@"
