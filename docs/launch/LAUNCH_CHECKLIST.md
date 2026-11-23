# FAST Launch Checklist

The gate for public launch on **25 November 2026**. Nothing ships in a
half-verified state: every unchecked box is either completed or explicitly
labelled **HUMAN ACTION REQUIRED** with an owner and a date.

---

## TECHNICAL

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| T1 | Production Vercel deployment | ☐ HUMAN ACTION REQUIRED | Import `AzariahAnderson/fast-gbv-platform`; framework preset detects Next.js |
| T2 | Fresh `GEMINI_API_KEY` | ☐ HUMAN ACTION REQUIRED | New key only; the development key stays revoked; server-side env var |
| T3 | `NEXT_PUBLIC_SITE_URL` | ☐ HUMAN ACTION REQUIRED | The real production origin; drives canonical URLs, sitemap, robots, JSON-LD |
| T4 | `CRON_SECRET` | ☐ HUMAN ACTION REQUIRED | Strong random value; Vercel sends it as a Bearer token to the hourly cron |
| T5 | Production build passing | ✅ Verified in v1.0.2 | Re-run after deploy on the production URL |
| T6 | Lighthouse on production | ☐ HUMAN ACTION REQUIRED | Run after deploy; Performance/Accessibility/Best Practices/SEO on mobile |
| T7 | PWA install | ☐ HUMAN ACTION REQUIRED | Install from the production URL on Android and iOS; icon + manifest correct |
| T8 | Offline test | ☐ HUMAN ACTION REQUIRED | Airplane mode → reload → cached page or offline fallback keeps numbers tappable |
| T9 | Emergency test (site level) | ✅ Automated: all dial links derive from `src/lib/numbers.ts` | Real-phone dialing is S1–S4 below |
| T10 | Live-data test | ✅ Fallback chain verified; ☐ HUMAN ACTION REQUIRED: Gemini path with the fresh key in production | Baseline shows if engines fail; no errors ever shown to visitors |
| T11 | CSP / security headers | ✅ Verified on production build | Re-verify headers on the live domain after deploy |
| T12 | Origin guard | ✅ Verified | Cross-origin POST → 403; cron GET requires Bearer when secret set |
| T13 | HTTPS | ☐ HUMAN ACTION REQUIRED | Vercel issues automatically; confirm no mixed content after posters are live |
| T14 | Sitemap | ✅ Generated from `NEXT_PUBLIC_SITE_URL` | Confirm it lists the real domain after deploy |
| T15 | Robots | ✅ Generated from `NEXT_PUBLIC_SITE_URL` | Confirm after deploy |
| T16 | Canonical URL | ✅ Reads env only | Confirm no placeholder domain in production metadata after deploy |

## SAFETY

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| S1 | Dial GBV Command Centre from a real SA phone | ☐ HUMAN ACTION REQUIRED | Mobile + landline if possible |
| S2 | Dial SAPS 10111 from a real SA phone | ☐ HUMAN ACTION REQUIRED | |
| S3 | Dial 112 from a real SA cellphone | ☐ HUMAN ACTION REQUIRED | |
| S4 | Silent channels | ☐ HUMAN ACTION REQUIRED | Send the please-call-me and SMS channels as displayed and confirm behaviour |
| S5 | Emergency links verified | ✅ Directory integrity tests enforce single source | No number exists outside `src/lib/numbers.ts` |
| S6 | Offline emergency access | ✅ Automated offline test passes | Re-run on a real phone in airplane mode (T8) |
| S7 | Language does not imply guaranteed intervention | ✅ Reviewed | Copy promises "free, confidential, answered 24/7" — never outcomes |
| S8 | No fabricated support claims | ✅ Reviewed in v1.0.2 | No testimonials, no statistics without sources, no endorsements |

## MARKETING

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| M1 | Website launch message | ✅ Reviewed in v1.0.2 | Hero communicates what/who/why + immediate action |
| M2 | QR posters (5 concepts) | ✅ Copy ready in [QR_CAMPAIGN.md](QR_CAMPAIGN.md) | ☐ HUMAN ACTION REQUIRED: generate codes from the production URL; print |
| M3 | School email + proposal + assembly script | ✅ Ready in [SCHOOL_OUTREACH.md](SCHOOL_OUTREACH.md) | ☐ Send to a first list of 10 schools |
| M4 | NGO email + proposal + one-pager + FAQ | ✅ Ready in [NGO_OUTREACH.md](NGO_OUTREACH.md) | ☐ Send to a first list of 10 organisations |
| M5 | Media release + pitch + talking points | ✅ Ready in [MEDIA_PITCH.md](MEDIA_PITCH.md) | ☐ HUMAN ACTION REQUIRED: founder approves the draft quote; send |
| M6 | WhatsApp messages (12) | ✅ Ready in [WHATSAPP_CAMPAIGN.md](WHATSAPP_CAMPAIGN.md) | ☐ Send day 1 message to personal networks on 25 Nov |
| M7 | Social launch posts | ✅ 60 concepts in [SOCIAL_CONTENT.md](SOCIAL_CONTENT.md) | ☐ Create accounts with consistent @handle |
| M8 | 16-day campaign | ✅ Planned in [CONTENT_CALENDAR.md](CONTENT_CALENDAR.md) | ☐ Schedule the first week before 25 Nov |
| M9 | Ambassador kit | ✅ Ready in [AMBASSADOR_PROGRAM.md](AMBASSADOR_PROGRAM.md) | ☐ Recruit the first 5 ambassadors from trusted networks |

## PARTNERSHIPS

| # | Item | Status | Notes |
| --- | --- | --- | --- |
| P1 | Schools | ☐ First 10 approached | Package: [SCHOOL_OUTREACH.md](SCHOOL_OUTREACH.md) |
| P2 | NGOs | ☐ First 10 approached | Package: [NGO_OUTREACH.md](NGO_OUTREACH.md) |
| P3 | Youth groups | ☐ | Use the NGO package; lead with the youth WhatsApp message |
| P4 | Community organisations | ☐ | Use the NGO package one-pager |
| P5 | Universities | ☐ | Use the NGO package + QR posters for residences |
| P6 | Clinics | ☐ | Use the NGO package; waiting-room poster concept #2 |
| P7 | Faith organisations | ☐ | Use the NGO package; assembly script adapts to youth meetings |
| P8 | Local media | ☐ | Package: [MEDIA_PITCH.md](MEDIA_PITCH.md) |

**Rule for all partnership rows:** no organisation is ever listed as a
partner, supporter or endorser anywhere until it has confirmed in writing.
The site itself carries no partner logos at all — that is deliberate.
