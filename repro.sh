#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
export NEXT_TELEMETRY_DISABLED=1
# Shared by all builds, as the self-hosting guide recommends, so action IDs match across deployments.
export NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")

# Each deployment is built from its own copy of the app, at the same path like a real deploy (action
# IDs depend on it), and then moved aside so all of them can be served later.
#   a:            the deployment an open tab is running (app/ as it is)
#   b:            the next deployment (app/ plus the files in deployment-b/)
#   b-workaround: b, built with the workaround header from next.config.mjs
build() {
  local name=$1 deployment_id=$2 workaround=$3 overlay=${4:-}
  mkdir -p deployments/build
  cp -R app next.config.mjs deployments/build/
  [ -n "$overlay" ] && cp -R "$overlay"/. deployments/build/
  (cd deployments/build && DEPLOYMENT_ID=$deployment_id WORKAROUND=$workaround npx next build > /dev/null)
  mv deployments/build "deployments/$name"
}

rm -rf deployments
build a a 0
build b b 0 deployment-b
build b-workaround b 1 deployment-b

for name in b b-workaround; do
  for scenario in action navigation; do
    echo "######## $scenario: tab opened on a, server replaced with $name"
    node run.mjs "$scenario" "$name"
  done
done
