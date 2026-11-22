#!/usr/bin/env bash
# Verify beta.8: welcome flow (language -> name -> struggles), hero greeting,
# more hero emojis (inner ring at xl), persistence, skip path, personalise
# reopen, mobile layout, sticky bar, console clean.
# All evals are IIFE-wrapped: agent-browser evals share one page global
# scope, so bare const declarations collide across calls.
set -u
cd /home/z/my-project

pkill -f "next dev" 2>/dev/null; pkill -f "next-server" 2>/dev/null; sleep 1
rm -rf .next
setsid bun x next dev -p 3000 > /tmp/dev-beta8.log 2>&1 &
for i in $(seq 1 60); do
  if curl -sf -o /dev/null http://localhost:3000/; then break; fi
  sleep 1
done
echo "server: $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/)"
echo "--- sw.js cache version ---"
curl -s http://localhost:3000/sw.js | rg 'const VERSION'

B="agent-browser"
mkdir -p /tmp/render
PASS=0; FAIL=0
ok(){ echo "PASS: $1"; PASS=$((PASS+1)); }
bad(){ echo "FAIL: $1"; FAIL=$((FAIL+1)); }
expect(){ if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (got: $2, want: $3)"; fi; }

echo "=== 1. DESKTOP FRESH VISIT: splash -> welcome ==="
$B close 2>/dev/null
$B set viewport 1440 900
$B open http://localhost:3000/ >/dev/null
$B eval 'localStorage.clear(); sessionStorage.clear()' >/dev/null
$B reload >/dev/null
sleep 2.4
$B screenshot /tmp/render/b8-01-splash.png >/dev/null
sleep 3.2   # ~5.6s total: splash lifted, welcome faded in
expect "welcome dialog open on first visit" "$($B eval 'document.querySelector("[role=dialog]") ? 1 : 0')" "1"
$B screenshot /tmp/render/b8-02-welcome-language.png >/dev/null

echo "=== 2. STEP 1: language ==="
$B eval '(() => { const b=[...document.querySelectorAll("[role=dialog] button")].find(x=>x.textContent.includes("isiZulu")); if(b) b.click(); return b ? 1 : 0; })()' >/dev/null
sleep 0.3
expect "isiZulu selected (Sawubona)" "$($B eval '(() => { const b=[...document.querySelectorAll("[role=dialog] button")].find(x=>x.textContent.includes("isiZulu")); return b && b.getAttribute("aria-pressed")==="true" ? 1 : 0; })()')" "1"
$B eval '(() => { const b=[...document.querySelectorAll("[role=dialog] button")].find(x=>x.textContent.trim().startsWith("Continue")); if(b) b.click(); return "ok"; })()' >/dev/null
sleep 0.6

echo "=== 3. STEP 2: name — compulsory + appropriateness ==="
expect "name step has 3 inputs" "$($B eval 'document.querySelectorAll("[role=dialog] input").length')" "3"
$B eval "(() => { const set=(el,v)=>{const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');d.set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))}; set(document.querySelectorAll('[role=dialog] input')[0], 'b!tch'); return 'set'; })()" >/dev/null
sleep 0.3
expect "profane name flagged" "$($B eval 'document.querySelector("[role=dialog] [role=alert]") ? 1 : 0')" "1"
expect "Continue disabled on profane name" "$($B eval '(() => { const b=[...document.querySelectorAll("[role=dialog] button")].find(x=>x.textContent.trim().startsWith("Continue")); return b && b.disabled ? 1 : 0; })()')" "1"
$B screenshot /tmp/render/b8-03-name-guard.png >/dev/null
$B eval "(() => { const set=(el,v)=>{const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');d.set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))}; const i=document.querySelectorAll('[role=dialog] input'); set(i[0],'Thandiwe'); set(i[1],'Mokoena'); set(i[2],'Thandi'); return 'set'; })()" >/dev/null
sleep 0.3
expect "valid names re-enable Continue" "$($B eval '(() => { const b=[...document.querySelectorAll("[role=dialog] button")].find(x=>x.textContent.trim().startsWith("Continue")); return b && !b.disabled ? 1 : 0; })()')" "1"
$B eval '(() => { const b=[...document.querySelectorAll("[role=dialog] button")].find(x=>x.textContent.trim().startsWith("Continue")); if(b) b.click(); return "ok"; })()' >/dev/null
sleep 0.6

echo "=== 4. STEP 3: struggles ==="
expect "11 struggle options" "$($B eval 'document.querySelectorAll("[role=dialog] [role=checkbox]").length')" "11"
$B eval '(() => { const c=[...document.querySelectorAll("[role=dialog] [role=checkbox]")]; const a=c.find(x=>x.textContent.includes("hurting me")); const b=c.find(x=>x.textContent.includes("not ready")); if(a) a.click(); if(b) b.click(); return "ok"; })()' >/dev/null
sleep 0.3
expect "two struggles checked" "$($B eval 'document.querySelectorAll("[role=dialog] [role=checkbox][aria-checked=true]").length')" "2"
$B screenshot /tmp/render/b8-04-struggles.png >/dev/null
$B eval '(() => { const b=[...document.querySelectorAll("[role=dialog] button")].find(x=>x.textContent.includes("Enter Fast")); if(b) b.click(); return "ok"; })()' >/dev/null
sleep 1.0

echo "=== 5. HERO: greeting + emoji frame ==="
expect "welcome closed after Enter Fast" "$($B eval 'document.querySelector("[role=dialog]") ? 0 : 1')" "1"
GREET=$($B eval '[...document.querySelectorAll("#top p")].map(p=>p.textContent).find(t=>t.includes("Sawubona")) || "none"')
case "$GREET" in *"Sawubona, Thandi"*) ok "hero greets 'Sawubona, Thandi'";; *) bad "hero greeting text (got: $GREET)";; esac
expect "profile saved on device" "$($B eval '(() => { const p=JSON.parse(localStorage.getItem("fast-profile")||"null"); return p ? p.lang+"/"+p.name+"/"+p.struggles.length : "none"; })()')" '"zul/Thandiwe/2"'
expect "nickname stored" "$($B eval '(() => { const p=JSON.parse(localStorage.getItem("fast-profile")); return p.nickname; })()')" '"Thandi"'
expect "visible hero emojis at 1440 (8 floats + sparkle + blossom)" "$($B eval '[...document.querySelectorAll("#top img[src*=\"/emojis/\"]")].filter(i=>i.offsetParent!==null).length')" "10"
expect "floats carry bob animation" "$($B eval '(() => { const i=[...document.querySelectorAll("#top img")].filter(x=>x.offsetParent!==null && x.src.includes("1f496")); return i.length ? getComputedStyle(i[0]).animationName : "none"; })()')" '"bob"'
$B screenshot /tmp/render/b8-05-hero-greeting.png >/dev/null

