// gen-report.js — FAST Platform v1.1.5 full release status report (English).
// R1 cover recipe + DM-1 palette per docx skill design system.
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  ImageRun, PageBreak, Header, Footer, PageNumber, NumberFormat,
  AlignmentType, HeadingLevel, WidthType, BorderStyle, ShadingType,
  SectionType, TableLayoutType, TableOfContents,
} = require("docx");
const fs = require("fs");
const D = require("./report-data");

// ---------- palette: DM-1 Deep Cyan, darkened tokens for white pages ----------
const P = {
  coverBg: "162235", coverAccent: "37DCF2",
  heading: "1B6B7A", body: "000000", secondary: "606060",
  headerBg: "1B6B7A", headerText: "FFFFFF",
  line: "C8DDE2", surface: "EDF3F5",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
};

const EN = { ascii: "Times New Roman", eastAsia: "SimSun" };
const COVER_FONT = { ascii: "Arial", eastAsia: "SimHei" };

const allNoBorders = {
  top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
  insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
};
const noBorders = {
  top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
};

// ---------- cover helpers (from design-system.md, verbatim logic) ----------
function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([...",.;:!? ", ..."-_/"]);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop();
    lines[lines.length - 1] += last;
  }
  return lines;
}

function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charWidth = (pt) => pt * 20;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt;
  let lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    const cpl = charsPerLine(minPt);
    lines = splitTitleLines(title, cpl);
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function calcCoverSpacing(params) {
  const {
    titleLineCount = 1, titlePt = 36, hasSubtitle = false,
    hasEnglishLabel = false, metaLineCount = 0,
    fixedHeight = 800, pageHeight = 16838,
    marginTop = 0, marginBottom = 0,
  } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - marginTop - marginBottom - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight +
    metaHeight + fixedHeight + implicitParaHeight;
  const remainingSpace = usableHeight - contentHeight;
  const safeRemaining = Math.max(remainingSpace, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45);
  const rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  const midSpacing = Math.max(safeRemaining - topSpacing - bottomSpacing, 0);
  return { topSpacing, midSpacing, bottomSpacing };
}

function buildCoverR1(config) {
  const C = config.palette;
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length,
    fixedHeight: 400,
  });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: C.accent, space: 12 };
  const children = [];
  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));
  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.accent, space: 8 } },
      children: [new TextRun({
        text: config.englishLabel.split("").join("  "),
        size: 18, color: C.accent, font: COVER_FONT, characterSpacing: 40,
      })],
    }));
  }
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: {
        after: i < titleLines.length - 1 ? 100 : 300,
        line: Math.ceil(titlePt * 23), lineRule: "atLeast",
      },
      children: [new TextRun({
        text: titleLines[i], size: titleSize, bold: true,
        color: C.titleColor, font: COVER_FONT,
      })],
    }));
  }
  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 800 },
      children: [new TextRun({
        text: config.subtitle, size: 24, color: C.subtitleColor, font: COVER_FONT,
      })],
    }));
  }
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 24, color: C.metaColor, font: COVER_FONT })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: C.footerColor, font: { ascii: "Arial" } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: C.footerColor, font: { ascii: "Arial" } }),
    ],
  }));
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: C.bg }, borders: noBorders,
        children,
      })],
    })],
  })];
}

