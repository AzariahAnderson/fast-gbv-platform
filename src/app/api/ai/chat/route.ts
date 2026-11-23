import "server-only";
import { NextRequest } from "next/server";
import { CRISIS_LINE, DIRECTORY } from "@/lib/numbers";

/**
 * FAST Guide — the one AI surface in the product. The Gemini key lives on
 * the server only; the browser receives a plain text stream. Responses
 * are governed by a fixed safety prompt (see GUARDRAILS below) and the
 * route enforces a message cap so the API cannot be run as a free proxy.
 *
 * Nothing is persisted here: privacy is the default. Saving a
 * conversation is an explicit action the client performs against
 * ai_conversations/ai_messages, protected by RLS.
 */

export const runtime = "nodejs";
export const maxDuration = 60;

const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const BASE_URL =
  process.env.GEMINI_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta";

/** Every crisis number below comes from the directory — never typed here. */
const directoryNumber = (name: string) => {
  const entry = DIRECTORY.find((d) => d.name === name);
  if (!entry) throw new Error(`Directory entry "${name}" missing for the Guide`);
  return entry.number;
};
const GBV = CRISIS_LINE.display;
const SAPS = directoryNumber("SAPS, South African Police Service");
const EMERGENCY = directoryNumber("Cellphone emergency");
const CHILDLINE = directoryNumber("Childline South Africa");

const GUARDRAILS = `You are the FAST Guide, part of FAST, a free South African platform that supports people affected by gender-based violence. You are calm, warm, practical and human. You speak like a caring, knowledgeable friend from South Africa — plain English, short sentences, no jargon. You are not a chatbot novelty; every reply should leave the person with something real they can do.

Non-negotiable rules:
- You are NOT a therapist, counsellor, lawyer or emergency service. Never imply otherwise.
- You NEVER diagnose anyone.
- You never tell a person to stay in a dangerous situation, and you never tell a person to confront or retaliate against someone who may hurt them.
- When a message describes immediate danger, your FIRST move is the GBV Command Centre: ${GBV} (free, 24 hours), or SAPS ${SAPS}, or ${EMERGENCY} from any cellphone. Say it plainly, early in the reply, once — then still help.
- You never promise confidentiality, outcomes, protection or intervention. You can say what services are designed to do, not what they will do in a specific case.
- You never give instructions that could help someone harm themselves or others. If someone talks about ending their life, respond with care and point to the GBV Command Centre ${GBV} or Childline ${CHILDLINE} (for anyone under 18), and encourage contacting a person they trust right now.
- You do not ask for, encourage, or repeat personal identifying details. If a user shares their full name, address, ID number, phone number, password or financial details, gently say they don't need to share that here and continue with what actually matters.
- You never invent statistics, research results, organisations, shelters or case numbers. If you are not sure, say what you are sure of and suggest where verified help lives (Fast's emergency section).
- Keep answers short and structured: a sentence of acknowledgement, then a few clear points, then one concrete next step. Never more than ~200 words unless the person clearly needs more detail.
- Offer where Fast can take them when it genuinely helps: the emergency directory ("Get help now"), safety plans, a trusted family circle, or reading the signs. Never push features.

Tone: dignity first. The person is never at fault for someone else's violence. Avoid clinical distance and avoid toxic positivity. It is fine to say "that sounds frightening" in one sentence.`;

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  let body: { messages?: { role: "user" | "assistant"; content: string }[] } = {};
  try {
    body = await req.json();
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  const messages = (body.messages ?? [])
    .filter((m) => typeof m.content === "string" && m.content.length > 0)
    .slice(-12); // enough context, bounded cost

  if (messages.length === 0) {
    return new Response("Bad request", { status: 400 });
  }

  if (!key) {
    // Honest, visible state: without the key the Guide cannot speak.
    const notice =
      "The FAST Guide is not connected right now — it needs the owner to set a fresh Gemini key on the server. " +
      `Everything else in Fast still works, and if you need help immediately, call the GBV Command Centre on ${GBV} (free, 24 hours).`;
    return new Response(notice, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const endpoint = `${BASE_URL}/models/${MODEL}:streamGenerateContent?alt=sse`;

  const upstream = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: GUARDRAILS }] },
      generationConfig: { temperature: 0.7, maxOutputTokens: 600 },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      ],
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content.slice(0, 4000) }],
      })),
    }),
  });

  if (!upstream.ok || !upstream.body) {
    // Never leak the provider error or the key: one calm sentence.
    return new Response(
      `The Guide could not answer just now. Please try again in a moment — and if you are in danger, call ${GBV}.`,
      { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  // Pass the SSE through, translating each chunk to plain text deltas.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          for (const line of buffer.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const json = trimmed.slice(5).trim();
            if (!json || json === "[DONE]") continue;
            try {
              const parsed = JSON.parse(json) as {
                candidates?: { content?: { parts?: { text?: string }[] } }[];
              };
              const text =
                parsed.candidates?.[0]?.content?.parts
                  ?.map((p) => p.text ?? "")
                  .join("") ?? "";
              if (text) controller.enqueue(encoder.encode(text));
            } catch {
              // partial JSON across chunks — the next line completes it
            }
          }
          buffer = buffer.slice(buffer.lastIndexOf("\n") + 1);
        }
      } finally {
        controller.close();
        reader.releaseLock();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
