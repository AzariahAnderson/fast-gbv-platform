# Runtime verification — v1.1.0 connected product

Every claim below was executed against the real Supabase project (ref
`cztdyqhatvogiaegniow`, region eu-west-1) on 23 November 2026, from this
repository, by the scripts in `scripts/runtime/`. Machine-readable evidence
lives in `docs/launch/runtime-verification/*.json`. Nothing here is
aspirational: anything that could not be tested from this environment is
listed under "Not testable from the sandbox".

## What was verified

| Area | Result | Evidence |
| --- | --- | --- |
| Migrations | 0001+0002 applied to the remote database; 24/24 tables, 67 RLS policies, 42 indexes, 6 triggers, 14 functions, 3 storage buckets present; RLS enabled on every private table | `schema-verification.json` |
| Realtime publication | `supabase_realtime` was EMPTY on the fresh project; `messages`, `typing_presence`, `message_reads`, `locations`, `location_shares`, `checkins` added by script (`scripts/db/enable-realtime.mjs`) | `realtime-publication.json` |
| Auth | Signup, login, server-verified session, logout + refresh-token revocation, unauthenticated data reads return zero rows — 15/15 checks | `auth-test.json` |
| Messaging | Full 16-step E2E: phone search (exact-match), direct conversation RPC, live postgres_changes delivery both directions (356–742 ms), typing, read receipts, edit, soft delete, mute honours trigger, archive, block (incl. RPC + membership bypass attempts), insert-only reports — 25/25 | `messaging-test.json` |
| Family | Create, invite, accept by code, roles, family chat realtime (471–679 ms), pinned messages (admin-only enforced), 4 check-in states, need-help reaches muted members, owner removes, member leaves, expired + revoked invites rejected, non-member isolation — 30/30 | `family-test.json` |
| Location | OFF default, approximate blur row, precise coordinates, explicit audience (grant/revoke), expiry gates (row + share), pause, delete, no history, live map events, RLS-gated realtime (non-viewer gets no event) — 20/20 | `location-test.json` |
| Safety plans | Create/edit/delete, private by default, explicit share, revoke, cross-user reads blocked, share creation by non-owner blocked | `safety-test.json` |
| Safe arrival | Timer with no contacts notifies nobody; trusted contacts notified exactly as configured; arrival closes; expiry stays local; no escalation row or notification exists; cross-user writes blocked — 14/14 | `safety-test.json` |
| Notifications | Trigger-only writes (client insert into anyone's centre blocked, including self), unread counts, ownership-guarded read state, need-help + safety-alert kinds not muteable in the app — 11/11 | `notifications-test.json` |
| Storage | Avatar upload/view/replace/delete, own-folder enforcement, public read by design; chat images member-gated + unauthenticated blocked; family images member-gated, admin-upload, denied after leaving; path traversal and non-UUID folders rejected — 17/17 | `storage-test.json` |
| AI (route) | Live route reaches Gemini; upstream failure handled gracefully ("call 0800 428 428"), no key or provider error leaked; no persistence code in the route; explicit save/delete cascade verified; UI labels the Guide as AI | `ai-privacy-test.json` |
| UI (Playwright) | 48 passed / 0 failed against the production build: auth gate on 7 routes, signup→onboarding→session→logout, two-user realtime chat (no refresh), optimistic send + honest offline failure + retry, map at 1440/768/390 with attribution and FAST palette, share lifecycle via UI, safe arrival, AI surface | Playwright output |
| Unit / static | 62/62 unit, typecheck clean, lint clean, production build succeeds | CI commands |

## Genuine bugs found by runtime testing — all fixed

1. **Block precedence hole (migration 0003).** The messages-send and
   join-direct policies checked `blocks` as the invoking user; a blocked
   user could not see the blocker's row, so the check never fired and they
   could keep sending into an existing conversation. Fixed with a
   security-definer `blocked_between()` helper; re-verified live.
2. **`join_family_by_code` RPC crash (migration 0004).** `column reference
   "code" is ambiguous` — the plpgsql parameter collided with
   `family_invites.code`. Parameter name kept (the app passes `{ code }`);
   reference qualified with the function name.
3. **Family removal kept chat access (migrations 0005 + 0007).** Deleting a
   `family_members` row left the conversation membership behind, so a
   removed member could still read the family chat, and (0007) kept their
   location-share viewer grants. A security-definer trigger now cleans up
   both on removal or leave.
4. **RLS policy recursion (migration 0006).** `location_shares` ↔
   `location_share_viewers` and `safety_plans` ↔ `safety_plan_shares`
   policies queried each other — any viewer read or INSERT RETURNING died
   with `infinite recursion detected in policy`. Fixed with
   security-definer visibility helpers; policy intent unchanged.
5. **CSP blocked the entire product in production.** `connect-src 'self'`
   and `img-src 'self' data:` forbade every browser→Supabase call (auth,
   REST, realtime websocket, storage images). Now limited to exactly
   `*.supabase.co` (+ tile hosts for the map) — nothing wider.
6. **Permissions-Policy denied geolocation everywhere.** `geolocation=()`
   made the consent-based map impossible in production. Changed to
   `geolocation=(self)`.
7. **Middleware hijacked unknown URLs into /login.** Any mistyped path
   redirected to sign-in instead of the 404 page with its emergency CTA.
   The guard now applies only to the explicit app-route list.
8. **Map never initialised on the production build.** The bootstrap effect
   ran while the session check still hid the container, and with `[]`
   dependencies it never re-ran. It now depends on the loading flag; a
   WebGL failure also renders an honest in-map notice instead of silence.
9. **Notifications: "Check-in" was muteable.** A check-in can carry
   "Need help", so the mute control could silence a help request in the
   centre. Check-ins (and safety alerts) are no longer muteable; muting
   now only drops the unread ping and never hides a row.

## Known platform behaviour (documented, not fixable app-side)

- Supabase's edge may serve a private object fetched moments earlier for a
  few seconds after a policy change (observed once during family-image
  tests; fresh objects are always RLS-checked, signed-URL issuance always
  re-checks). The app signs chat-image URLs at request time, which is the
  recommended mode.
- The first realtime event can be missed if a subscription joins and the
  write lands within the same instant; the app's UI subscribes on page
  entry, long before any send.

## Not testable from the sandbox — HUMAN ACTION REQUIRED

- **Gemini API streaming**: Google rejects this sandbox's region
  (`"User location is not supported for the API use"`, HTTP 400, all four
  supplied keys). The route, guardrails, fallback text and privacy model
  were verified; the model's live responses were not. Verify from a
  supported region (e.g. the Vercel deployment) — the same three prompts:
  "What is coercive control?", "How can I help a friend who is being
  abused?", "I'm in danger right now."
- **Real-phone tests**: dial-tones for the emergency numbers, PWA install,
  airplane-mode behaviour, keyboard insets on a physical device, push
  notification layout, safe-arrival 15-minute reminder on a real lock
  screen.
- **Production Lighthouse** on the deployed URL (v1.0.2 baseline: 65/100/100/100).