// ---------- body builders ----------
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text, bold: true, size: 32, color: P.heading, font: EN })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text, bold: true, size: 28, color: P.heading, font: EN })],
  });
}
function para(text, opts = {}) {
  const runs = Array.isArray(text)
    ? text.map((t) => new TextRun({
        text: t.text, bold: !!t.bold, size: 24,
        color: t.color || P.body, font: EN,
      }))
    : [new TextRun({ text, size: 24, color: P.body, font: EN })];
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120, line: 312 },
    ...opts,
    children: runs,
  });
}
function bullet(text) {
  return new Paragraph({
    bullet: { level: 0 },
    alignment: AlignmentType.LEFT,
    spacing: { after: 80, line: 312 },
    children: [new TextRun({ text, size: 24, color: P.body, font: EN })],
  });
}
function caption(text) {
  return new Paragraph({
    keepNext: true,
    alignment: AlignmentType.LEFT,
    spacing: { before: 160, after: 100, line: 312 },
    children: [new TextRun({ text, bold: true, size: 21, color: P.secondary, font: EN })],
  });
}
function cell(text, opts = {}) {
  return new TableCell({
    width: { size: opts.w, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: opts.fill || "FFFFFF" },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { line: 276 },
      children: [new TextRun({
        text, bold: !!opts.bold, size: 21,
        color: opts.color || P.body, font: EN,
      })],
    })],
  });
}
function makeTable(headers, rows, widths, opts = {}) {
  const zebra = !!opts.zebra;
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: P.headerBg },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: P.headerBg },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: P.line },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        tableHeader: true, cantSplit: true,
        children: headers.map((t, i) => cell(t, { w: widths[i], fill: P.headerBg, color: P.headerText, bold: true })),
      }),
      ...rows.map((r, ri) => new TableRow({
        cantSplit: true,
        children: r.map((t, i) => cell(t, {
          w: widths[i],
          fill: zebra && ri % 2 === 1 ? P.surface : "FFFFFF",
        })),
      })),
    ],
  });
}

// ---------- figure ----------
const chartBuf = fs.readFileSync("/home/z/my-project/scripts/report-assets/gate-chart.png");
const chartImage = new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 200, after: 60 },
  children: [new ImageRun({ data: chartBuf, transformation: { width: 500, height: 280 }, type: "png" })],
});
const chartCaption = new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 200, line: 312 },
  children: [new TextRun({
    text: "Figure 1: Checks per test layer in the fresh 26 November 2026 gate; the grey bar skips by design without credentials",
    size: 18, color: P.secondary, font: EN, italics: true,
  })],
});

// ---------- body content ----------
const body = [];

body.push(h1("1. Executive Summary"));
body.push(para([
  { text: "Verdict first: FAST v1.1.5 is code-complete, every sandbox gate is green as of today, and the release is published to GitHub. ", bold: true },
  { text: "The only remaining step between the current state and a live product is a human one: importing the repository into Vercel and setting six environment variables." },
]));
body.push(para("This report covers every part of the project from A to Z. Section 3 details the v1.1.5 polish release: the richer hero emoji frame, the removal of the footer credit line, an accessibility contrast fix, an expanded service-worker precache, and two new gate tools. Section 4 re-runs the entire verification gate from scratch against the exact pushed commit rather than citing earlier results: TypeScript reports zero errors, ESLint is clean, all 46 unit tests pass, a fresh standalone production build succeeds, the 58-check route battery passes in full, the link audit finds no dead links, and 14 Playwright smoke checks pass. Sections 7 through 12 follow the agreed reporting protocol and separate what was verified in this workspace, what is verified on GitHub, what exists in production (nothing yet), what is blocked, and what only the owner can do."));
body.push(para("One audit note deserves a plain explanation up front: the link audit reports that https://fast-gbv.vercel.app answers 404. That is the placeholder canonical URL in src/lib/site.ts, used only because no production URL exists yet. It resolves automatically once the owner deploys to Vercel and sets NEXT_PUBLIC_SITE_URL to the real domain. No other dead link exists anywhere in the product."));

