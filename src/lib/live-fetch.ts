import "server-only";

import { promises as fs } from "fs";
import path from "path";
import type { LiveData } from "./live-types";
import { BASELINE } from "./live-types";
import { sanitizeData } from "./live-sanitize";

/**
 * Hourly AI data service with a three engine chain.
 *
 * 1. Gemini flash with Google Search grounding (the user's own key).
 * 2. Gemini flash without tools, in case grounding quota runs dry.
 * 3. A platform web search engine: real results are fetched first and an
 *    LLM is only allowed to compose them, never to invent.
 *
 * Whatever engine answers first is cached in memory and on disk, so at most
 * one generation runs per hour no matter how many visitors arrive, and if
 * every engine fails the verified baseline still goes out. A visitor never
 * waits on any of this: the read path returns the cached payload instantly.
 */

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const BASE_URL = process.env.GEMINI_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";
const ENDPOINT = `${BASE_URL}/models/${MODEL}:generateContent`;
const TTL_MS = 55 * 60 * 1000; // regenerate once an hour
const MIN_INTERVAL_MS = 9 * 60 * 1000; // hard spend ceiling per engine chain
const TIMEOUT_MS = 45 * 1000;

type CacheState = {
  data: LiveData;
  fetchedAt: number;
};

const g = globalThis as unknown as {
  __fastLive?: CacheState;
  __fastLiveJob?: Promise<LiveData>;
  /** Set for this process lifetime when Gemini answers that it will never
   * serve this region, so later refreshes skip straight to the fallback. */
  __fastGeminiBlocked?: boolean;
};

function state(): CacheState {
  if (!g.__fastLive) {
    g.__fastLive = { data: BASELINE, fetchedAt: 0 };
  }
  return g.__fastLive;
}

function cacheFile(): string {
  const dir = process.env.VERCEL ? "/tmp" : path.join(process.cwd(), ".data");
  return path.join(dir, "live-cache.json");
}

/** Returns the cached payload together with the time it was written. */
async function readCacheFile(): Promise<CacheState | null> {
  try {
    const raw = await fs.readFile(cacheFile(), "utf8");
    const parsed = JSON.parse(raw) as CacheState;
    if (parsed?.data?.stats?.length) {
      return { data: sanitize(parsed.data), fetchedAt: parsed.fetchedAt || 0 };
    }
  } catch {
    /* no cache yet */
  }
  return null;
}

async function writeCacheFile(data: LiveData): Promise<void> {
  try {
    await fs.mkdir(path.dirname(cacheFile()), { recursive: true });
    await fs.writeFile(
      cacheFile(),
      JSON.stringify({ data, fetchedAt: Date.now() }),
      "utf8",
    );
  } catch {
    /* read-only filesystem, memory cache still works */
  }
}

/* ------------------------------ sanitising ------------------------------ */

/**
 * The normaliser every payload passes through. The pure implementation
 * lives in live-sanitize.ts (dependency free, unit tested against every
 * failure mode); here it is wired to the in-memory cache so a partially
 * valid payload keeps the last good fields instead of losing them.
 */
export function sanitize(raw: unknown): LiveData {
  return sanitizeData(raw, state().data);
}

/* ------------------------------ shared prompt ---------------------------- */

const SHAPE = `{"stats":[{"value":"","label":"","source":"","sourceUrl":""}],"news":[{"title":"","summary":"","source":"","sourceUrl":"","date":""}],"encouragement":["","","","","","","","","",""],"tip":""}`;

