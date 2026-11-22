#!/usr/bin/env python3
"""
Brand asset pipeline for the Fast beta.

Inputs (user uploads, never modified):
  upload/FAST Motion Tech Logo.png       2172x724 RGBA, transparent background
  upload/You Are Loved_ United in Hope.png 2048x768 RGB banner

Outputs:
  public/images/fast-logo.png            trimmed RGBA logo, 1200px wide
  public/images/you-are-loved-banner.jpg 1600x600 JPEG q85
  src/app/icon.png                       512x512 square, logo on black
  src/app/apple-icon.png                 180x180 square, logo on black
  src/app/favicon.ico                    16/32/48 multi-size ICO
  public/icons/icon-192.png              192x192 square
  public/icons/icon-512.png              512x512 square
  public/icons/icon-maskable-512.png     512x512, artwork inside the safe zone

The logo artwork is used exactly as supplied: it is only trimmed, scaled and
centred on a black square that matches the site's dark ink palette. No
recoloring, no redrawn artwork.
"""

from PIL import Image

LOGO_SRC = "upload/FAST Motion Tech Logo.png"
BANNER_SRC = "upload/You Are Loved_ United in Hope.png"


def trimmed_logo() -> Image.Image:
    """Trim fully transparent margins so the artwork fills its box."""
    logo = Image.open(LOGO_SRC).convert("RGBA")
    bbox = logo.getchannel("A").getbbox()
    if bbox:
        logo = logo.crop(bbox)
    return logo


def save_logo(out_path: str, target_width: int) -> tuple[int, int]:
    logo = trimmed_logo()
    w, h = logo.size
    new_h = round(h * target_width / w)
    logo = logo.resize((target_width, new_h), Image.LANCZOS)
    logo.save(out_path, "PNG", optimize=True)
    return logo.size


def square_icon(out_path: str, size: int, art_ratio: float, fmt: str = "PNG") -> None:
    """Centre the logo on a black square; art_ratio is art width / canvas width."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    logo = trimmed_logo()
    art_w = round(size * art_ratio)
    art_h = round(logo.size[1] * art_w / logo.size[0])
    if art_h > size:
        art_h = round(size * 0.9)
        art_w = round(logo.size[0] * art_h / logo.size[1])
    art = logo.resize((art_w, art_h), Image.LANCZOS)
    canvas.alpha_composite(art, ((size - art_w) // 2, (size - art_h) // 2))
    canvas.convert("RGB" if fmt == "ICO" else "RGBA").save(out_path, fmt)


def favicon(out_path: str, art_ratio: float = 0.86) -> None:
    """One 256px master; PIL derives crisp 16/32/48 ICO frames from it."""
    canvas = Image.new("RGBA", (256, 256), (0, 0, 0, 255))
    logo = trimmed_logo()
    art_w = round(256 * art_ratio)
    art_h = round(logo.size[1] * art_w / logo.size[0])
    art = logo.resize((art_w, art_h), Image.LANCZOS)
    canvas.alpha_composite(art, ((256 - art_w) // 2, (256 - art_h) // 2))
    canvas.save(out_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])


def banner() -> None:
    src = Image.open(BANNER_SRC).convert("RGB")
    src.resize((1600, 600), Image.LANCZOS).save(
        "public/images/you-are-loved-banner.jpg", "JPEG", quality=85, optimize=True, progressive=True
    )


if __name__ == "__main__":
    print("fast-logo.png:", save_logo("public/images/fast-logo.png", 1200))
    banner()
    print("you-are-loved-banner.jpg: 1600x600")
    square_icon("src/app/icon.png", 512, 0.86)
    square_icon("src/app/apple-icon.png", 180, 0.86)
    favicon("src/app/favicon.ico")
    square_icon("public/icons/icon-192.png", 192, 0.86)
    square_icon("public/icons/icon-512.png", 512, 0.86)
    square_icon("public/icons/icon-maskable-512.png", 512, 0.62)
    print("done")
