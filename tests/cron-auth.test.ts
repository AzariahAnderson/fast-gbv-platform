import { describe, expect, test, afterEach } from "bun:test";
import { cronAuthorized, sameOrigin } from "../src/lib/cron-auth";

/**
 * Focused security tests for the cron/refresh endpoint's two gates. The
 * secret must be required and compared in constant time when configured;
 * the POST path must reject cross-site origins. Nothing here may ever
 * print the secret itself.
 */
const SECRET = "test-cron-secret-value-not-a-real-credential";

function req(
  headers: Record<string, string> = {},
  url = "https://fast.example/api/refresh",
): Request {
  return new Request(url, { headers });
}

const originalSecret = process.env.CRON_SECRET;
afterEach(() => {
  if (originalSecret === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = originalSecret;
});

describe("cronAuthorized (GET, bearer auth)", () => {
  test("no CRON_SECRET configured: open (local dev and fresh deploys)", () => {
    delete process.env.CRON_SECRET;
    expect(cronAuthorized(req())).toBe(true);
    expect(cronAuthorized(req({ authorization: "Bearer wrong" }))).toBe(true);
  });

  test("configured: correct bearer token passes", () => {
    process.env.CRON_SECRET = SECRET;
    expect(cronAuthorized(req({ authorization: `Bearer ${SECRET}` }))).toBe(true);
  });

  test("configured: missing, malformed or wrong token fails", () => {
    process.env.CRON_SECRET = SECRET;
    expect(cronAuthorized(req())).toBe(false);
    expect(cronAuthorized(req({ authorization: SECRET }))).toBe(false); // no Bearer prefix
    expect(cronAuthorized(req({ authorization: "Basic 1234" }))).toBe(false);
    expect(cronAuthorized(req({ authorization: "Bearer wrong" }))).toBe(false);
    expect(cronAuthorized(req({ authorization: "Bearer " }))).toBe(false);
  });

  test("configured: prefix-of-secret and extension-of-secret both fail", () => {
    process.env.CRON_SECRET = SECRET;
    expect(cronAuthorized(req({ authorization: `Bearer ${SECRET.slice(0, 8)}` }))).toBe(false);
    expect(cronAuthorized(req({ authorization: `Bearer ${SECRET}x` }))).toBe(false);
  });

  test("configured: case difference in token fails", () => {
    process.env.CRON_SECRET = SECRET;
    expect(cronAuthorized(req({ authorization: `Bearer ${SECRET.toUpperCase()}` }))).toBe(false);
  });
});

describe("sameOrigin (POST CSRF gate)", () => {
  const host = { host: "fast.example" };

  test("no Origin header (curl/cron): allowed", () => {
    expect(sameOrigin(req(host))).toBe(true);
  });

  test("matching origin: allowed", () => {
    expect(sameOrigin(req({ ...host, origin: "https://fast.example" }))).toBe(true);
  });

  test("cross-site origin: forbidden", () => {
    expect(sameOrigin(req({ ...host, origin: "https://evil.example" }))).toBe(false);
    expect(sameOrigin(req({ ...host, origin: "https://fast.example.evil.net" }))).toBe(false);
    expect(sameOrigin(req({ ...host, origin: "null" }))).toBe(false);
  });

  test("unparseable Origin: forbidden", () => {
    expect(sameOrigin(req({ ...host, origin: "not a url" }))).toBe(false);
  });
});
