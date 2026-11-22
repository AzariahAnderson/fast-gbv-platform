#!/usr/bin/env python3
"""Build all static assets for the Fast PWA:
1. Downscale Noto animated emoji WebPs from 512px to 128px (data friendly).
2. Generate PWA icons (192, 512, maskable 512, apple 180, favicon 32) with PIL.
"""
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = "/home/z/my-project"
EMOJI_DIR = os.path.join(ROOT, "public", "emojis")
ICON_DIR = os.path.join(ROOT, "public", "icons")
APP_DIR = os.path.join(ROOT, "src", "app")

# ---------------- 1. Emoji downscaling ----------------
# Only the six always-visible animations: the seedling (1f331) grows out of
# nothing and the star (1f31f) twinks to black for whole frames mid-loop,
# and an emoji that vanishes reads as a broken image, not as charm.
KEEP = ["2728", "1f49b", "1f4aa", "1f91d", "1fac2", "1f49a"]
MAX_FRAMES = 24

import urllib.request

for code in KEEP:
    src = os.path.join(EMOJI_DIR, f"{code}.webp")
    if not os.path.exists(src):
        url = f"https://fonts.gstatic.com/s/e/notoemoji/latest/{code}/512.webp"
        print(f"re-downloading {code}")
        urllib.request.urlretrieve(url, src)
    im = Image.open(src)
    n = getattr(im, "n_frames", 1)
    step = max(1, -(-n // MAX_FRAMES))  # ceil division
    frames = []
    durations = []
    for i in range(0, n, step):
        im.seek(i)
        frame = im.convert("RGBA").resize((96, 96), Image.LANCZOS)
        frames.append(frame)
        durations.append(im.info.get("duration", 80) * step)
    out = os.path.join(EMOJI_DIR, f"{code}-128.webp")
    frames[0].save(
        out,
        format="WEBP",
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        method=6,
        quality=58,
    )
    print(f"{code}: {os.path.getsize(out)} bytes, {len(frames)} frames")

# Remove heavy originals so only the small set ships
for f in os.listdir(EMOJI_DIR):
    if not f.endswith("-128.webp"):
        os.remove(os.path.join(EMOJI_DIR, f))

# ---------------- 2. PWA icons ----------------
os.makedirs(ICON_DIR, exist_ok=True)
BG = (69, 64, 64, 255)        # #454040
FG = (230, 240, 130, 255)     # #E6F082 lime
GOLD = (216, 211, 101, 255)   # #D8D365

FONT_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/chinese/NotoSansSC-Bold.ttf",
    "/usr/share/fonts/truetype/chinese/NotoSansSC-Black.ttf",
]
font_file = next((p for p in FONT_PATHS if os.path.exists(p)), None)
print("icon font:", font_file)


def draw_icon(size: int, path: str, radius_ratio: float, pad_ratio: float) -> None:
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * radius_ratio)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=BG)
    font = ImageFont.truetype(font_file, int(size * (1 - 2 * pad_ratio)))
    bbox = d.textbbox((0, 0), "F", font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    x = (size - w) // 2 - bbox[0]
    y = (size - h) // 2 - bbox[1] - int(size * 0.02)
    d.text((x, y), "F", font=font, fill=FG)
    bar_w = int(size * 0.30)
    bar_h = max(2, int(size * 0.035))
    bx = (size - bar_w) // 2
    by = y + bbox[3] + int(size * 0.075)
    d.rounded_rectangle([bx, by, bx + bar_w, by + bar_h], radius=bar_h // 2, fill=GOLD)
    img.save(path, format="PNG")
    print(path, os.path.getsize(path), "bytes")


draw_icon(192, os.path.join(ICON_DIR, "icon-192.png"), 0.22, 0.28)
draw_icon(512, os.path.join(ICON_DIR, "icon-512.png"), 0.22, 0.28)
draw_icon(512, os.path.join(ICON_DIR, "icon-maskable-512.png"), 0.0, 0.36)  # full-bleed, safe zone
draw_icon(180, os.path.join(APP_DIR, "apple-icon.png"), 0.22, 0.28)
draw_icon(512, os.path.join(APP_DIR, "icon.png"), 0.22, 0.28)
draw_icon(32, os.path.join(APP_DIR, "favicon.png"), 0.30, 0.26)
print("done")
