/* FAST Full Website Report generator — docx skill compliant (R1 cover, 3-section numbering, TOC). */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, NumberFormat, AlignmentType, HeadingLevel,
  WidthType, BorderStyle, ShadingType, SectionType, TableLayoutType,
  TableOfContents, PageBreak,
} = require("docx");
const fs = require("fs");

/* ---------------- palette (brand-consistent) ---------------- */
const DOC = {
  primary: "3A332B",   // headings, deep warm brown
  body: "262220",      // body text
  secondary: "6E6560", // captions
  accent: "8F7F1F",    // darkened site gold, print-safe
  surface: "F5F2E8",   // table header fill
  line: "C9C2B2",      // table borders
};
const COVER = {
  bg: "454040", titleColor: "EDEBE6", subtitleColor: "C7C3BB",
  metaColor: "A8A39A", accent: "D8D365", footerColor: "8A857C",
};

/* ---------------- cover recipe R1 helpers (from design-system.md) ---------------- */
const noBorders = {
  top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
};
const allNoBorders = {
  top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
  left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
  insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE },
};

function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([..."-_/ \t"]);
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
  // English text: average char width ~ pt * 11 twips
  const charWidth = (pt) => pt * 11;
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt, lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) {
    lines = splitTitleLines(title, charsPerLine(minPt));
    titlePt = minPt;
  }
  return { titlePt, titleLines: lines };
}

function calcCoverSpacing(params) {
  const {
    titleLineCount = 1, titlePt = 36, hasSubtitle = false,
    hasEnglishLabel = false, metaLineCount = 0,
    fixedHeight = 800, pageHeight = 16838, marginTop = 0, marginBottom = 0,
  } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - marginTop - marginBottom - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight + metaHeight + fixedHeight + implicitParaHeight;
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
  const P = config.palette;
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
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 };
  const children = [];

  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));

  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } },
      children: [new TextRun({
        text: config.englishLabel.split("").join("  "),
        size: 18, color: P.accent, font: { ascii: "Arial", eastAsia: "SimHei" }, characterSpacing: 40,
      })],
    }));
  }

  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({
        text: titleLines[i], size: titleSize, bold: true,
        color: P.titleColor, font: { eastAsia: "SimHei", ascii: "Arial" },
      })],
    }));
  }

  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 800, line: 312 },
      children: [new TextRun({
        text: config.subtitle, size: 24, color: P.subtitleColor,
        font: { eastAsia: "Microsoft YaHei", ascii: "Arial" },
      })],
    }));
  }

  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({
        text: line, size: 24, color: P.metaColor,
        font: { eastAsia: "Microsoft YaHei", ascii: "Arial" },
      })],
    }));
  }

  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));

  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: P.footerColor, font: { ascii: "Arial" } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: P.footerColor, font: { ascii: "Arial" } }),
    ],
  }));

  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: P.bg }, borders: noBorders,
        children,
      })],
    })],
  })];
}

/* ---------------- body helpers ---------------- */
const BODY_FONT = { ascii: "Times New Roman", eastAsia: "SimSun" };
const HEAD_FONT = { ascii: "Arial", eastAsia: "SimHei" };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 180, line: 312 },
    children: [new TextRun({ text, bold: true, size: 32, color: DOC.primary, font: HEAD_FONT })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 120, line: 312 },
    children: [new TextRun({ text, bold: true, size: 26, color: DOC.primary, font: HEAD_FONT })],
  });
}
function p(textOrRuns, opts = {}) {
  const runs = typeof textOrRuns === "string"
    ? [new TextRun({ text: textOrRuns, size: 24, color: DOC.body, font: BODY_FONT })]
    : textOrRuns;
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 120 },
    ...opts,
    children: runs,
  });
}
function r(text, extra = {}) {
  return new TextRun({ text, size: 24, color: DOC.body, font: BODY_FONT, ...extra });
}
function b(text) { return r(text, { bold: true }); }
function note(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 120 },
    children: [new TextRun({ text, size: 21, color: DOC.secondary, italics: true, font: BODY_FONT })],
  });
}
function tableTitle(text) {
  return new Paragraph({
    keepNext: true,
    spacing: { before: 200, after: 100, line: 312 },
    children: [new TextRun({ text, bold: true, size: 21, color: DOC.secondary, font: HEAD_FONT })],
  });
}
function cell(text, { header = false, width, align = AlignmentType.LEFT } = {}) {
  return new TableCell({
    width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
    shading: header ? { type: ShadingType.CLEAR, fill: DOC.surface } : undefined,
    margins: { top: 80, bottom: 80, left: 140, right: 140 },
    children: [new Paragraph({
      alignment: align,
      spacing: { line: 312 },
      children: [new TextRun({
        text, size: header ? 21 : 21, bold: header,
        color: header ? DOC.primary : DOC.body, font: header ? HEAD_FONT : BODY_FONT,
      })],
    })],
  });
}
function table(headers, rows, widths) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: DOC.accent },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: DOC.accent },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: DOC.line },
      insideVertical: { style: BorderStyle.NONE },
    },
    rows: [
      new TableRow({
        tableHeader: true, cantSplit: true,
        children: headers.map((t, i) => cell(t, { header: true, width: widths[i] })),
      }),
      ...rows.map((cols) => new TableRow({
        cantSplit: true,
        children: cols.map((t, i) => cell(t, { width: widths[i] })),
      })),
    ],
  });
}

/* ---------------- content ---------------- */
const body = [];

