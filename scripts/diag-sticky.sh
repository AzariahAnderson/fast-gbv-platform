#!/usr/bin/env bash
# Diagnose the sticky top bar: start dev server, then exercise scroll
# behaviour at desktop + mobile widths and capture screenshots.
set -u
cd /home/z/my-project

# 1. Clean port 3000 of any stale server
pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null; sleep 1

# 2. Start the dev server detached so it survives this call
setsid bun x next dev -p 3000 > /tmp/dev-diag.log 2>&1 &

# 3. Wait until it answers
for i in $(seq 1 60); do
  if curl -sf -o /dev/null http://localhost:3000/; then break; fi
  sleep 1
done
echo "server status: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/)"

# 4. Browser diagnostics
B="agent-browser"
mkdir -p /tmp/render
$B close 2>/dev/null
$B set viewport 1440 900
$B open http://localhost:3000/ >/dev/null
$B wait --load networkidle >/dev/null 2>&1
# Let the splash finish (4s) + entrance animations
sleep 5.5
$B screenshot /tmp/render/diag-01-top.png >/dev/null
echo "--- top screenshot done"

# Scroll down in steps, snapshot the bar at each stop
$B scroll down 900 >/dev/null; sleep 1.2
$B screenshot /tmp/render/diag-02-scrolled-hero.png >/dev/null
$B scroll down 1200 >/dev/null; sleep 1.2
$B screenshot /tmp/render/diag-03-scrolled-mid.png >/dev/null
$B scroll down 1500 >/dev/null; sleep 1.2
$B screenshot /tmp/render/diag-04-scrolled-deep.png >/dev/null

# Scroll back up: the bar must reappear
$B scroll up 2000 >/dev/null; sleep 1.2
$B screenshot /tmp/render/diag-05-scrolled-up.png >/dev/null

# Jump link behaviour: click a nav link and see whether the heading hides
# underneath the fixed bar
$B eval "document.querySelector('a[href=\\\"#faq\\\"]').click()" >/dev/null 2>&1
sleep 1.6
$B screenshot /tmp/render/diag-06-anchor-faq.png >/dev/null

# Console + page errors
echo "--- CONSOLE ---"
$B console 2>/dev/null | tail -30
echo "--- ERRORS ---"
$B errors 2>/dev/null | tail -20

echo "--- overflow check ---"
$B eval "document.documentElement.scrollWidth - document.documentElement.clientWidth"

$B close 2>/dev/null
echo "done"
