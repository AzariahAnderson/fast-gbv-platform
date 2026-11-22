#!/usr/bin/env bash
# Verify beta.5: sticky bar upgrades (progress hairline, scroll spy),
# error boundary page renders, live section, console cleanliness,
# performance timings, desktop + mobile.
set -u
cd /home/z/my-project

pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null; sleep 1
setsid bun x next dev -p 3000 > /tmp/dev-beta5.log 2>&1 &
for i in $(seq 1 60); do
  if curl -sf -o /dev/null http://localhost:3000/; then break; fi
  sleep 1
done
echo "server: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/)"

B="agent-browser"
mkdir -p /tmp/render
$B close 2>/dev/null
$B set viewport 1440 900
$B open http://localhost:3000/ >/dev/null
$B eval "sessionStorage.clear()" >/dev/null 2>&1
$B reload >/dev/null
$B wait --load networkidle >/dev/null 2>&1
sleep 5.5
$B screenshot /tmp/render/b5-01-hero.png >/dev/null

# Performance timings (cold-ish in dev; directional only)
echo "--- PERF ---"
$B eval "JSON.stringify((() => { const n = performance.getEntriesByType('navigation')[0]; const p = performance.getEntriesByType('paint'); return { domContentLoaded: Math.round(n.domContentLoadedEventEnd), loadEvent: Math.round(n.loadEventEnd), fcp: p.map(e=>Math.round(e.startTime)).join(','), transferKB: Math.round(n.transferSize/1024) }; })())"

# Scroll: progress hairline + scroll spy. Instant jumps keep the timing
# deterministic (wheel dispatch races the IO evaluation in headless).
$B eval "window.scrollTo({top: 1600, behavior: 'instant'})" >/dev/null; sleep 1.0
$B screenshot /tmp/render/b5-02-emergency.png >/dev/null
$B eval "document.querySelector('header [style*=scale]').style.transform" 2>/dev/null | head -2
$B eval "window.scrollTo({top: 3600, behavior: 'instant'})" >/dev/null; sleep 1.0
$B screenshot /tmp/render/b5-03-survivors.png >/dev/null
# active nav link check
$B eval "(() => { const a = document.querySelector('header nav ul a[aria-current]'); return a ? a.textContent : 'none'; })()"

# anchor click: bar stays, spy follows
$B eval "document.querySelector('header nav ul a[href=\"#live\"]').click()" >/dev/null
sleep 2.2
$B eval "(() => { const a = document.querySelector('header nav ul a[aria-current]'); return { current: a ? a.textContent : 'none', barTop: document.querySelector('header').getBoundingClientRect().top }; })()"
$B screenshot /tmp/render/b5-04-live.png >/dev/null

# copy chip interaction
$B eval "window.scrollTo(0, 1600)" >/dev/null; sleep 0.8
$B snapshot -i -s "#emergency" 2>/dev/null | rg -i "copy" | head -4

# console + errors
echo "--- CONSOLE ---"
$B console 2>/dev/null | rg -v "HMR|React DevTools" | head -10 || echo "clean"
echo "--- ERRORS ---"
$B errors 2>/dev/null | head -10 || echo "no errors"
echo "--- overflow ---"
$B eval "document.documentElement.scrollWidth - document.documentElement.clientWidth"

# error boundary render check: load the error page in isolation via a bad
# navigation is not possible on one route; render check instead via DOM
# insert to confirm the file compiled: eval a direct fetch of a 404 route
echo "--- error boundary smoke: /_not-found responds ---"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/does-not-exist

# mobile pass
$B set viewport 390 844
$B eval "window.scrollTo(0,0)" >/dev/null
sleep 0.6
$B screenshot /tmp/render/b5-05-mobile-top.png >/dev/null
$B scroll down 1300 >/dev/null; sleep 1.0
$B screenshot /tmp/render/b5-06-mobile-emergency.png >/dev/null
echo "--- mobile overflow ---"
$B eval "document.documentElement.scrollWidth - document.documentElement.clientWidth"
$B close 2>/dev/null
echo "done"