/* 1. Executive Summary */
body.push(h1("1. Executive Summary"));
body.push(p([
  r("Fast is a single-page web application that connects South Africans to the country's free, official gender-based violence (GBV) services in seconds. It routes three audiences — survivors of abuse, people worried about someone else, and people who want to stop causing harm — to verified national resources such as the Department of Social Development's GBV Command Centre (0800 428 428), which operates around the clock in all eleven official languages. The site is intentionally fast, private and resilient: it works with no airtime, no account and no connection after the first visit."),
]));
body.push(p([
  r("This report documents the entire website from A to Z as at 22 November 2026. The build comprises "),
  b("thirteen page sections"), r(" assembled in "), b("src/app/page.tsx"),
  r(", a strict four-colour design system (#454040, #605B51, #D8D365, #E6F082) expressed entirely in the "),
  b("Inter variable typeface"),
  r(", an hourly AI content engine that regenerates statistics and news with clickable sources, an encouragement strip that rotates compassionate lines accompanied by Google's animated 3D emoji, and a Progressive Web App (PWA) layer that keeps the emergency section usable offline. Emergency contact numbers appear in exactly one section of the page; every other section hands the visitor down to it."),
]));
body.push(p([
  r("Verification status: the development server is running on port 3000, ESLint passes with zero errors, the live data endpoint was tested and returned a fresh AI-generated payload containing ten motivation lines, and the page was inspected in a real browser at mobile (390 px) and desktop (1440 px) widths with no console errors. The single most urgent follow-up is to "),
  b("rotate the Gemini API key"),
  r(", which was pasted into a chat during development and therefore must be treated as exposed; the key already lives only in the server-side .env.local file and is never sent to the browser."),
]));

/* 2. Mission, Vision, Goals and Objectives */
body.push(h1("2. Mission, Vision, Goals and Objectives"));
body.push(h2("2.1 Mission"));
body.push(p([
  r("To make the fastest route to help the default route. Fast exists to shrink the distance between a person in danger and a trained human voice — one page, one tap, zero friction — while treating every visitor, including those who cause harm, with accountability and without judgement."),
]));
body.push(h2("2.2 Vision"));
body.push(p([
  r("A South Africa where anyone who experiences, witnesses or perpetrates gender-based violence knows exactly where to turn, can reach that place from any phone even with no airtime and no data, and can trust every number and every figure on the page because the sources are one tap away."),
]));
body.push(h2("2.3 Primary Goal"));
body.push(p([
  r("Deliver a single, public-awareness landing page that carries every verified GBV entry point in the country, regenerates its statistics and news hourly from real published sources, and remains usable offline on low-end devices over unreliable networks."),
]));
body.push(h2("2.4 Objectives"));
body.push(p([
  r("Six objectives govern design and engineering decisions. Each is measurable and each is already reflected in the shipped build."),
]));
body.push(table(
  ["#", "Objective", "How the build meets it"],
  [
    ["1", "Zero-friction access to help", "Tap-to-dial buttons throughout; the one phone-number section sits directly under the hero; silent options (Please Call Me *120*7867#, SMS 31531) for anyone who cannot speak safely"],
    ["2", "Trust through verification", "Every statistic card and news card links to its publishing source; emergency numbers are hard-coded verified official values and are never AI-generated"],
    ["3", "Real-time relevance", "Gemini with Google Search grounding regenerates stats, news, encouragement and a safety tip every hour, cached so at most one generation runs per hour regardless of traffic"],
    ["4", "Availability everywhere", "Service worker caches pages, assets and the last live payload; offline.html fallback; network timeouts tuned for flaky mobile networks; reduced-motion support"],
    ["5", "Non-judgemental coverage", "Dedicated sections for survivors (#survivors) and for people ready to stop harming (#change), with behaviour-change programmes such as Sonke Gender Justice men's groups"],
    ["6", "Privacy by design", "No accounts, no tracking cookies, no personal data collected or stored; browsing-privacy guidance for monitored devices"],
  ],
  [6, 30, 64]
));
body.push(h2("2.5 Target Audiences"));
body.push(p([
  b("Survivors and people in immediate danger"), r(" are served by the hero, the emergency section and the survivor pathways bento. "),
  b("Concerned friends, family and neighbours"), r(" are addressed in the FAQ and the survivor section, which explain how to support someone safely. "),
  b("People causing harm who want to stop"), r(" receive the #change section, counselling referrals and behaviour-change programmes, reflecting the principle that the cycle cannot end without them. All copy is written in plain, calm South African English with no stigma and no jargon."),
]));
body.push(h2("2.6 Guiding Principles"));
body.push(p([
  r("Four principles recur across every round of feedback: "),
  b("speed"), r(" (help answers fast, and so must the page), "),
  b("verification"), r(" (nothing invented, every figure sourced), "),
  b("restraint"), r(" (one accent colour used only where the visitor must act) and "),
  b("dignity"), r(" (no pulsing alerts, no panic-inducing UI, no clutter competing with the numbers that matter)."),
]));

/* 3. A-Z inventory */
body.push(h1("3. The Website from A to Z: Section-by-Section Inventory"));
body.push(p([
  r("The page is assembled once in "), b("src/app/page.tsx"),
  r(" and renders in the following order. Each subsection below states what the visitor sees, what it is for, and how it behaves."),
]));