body.push(h1("2. Product Overview and Version History"));
body.push(para("FAST is a free, public-awareness Progressive Web App that connects South Africans to the country's official gender-based violence services. It pairs a verified emergency directory (every dial link comes from src/lib/numbers.ts) with a live statistics page grounded hourly through web search, an encouragement strip in all 11 official languages, behaviour-change guidance, and a signed-in dashboard offering private messaging, family circles, a safety map, safety plans, notifications and an AI assistant. The stack is Next.js (App Router, standalone output) with Supabase for auth, Postgres and realtime channels, and Google Gemini for grounding. The product works offline after the first visit: a service worker precaches the exact 26-asset used set, so the emergency section keeps working with no connection."));
body.push(para("Privacy is structural, not cosmetic. The public awareness page stores nothing: the optional greeting profile (language, name, struggles) lives on the device only and never reaches a server. Dashboard features that need an account use password-based signup with no email verification codes at any point in the flow. The repository currently holds 36 commits, 232 tracked files, 86 source files under src/, 10 test files, 28 documentation files and 26 emoji artwork assets; the standalone production build weighs 89 MB on disk."));
body.push(caption("Table 1: Version history from v1.0.0 to v1.1.5 (20 further commits cover the beta line and scaffolding; Appendix A lists all 36)"));
body.push(makeTable(
  ["Commit", "Version", "What it delivered"],
  [
    ["59901af", "v1.1.5", "Richer hero emoji frame, footer credit removed, accessibility contrast fix, gate tooling"],
    ["c60ac48", "docs", "Gemini sandbox probe re-run: primary key 429, fallbacks region-blocked"],
    ["d3400fc", "docs", "v1.1.4 gate recorded: sandbox green, deploy remains a human boundary"],
    ["e5855b8", "v1.1.4", "No verification codes anywhere, article system removed, FAST Guide rich rendering"],
    ["09e2f39", "v1.1.3", "Mobile blockers fixed: pinned composers, safe-arrival tap targets"],
    ["305c65d", "v1.1.2", "Split-screen auth and customization screens, confirmation-free signup"],
    ["0d169b0", "v1.1.1", "Runtime verification: connect, prove and harden the real product"],
    ["de62621", "v1.1.0", "FAST becomes a real product: auth, messaging, families, map, safety, AI"],
    ["43a501f", "v1.0.0", "Production release: verified safety, security, tests and docs"],
  ],
  [14, 14, 72], { zebra: true }
));
body.push(para("Two documentation commits (a528424 and d3400fc) recorded the deployment-gate protocol that this report still follows: evidence is separated into what was proven in the workspace, what is proven on GitHub, what exists in production, and what remains a human action. The protocol exists so that a green local gate can never be mistaken for a live product."));

body.push(h1("3. The v1.1.5 Polish Release"));
body.push(para("Commit 59901af changed 16 files with 301 insertions and 49 deletions. It was the direct response to the polish brief: improve the hero emoji, delete the footer attribution line, guarantee no dead links, keep the login, signup and dashboard flows connected, and harden everything for release. Every item shipped, and the two new gate tools it introduced are what make Sections 4 and 5 of this report measurable today."));
body.push(caption("Table 2: What changed in v1.1.5 and why each change matters"));
body.push(makeTable(
  ["Area", "Change", "Why it matters"],
  [
    ["Hero emoji frame", "Grows to 19 companions in four depth tiers; seven new animations (lion, Africa-centred globe, full moon face, wave, confetti, gift, heart decoration)", "Courage, community, 3am company, calm, joy, new beginnings and devotion each get a mark; wide screens gain companions while small ones stay uncluttered"],
    ["Phones", "The frame now exists below the sm breakpoint: two tiny corner companions tuck between the fixed navbar and the badge", "Previously the entire frame was hidden on phones, leaving small screens with no hero emojis at all"],
    ["Verification discipline", "Every pick was measured frame-by-frame by scripts/fetch-emojis.py; the raised-hands emoji was rejected after measurement showed it vanishing mid-loop", "No emoji ever blinks out of existence; none repeats the encouragement strip's set"],
    ["Footer", "The credit line about Noto Emoji artwork is removed; the closing row is now a single centred emergency link", "The footer ends with the one thing a reader in crisis needs, not an attribution"],
    ["Accessibility", "That closing link moved from text-faint (4.2:1 contrast over the footer glow) to text-body (5.1 to 5.8:1)", "Resolves the axe contrast failure without adding visual noise"],
    ["Service worker", "Precache extended to the exact 26-asset used set (fast-v15); the assets pipeline KEEP list updated to match", "Offline behaviour matches reality; retired emoji assets are no longer cached"],
    ["Gate tooling", "New scripts/link-audit.mjs (anchors, tel directory, routes, sitemap, external) and scripts/battery-local-routes.sh (58 checks)", "Dead links and route/header/cron regressions are now machine-checked on every gate"],
    ["Tests", "app.spec.ts skips with a clear reason when TEST_USER_* credentials are absent", "Contributors see why authenticated cases did not run instead of a confusing failure"],
  ],
  [16, 42, 42], { zebra: true }
));

