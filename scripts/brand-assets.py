#!/usr/bin/env python3
"""
Fast brand icon pipeline (beta 0.9.0-beta.2).

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
    print("icon set regenerated: grey bg, white F, static raster only")
