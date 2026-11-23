#!/bin/bash
# FAST v1.1.5 gate battery — standalone production build, port 3100.
# Kept as tracked tooling: scripts/battery-local-routes.sh
BASE=http://127.0.0.1:3100
PASS=0; FAIL=0
chk() { # chk <expected> <label> <url> [curl-extra...]
  local exp="$1" label="$2" url="$3"; shift 3
  local out code loc
  out=$(curl -s -o /dev/null -w "%{http_code}|%{redirect_url}" "$@" "$BASE$url")
  code="${out%%|*}"; loc="${out#*|}"
  local ok=0
  if [ "$exp" = "200" ] && [ "$code" = "200" ]; then ok=1; fi
  if [ "$exp" = "404" ] && [ "$code" = "404" ]; then ok=1; fi
  if [ "$exp" = "307" ]; then
    if [ "$code" = "307" ] && [[ "$loc" == *"/login?next="* ]]; then ok=1; fi
  fi
  if [ "$ok" = "1" ]; then PASS=$((PASS+1)); printf "PASS  %-42s -> %s %s\n" "$label" "$code" "${loc:0:60}"
  else FAIL=$((FAIL+1)); printf "FAIL  %-42s -> %s %s (expected %s)\n" "$label" "$code" "${loc:0:60}" "$exp"; fi
}

echo "=== PUBLIC ROUTES (expect 200) ==="
for p in / /login /signup /manifest.webmanifest /robots.txt /sitemap.xml /offline.html; do chk 200 "$p" "$p"; done

echo "=== PROTECTED ROUTES unauthenticated (expect 307 -> /login?next=) ==="
for p in /home /messages /family /map /safety /safety/plans /ai /notifications /profile /settings /onboarding; do chk 307 "$p" "$p"; done
chk 307 "GET  /api/ai/chat" /api/ai/chat
chk 307 "POST /api/ai/chat" /api/ai/chat -X POST

echo "=== REMOVED / UNKNOWN (expect 404, never /login redirect) ==="
for p in /verify /api/image /articles /news /about /help /resources /definitely-not-a-route; do chk 404 "$p" "$p"; done

echo "=== SECURITY HEADERS on / ==="
H=$(curl -s -D - -o /dev/null "$BASE/")
for h in "strict-transport-security" "x-frame-options" "x-content-type-options" "referrer-policy" "permissions-policy" "content-security-policy"; do
  v=$(printf '%s' "$H" | grep -i "^$h:" | head -1 | cut -d' ' -f2-)
  if [ -n "$v" ]; then PASS=$((PASS+1)); printf "PASS  header %-28s %s\n" "$h:" "$(printf '%s' "$v" | head -c 80)"
  else FAIL=$((FAIL+1)); printf "FAIL  header %s missing\n" "$h"; fi
done
printf '%s' "$H" | grep -i "^x-frame-options:" | grep -qi "DENY" && { PASS=$((PASS+1)); echo "PASS  X-Frame-Options is DENY"; } || { FAIL=$((FAIL+1)); echo "FAIL  X-Frame-Options not DENY"; }
printf '%s' "$H" | grep -i "^permissions-policy:" | grep -qi "geolocation=(self)" && { PASS=$((PASS+1)); echo "PASS  Permissions-Policy geolocation=(self)"; } || { FAIL=$((FAIL+1)); echo "FAIL  geolocation policy wrong"; }
printf '%s' "$H" | grep -i "^content-security-policy:" | grep -qi "frame-ancestors 'none'" && { PASS=$((PASS+1)); echo "PASS  CSP frame-ancestors 'none'"; } || { FAIL=$((FAIL+1)); echo "FAIL  CSP frame-ancestors missing"; }
printf '%s' "$H" | grep -i "^content-security-policy:" | grep -qi "connect-src[^;]*\.supabase\.co" && { PASS=$((PASS+1)); echo "PASS  CSP connect-src includes *.supabase.co"; } || { FAIL=$((FAIL+1)); echo "FAIL  CSP connect-src missing supabase"; }

