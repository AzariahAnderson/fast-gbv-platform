#!/usr/bin/env bash
# Production verification: boot the standalone build, then run MIME checks,
# route battery, link audit and the service-worker scenario probe.
# All output lands in a log file; the caller tails it.
set -u
LOG=/tmp/verify.log
: > "$LOG"

export NEXT_PUBLIC_SUPABASE_URL="https://dummy-project.supabase.co"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="dummy-key"
export GEMINI_API_KEY="dummy-gemini"
export CRON_SECRET="x"
export NODE_ENV=production
export PORT=3100
export HOSTNAME=127.0.0.1

# Kill any previous standalone server by exact pid lookup, no patterns.
OLD=$(ss -tlnp 2>/dev/null | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2)
if [ -n "${OLD:-}" ]; then kill -9 "$OLD" 2>/dev/null; fi
sleep 1

nohup node .next/standalone/server.js > /tmp/fast-server.log 2>&1 < /dev/null &
sleep 4

echo "=== MIME ===" >> "$LOG"
CHUNK=$(curl -s --max-time 10 http://127.0.0.1:3100/ | grep -o '/_next/static/chunks/[^"]*\.js' | head -1)
CSS=$(curl -s --max-time 10 http://127.0.0.1:3100/ | grep -o '/_next/static/css/[^"]*\.css' | head -1)
echo "chunk: $CHUNK" >> "$LOG"
echo "css:   $CSS" >> "$LOG"
for u in "$CHUNK" "$CSS" "/sw.js" "/manifest.webmanifest" "/offline.html" "/"; do
  curl -s --max-time 15 -o /dev/null -w "%{http_code} %{content_type}  $u\n" "http://127.0.0.1:3100$u" >> "$LOG" 2>&1
done
curl -s --max-time 15 -o /dev/null -w "%{http_code} %{content_type}  /_next/static/chunks/nope.js (direct, no SW)\n" http://127.0.0.1:3100/_next/static/chunks/nope.js >> "$LOG" 2>&1

echo "=== ROUTE BATTERY ===" >> "$LOG"
BASE_URL=http://127.0.0.1:3100 CRON_SECRET=x timeout 280 node scripts/route-battery.mjs >> "$LOG" 2>&1
echo "battery exit: $?" >> "$LOG"

echo "=== LINK AUDIT ===" >> "$LOG"
BASE_URL=http://127.0.0.1:3100 timeout 240 node scripts/link-audit.mjs >> "$LOG" 2>&1
echo "link audit exit: $?" >> "$LOG"

echo "=== SW SCENARIOS ===" >> "$LOG"
BASE_URL=http://127.0.0.1:3100 timeout 280 node scripts/security/sw-scenarios.mjs >> "$LOG" 2>&1
echo "sw scenarios exit: $?" >> "$LOG"

# Stop the server by port lookup again.
NEW=$(ss -tlnp 2>/dev/null | grep -o 'pid=[0-9]*' | head -1 | cut -d= -f2)
if [ -n "${NEW:-}" ]; then kill -9 "$NEW" 2>/dev/null; fi

echo "=== DONE ===" >> "$LOG"
