#!/usr/bin/env bash
# Verify beta.6: no loading bars anywhere, animated emojis framing the
# hero headline, sticky bar still never hides, console clean, no overflow.
set -u
cd /home/z/my-project

pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null; sleep 1
setsid bun x next dev -p 3000 > /tmp/dev-beta6.log 2>&1 &
for i in $(seq 1 60); do
  if curl -sf -o /dev/null http://localhost:3000/; then break; fi
  sleep 1
done
echo "server: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/)"

# --- Headers still intact ---
echo "--- HEADERS / ---"
curl -sI http://localhost:3000/ | rg -i "content-security|x-frame|referrer|cross-origin-opener" | head -6
echo "--- sw.js cache version ---"
curl -s http://localhost:3000/sw.js | rg 'const VERSION'

B="agent-browser"
mkdir -p /tmp/render
$B close 2>/dev/null
$B set viewport 1440 900
$B open http://localhost:3000/ >/dev/null
$B eval "sessionStorage.clear()" >/dev/null 2>&1
$B reload >/dev/null
# splash mid-flight: wordmark up, tagline in, values arriving, NO gold sweep
sleep 2.5
$B screenshot /tmp/render/b6-01-splash.png >/dev/null
# curtain lifted, headline + floats + sparkle landed
sleep 3.2
$B screenshot /tmp/render/b6-02-hero.png >/dev/null
# later in the emoji animation loops: every float must still be visible
sleep 2.7
$B screenshot /tmp/render/b6-02b-hero-later.png >/dev/null

# emoji inventory in the hero: 4 floats + 1 inline sparkle at lg
echo "--- hero emoji count (desktop, expect 5) ---"
$B eval "Array.from(document.querySelectorAll('section img[src*=\\\"/emojis/\\\"]')).map(i => ({src: i.src.split('/').pop(), w: Math.round(i.getBoundingClientRect().width)}))"
# no scaleX progress element in the header, header pinned to top
echo "--- header state ---"
$B eval "({barTop: document.querySelector('header').getBoundingClientRect().top, progressEls: document.querySelectorAll('header [style*=\\\"scalex\\\"], header [style*=\\\"scaleX\\\"]').length, h: document.querySelector('header').getBoundingClientRect().height})"

# sticky bar persistence deep down + anchor jump
$B scroll down 1400 >/dev/null; sleep 1.0
$B screenshot /tmp/render/b6-03-scrolled.png >/dev/null
$B eval "document.querySelector('a[href=\\\"#faq\\\"]').click()" >/dev/null 2>&1
sleep 1.6
$B screenshot /tmp/render/b6-04-anchor.png >/dev/null
$B eval "({barTopAfterAnchor: document.querySelector('header').getBoundingClientRect().top})"

echo "--- CONSOLE ---"
$B console 2>/dev/null | tail -10
echo "--- ERRORS ---"
$B errors 2>/dev/null | tail -8
echo "--- desktop overflow ---"
$B eval "document.documentElement.scrollWidth - document.documentElement.clientWidth"

# mobile pass: floats hidden, inline sparkle visible
$B set viewport 390 844
$B eval "window.scrollTo(0,0)" >/dev/null
$B eval "sessionStorage.clear()" >/dev/null 2>&1
$B reload >/dev/null
sleep 5.6
$B screenshot /tmp/render/b6-05-mobile-hero.png >/dev/null
echo "--- hero emoji count (mobile, expect 1) ---"
$B eval "Array.from(document.querySelectorAll('section img[src*=\\\"/emojis/\\\"]')).map(i => ({src: i.src.split('/').pop(), w: Math.round(i.getBoundingClientRect().width)}))"
echo "--- mobile overflow ---"
$B eval "document.documentElement.scrollWidth - document.documentElement.clientWidth"
$B close 2>/dev/null
echo "done"