body.push(h1("4. Fresh Verification Gate, 26 November 2026"));
body.push(para("Everything in this section was executed today, in this workspace, against the exact pushed tree (git status clean at 59901af). The production build was compiled from scratch, served on port 3100 with a Supabase URL, a placeholder publishable key and a battery-only CRON_SECRET, and every check ran against that server. The long-running development server on port 3000 was left untouched, and the battery server was stopped after the run. Nothing here is quoted from an earlier session's log."));
body.push(caption("Table 3: Gate results on the exact pushed commit"));
body.push(makeTable(
  ["Layer", "Command / surface", "Result"],
  D.GATE,
  [22, 40, 38], { zebra: true }
));
body.push(para("The 58-check battery decomposes as follows. Seven public routes answer 200, including the offline fallback page. Thirteen protected surfaces redirect unauthenticated requests to the login screen with a next parameter: the eleven dashboard pages (/home, /messages, /family, /map, /safety, /safety/plans, /ai, /notifications, /profile, /settings, /onboarding) plus both GET and POST on /api/ai/chat. Eight removed or unknown paths answer 404 directly, never a login redirect, which proves the removed /verify and article routes are really gone. Ten header checks verify presence and exact values. Twelve emoji asset checks confirm the seven new v1.1.5 animations are served and the five retired ones are not. Five cron checks exercise the secret and origin guards on /api/refresh. Two footer checks confirm the credit line is gone and the emergency closing link is present. One secret scan sweeps the client bundles."));
body.push(caption("Table 4: Battery composition (58 checks total)"));
body.push(makeTable(
  ["Group", "Checks", "Detail"],
  D.BATTERY_COMPOSITION,
  [32, 12, 56], { zebra: true }
));
body.push(chartImage);
body.push(chartCaption);
body.push(para("The link audit walked every page of the public surface and resolved every fragment href against same-page ids, every internal route against the expected status, every tel: number against the verified directory in src/lib/numbers.ts, every sitemap URL, and every external https link. Result: 91 targets ok. The only note is the placeholder canonical URL discussed in the Executive Summary, plus one sandbox-only network error when HEAD-checking hsrc.ac.za; an independent web fetch confirms that site is up, so it is an egress quirk here, not a dead link. Playwright smoke tests cover the public experience at 1440x900 and 390x844: the homepage hero and crisis line, every dial link against the directory, the emergency section, the FAQ accordion, keyboard order starting at the skip link, the 404 page keeping the crisis path reachable, no horizontal overflow on mobile, the crisis CTA reachable without the menu, the mobile menu, and the full welcome flow (language, name guard, greeting, removal). All 14 executed cases passed."));