body.push(h2("3.1 Preloader (Splash)"));
body.push(p([
  r("A four-second splash curtain on the ink background. The wordmark F-A-S-T rises letter by letter in Inter black (the A in gold), a hairline rule scales in, the line "),
  b("South African GBV support, always on"),
  r(" fades up, and the four values "),
  b("Free, Anonymous, Safe, Trusted"),
  r(" appear in sequence. No progress bar, no counters, no pulsing indicators — per design feedback. The curtain lifts at 4.0 s while the hero enters underneath it (hero delays are calibrated against D = 3.9). Scroll is locked until the curtain lifts, and prefers-reduced-motion users get an instant, opacity-only variant."),
]));

body.push(h2("3.2 PWA Registration and Noise Texture"));
body.push(p([
  r("PwaRegister registers "), b("/sw.js"),
  r(" once, after the load event, so offline support never competes with first paint. A fixed, pointer-transparent film-grain overlay (5% opacity, fully desaturated SVG turbulence) sits above the content at z-90 to give the dark surfaces a printed, non-flat texture without introducing any foreign hue."),
]));

body.push(h2("3.3 Navbar"));
body.push(p([
  r("A fixed top bar with five anchor links (Emergency, Survivors, Live, Change, FAQ) and a gold "),
  b("Get help now"),
  r(" button that dials 0800 428 428. It hides while scrolling down past the hero and reveals on the way up; once scrolled it becomes a blurred glass bar (ink at 90% opacity, taupe bottom border, deep shadow). The entrance animation is delayed to 4.05 s so it slides in exactly as the splash curtain finishes. On mobile the button collapses to a phone icon, and the menu is a full-screen overlay with oversized staggered links and a call button pinned to the safe-area bottom."),
]));

body.push(h2("3.4 Hero"));
body.push(p([
  r("The headline "),
  b("When it hurts most, help answers fast"),
  r(" rises word by word out of individual clip masks (the final word in gold), over an atmospheric backdrop of one warm gold glow, two deep drifting fields and a faint taupe grid that fades at the top and bottom. Body copy states what Fast connects and for whom, with the service list (counselling, shelters, police response, medical care, legal protection) emphasised in near-white. Two calls to action follow: a gold tap-to-dial button and a quiet secondary button ("),
  b("I want to change"),
  r(") that anchors to the behaviour-change section. A trust strip lists Free and confidential, Answered 24 hours, All 11 official languages, Nothing on your bill, and a scroll cue points to the emergency section."),
]));

body.push(h2("3.5 Encouragement Strip (Motivations)"));
body.push(p([
  r("The former emergency-numbers ticker was replaced, per feedback, by a slow rotating strip of compassionate messages labelled "),
  b("Hold on, read this"),
  r(". Fifteen verified baseline lines are built in (for example \u201CWhat happened to you was not your fault.\u201D and \u201CChoosing to stop harming is possible, and help exists for that choice too.\u201D), and the hourly AI engine generates ten more, mixed across survivors, worried others and people who cause harm; the sanitizer accepts up to twelve. Each message is paired with an official animated 3D emoji from Google's Noto Emoji Animation set (sparkles, yellow heart, seedling, flexed biceps, handshake, people hugging, green heart, glowing star), stored locally at 128 px so they cost almost nothing on mobile data and keep working offline. Messages rotate every 6.5 seconds with a blur-and-rise transition, pause on hover or keyboard focus, and a row of progress dots (gold for the active one) shows the set size. With the expanded set the strip now carries 10-15 motivations instead of the original four."),
]));

body.push(h2("3.6 Emergency — the One Numbers Section"));
body.push(p([
  r("This is "),
  b("the only section of the site that carries phone numbers"),
  r("; every other section links down to it, so nothing competes with it in a crisis. It opens with the heading "),
  b("Every number you need, one place"),
  r(" and a featured gold-framed card for the "),
  b("GBV Command Centre, 0800 428 428"),
  r(" (Department of Social Development) describing the 24-hour, eleven-language, toll-free line with social-worker callback and shelter placement. A \u201CCan't speak out loud?\u201D card holds the two silent options — the free Please Call Me code *120*7867# and SMS the word Help to 31531 — each with a copy chip. Three further call cards cover SAPS 10111, ambulance and fire 10177 (with the cellphone 112 note) and Childline 116. Below, \u201CThe full directory, verified\u201D renders an eleven-row table of every service with what it does, its number and its hours: GBV Command Centre, SAPS, cellphone emergency 112, ambulance and fire 10177, TEARS Foundation *134*7355#, POWA, Lifeline 0861 322 322, Childline 116, Sonke Gender Justice, FAMSA and Crime Stop 0860 010 111. A closing safety note explains that calls and SMS leave a record, advises deleting entries and private browsing, and tells anyone in immediate danger to leave the screen and call the police."),
]));

body.push(h2("3.7 Survivor Pathways Bento (#survivors)"));
body.push(p([
  r("Seven cards in an asymmetric six-column bento grid under the heading "),
  b("You are not alone, and you are not to blame"),
  r(": 24-hour counselling in any of the eleven languages; safe places to stay (shelters and safe houses in all nine provinces, often same-day, arranged with POWA); free legal protection under the Domestic Violence Act (interim protection orders from any magistrates-court clerk, no lawyer, SAPS must assist and must arrest on breach); medical care and evidence (Thuthuzela Care Centres and the J88 form); help without a voice call; a four-item safety-plan checklist (code word, grab bag with documents and cash, nearest police station saved, where to go and who knows); and help for children through Childline. Every card's action link anchors down to the emergency section rather than repeating a number."),
]));