function buildRules(): string {
  return `Rules:
- stats: exactly 4 items with verified South African gender-based violence figures from credible publishers (HSRC, SAMRC, WHO, SAPS, Stats SA, UNODC, government departments or major news investigations). "value" is a short display string such as "1 in 3". Each item carries the publishing organisation plus year in "source" and a real https page in "sourceUrl".
- news: exactly 3 real items about GBV response, policy, shelters, prosecutions or prevention in South Africa, published by established outlets (SABC News, News24, Daily Maverick, IOL, eNCA, Mail & Guardian, EWN, government releases). Include the publication name, the article https URL and the publish date as YYYY-MM-DD. If you cannot ground an item, drop it rather than inventing it.
- encouragement: exactly 10 short compassionate lines (max 16 words each), a mix addressed to survivors, to people worried about someone else, and to people choosing to stop harming. No numbers, no clichés, no repeated openings.
- tip: one practical personal-safety or support tip, max 30 words.
- Never invent URLs, dates or figures. Omit a sourceUrl rather than fabricating one.
- Answer with ONLY valid JSON, no markdown fences, in exactly this shape:
${SHAPE}`;
}

/* --------------------------- engine 1 and 2: gemini ---------------------- */

function extractText(payload: unknown): string {
  const data = payload as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  return (
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("") ?? ""
  );
}

function stripFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