body.push(h1("5. Security Posture"));
body.push(para("Security is verified by response, not by configuration files. The battery checks the exact header values a browser receives, the cron endpoint's full rejection matrix, and a value-shaped secret scan across every client-served byte."));
body.push(caption("Table 5: Security headers on the production build (all verified live)"));
body.push(makeTable(
  ["Header", "Verified value", "Status"],
  D.HEADERS,
  [30, 56, 14], { zebra: true }
));
body.push(caption("Table 6: /api/refresh cron guard, full rejection matrix"));
body.push(makeTable(
  ["Request shape", "Response"],
  D.CRON,
  [60, 40], { zebra: true }
));
body.push(para("The client-bundle secret scan greps every file under the served static roots for value-shaped patterns: Supabase service-role secrets, Google API key shapes, embedded service-role JSON, the cron secret literal, and Postgres connection strings. It found zero hits. The sign-in path contains no one-time-pin flow anywhere: signInWithOtp appears only inside the Supabase SDK chunk with zero call sites in application code, and the login and signup screens state honestly that verification codes are never used. The removed /verify route answers 404, closing the old OTP entry point completely."));
body.push(para("Credential handling in this workspace followed a fixed protocol: the GitHub token was written to a temporary directory outside the repository with restrictive permissions, used for the authenticated API calls, and deleted immediately afterwards. A repository-wide scan for the token prefix and for fine-grained token patterns returns zero hits, and no credential was ever printed, committed or stored in a report. Because the token did appear in conversation plaintext and carries admin scope, rotating it remains on the human action list in Section 11."));

body.push(h1("6. Test Coverage Inventory"));
body.push(para("Coverage spans six layers, from pure unit functions to browser-driven flows. The table below states exactly what ran today and what remains gated, so no reader can mistake a skipped layer for a passing one."));
body.push(caption("Table 7: Test layers, execution status and evidence"));
body.push(makeTable(
  ["Layer", "Size", "Executed", "Coverage and result"],
  D.COVERAGE,
  [24, 12, 22, 42], { zebra: true }
));
body.push(para("The authenticated end-to-end layer (login, signup, messaging between two users, family circles, safety plans, notifications, AI chat, location privacy) requires two real test accounts. Without TEST_USER_* variables in the environment it skips with an explicit reason rather than failing. Its evidence base is the set of recorded JSON runs under docs/launch/runtime-verification/ (auth, messaging, family, notifications, safety, ai, ai-privacy, location, performance, plus the realtime publication record), captured in earlier sessions against the live Supabase backend. The route battery additionally proves, fresh today, that every dashboard route guards itself correctly and that the removed routes stay removed."));

body.push(h1("7. Z.AI Workspace Evidence"));
body.push(para("Everything in Sections 4, 5 and 6 labelled executed today was produced inside this workspace against commit 59901af with a pristine working tree: a fresh standalone production build on port 3100, the 58-check route battery, the full link audit, the complete unit suite, the TypeScript compiler, ESLint, and the Playwright smoke suite against the development server on port 3000, which was left running untouched throughout. The battery server was stopped after the run and no file in the repository was modified; git status remains empty and the tree still matches origin/main exactly."));
body.push(para("This workspace also produced the release itself: the v1.1.5 commit was authored here, gated here, and pushed from here. Its limitations are equally honest. Gemini behaviour cannot be exercised from this sandbox because the primary key is quota-exhausted (429) and the three fallback keys are region-blocked (400), so all Gemini claims stop at the sandbox boundary. The live statistics endpoint is not affected: /api/live answered 200 today through its web-search-grounded fallback engine, independent of Gemini."));

body.push(h1("8. GitHub Publication Status"));
body.push(para([
  { text: "The repository AzariahAnderson/fast-gbv-platform is published and verified. ", bold: true },
  { text: "An authenticated GitHub API call today returned the remote main head as 59901af1a5a546486dd5a0f0f964396117068c07: an exact string match with the local HEAD, with parent c60ac48 and committer date 2026-11-23T23:47:37Z. The local tracking ref agrees, and the branch shows zero ahead or behind. The earlier push had already carried the twelve commits 43a501f through c60ac48; v1.1.5 followed on top and is confirmed present." },
]));
body.push(para("The push used the temporary-token protocol described in Section 5: stage, use, delete, scan. The token staging directory no longer exists, and the repository-wide leak scan returns zero hits. No secret, key or credential appears anywhere in the 232 tracked files."));