body.push(h2("3.8 Live Data Section (#live)"));
body.push(p([
  r("Headed "),
  b("The crisis in numbers you can check yourself"),
  r(", this section renders the hourly AI payload: four statistic cards (value, explanation, publishing organisation with an outbound link) with the first value in gold; three news cards (date chip, headline, summary, publisher link); a featured "),
  b("Today's tip"),
  r(" card with one practical safety suggestion; a status badge showing either \u201CUpdated HH:MM SAST\u201D or \u201CVerified baseline\u201D; and a manual Refresh button that is rate-limited server-side to roughly one generation every nine minutes so neither a cron run nor a curious visitor can run the API key dry. A closing assurance states that news and figures refresh hourly while emergency contact numbers are verified official values and are never AI-generated."),
]));

body.push(h2("3.9 Behaviour-Change Bento (#change)"));
body.push(p([
  r("Under "),
  b("Real strength is choosing to stop"),
  r(", this section addresses people causing harm. The main card walks "),
  b("Three honest steps out"),
  r(" — 01 Name it, 02 Ask for help (call the Command Centre and say \u201CI need help to change\u201D), 03 Do the work (join a behaviour-change programme). A quote card states \u201CThe cycle ends with you, not with the next child who watches\u201D and explains intergenerational modelling. Three further cards cover counselling for the person causing harm (Lifeline, FAMSA), structured programmes (Sonke Gender Justice men's groups, Command Centre referrals) and repairing the family (FAMSA psychologists and social workers, including supervised reunification where safe)."),
]));

body.push(h2("3.10 How Fast Works (#how)"));
body.push(p([
  r("Three numbered step cards — "),
  b("Reach out"),
  r(" (call, SMS or Please Call Me from any network, any hour, any language), "),
  b("Get matched"),
  r(" (a counsellor assesses danger and connects police, ambulance, shelter, social worker, legal help or a behaviour-change programme) and "),
  b("Stay supported"),
  r(" (follow-up contact, personal safety plan, court preparation, counselling for the family) — joined by arrows on desktop with oversized ghost numerals that tint gold on hover."),
]));

body.push(h2("3.11 FAQ (#faq)"));
body.push(p([
  r("Seven accordion items under "),
  b("The things you are afraid to ask"),
  r(": Is it really free and confidential; what happens when I call the Command Centre; can I call for someone else; I am a man, can I get help; I am causing harm, will I be judged; what if I cannot speak safely on the phone; and how do I hide my visit to this website. The answers rehearse the same verified facts as the rest of the page and close with the privacy guidance."),
]));

body.push(h2("3.12 Closing Call to Action and Footer"));
body.push(p([
  r("A featured gold-framed panel — "),
  b("One call can change everything"),
  r(" — asks the visitor to save the Command Centre number today \u201Cnot because you expect trouble, but because trouble never sends an invitation,\u201D and anchors to the emergency section. The footer carries four link columns (Help, For survivors, For change, About the data), three assurance blocks — "),
  b("Private by design"), r(", "), b("Works without data"), r(", "), b("Statistics you can check"),
  r(" — a credit line for the Noto animated emoji artwork, and one quiet final pointer to the emergency numbers for anyone who reaches the very bottom in a crisis. The footer itself carries no numbers."),
]));

/* 4. Design system */
body.push(h1("4. Design System and Visual Identity"));
body.push(h2("4.1 The Four-Colour Palette"));
body.push(p([
  r("Per explicit instruction (\u201Cuse exact color scheme nothing else\u201D), every colour on the site derives from exactly four values; anything else is one of these four blended over the background, so no foreign hue can appear."),
]));
body.push(table(
  ["Colour", "Hex", "Role"],
  [
    ["Deep ink", "#454040", "Page background, ink surfaces, theme colour, PWA background"],
    ["Taupe", "#605B51", "Structure: 3px card frames, dividers, secondary surfaces, grid lines"],
    ["Gold", "#D8D365", "The action colour: buttons, phone numbers, one highlighted word per heading, featured card frames, selection"],
    ["Lime", "#E6F082", "Interactions only — hovers, featured-card hover border, focus — never body copy"],
  ],
  [22, 16, 62]
));
body.push(h2("4.2 Text Hierarchy Without Coloured Copy"));
body.push(p([
  r("Early feedback (\u201Ctext cannot be all green\u201D) settled the rule: body copy never runs in the accent colours. Instead a ladder of warm greys is mixed from the taupe itself toward white: headlines at "),
  b("#EDEBE6"), r(" (8.6:1 contrast), body at "), b("#C7C3BB"),
  r(" (5.8:1), labels at "), b("#A8A39A"),
  r(" (3.9:1) and footnotes at "), b("#8A857C"),
  r(" (2.8:1) against the #454040 background. Gold is reserved for the things a visitor must act on, which is precisely what makes it stand out."),
]));
body.push(h2("4.3 Typography and Weight"));
body.push(p([
  r("Inter is the single family for the whole site, loaded as a variable font through next/font so every weight from 100 to 900 is available without a second file. Display headlines run at font-black (900) with tightened tracking (-0.025em); uppercase micro-labels run at 10-11 px with 0.14-0.34 em tracking; body copy runs medium (500) for legibility on dark backgrounds. OpenType features ss01 and cv11 are enabled, and text rendering is set to optimizeLegibility."),
]));
body.push(h2("4.4 Card System and Motion Language"));
body.push(p([
  r("One surface recipe covers every card in the site: 28 px radius, a thick 3 px taupe frame, a taupe fill over the ink background and a soft neutral top highlight. Featured cards swap the frame to gold. Hover lifts a card 4 px on a colour-neutral black shadow and turns its frame gold. Motion is one spring-like easing curve (cubic-bezier 0.22, 1, 0.36, 1) shared by reveal-on-scroll (opacity, 28 px rise, slight scale and blur, firing once at -70 px viewport margin), word-mask headline entrances, the splash curtain, a 5.5 s emoji bob and two barely-perceptible 26-32 s background drifts. "),
  b("prefers-reduced-motion"),
  r(" disables all of it."),
]));
body.push(h2("4.5 Signature Textures and Micro-states"));
body.push(p([
  r("A desaturated film-grain overlay, a 72 px taupe structural grid with vertical fade masks, hidden scrollbars on every element and browser, a gold text-selection colour, a gold focus-visible outline with offset, and smooth anchor scrolling complete the identity. Mouse-follower effects, neon glows, pulsing dots and loading bars were all removed in earlier feedback rounds."),
]));

