#!/usr/bin/env bash
set -u
cd /home/z/my-project
pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null; sleep 1
setsid bun x next dev -p 3000 > /tmp/dev-debug.log 2>&1 &
for i in $(seq 1 60); do
  if curl -sf -o /dev/null http://localhost:3000/; then break; fi
  sleep 1
done

B="agent-browser"
$B close 2>/dev/null
$B set viewport 1440 900
$B open http://localhost:3000/ >/dev/null
sleep 5.5
$B eval "window.scrollTo(0, 1600)" >/dev/null
sleep 1.2
echo "--- rects at scroll 1600 ---"
$B eval "JSON.stringify({scrollY: Math.round(scrollY), emergency: (() => { const r = document.getElementById('emergency').getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) }; })(), bandTop: Math.round(innerHeight * 0.38), bandBottom: Math.round(innerHeight * 0.48), current: document.querySelector('header a[aria-current]')?.textContent ?? 'none'})"
echo "--- active state probe ---"
$B eval "JSON.stringify({hasAriaCurrent: !!document.querySelector('header a[aria-current]'), headerLinks: [...document.querySelectorAll('header nav ul a')].map(a => a.textContent).join(',')})"
$B close 2>/dev/null
echo done
