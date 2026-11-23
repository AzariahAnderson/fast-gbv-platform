# FAST Launch Hub

Everything needed to put **Fast — Family Assistance & Safety Technology** in
front of South Africans during the **16 Days of Activism Against Gender-Based
Violence and Femicide (25 November – 10 December 2026)** — and to keep it
useful every day after the campaign ends.

Fast's voice everywhere in this folder: **calm, human, trustworthy,
empowering, South African, practical.** Never fear-based. Never clickbait.
Never a claim we cannot stand behind.

## The one-line position

Fast is a **free digital resource people can give to someone who needs
prevention information, safety planning and verified support resources** —
even on a weak network, even offline, even anonymously.

## What is in this folder

| File | What it is | Use it when |
| --- | --- | --- |
| [LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md) | Technical, safety, marketing and partnership gates for launch day | Before 25 November, one final pass |
| [CONTENT_CALENDAR.md](CONTENT_CALENDAR.md) | **FAST — 16 Days / 16 Actions**, the complete day-by-day campaign | From 25 November, one day at a time |
| [SCHOOL_OUTREACH.md](SCHOOL_OUTREACH.md) | Email, formal proposal, assembly script and poster copy for schools | Contacting principals, counsellors, SGBs |
| [NGO_OUTREACH.md](NGO_OUTREACH.md) | Outreach message, partnership proposal, one-pager, FAQ for organisations | Contacting NGOs, clinics, faith and youth groups |
| [MEDIA_PITCH.md](MEDIA_PITCH.md) | Press release, founder story, media email and 10 talking points | Local media, community radio, journalists |
| [WHATSAPP_CAMPAIGN.md](WHATSAPP_CAMPAIGN.md) | Ready-to-forward WhatsApp messages | Peer-to-peer distribution from day one |
| [QR_CAMPAIGN.md](QR_CAMPAIGN.md) | Placement plan and 5 poster concepts for QR distribution | Printing posters and cards |
| [SOCIAL_CONTENT.md](SOCIAL_CONTENT.md) | 60 social concepts for TikTok, Instagram, Facebook, LinkedIn | Planning a week of posts in 30 minutes |
| [AMBASSADOR_PROGRAM.md](AMBASSADOR_PROGRAM.md) | The **FAST Community Ambassadors** programme | Recruiting and briefing volunteers |
| [PARTNERSHIP_STRATEGY.md](PARTNERSHIP_STRATEGY.md) | Who to approach, in what order, with what promise | Planning outreach week by week |
| [MEASUREMENT.md](MEASUREMENT.md) | Privacy-first measurement policy — what we count and why | Before adding any measurement |

## Hard rules for everything published

1. **No fabricated anything.** No invented statistics, testimonials, partner
   logos, user counts or endorsements. If a number is not sourced in the
   live section's verified chain, it is not published.
2. **`[FAST URL]` until the domain exists.** Every poster, message and
   document uses the literal placeholder `[FAST URL]` until
   `NEXT_PUBLIC_SITE_URL` is configured in production. QR codes are only
   generated from the real production URL — never from a guess, never from
   `localhost`, never from a placeholder string.
3. **Emergency numbers come from the directory, never from memory.** Copy
   them from `src/lib/numbers.ts` (the site displays them). When in doubt,
   link to the site instead of retyping numbers.
4. **Ambassadors are not counsellors.** The [AMBASSADOR_PROGRAM.md](AMBASSADOR_PROGRAM.md)
   code of conduct binds everyone who speaks for Fast.
5. **Honesty about status.** Fast is an independent public-interest project,
   not a government service and not affiliated with one. Every document here
   says so plainly.

## HUMAN ACTION REQUIRED before launch

These cannot be done from the development environment and are tracked in
[LAUNCH_CHECKLIST.md](LAUNCH_CHECKLIST.md):

- Production Vercel deployment with a fresh `GEMINI_API_KEY`,
  the real `NEXT_PUBLIC_SITE_URL` and a strong `CRON_SECRET`.
- Replacing every `[FAST URL]` placeholder with the real production domain.
- Generating the actual QR codes from the production URL.
- Dialing every critical number from a real South African phone.
- Founder approval of the press-release quote in [MEDIA_PITCH.md](MEDIA_PITCH.md).