/* 5. AI engine */
body.push(h1("5. The Hourly AI Content Engine"));
body.push(h2("5.1 Three-Engine Fallback Chain"));
body.push(p([
  r("The live service ("), b("src/lib/live-fetch.ts"),
  r(", server-only) tries engines cheapest-first: "),
  b("(1) gemini-flash-latest with Google Search grounding"),
  r(" (the owner's key), "),
  b("(2) plain gemini-flash-latest"),
  r(" in case grounding quota runs dry, and "),
  b("(3) a platform web-search engine"),
  r(" that fetches real search results first and only lets a language model compose them — it is never allowed to invent. If the key is missing or Gemini answers that the region is not supported, the Gemini engines are skipped for the process lifetime, saving two dead timeouts on every refresh."),
]));
body.push(h2("5.2 Prompt Contract and Sanitisation"));
body.push(p([
  r("The prompt fixes today's date, requires JSON-only output in an exact shape, and demands: exactly four verified South African GBV statistics from credible publishers (HSRC, SAMRC, WHO, SAPS, Stats SA, UNODC, government departments or major news investigations) each with organisation-plus-year and a real https source URL; exactly three real news items from established outlets with publication name, article URL and publish date — \u201Cif you cannot ground an item, drop it rather than inventing it\u201D; exactly "),
  b("ten short compassionate encouragement lines"),
  r(" (a mix for survivors, worried others and people choosing to stop harming; no numbers, no cliches, no repeated openings); and one practical safety tip of at most 30 words. Everything an engine returns passes through a defensive sanitizer that strips whitespace, caps lengths (values 40, labels 220, titles 160, summaries 320, encouragement 140 characters each, twelve items maximum), accepts only genuine https URLs, drops search-provider redirect wrappers, validates dates as YYYY-MM-DD, and enforces quality gates (at least two statistics, one news item, two encouragement lines) before anything reaches a visitor; anything that fails a gate falls back to the previous good payload."),
]));
body.push(h2("5.3 Caching, Scheduling and Spend Control"));
body.push(p([
  r("Regeneration runs at most once per 55 minutes. A thundering-herd guard shares one in-flight job across concurrent callers; payloads persist in process memory, then on disk (.data/live-cache.json, /tmp on Vercel), then to the verified baseline. A hard nine-minute interval caps forced refreshes. The read path never blocks a visitor: memory answers instantly, a stale disk cache answers within ten minutes of a cold start, and a first-ever request returns the baseline immediately while generation proceeds in the background. Deployment refreshes come from a Vercel hourly cron ("),
  b("0 * * * *"),
  r(" on /api/refresh in vercel.json) plus the manual button in the Live section."),
]));
body.push(h2("5.4 Client Consumption"));
body.push(p([
  r("The "), b("useLive()"),
  r(" hook is a shared client store: every component that calls it participates in one fetch of /api/live per page load, the verified baseline renders first so nothing blocks, and live data quietly replaces it when it arrives. A module-level cache means the payload survives route re-renders."),
]));

/* 6. PWA */
body.push(h1("6. Offline Capability and Mobile Resilience (PWA)"));
body.push(p([
  r("The manifest ("), b("manifest.webmanifest"),
  r(") installs the site as a standalone portrait app named \u201CFast\u201D with theme and background #454040, language en-ZA, categories health/government/lifestyle, and three icons (192, 512 and a maskable 512). The service worker ("), b("sw.js"),
  r(", version fast-v1) uses three strategies: navigations are network-first with a hard 3.5 s timeout, falling back to the cached page and then to a dedicated offline.html; /api/live is network-first with a 4.5 s timeout so the last successful AI payload stays available with no connection; and immutable build output, the local emoji images, icons and fonts are cache-first with a quiet background refresh. On activation it deletes every cache outside its own three names. Navigation timeouts were chosen for visitors on flaky mobile networks, and the whole emergency section keeps working offline after a single visit — consistent with the footer promise \u201CVisit it once today and the emergency section keeps working with no connection and almost no airtime.\u201D"),
]));