echo "=== 6. PERSISTENCE: reload keeps greeting, no welcome ==="
$B reload >/dev/null
sleep 2.5
expect "welcome does not reopen with profile" "$($B eval 'document.querySelector("[role=dialog]") ? 1 : 0')" "0"
case "$($B eval 'document.body.textContent.includes("Sawubona, Thandi") ? 1 : 0')" in
  1) ok "greeting survives reload";; *) bad "greeting survives reload";;
esac

echo "=== 7. SKIP PATH ==="
$B eval 'localStorage.clear(); sessionStorage.clear()' >/dev/null
$B reload >/dev/null
sleep 5.8
expect "welcome opens after skip-flag cleared" "$($B eval 'document.querySelector("[role=dialog]") ? 1 : 0')" "1"
$B eval '(() => { const b=[...document.querySelectorAll("[role=dialog] button")].find(x=>x.textContent.includes("Skip for now")); if(b) b.click(); return "ok"; })()' >/dev/null
sleep 0.8
expect "skip closes welcome" "$($B eval 'document.querySelector("[role=dialog]") ? 0 : 1')" "1"
expect "skip flag stored" "$($B eval 'localStorage.getItem("fast-welcome-skip") === "1" ? 1 : 0')" "1"
expect "no greeting after skip" "$($B eval 'document.body.textContent.includes("Sawubona") ? 1 : 0')" "0"
$B screenshot /tmp/render/b8-06-hero-default.png >/dev/null
$B reload >/dev/null
sleep 5.5
expect "welcome stays closed after skip on reload" "$($B eval 'document.querySelector("[role=dialog]") ? 1 : 0')" "0"

