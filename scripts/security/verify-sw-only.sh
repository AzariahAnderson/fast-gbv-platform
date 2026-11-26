#!/usr/bin/env bash
# Re-run only the service-worker scenario probe against a fresh server.
set -u
LOG=/tmp/sw-run.log
: > "$LOG"

export NEXT_PUBLIC_SUPABASE_URL="https://dummy-project.supabase.co"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="dummy-key"
export GEMINI_API_KEY="dummy-gemini"
export CRON_SECRET="x"
export NODE_ENV=production
export PORT=3100
export HOSTNAME=127.0.0.1

ss -tlnp > /tmp/ss-before.txt 2>&1
PIDS=$(grep -o 'pid=[0-9]*' /tmp/ss-before.txt | cut -d= -f2 | sort -u)
for p in $PIDS; do kill -9 "$p" 2>/dev/null; done
sleep 1

nohup node .next/standalone/server.js > /tmp/fast-server.log 2>&1 < /dev/null &
sleep 4

BASE_URL=http://127.0.0.1:3100 timeout 240 node scripts/security/sw-scenarios.mjs >> "$LOG" 2>&1
echo "scenarios exit: $?" >> "$LOG"

PIDS2=$(ss -tlnp 2>/dev/null | grep -o 'pid=[0-9]*' | cut -d= -f2 | sort -u)
for p in $PIDS2; do kill -9 "$p" 2>/dev/null; done

echo "=== DONE ===" >> "$LOG"