/* 7. Data integrity */
body.push(h1("7. Data Integrity, Sourcing and Safety by Design"));
body.push(h2("7.1 Verified Baseline"));
body.push(p([
  r("When every engine fails, the page still shows a payload of figures verified against their publishing organisations, with official domains (not invented deep links) as source URLs."),
]));
body.push(table(
  ["Figure", "Meaning on the page", "Source"],
  [
    ["1 in 3", "Women in South Africa experiencing physical and/or sexual violence in their lifetime", "HSRC National GBV Prevalence Survey (hsrc.ac.za)"],
    ["5.5", "Of every 100 000 women killed by an intimate partner, close to five times the global average", "South African Medical Research Council (samrc.ac.za)"],
    ["5x", "South Africa's femicide rate compared to the global average", "WHO global femicide estimates (who.int)"],
    ["24/7", "The GBV Command Centre never closes", "Department of Social Development (dsd.gov.za)"],
  ],
  [14, 50, 36]
));
body.push(h2("7.2 Numbers Are Never AI-Generated"));
body.push(p([
  r("A hard architectural rule separates the two kinds of content: statistics and news are regenerated hourly and always carry sources a visitor can click, while emergency contact numbers are hard-coded, verified official values that no model can alter. The Live section repeats this assurance in small print. Contact numbers also appear in exactly one section, so there is exactly one place to verify and one place to maintain."),
]));
body.push(h2("7.3 Privacy and Visitor Safety"));
body.push(p([
  r("Fast is a static awareness page: no accounts, no tracking cookies, no personal information collected or stored. The API key lives only in the server-side environment. For visitors whose devices are monitored, the page teaches private browsing and history clearing, offers silent help channels that cost nothing and leave no charge record, and advises deleting sent messages and call entries. The emergency section ends with an explicit note that if a visitor is in immediate danger they should leave the screen and call the police."),
]));

/* 8. Tech stack */
body.push(h1("8. Technology Stack and Architecture"));
body.push(p([
  r("The project is a single Next.js App Router application managed with bun, styled with Tailwind CSS 4 and animated with framer-motion. The table lists the load-bearing choices."),
]));
body.push(table(
  ["Layer", "Technology", "Why it is there"],
  [
    ["Framework", "Next.js 16.1.3 (App Router, standalone output), React 19, TypeScript", "Server components for the shell, client components for interaction, route handlers for the live API"],
    ["Styling", "Tailwind CSS 4 (@theme inline), shadcn/Radix primitives (accordion)", "Token-driven theming; the four brand colours enter as CSS variables only"],
    ["Type", "Inter variable via next/font", "One family, every weight, no second font file"],
    ["Animation", "framer-motion", "Reveal-on-scroll, word masks, curtain, accordion and menu transitions with reduced-motion respect"],
    ["Live data", "gemini-flash-latest REST API + z-ai-web-dev-sdk search fallback, server-only module", "Hourly grounded regeneration with a three-engine chain"],
    ["Scheduling", "Vercel cron (vercel.json, 0 * * * *) + manual refresh endpoint", "One generation per hour regardless of traffic"],
    ["Offline", "manifest.webmanifest + sw.js service worker", "Installable app; pages, assets and last live payload cached"],
    ["Quality", "ESLint (eslint-config-next), bun run lint", "Zero-warning gate before every delivery"],
  ],
  [16, 40, 44]
));
body.push(p([
  r("Architecturally the site is one page composed of thirteen client sections over three server pieces: the layout (metadata, fonts, viewport theme colour), the two API routes (/api/live read path, /api/refresh write path) and the shared live-types/live-fetch modules. The complete file map is in Appendix B."),
]));

/* 9. QA log */
body.push(h1("9. Quality Assurance: Bugs Fixed and Debugging Log"));
body.push(p([
  r("Eight rounds of feedback each ended with a lint pass and browser inspection. The table records the defects found and how each was resolved."),
]));
body.push(table(
  ["Defect", "Resolution"],
  [
    ["Unused imports failing ESLint (marquee, navbar)", "Removed; lint green"],
    ["React set-state-in-effect violation in the count-up component", "Restructured so state is derived from motion values, not set in an effect"],
    ["Statistics card animated \u201C1 in 3\u201D into \u201C1 in 13\u201D and rendered an escaped \u201Cx\u201D suffix", "Rewrote the affected cards as static styled text; animations kept only for pure numerals"],
    ["Emergency numbers repeated in navbar, footer, cards and FAQ", "Consolidated into the single emergency section; all other sections anchor-link to it"],
    ["Infinite numbers ticker felt alarming", "Replaced with the encouragement strip and Noto animated 3D emoji"],
    ["Hydration mismatch warning observed in the browser during development", "Diagnosed as a stale dev-session artifact (a hot-reloaded page holding a pre-refresh cached payload); a clean reload shows zero errors, and first paint is deterministic from the baseline on both server and client"],
    ["Loading bars, neon glows, pulsing dots, mouse effects, ghost text", "All removed across rounds 3-6 per feedback"],
    ["Motivations felt thin (four lines)", "Baseline expanded to fifteen lines; the AI prompt now generates ten; sanitizer cap raised to twelve; dot indicator wraps for larger sets"],
  ],
  [42, 58]
));

/* 10. Status */
body.push(h1("10. Current Status and Verification Results"));
body.push(p([
  r("As at 22 November 2026 the development server is running on port 3000 (bun run dev, Next.js 16.1.3). ESLint passes with no errors. The /api/live endpoint was queried directly and returned a fresh AI payload (generator: websearch chain) containing ten encouragement lines, four statistics and three news items. A forced /api/refresh confirmed regeneration works end to end. The page was opened in a real browser: at 390 px the hero, headline and trust strip render correctly, and at 1440 px the encouragement strip shows ten progress dots with the animated handshake emoji while an AI message fades in. No console errors remain after a clean load."),
]));
body.push(note("Verification artefacts: API payload inspection (curl), browser screenshots at mobile and desktop widths, ESLint output, and the dev-server log."));

