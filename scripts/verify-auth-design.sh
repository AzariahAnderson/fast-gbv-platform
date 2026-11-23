#!/usr/bin/env bash
# Visual + functional verification of the split-screen auth redesign and
# the upgraded hero. Starts the dev server, drives agent-browser through
# every auth surface (desktop + mobile) and the homepage hero, captures
# screenshots and a text report, then stops the server. One invocation:
# background processes do not survive between tool calls in this sandbox.
set -u
cd /home/z/my-project

SHOTS=/tmp/shots
mkdir -p "$SHOTS"
REPORT="$SHOTS/report.txt"
: > "$REPORT"

log() { echo "$@" | tee -a "$REPORT"; }

# ---------------------------------------------------------------- server
setsid nohup bun run dev < /dev/null > /dev/null 2>&1 &
DEV_PID=$!
log "dev launcher pid: $DEV_PID"

for i in $(seq 1 60); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/login || true)
  [ "$code" = "200" ] && break
  sleep 1
done
log "server ready after ${i}s (login http $code)"

ab() { agent-browser "$@"; }

# ------------------------------------------------- desktop: login (1440x900)
ab set viewport 1440 900
ab cookies clear > /dev/null 2>&1
ab storage local clear > /dev/null 2>&1
ab open http://localhost:3000/login
ab wait --load networkidle
ab wait 1800
ab screenshot "$SHOTS/login-desktop.png"
log "login desktop title: $(ab get title)"
ab errors >> "$REPORT" 2>&1

# ------------------------------------------------- desktop: signup
ab open http://localhost:3000/signup
ab wait --load networkidle
ab wait 1500
ab screenshot "$SHOTS/signup-desktop.png"

# ------------------------------------------------- desktop: verify (with email param)
ab open "http://localhost:3000/verify?email=test-user-a@fast.test"
ab wait --load networkidle
ab wait 1500
ab screenshot "$SHOTS/verify-desktop.png"

# --------------------------------------------- desktop: signup -> onboarding
UI_EMAIL="test-user-ui-$(date +%s)@fast.test"
UI_PASS="Fast-ui-$(date +%s)-abc123"
ab open http://localhost:3000/signup
ab wait --load networkidle
ab find role tab click --name "Password"
ab eval "
  const setVal = (el, v) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
  };
  setVal(document.querySelector('input[type=email]'), '$UI_EMAIL');
  setVal(document.querySelector('input[type=password]'), '$UI_PASS');
  'filled';
"
ab find role button click --name "Continue"
ab wait --url "/onboarding" 20000 || log "WARN: did not reach /onboarding"
ab wait --text "How should Fast" 15000 || log "WARN: onboarding form not visible"
sleep 1
ab screenshot "$SHOTS/onboarding-desktop.png"
log "after signup url: $(ab get url)"
log "onboarding has 'Make Fast yours' panel text: $(ab eval "document.body.innerText.includes('Make Fast')")"

# onboarding -> home
ab eval "
  const nameInput = document.querySelector('input[maxlength=\"40\"]');
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(nameInput, 'Test User UI');
  nameInput.dispatchEvent(new Event('input', { bubbles: true }));
  'named';
"
ab find role button click --name "Enter Fast"
ab wait --url "/home" 20000 || log "WARN: did not reach /home"
sleep 1.5
log "after onboarding url: $(ab get url)"
ab screenshot "$SHOTS/home-desktop.png"

# --------------------------------------------------------- desktop: hero
ab storage local set fast-welcome-skip 1
ab open http://localhost:3000/
ab wait 6500
ab screenshot "$SHOTS/hero-desktop.png"
log "hero emoji imgs: $(ab eval 'document.querySelectorAll(String.fromCharCode(105,109,103)).length')"
log "hero visible emojis: $(ab eval 'Array.from(document.images).filter(i => i.src.includes("emojis")).length')"
log "hero overflow-x: $(ab eval 'document.documentElement.scrollWidth - document.documentElement.clientWidth')"
ab errors >> "$REPORT" 2>&1

# ------------------------------------------------------------- mobile pass
# Fresh session so /login no longer redirects the signed-in user home.
ab set viewport 390 844
ab cookies clear > /dev/null 2>&1
ab storage local clear > /dev/null 2>&1
ab open http://localhost:3000/login
ab wait --load networkidle
ab wait 1500
ab screenshot "$SHOTS/login-mobile.png"
log "login mobile url: $(ab get url)"
log "login mobile overflow-x: $(ab eval 'document.documentElement.scrollWidth - document.documentElement.clientWidth')"

ab open http://localhost:3000/signup
ab wait --load networkidle
ab wait 1200
ab screenshot "$SHOTS/signup-mobile.png"

ab storage local set fast-welcome-skip 1
ab open http://localhost:3000/
ab wait 6500
ab screenshot "$SHOTS/hero-mobile.png"
log "hero mobile overflow-x: $(ab eval 'document.documentElement.scrollWidth - document.documentElement.clientWidth')"
ab errors >> "$REPORT" 2>&1

log "---- dev.log tail ----"
tail -25 dev.log >> "$REPORT"

# ------------------------------------------------------------- stop server
kill "$DEV_PID" 2>/dev/null
pkill -f 'next dev' 2>/dev/null
pkill -f 'next-server' 2>/dev/null
sleep 1
log "done"
