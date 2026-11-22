#!/usr/bin/env bash
# Verify beta.4: splash design, sticky bar persistence, CSP headers,
# console cleanliness, mobile layout.
set -u
cd /home/z/my-project

pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null; sleep 1
setsid bun x next dev -p 3000 > /tmp/dev-beta4.log 2>&1 &
for i in $(seq 1 60); do
  if curl -sf -o /dev/null http://localhost:3000/; then break; fi
  sleep 1
done
echo "server: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/)"

# --- Security headers ---
echo "--- HEADERS / ---"
curl -sI http://localhost:3000/ | rg -i "content-security|x-frame|x-xss|referrer|cross-origin|permissions|strict-transport" 
echo "--- HEADERS /sw.js ---"
curl -sI http://localhost:3000/sw.js | rg -i "cache-control|service-worker-allowed|content-security"
echo "--- refresh POST cross-origin (should 403) ---"
curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/refresh -H "Origin: https://evil.example" -H "Host: localhost:3000"

B="agent-browser"
mkdir -p /tmp/render
$B close 2>/dev/null
$B set viewport 1440 900
$B open http://localhost:3000/ >/dev/null
# capture splash mid-animation (2.5s in) — fresh session storage per open? clear first
$B storage local clear >/dev/null 2>&1
$B eval "sessionStorage.clear()" >/dev/null 2>&1
$B reload >/dev/null
sleep 2.4
$B screenshot /tmp/render/b4-01-splash.png >/dev/null
sleep 2.6
$B screenshot /tmp/render/b4-02-hero.png >/dev/null

# sticky bar persistence: scroll deep down, bar must stay
$B scroll down 1400 >/dev/null; sleep 1.0
$B screenshot /tmp/render/b4-03-scrolled.png >/dev/null
$B scroll down 1800 >/dev/null; sleep 1.0
$B screenshot /tmp/render/b4-04-deep.png >/dev/null
$B eval "({bar: !!document.querySelector('header'), top: document.querySelector('header').getBoundingClientRect().top})"

# anchor navigation: click FAQ link, bar must remain visible
$B eval "document.querySelector('a[href=\\\"#faq\\\"]').click()" >/dev/null 2>&1
sleep 1.6
$B screenshot /tmp/render/b4-05-anchor.png >/dev/null
$B eval "({barTop: document.querySelector('header').getBoundingClientRect().top})"

# console + errors
echo "--- CONSOLE ---"
$B console 2>/dev/null | tail -12
echo "--- ERRORS ---"
$B errors 2>/dev/null | tail -10
echo "--- overflow ---"
$B eval "document.documentElement.scrollWidth - document.documentElement.clientWidth"

# mobile pass
$B set viewport 390 844
$B eval "window.scrollTo(0,0)" >/dev/null
$B reload >/dev/null
sleep 5.5
$B screenshot /tmp/render/b4-06-mobile-hero.png >/dev/null
$B scroll down 1000 >/dev/null; sleep 0.8
$B screenshot /tmp/render/b4-07-mobile-scrolled.png >/dev/null
echo "--- mobile overflow ---"
$B eval "document.documentElement.scrollWidth - document.documentElement.clientWidth"
$B close 2>/dev/null
echo "done"
