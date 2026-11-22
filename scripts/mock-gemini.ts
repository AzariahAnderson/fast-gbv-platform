/**
 * Failure drill for the live-data engine.
 * Modes:
 *   bun mock-gemini.ts 500      -> API failure responses
 *   bun mock-gemini.ts garbage  -> 200 with malformed JSON body
 */
const mode = process.argv[2] || "500";

Bun.serve({
  port: 9999,
  fetch() {
    if (mode === "500") {
      return new Response(JSON.stringify({ error: { message: "mock: internal failure" } }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
    // Malformed: valid HTTP, nonsense body.
    return new Response("<<<not json at all>>>", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
});
console.log(`mock gemini on :9999 mode=${mode}`);
