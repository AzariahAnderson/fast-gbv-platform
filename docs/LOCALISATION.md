# Localisation architecture

Fast is written in English (South African English, `en-ZA`). The welcome flow
already asks every visitor which of South Africa's eleven official languages
they want to be greeted in, and the hero uses that language's greeting. The
rest of the page is English today.

This document is the plan for making the whole page localisable without ever
putting safety-critical content at risk. It follows one principle: **crisis
content moves last, slowly, and only with human review.**

## Stage 1 — shipped (this release)

- A typed English source catalogue lives in `src/lib/i18n/en.ts`. It contains
  the exact strings the components render today, so wiring a component to it
  later is a no-op swap rather than a rewrite.
- Tests in `tests/i18n.test.ts` enforce the catalogue's rules: values are
  prose, and no catalogue value may contain a phone number, USSD code or
  digit run. Numbers belong to `src/lib/numbers.ts` alone.
- `next-intl` is the designated integration library and is already a project
  dependency. It is intentionally NOT wired yet: wiring translation routing
  before real translations exist would create empty promises on a crisis
  page.

## Stage 2 — when reviewed translations exist

1. Add `src/lib/i18n/<locale>.ts` files typed as `Messages` (the exported
   type of the English catalogue), so a missing key fails TypeScript.
2. Wire `NextIntlClientProvider` with the selected locale's messages. The
   visitor's language choice already persists locally in the profile
   (`src/lib/profile.ts`); reuse it as the locale source.
3. Keep English as the fallback for any unwired surface. Partial locales are
   acceptable; wrong locales are not.
4. Update `<html lang>` to the active locale when content actually renders
   in it.

## What must never vary between locales

- Emergency numbers, USSD and SMS short codes — data of `src/lib/numbers.ts`,
  interpolated, never translated.
- The official names of services (the GBV Command Centre is the GBV Command
  Centre in every language; a translated nickname is forbidden).
- Claims about cost and availability ("free", "24 hours") — verified strings
  from the directory, interpolated, not re-authored per locale.

## Translation review rules

- Crisis instructions are translated by a professional translator and
  reviewed by a community reviewer before shipping. Machine translation of
  safety guidance is forbidden.
- Maintain a small glossary of crisis terminology (survivor, protection
  order, shelter, behaviour change) so every locale uses one consistent term
  per concept. The glossary grows in this file as locales are added.
- A locale that cannot be reviewed yet ships nothing — English remains.

## SEO

Single-page today; language-specific URLs only become relevant when content
pages exist. If they do, give each locale its own path (`/af/`, `/zu/`, ...)
with `hreflang` alternates and locale-specific metadata. Do not serve
translated content on a single URL with client-side swapping only.