/* 11. Limitations */
body.push(h1("11. Known Limitations and Risks"));
body.push(p([
  b("API key exposure. "),
  r("The Gemini key was pasted into a chat during development. It is stored only in .env.local and used server-side, but it must be treated as compromised and rotated in Google AI Studio, then replaced in .env.local."),
]));
body.push(p([
  b("Engine availability. "),
  r("Gemini grounding depends on regional support and quota; the chain falls back to plain Gemini and then to the platform search engine, and finally to the verified baseline, so content can be less fresh — never wrong or unsourced — when upstream services degrade."),
]));
body.push(p([
  b("Splash length. "),
  r("The four-second curtain is a deliberate brand moment but repeats for every visit; a sessionStorage skip for returning visitors is recommended."),
]));
body.push(p([
  b("Scope and upkeep. "),
  r("The directory's office hours (POWA, FAMSA) require periodic human re-verification; the site is a single page, so search presence depends on one URL; and the development configuration currently ignores TypeScript build errors (typescript.ignoreBuildErrors), which should be tightened before a production deploy."),
]));

/* 12. Roadmap */
body.push(h1("12. Roadmap and Recommendations"));
body.push(table(
  ["Priority", "Action", "Expected outcome"],
  [
    ["1", "Rotate the Gemini API key in Google AI Studio and update .env.local", "Removes the exposure created when the key was shared in chat"],
    ["2", "Add a sessionStorage splash skip for repeat visits within a session", "Keeps the brand moment for first-time visitors without taxing returnees"],
    ["3", "Add schema.org structured data (CrisisLine / GovernmentOrganization) and a sitemap", "Richer search results for people searching for help"],
    ["4", "Localise into South Africa's eleven official languages (next-intl is already a dependency)", "Wider reach, matching the Command Centre's eleven-language promise"],
    ["5", "Deploy to a production domain with the Vercel cron enabled", "Moves hourly regeneration from the dev server to production"],
    ["6", "Tighten TypeScript config (remove ignoreBuildErrors) and run a Lighthouse pass", "Production-grade type safety and a measured performance budget"],
    ["7", "Institute an annual directory re-verification workflow", "Keeps every number and office hour correct over time"],
  ],
  [14, 48, 38]
));

/* Appendix A */
body.push(h1("Appendix A: Verified Emergency Directory"));
body.push(p([
  r("The table below reproduces the full directory exactly as it appears in the emergency section (and Appendix A of the site copy), including hours and purpose. All values are toll-free or free where stated, and every one was verified against official publishing organisations at the time of writing."),
]));
body.push(table(
  ["Service", "What it does", "Number", "Hours"],
  [
    ["GBV Command Centre", "Crisis counselling, social workers, shelters and referrals, for survivors and abusers", "0800 428 428", "24 hours, free"],
    ["SAPS (police)", "Emergencies, opening a case, protection order enforcement, FCS units", "10111", "24 hours, free"],
    ["Cellphone emergency", "Routes to nearest police, ambulance or fire from any cellphone", "112", "24 hours, free"],
    ["Ambulance and fire", "Medical emergencies, serious injuries, firefighting", "10177", "24 hours, free"],
    ["TEARS Foundation", "Free SMS helpline for survivors of gender-based and sexual violence", "*134*7355#", "24 hours, free"],
    ["POWA", "Counselling, shelters and court support for women experiencing abuse", "011 642 4345", "Office hours"],
    ["Lifeline South Africa", "Emotional counselling for anyone, including those who cause harm", "0861 322 322", "24 hours, free"],
    ["Childline South Africa", "Child abuse, neglect; support for children and teenagers", "116", "24 hours, free"],
    ["Sonke Gender Justice", "Men's behaviour-change groups and gender justice advocacy", "011 339 3589", "Office hours"],
    ["FAMSA (Family Life Centre)", "Professional individual, relationship and family counselling (Johannesburg)", "011 788 4784", "Mon-Fri 08:00-17:00"],
    ["Crime Stop", "Report crime anonymously; no names taken", "0860 010 111", "24 hours, free"],
    ["Please Call Me callback", "Silent help: a counsellor calls you back at no cost", "*120*7867#", "24 hours, free"],
    ["SMS Help line", "Silent help: SMS the word Help", "31531", "24 hours, free"],
  ],
  [22, 42, 18, 18]
));

