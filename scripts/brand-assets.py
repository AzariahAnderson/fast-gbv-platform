#!/usr/bin/env python3
"""
Fast brand icon pipeline (beta 0.9.0-beta.3).

The uploaded FAST motion artwork has been dropped from the UI. All favicons
and PWA icons are now generated in-house: a flat, static, grey (taupe #605B51,
the palette's own grey) rounded nothing - just a square of colour with a bold
white "F" set in Noto Sans Bold. No SVG, no animation, no external artwork.

Inputs : /usr/share/fonts/truetype/chinese/NotoSansSC-Bold.ttf (Latin glyphs)
Outputs:
  src/app/favicon.ico                    16/32/48 multi-size ICO
  src/app/icon.png                       512x512
  src/app/apple-icon.png                 180x180
  public/icons/icon-192.png              192x192
  public/icons/icon-512.png              512x512
  public/icons/icon-maskable-512.png     512x512, glyph inside the safe zone

The "You are loved" banner JPEG in public/images is untouched; it stays the
footer artwork and the OG image.
"""

from PIL import Image, ImageDraw, ImageFont

FONT_PATH = "/usr/share/fonts/truetype/chinese/NotoSansSC-Bold.ttf"
GREY = (96, 91, 81, 255)     # #605B51, the palette taupe
WHITE = (255, 255, 255, 255)


def f_glyph(height: int) -> Image.Image:
    """Render a white bold "F" and trim it to its ink bounding box."""
    size = height * 3
    font = ImageFont.truetype(FONT_PATH, size)
    pad = size // 2
    img = Image.new("RGBA", (size + pad * 2, size + pad * 2), (0, 0, 0, 0))
    ImageDraw.Draw(img).text((pad + size // 2, pad + size // 2), "F",
                             font=font, fill=WHITE, anchor="mm")
    bbox = img.getbbox()
    img = img.crop(bbox)
    scale = height / img.size[1]
    return img.resize((max(1, round(img.size[0] * scale)), height), Image.LANCZOS)


def make_icon(size: int, glyph_ratio: float) -> Image.Image:
    """Grey square with the white F optically centred (nudged up half a
    percent because a lone capital sits heavy on the baseline)."""
    canvas = Image.new("RGBA", (size, size), GREY)
    glyph = f_glyph(round(size * glyph_ratio))
    x = (size - glyph.size[0]) // 2
    y = round((size - glyph.size[1]) / 2 - size * 0.005)
    canvas.alpha_composite(glyph, (x, y))
    return canvas


def og() -> None:
    """Static 1200x630 Open Graph share image, drawn in the site's own
    language: ink background, faint 72px grid, white FAST wordmark with the A
    in brand gold, and the tagline. Mirrors the splash screen."""
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), (69, 64, 64))  # #454040
    draw = ImageDraw.Draw(img)
    # Faint grid, same rhythm as the site's bg-grid utility.
    for x in range(72, W, 72):
        draw.line([(x, 0), (x, H)], fill=(84, 78, 78), width=1)
    for y in range(72, H, 72):
        draw.line([(0, y), (W, y)], fill=(84, 78, 78), width=1)
    draw.rectangle([24, 24, W - 24, H - 24], outline=(96, 91, 81), width=3)

    # Wordmark: FAST, A in brand gold.
    font_big = ImageFont.truetype(FONT_PATH, 190)
    gold = (216, 211, 101)
    white = (245, 242, 238)
    cx, cy = W // 2, H // 2 - 30
    # Measure the whole word, then draw letter by letter so the A can be gold.
    widths = []
    for ch in "FAST":
        box = draw.textbbox((0, 0), ch, font=font_big)
        widths.append(box[2] - box[0])
    total = sum(widths) + 6 * 3
    x = cx - total // 2
    for i, ch in enumerate("FAST"):
        box = draw.textbbox((0, 0), ch, font=font_big)
        draw.text((x - box[0], cy), ch, font=font_big,
                  fill=gold if ch == "A" else white, anchor="mm")
        x += widths[i] + 6

    # Brand rule under the wordmark.
    line_y = cy + 130
    draw.rectangle([cx - 190, line_y, cx + 190, line_y + 3], fill=gold)

    # Tagline.
    font_small = ImageFont.truetype(FONT_PATH, 34)
    draw.text((cx, line_y + 64),
              "Free, confidential, 24/7 GBV support for South Africa",
              font=font_small, fill=(196, 190, 180), anchor="mm")

    # Quiet footer strip.
    font_tiny = ImageFont.truetype(FONT_PATH, 24)
    draw.text((cx, H - 64), "0800 428 428 · No accounts · Works offline",
              font=font_tiny, fill=(150, 144, 134), anchor="mm")

    img.save("public/images/og.png", "PNG", optimize=True)


if __name__ == "__main__":
    make_icon(512, 0.58).save("src/app/icon.png", "PNG", optimize=True)
    make_icon(180, 0.58).save("src/app/apple-icon.png", "PNG", optimize=True)
    master = make_icon(256, 0.58)
    master.save("src/app/favicon.ico", format="ICO",
                sizes=[(16, 16), (32, 32), (48, 48)])
    make_icon(192, 0.58).save("public/icons/icon-192.png", "PNG", optimize=True)
    make_icon(512, 0.58).save("public/icons/icon-512.png", "PNG", optimize=True)
    # Maskable: keep the glyph well inside the 80% safe-zone circle.
    make_icon(512, 0.38).save("public/icons/icon-maskable-512.png", "PNG", optimize=True)
    og()
    print("icon set + og.png regenerated: static raster only")