async function callGemini(useSearch: boolean): Promise<LiveData> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("missing GEMINI_API_KEY");

  const body: Record<string, unknown> = {
    contents: [
      {
        parts: [
          {
            text: `You are the live data editor for Fast, a South African gender-based violence support website. Today is ${new Date().toISOString()}.

${buildRules()}`,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.25,
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
    },
  };
  if (useSearch) body.tools = [{ googleSearch: {} }];

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    // Surface the real reason in the log (quota, geo block, bad key...)
    // instead of a bare status code, and remember permanent rejections.
    const detail = await res.text().catch(() => "");
    const reason = (() => {
      try {
        return JSON.parse(detail)?.error?.message ?? "";
      } catch {
        return detail.slice(0, 140);
      }
    })();
    if (/location is not supported|API key not valid/i.test(reason)) {
      g.__fastGeminiBlocked = true;
    }
    throw new Error(`gemini ${res.status}${reason ? `: ${reason.slice(0, 160)}` : ""}`);
  }
  const text = extractText(await res.json());
  return sanitize({ ...JSON.parse(stripFences(text)), generator: "gemini" });
}

/* --------------------- engine 3: platform web search --------------------- */

type SearchItem = { url: string; name: string; snippet: string; host_name: string; date: string };

async function callSearchEngine(): Promise<LiveData> {
  const mod = await import("z-ai-web-dev-sdk");
  const zai = await mod.default.create();

  const [statResults, newsResults] = await Promise.all([
    zai.functions.invoke("web_search", {
      query: "South Africa gender-based violence statistics femicide prevalence HSRC study",
      num: 8,
      recency_days: 365,
    }),
    zai.functions.invoke("web_search", {
      query: "gender-based violence South Africa news shelters protection order",
      num: 10,
      recency_days: 45,
    }),
  ]);

  const shape = (items: SearchItem[] | undefined) =>
    (items ?? [])
      .slice(0, 10)
      .map((r) => `- title: ${r.name} | publisher: ${r.host_name} | url: ${r.url} | date: ${r.date || "unknown"} | snippet: ${r.snippet}`)
      .join("\n");

  const completion = (await zai.chat.completions.create({
    messages: [
      {
        role: "system",
        content:
          "You are the live data editor for a South African GBV support site. You only use the search results given to you, you never invent sources, URLs or dates, and you answer with JSON only.",
      },
      {
        role: "user",
        content: `Today is ${new Date().toISOString()}.

${buildRules()}

Statistics search results:
${shape(statResults as SearchItem[])}

News search results:
${shape(newsResults as SearchItem[])}

For the news section choose the 3 most relevant and most recent items from the news search results above and copy their publisher, url and date exactly. Prefer mainstream outlets (SABC News, SAnews, News24, Daily Maverick, IOL, eNCA, EWN, government sites) and skip social media links when a news site or government page is available. For the statistics section prefer figures stated in the results; if none carry a figure, use the most established published national statistics you are certain of and link the official publisher domain (https://www.hsrc.ac.za, https://www.samrc.ac.za, https://www.who.int, https://www.saps.gov.za).`,
      },
    ],
    thinking: { type: "disabled" },
  })) as { choices?: { message?: { content?: string } }[] };

  const text = completion?.choices?.[0]?.message?.content ?? "";
  return sanitize({ ...JSON.parse(stripFences(text)), generator: "websearch" });
}

/* ------------------------------ orchestration ---------------------------- */

/**
 * Generate once, guarding against thundering herds: concurrent callers share
 * one in-flight job, and the engines run cheapest first.
 */
async function generate(): Promise<LiveData> {
  if (g.__fastLiveJob) return g.__fastLiveJob;
  const job = (async () => {
    // Cheapest first. Gemini is skipped entirely when this server knows the
    // key cannot work from here (missing key, unsupported region), which
    // saves two dead timeouts on every refresh in those deployments.
    const geminiDead = g.__fastGeminiBlocked === true || !process.env.GEMINI_API_KEY;
    const attempts: [string, () => Promise<LiveData>][] = geminiDead
      ? [["websearch", callSearchEngine]]
      : [
          ["gemini+search", () => callGemini(true)],
          ["gemini", () => callGemini(false)],
          ["websearch", callSearchEngine],
        ];
    for (const [name, run] of attempts) {
      try {
        const data = await run();
        state().data = data;
        state().fetchedAt = Date.now();
        await writeCacheFile(data);
        console.log(`[live] refreshed via ${name}`);
        return data;
      } catch (err) {
        console.error(`[live] ${name} failed:`, (err as Error).message);
      }
    }
    // Every engine failed: keep whatever we had (memory > file > baseline)
    // and schedule the next attempt for roughly five minutes from now.
    const file = await readCacheFile();
    const data = file?.data ?? state().data ?? BASELINE;
    state().data = data;
    state().fetchedAt = Date.now() - TTL_MS + 5 * 60 * 1000;
    return data;
  })().finally(() => {
    g.__fastLiveJob = undefined;
  });
  g.__fastLiveJob = job;
  return job;
}

/** Cheap read path: memory, then the disk cache, then a background refresh. */
export async function getLive(): Promise<LiveData> {
  const current = state();
  const age = Date.now() - current.fetchedAt;
  if (current.fetchedAt > 0 && age < TTL_MS) {
    return current.data;
  }
  if (current.fetchedAt === 0) {
    // Cold instance: adopt the last cached payload, fresh or stale, so a
    // visitor never waits on a generation and never sees an empty section.
    const file = await readCacheFile();
    if (file) {
      current.data = file.data;
      current.fetchedAt = file.fetchedAt;
    }
  }
  if (Date.now() - state().fetchedAt >= TTL_MS) {
    // Non-blocking refresh: visitors never wait on a generation.
    void generate();
    // Serve the last valid payload right now; the fresh one lands in the
    // cache for the next request.
    return state().data;
  }
  return current.data;
}

/** Forced refresh used by the hourly cron and the manual refresh button. */
export async function refreshLive(): Promise<{ data: LiveData; refreshed: boolean }> {
  const current = state();
  const age = Date.now() - current.fetchedAt;
  if (current.fetchedAt > 0 && age < MIN_INTERVAL_MS && g.__fastLiveJob === undefined) {
    return { data: current.data, refreshed: false };
  }
  if (current.fetchedAt === 0) {
    // Cold instance: a recently written disk cache means another instance
    // just generated, so there is no need to spend engine quota again.
    const file = await readCacheFile();
    if (file && file.fetchedAt > 0 && Date.now() - file.fetchedAt < MIN_INTERVAL_MS) {
      current.data = file.data;
      current.fetchedAt = file.fetchedAt;
      return { data: current.data, refreshed: false };
    }
  }
  const data = await generate();
  return { data, refreshed: true };
}
