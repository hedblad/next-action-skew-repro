#!/usr/bin/env bash
# Builds two "deployments" of the same app. "b" adds a client component that "a" has never seen,
# like any deploy that ships a new or changed client module.
set -euo pipefail
cd "$(dirname "$0")"
export NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY:-$(node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")}
export NEXT_TELEMETRY_DISABLED=1

render() {
  local variant=$1
  for f in app/page app/other/page; do
    if [ "$variant" = b ]; then
      sed -e "s#/\*B_IMPORT\*/#import { NewFeature } from '$( [ $f = app/page ] && echo . || echo .. )/new-feature';#" \
          -e 's#{/\*B_RENDER\*/}#<NewFeature />#' "$f.template.jsx" > "$f.jsx"
    else
      sed -e 's#/\*B_IMPORT\*/##' -e 's#{/\*B_RENDER\*/}##' "$f.template.jsx" > "$f.jsx"
    fi
  done
  if [ "$variant" = b ]; then
    sed -e "s#/\*B_SHARED_IMPORT\*/#import { formatLabel } from './shared';#" \
        -e "s#{/\*B_SHARED_RENDER\*/}#{formatLabel('nav')}#" app/layout-widget.template.jsx > app/layout-widget.jsx
  else
    sed -e 's#/\*B_SHARED_IMPORT\*/##' -e 's#{/\*B_SHARED_RENDER\*/}#nav#' app/layout-widget.template.jsx > app/layout-widget.jsx
  fi
  cp app/layout.template.jsx app/layout.jsx
  # Deployment "b" also changes something in the bootstrap chunks every page loads up front
  # (here: instrumentation-client; in practice often a dependency bump of React, Next, Sentry...).
  if [ "$variant" = b ] && [ "${BOOTSTRAP_CHANGE:-0}" = 1 ]; then
    printf "import { formatLabel } from './app/shared';\nconsole.info(formatLabel('instrumentation-client'));\n" > instrumentation-client.js
  else
    rm -f instrumentation-client.js
  fi
}

for variant in a b; do
  render "$variant"
  DEPLOYMENT_ID=$variant DIST_DIR=".next-$variant" npx next build
done

# Same "b", plus the workaround: send x-nextjs-deployment-id on every response via headers().
DEPLOYMENT_ID=b DIST_DIR=".next-b-workaround" WORKAROUND_HEADER=1 npx next build