body.push(h1("9. Production Status"));
body.push(para([
  { text: "Nothing is deployed. ", bold: true },
  { text: "Three independent pieces of evidence, gathered during the earlier verification rounds, agree that Vercel has never built this repository: the GitHub Deployments API lists zero deployments ever for the repo, no commit carries any deployment status or check run, and the placeholder domain https://fast-gbv.vercel.app answers with x-vercel-error: DEPLOYMENT_NOT_FOUND, which is also the precise cause of the single link-audit note." },
]));
body.push(para("Per the owner's instruction, Vercel is no longer operated from this workspace. All production claims therefore remain classified as human action required until the owner completes the import described next. Nothing in the codebase blocks that step: vercel.json carries only the cron schedule, the build uses standard Next.js defaults, and every environment variable the platform expects is documented in the next section."));

body.push(h1("10. Failed and Blocked Items"));
body.push(para("Four items are genuinely blocked or excluded from today's green claim. Each is listed with its impact and its mitigation so the release decision can weigh them explicitly rather than discovering them later."));
body.push(caption("Table 8: Blocked and excluded items"));
body.push(makeTable(
  ["Item", "Observed status", "Impact on release", "Mitigation"],
  D.BLOCKED,
  [20, 24, 28, 28], { zebra: true }
));

body.push(h1("11. Human Actions Required"));
body.push(para("These steps are the owner's by agreement. They are ordered; the first is the only one that stands between the current state and a live product."));
body.push(h2("11.1 Deploy to Vercel"));
body.push(bullet("Open vercel.com, import the existing repository AzariahAnderson/fast-gbv-platform, and accept the Next.js framework defaults (vercel.json already carries the hourly cron)."));
body.push(bullet("Set the six environment variables in Table 9 before the first deploy, so the first build is the correct build."));
body.push(bullet("Set NEXT_PUBLIC_SITE_URL to the final production domain; this drives the sitemap and Open Graph tags and clears the single link-audit note."));
body.push(bullet("Deploy, then run the post-deploy checklist in Section 11.4."));
body.push(caption("Table 9: Environment variable manifest"));
body.push(makeTable(
  ["Variable", "Visibility", "Purpose"],
  D.ENV_VARS,
  [40, 16, 44], { zebra: true }
));
body.push(para("Do not set NEXT_PUBLIC_PHONE_AUTH_ENABLED. It is deprecated: the verification-code flow it controlled was removed by design in v1.1.4, and setting it has no effect beyond confusion."));
body.push(h2("11.2 Rotate the GitHub token"));
body.push(para("The classic token used for the push appeared in conversation plaintext and carries admin scope. Revoke it in GitHub developer settings and issue a replacement if further authenticated work is needed. The repository itself is clean: the leak scan for token patterns returns zero hits."));
body.push(h2("11.3 Optional: un-skip the authenticated e2e layer"));
body.push(para("Adding the four test-account variables (TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD, TEST_USER_B_EMAIL and TEST_USER_B_PASSWORD) to the gitignored .env file unlocks 48 Playwright cases that exercise the login, signup, messaging, family, safety and AI flows between two real accounts. This step is optional: the recorded JSON evidence and today's route battery already cover the wiring.", { alignment: AlignmentType.LEFT }));
body.push(h2("11.4 Post-deploy verification checklist"));
body.push(bullet("Confirm the deployment URL answers 200 on / and that /login, /signup and /offline.html answer 200."));
body.push(bullet("Re-run scripts/battery-local-routes.sh against the production URL (change BASE) and expect 58/58."));
body.push(bullet("Re-run scripts/link-audit.mjs against production with NEXT_PUBLIC_SITE_URL set and expect zero failing external notes."));
body.push(bullet("Send one real AI chat message to confirm Gemini works from Vercel's region, and confirm /api/live returns grounded figures."));
body.push(bullet("Confirm the hourly cron executes: Vercel dashboard shows the /api/refresh invocation succeeding with the configured CRON_SECRET."));