/* Appendix B */
body.push(h1("Appendix B: Project File Map"));
body.push(p([
  r("Key files and their responsibilities. The Gemini API key is held in .env.local as GEMINI_API_KEY and is referenced here by name only."),
]));
body.push(table(
  ["File", "Responsibility"],
  [
    ["src/app/page.tsx", "Assembles all thirteen page sections in render order"],
    ["src/app/layout.tsx", "Inter font, SEO metadata, viewport theme #454040, manifest reference"],
    ["src/app/globals.css", "Four-colour tokens, grey text ladder, card system, textures, keyframes, reduced-motion"],
    ["src/components/site/preloader.tsx", "Four-second splash curtain with wordmark and values"],
    ["src/components/site/pwa-register.tsx", "Registers /sw.js after load"],
    ["src/components/site/navbar.tsx", "Fixed nav, hide-on-scroll, glass state, mobile overlay menu, logo"],
    ["src/components/site/hero.tsx", "Atmospheric backdrop, word-mask headline, CTAs, trust strip"],
    ["src/components/site/encouragement.tsx", "Rotating motivations with Noto animated 3D emoji and dot progress"],
    ["src/components/site/emergency.tsx", "The single numbers section: featured line, silent help, call cards, directory"],
    ["src/components/site/bento-survivors.tsx", "Seven survivor pathway cards with safety-plan checklist"],
    ["src/components/site/live.tsx", "Hourly statistics, news, tip, status badge and refresh button"],
    ["src/components/site/bento-change.tsx", "Behaviour-change pathways: three steps, quote, programmes, family repair"],
    ["src/components/site/steps.tsx", "Reach out, Get matched, Stay supported"],
    ["src/components/site/faq.tsx", "Seven-question accordion including privacy guidance"],
    ["src/components/site/cta.tsx", "Closing save-the-number panel"],
    ["src/components/site/footer.tsx", "Link columns, assurance blocks, credits, final emergency pointer"],
    ["src/components/site/cards.tsx / reveal.tsx", "Shared card recipes (CallCard, InfoCard, CopyChip) and scroll-reveal primitives"],
    ["src/lib/live-types.ts", "LiveData type and the verified BASELINE payload (15 motivations)"],
    ["src/lib/live-fetch.ts", "Server-only three-engine hourly generator, sanitizer, cache, TTL and spend guard"],
    ["src/hooks/use-live.ts", "Shared client store: one fetch per load, baseline-first rendering"],
    ["src/app/api/live/route.ts", "Instant read path for cached live data"],
    ["src/app/api/refresh/route.ts", "Forced regeneration (cron + manual), rate-limited"],
    ["public/manifest.webmanifest", "Installable PWA manifest (standalone, en-ZA, #454040)"],
    ["public/sw.js", "Service worker: navigation, live-data and static caching strategies"],
    ["public/offline.html", "Offline fallback page"],
    ["public/emojis/", "Locally hosted Noto animated 3D emoji set (128 px webp)"],
    ["vercel.json", "Hourly cron on /api/refresh (0 * * * *)"],
    [".env.local", "GEMINI_API_KEY (server-side only; value never committed or sent to the client)"],
  ],
  [34, 66]
));

/* ---------------- TOC section children ---------------- */
const tocChildren = [
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 480, after: 360 },
    children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, font: HEAD_FONT, color: DOC.primary })],
  }),
  new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({
    spacing: { before: 200 },
    children: [new TextRun({
      text: "Note: This Table of Contents is generated via field codes. To ensure page number accuracy after editing, please right-click the TOC and select \u201CUpdate Field.\u201D",
      italics: true, size: 18, color: "888888", font: BODY_FONT,
    })],
  }),
  // No trailing PageBreak: the body lives in its own NEXT_PAGE section, so a
  // PageBreak here would combine with the section break into a blank page.
];

/* ---------------- headers / footers ---------------- */
function pageHeader() {
  return new Header({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: DOC.line, space: 4 } },
      children: [new TextRun({ text: "FAST Full Website Report", size: 18, color: "808080", font: HEAD_FONT })],
    })],
  });
}
function pageFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080", font: BODY_FONT })],
    })],
  });
}

/* ---------------- document ---------------- */
const pgSize = { width: 11906, height: 16838 };
const pgMargin = { top: 1440, bottom: 1440, left: 1701, right: 1417 };

const doc = new Document({
  creator: "Fast",
  title: "FAST Full Website Report",
  description: "A to Z report of the Fast South African GBV support website",
  styles: {
    default: {
      document: {
        run: { font: BODY_FONT, size: 24, color: DOC.body },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: HEAD_FONT, size: 32, bold: true, color: DOC.primary },
        paragraph: { spacing: { before: 400, after: 180, line: 312 }, outlineLevel: 0 },
      },
      heading2: {
        run: { font: HEAD_FONT, size: 26, bold: true, color: DOC.primary },
        paragraph: { spacing: { before: 280, after: 120, line: 312 }, outlineLevel: 1 },
      },
    },
  },
  sections: [
    { // Section 1: Cover — margin 0, no footer, no page numbers
      properties: {
        page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } },
      },
      children: buildCoverR1({
        title: "FAST Full Website Report",
        subtitle: "South Africa's free, 24/7 gender-based violence support hub - mission, goals, objectives, architecture, design system, live data engine and roadmap, documented from A to Z",
        englishLabel: "GBV SUPPORT PLATFORM",
        metaLines: [
          "Project: Fast - public awareness landing page",
          "Region: South Africa (en-ZA)",
          "Report date: 22 November 2026",
          "Status: Development server live, lint-clean, live data verified",
        ],
        footerLeft: "Fast · Built with care for South Africa",
        footerRight: "November 2026",
        palette: COVER,
      }),
    },
    { // Section 2: Front matter — Roman numerals
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      headers: { default: pageHeader() },
      footers: { default: pageFooter() },
      children: tocChildren,
    },
    { // Section 3: Body — Arabic from 1
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      headers: { default: pageHeader() },
      footers: { default: pageFooter() },
      children: body,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync("/home/z/my-project/download/FAST_Full_Website_Report.docx", buf);
  console.log("written: FAST_Full_Website_Report.docx", buf.length, "bytes");
});
