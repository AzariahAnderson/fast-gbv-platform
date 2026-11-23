# Emergency directory maintenance workflow

The emergency directory (`src/lib/numbers.ts`) is the most safety-critical
file in this project. A wrong number is worse than no number, because a
person in danger may have only one chance to reach help. Numbers and office
hours change; this document defines how the project keeps them correct.

## The rule

- Every phone number, USSD code, SMS short code and official service name on
  the site comes from `src/lib/numbers.ts`. Nowhere else. The automated
  integrity test (`bun run test:directory`) fails the build if any component
  hardcodes a number, if the offline fallback drifts, or if the directory
  data is internally inconsistent.
- Numbers are never generated, suggested or modified by an AI model. The
  live-data engines (Gemini, web search) only ever produce statistics and
  news; they have no path into the directory.

## What must be verified, per entry

1. The number or short code still connects to the service it names.
2. The service name is still the organisation's official name.
3. The hours claim ("24 hours, free", "Office hours", "Mon to Fri") is still
   true.
4. The one-line description still matches what the service actually offers.

## Where each entry is verified

Check the organisation's own official channels first; a directory listing
site is never sufficient.

| Entry | Official source to check |
| --- | --- |
| GBV Command Centre (call, please-call-me, SMS) | Department of Social Development: www.dsd.gov.za and its published GBV Command Centre material |
| SAPS 10111 | South African Police Service: www.saps.gov.za |
| Cellphone emergency 112 | South African mobile network operators' published emergency information; 112 is the national GSM emergency number |
| Ambulance and fire 10177 | Provincial emergency medical services publications and www.westerncape.gov.za-style official provincial pages |
| Crime Stop 0860 010 111 | SAPS Crime Stop material on www.saps.gov.za |
| TEARS Foundation | The organisation's own website and published material |
| POWA | The organisation's own website and published material |
| Lifeline South Africa | The organisation's own website and published material |
| Family Life Centre (FAMSA) | The organisation's own website and published material |
| Childline South Africa | The organisation's own website and published material |
| Sonke Gender Justice | The organisation's own website and published material |

## How often

- **Quarterly:** verify every entry in the table above (a full pass).
- **Immediately, event-driven:** any report — from a visitor, a support
  worker or a partner organisation — that a number fails is verified and, if
  confirmed, fixed the same day.
- **Before every release:** `bun run test:directory` must pass (automated).

## Who approves changes

- **Verifier:** the maintainer performing the check calls or sends the
  number and reads the official source.
- **Approver:** a second person reviews the diff against the official
  source before merge. Two sets of eyes on every number change, always.
- Roles are filled by the project's maintainers and volunteers; record who
  held each role in the log below.

## How changes are recorded

Every change to `src/lib/numbers.ts` ships in a pull request whose
description states: which entries changed, what the official source was, the
date it was checked, and who verified and who approved. The running record
lives in the verification log below and in the git history.

## How production is updated

1. Change only `src/lib/numbers.ts` (the integrity test enforces this).
2. Run `bun run test:directory` and `bun run build` locally.
3. Open a pull request with the verification details above; get approval.
4. Merge to `main`; Vercel deploys automatically.
5. Spot-check the live site: dial links on desktop, the offline fallback
   page, and the silent channels' copy values.

## Verification log

| Date | Entries checked | Result | Source used | Verifier | Approver |
| --- | --- | --- | --- | --- | --- |
| Initial publishing | Full directory | All verified | Official channels of each service | Project maintainer | Project maintainer |

_(Add one row per verification pass. Do not invent entries.)_
