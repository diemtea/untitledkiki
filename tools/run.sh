#!/bin/sh
# Run a playtest script with its own short-lived dev server: tools/run.sh tools/enc.mjs troll 1 0
cd "$(dirname "$0")/.."
npx vite --port 5173 --strictPort > /tmp/vite-test.log 2>&1 &
VPID=$!
for i in $(seq 1 60); do curl -s -o /dev/null http://localhost:5173/ && break; sleep 0.5; done
node "$@"
CODE=$?
kill $VPID 2>/dev/null
wait $VPID 2>/dev/null
exit $CODE
