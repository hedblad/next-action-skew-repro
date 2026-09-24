#!/usr/bin/env bash
# Builds the deployments, then runs every scenario from a stale tab on deployment "a".
set -euo pipefail
cd "$(dirname "$0")"
BOOTSTRAP_CHANGE=1 ./build.sh > /dev/null
for dist in .next-b .next-b-workaround; do
  for scenario in action navigation; do
    echo "######## $scenario, stale tab on a, server now $dist"
    NEW_DIST=$dist node run.mjs "$scenario" 2>&1 | grep -vE '\[server|DEP0169|Network:' | sed -n '/deploying/,$p'
  done
done