echo "=== NEW ASSETS (v1.1.5 emoji frame) ==="
for a in 1f30a 1f981 1f38a 1f31d 1f381 1f49f 1f30d; do
  c=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/emojis/$a-128.webp"); [ "$c" = "200" ] && { PASS=$((PASS+1)); echo "PASS  /emojis/$a-128.webp"; } || { FAIL=$((FAIL+1)); echo "FAIL  /emojis/$a-128.webp -> $c"; }
done
for a in 1f493 1f49d 1f389 1f90d 1f64c; do
  c=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/emojis/$a-128.webp"); [ "$c" = "404" ] && { PASS=$((PASS+1)); echo "PASS  /emojis/$a-128.webp correctly absent"; } || { FAIL=$((FAIL+1)); echo "FAIL  /emojis/$a-128.webp still served ($c)"; }
done

echo "=== CRON AUTH on /api/refresh ==="
c=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/refresh"); [ "$c" = "401" ] && { PASS=$((PASS+1)); echo "PASS  no secret -> 401"; } || { FAIL=$((FAIL+1)); echo "FAIL  no secret -> $c"; }
c=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer wrong-secret-value" "$BASE/api/refresh"); [ "$c" = "401" ] && { PASS=$((PASS+1)); echo "PASS  wrong secret -> 401"; } || { FAIL=$((FAIL+1)); echo "FAIL  wrong secret -> $c"; }
c=$(curl -s -o /dev/null -w "%{http_code}" -H "Authorization: Bearer local-battery-cron-secret" "$BASE/api/refresh"); [ "$c" = "200" ] && { PASS=$((PASS+1)); echo "PASS  correct secret -> 200"; } || { FAIL=$((FAIL+1)); echo "FAIL  correct secret -> $c"; }
c=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Origin: https://evil.example.com" "$BASE/api/refresh"); [ "$c" = "403" ] && { PASS=$((PASS+1)); echo "PASS  POST foreign origin -> 403"; } || { FAIL=$((FAIL+1)); echo "FAIL  POST foreign origin -> $c"; }
c=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Origin: $BASE" "$BASE/api/refresh"); [ "$c" = "200" ] && { PASS=$((PASS+1)); echo "PASS  POST same origin -> 200"; } || { FAIL=$((FAIL+1)); echo "FAIL  POST same origin -> $c"; }

echo "=== FOOTER CREDIT REMOVED ==="
curl -s "$BASE/" | grep -q "Animated emoji artwork by Noto Emoji" && { FAIL=$((FAIL+1)); echo "FAIL  credit line still present on /"; } || { PASS=$((PASS+1)); echo "PASS  credit line absent from /"; }
curl -s "$BASE/" | grep -q "In immediate danger? The emergency numbers are one tap away" && { PASS=$((PASS+1)); echo "PASS  emergency closing link present"; } || { FAIL=$((FAIL+1)); echo "FAIL  emergency closing link missing"; }

echo "=== CLIENT-BUNDLE SECRET SCAN (value-shaped patterns) ==="
PAT='sb_secret_[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|"role":"service_role"|local-battery-cron-secret|postgres(ql)?:[^ ]*:[^ ]*@'
HITS=$(grep -rIlE "$PAT" .next/standalone/.next/static .next/standalone/public public 2>/dev/null | wc -l)
[ "$HITS" = "0" ] && { PASS=$((PASS+1)); echo "PASS  0 value-shaped secret hits in client bundles"; } || { FAIL=$((FAIL+1)); echo "FAIL  $HITS client files match:"; grep -rIlE "$PAT" .next/standalone/.next/static .next/standalone/public public 2>/dev/null; }

echo ""
echo "BATTERY RESULT: PASS=$PASS FAIL=$FAIL"
