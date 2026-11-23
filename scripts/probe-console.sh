#!/usr/bin/env bash
# Probe: capture browser console messages + page errors on /login.
set -u
cd /home/z/my-project

setsid nohup bun run dev < /dev/null > /dev/null 2>&1 &
DEV_PID=$!
for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login || true)
  [ "$code" = "200" ] && break
  sleep 1
done
echo "server ready ($i s)"

agent-browser set viewport 1440 900
agent-browser cookies clear > /dev/null 2>&1
agent-browser storage local clear > /dev/null 2>&1
agent-browser open http://localhost:3000/login
agent-browser wait --load networkidle
agent-browser wait 2500
echo "--- console ---"
agent-browser console
echo "--- errors ---"
agent-browser errors

kill "$DEV_PID" 2>/dev/null
pkill -f 'next dev' 2>/dev/null
pkill -f 'next-server' 2>/dev/null
echo probe-done
