/**
 * Thumbnail extractor tests. The extractor decides which image URL may
 * represent a news article; these tests pin every shape it will meet in
 * the wild and every rejection it must make. A dropped image is always
 * safe (the card renders its fallback tile); a smuggled one is not.
 */

import { describe, expect, it } from "bun:test";
import { extractThumb } from "../src/lib/thumb-extract";

const PAGE = "https://www.news.example/article";

describe("thumbnail extraction", () => {
  it("reads og:image in property-first order", () => {
    const html = `<html><head><meta property="og:image" content="https://cdn.example/pic.jpg"></head></html>`;
    expect(extractThumb(html, PAGE)).toBe("https://cdn.example/pic.jpg");
  });

  it("reads og:image in content-first order", () => {
    const html = `<html><head><meta content="https://cdn.example/pic.jpg" property="og:image"></head></html>`;
    expect(extractThumb(html, PAGE)).toBe("https://cdn.example/pic.jpg");
  });

  it("prefers og:image:secure_url over og:image", () => {
    const html = [
      '<meta property="og:image" content="https://insecure-cdn.example/a.jpg">',
      '<meta property="og:image:secure_url" content="https://secure-cdn.example/b.jpg">',
    ].join("");
    expect(extractThumb(html, PAGE)).toBe("https://secure-cdn.example/b.jpg");
  });

  it("falls back to twitter:image when no og tag exists", () => {
    const html = `<html><head><meta name="twitter:image" content="https://cdn.example/t.jpg"></head></html>`;
    expect(extractThumb(html, PAGE)).toBe("https://cdn.example/t.jpg");
  });

  it("reads twitter:image in content-first order too", () => {
    const html = `<html><head><meta content="https://cdn.example/t.jpg" name="twitter:image:src"></head></html>`;
    expect(extractThumb(html, PAGE)).toBe("https://cdn.example/t.jpg");
  });

  it("resolves relative paths against the final article URL", () => {
    const html = `<meta property="og:image" content="/img/preview.jpg">`;
    expect(extractThumb(html, PAGE)).toBe("https://www.news.example/img/preview.jpg");
  });

  it("decodes entities inside the content attribute", () => {
    const html = `<meta property="og:image" content="https://cdn.example/pic.jpg?w=1200&amp;h=630">`;
    expect(extractThumb(html, PAGE)).toBe("https://cdn.example/pic.jpg?w=1200&h=630");
  });

  it("rejects http image URLs", () => {
    const html = `<meta property="og:image" content="http://cdn.example/pic.jpg">`;
    expect(extractThumb(html, PAGE)).toBeUndefined();
  });

  it("rejects redirect-wrapped image URLs", () => {
    const html = `<meta property="og:image" content="https://track.example/img?url=https://cdn.example/pic.jpg">`;
    expect(extractThumb(html, PAGE)).toBeUndefined();
  });

  it("rejects a page with no preview tags at all", () => {
    expect(extractThumb("<html><head><title>x</title></head></html>", PAGE)).toBeUndefined();
    expect(extractThumb("", PAGE)).toBeUndefined();
  });

  it("rejects a malformed URL instead of throwing", () => {
    const html = `<meta property="og:image" content="https://cdn.example:portless/[broken">`;
    expect(extractThumb(html, PAGE)).toBeUndefined();
  });
});