echo "=== 8. PERSONALISE reopens ==="
$B eval '(() => { const b=[...document.querySelectorAll("footer button")].find(x=>x.textContent.includes("Personalise")); if(b) b.click(); return "ok"; })()' >/dev/null
sleep 0.8
expect "personalise reopens welcome" "$($B eval 'document.querySelector("[role=dialog]") ? 1 : 0')" "1"
$B press Escape
sleep 1.2
expect "Escape closes welcome" "$($B eval 'document.querySelector("[role=dialog]") ? 0 : 1')" "1"

echo "=== 9. STICKY BAR + OVERFLOW (desktop) ==="
$B eval 'window.scrollTo(0,900); "scrolled"' >/dev/null
sleep 0.4
expect "header pinned at top after scroll" "$($B eval 'Math.round(document.querySelector("header").getBoundingClientRect().top)')" "0"

echo "=== 10. MOBILE 390x844 ==="
$B set viewport 390 844
$B eval 'localStorage.clear(); sessionStorage.clear()' >/dev/null
$B reload >/dev/null
sleep 5.8
expect "welcome opens on mobile" "$($B eval 'document.querySelector("[role=dialog]") ? 1 : 0')" "1"
$B screenshot /tmp/render/b8-07-mobile-welcome.png >/dev/null
$B press Escape
sleep 0.8
expect "mobile: only sparkle visible in hero (no gutters)" "$($B eval '[...document.querySelectorAll("#top img[src*=\"/emojis/\"]")].filter(i=>i.offsetParent!==null).length')" "1"
expect "no horizontal overflow on mobile" "$($B eval 'document.documentElement.scrollWidth <= window.innerWidth ? 1 : 0')" "1"
# full mobile flow via Personalise: Molo, Sipho
$B eval 'window.scrollTo(0, document.body.scrollHeight); "bottom"' >/dev/null
sleep 0.5
$B eval '(() => { const b=[...document.querySelectorAll("footer button")].find(x=>x.textContent.includes("Personalise")); if(b) b.click(); return "ok"; })()' >/dev/null
sleep 0.8
$B eval '(() => { const b=[...document.querySelectorAll("[role=dialog] button")].find(x=>x.textContent.includes("isiXhosa")); if(b) b.click(); return b ? 1 : 0; })()' >/dev/null
sleep 0.3
$B eval '(() => { const b=[...document.querySelectorAll("[role=dialog] button")].find(x=>x.textContent.trim().startsWith("Continue")); if(b) b.click(); return "ok"; })()' >/dev/null
sleep 0.6
$B eval "(() => { const set=(el,v)=>{const d=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value');d.set.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}))}; set(document.querySelectorAll('[role=dialog] input')[0], 'Sipho'); return 'set'; })()" >/dev/null
sleep 0.3
$B eval '(() => { const b=[...document.querySelectorAll("[role=dialog] button")].find(x=>x.textContent.trim().startsWith("Continue")); if(b) b.click(); return "ok"; })()' >/dev/null
sleep 0.6
$B eval '(() => { const c=[...document.querySelectorAll("[role=dialog] [role=checkbox]")]; const a=c.find(x=>x.textContent.includes("someone else")); if(a) a.click(); return "ok"; })()' >/dev/null
sleep 0.3
$B eval '(() => { const b=[...document.querySelectorAll("[role=dialog] button")].find(x=>x.textContent.includes("Enter Fast")); if(b) b.click(); return "ok"; })()' >/dev/null
sleep 1.0
case "$($B eval 'document.body.textContent.includes("Molo, Sipho") ? 1 : 0')" in
  1) ok "mobile hero greets 'Molo, Sipho'";; *) bad "mobile greeting";;
esac
expect "mobile: sparkle + greeting blossom only" "$($B eval '[...document.querySelectorAll("#top img[src*=\"/emojis/\"]")].filter(i=>i.offsetParent!==null).length')" "2"
$B screenshot /tmp/render/b8-08-mobile-greeting.png >/dev/null
$B eval 'window.scrollTo(0,0); "top"' >/dev/null

echo "=== 11. CONSOLE + ERRORS ==="
echo "--- page errors ---"
$B errors
echo "--- console (last 8) ---"
$B console | tail -8

echo ""
echo "RESULT: $PASS passed, $FAIL failed"
exit $([ "$FAIL" -eq 0 ] && echo 0 || echo 1)