body.push(h1("12. Final Release Status"));
body.push(caption("Table 10: Release board"));
body.push(makeTable(
  ["Dimension", "Status"],
  D.RELEASE_ROWS,
  [30, 70], { zebra: true }
));
body.push(para("FAST v1.1.5 is released as far as this workspace can release it: the polish brief is fully implemented, the gate is green on every layer that can run here, the publication is proven on GitHub, and the failure modes that remain are documented with owners and mitigations. The product is ready for its owner to deploy; the moment Vercel serves it at the real domain with the six variables set, this report's production section can be rewritten from HUMAN ACTION REQUIRED to VERIFIED IN PRODUCTION by running the same battery against the live URL."));

body.push(h1("Appendix A: Complete Commit Ledger"));
body.push(para("All 36 commits on main, newest first, as recorded by git log on the verified tree. Scaffold-phase commits carry structured identifiers from the original project bootstrap."));
body.push(caption("Table 11: Full commit ledger (36 commits)"));
body.push(makeTable(
  ["Commit", "Phase", "Subject"],
  D.COMMITS,
  [13, 17, 70], { zebra: true }
));

// ---------- assembly ----------
const pgSize = { width: 11906, height: 16838 };
const pgMargin = { top: 1440, bottom: 1440, left: 1701, right: 1417 };

function pageNumFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080", font: EN })],
    })],
  });
}
function docHeader() {
  return new Header({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({
        text: "FAST Platform - Full Release Status Report v1.1.5",
        size: 18, color: "808080", font: EN,
      })],
    })],
  });
}

const coverConfig = {
  title: "FAST Platform",
  subtitle: "Full Release Status Report - v1.1.5, commit 59901af",
  englishLabel: "RELEASE STATUS REPORT",
  metaLines: [
    "Repository: github.com/AzariahAnderson/fast-gbv-platform",
    "Branch main is pushed and verified at commit 59901af",
    "Verification: fresh full gate re-run on 26 November 2026",
    "Remaining release step: Vercel deployment (human action)",
  ],
  footerLeft: "FAST GBV Platform",
  footerRight: "v1.1.5 - 26 November 2026",
  palette: { bg: P.coverBg, accent: P.coverAccent, ...P.cover },
};

const tocChildren = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 480, after: 360 },
    children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, font: EN, color: P.heading })],
  }),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({
    spacing: { before: 200 },
    children: [new TextRun({
      text: "Note: This Table of Contents is generated via field codes. To ensure page number accuracy after editing, please right-click the TOC and select \"Update Field.\"",
      italics: true, size: 18, color: "888888", font: EN,
    })],
  }),
];

const doc = new Document({
  creator: "Z.ai workspace",
  title: "FAST Platform Full Release Status Report v1.1.5",
  styles: {
    default: {
      document: {
        run: { font: EN, size: 24, color: P.body },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: EN, size: 32, bold: true, color: P.heading },
        paragraph: { spacing: { before: 360, after: 160, line: 312 }, outlineLevel: 0 },
      },
      heading2: {
        run: { font: EN, size: 28, bold: true, color: P.heading },
        paragraph: { spacing: { before: 240, after: 120, line: 312 }, outlineLevel: 1 },
      },
    },
  },
  sections: [
    { // Section 1: cover - no footer, no page numbers
      properties: { page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: buildCoverR1(coverConfig),
    },
    { // Section 2: front matter (TOC) - Roman numerals
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      footers: { default: pageNumFooter() },
      children: tocChildren,
    },
    { // Section 3: body - Arabic numerals restarting at 1
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      headers: { default: docHeader() },
      footers: { default: pageNumFooter() },
      children: body,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  const out = "/home/z/my-project/download/FAST-Platform-Full-Release-Report-v1.1.5.docx";
  fs.writeFileSync(out, buf);
  console.log("written:", out, buf.length, "bytes");
});
