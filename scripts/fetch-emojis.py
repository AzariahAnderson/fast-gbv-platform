#!/usr/bin/env python3
"""Fetch candidate Noto animated emojis, downscale to the site's 96px-canvas
webp convention and report per-frame visibility so hero picks never vanish
mid-loop. Standalone on purpose: make-assets.py also regenerates PWA icons,
which is pointless work for an emoji swap.

Usage: python3 scripts/fetch-emojis.py 1f496 1f64f ...   (Noto codepoints)
"""
import os
import sys
import urllib.request

from PIL import Image

ROOT = "/home/z/my-project"
EMOJI_DIR = os.path.join(ROOT, "public", "emojis")
MAX_FRAMES = 24  # matches make-assets.py


def downscale(code: str) -> str:
    src = os.path.join(EMOJI_DIR, f"{code}.webp")
    if not os.path.exists(src):
        url = f"https://fonts.gstatic.com/s/e/notoemoji/latest/{code}/512.webp"
        print(f"downloading {code}")
        urllib.request.urlretrieve(url, src)
    im = Image.open(src)
    n = getattr(im, "n_frames", 1)
    step = max(1, -(-n // MAX_FRAMES))
    frames, durations = [], []
    for i in range(0, n, step):
        im.seek(i)
        frames.append(im.convert("RGBA").resize((96, 96), Image.LANCZOS))
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
    os.remove(src)  # keep only the small set, like make-assets.py
    return out


def visibility(path: str) -> tuple[int, int, int]:
    """Return (frames, near_empty_frames, min/max opaque ratio x1000)."""
    im = Image.open(path)
    n = getattr(im, "n_frames", 1)
    vis = []
    for i in range(n):
        im.seek(i)
        px = im.convert("RGBA").load()
        cnt = sum(
            1
            for y in range(0, 96, 3)
            for x in range(0, 96, 3)
            if px[x, y][3] > 60
        )
        vis.append(cnt)
    full = max(vis) or 1
    empty = sum(1 for v in vis if v < full * 0.12)
    return n, empty, min(vis) * 1000 // full


if __name__ == "__main__":
    codes = sys.argv[1:]
    if not codes:
        sys.exit("pass candidate codepoints, e.g. 1f496 1f64f")
    for code in codes:
        out = downscale(code)
        n, empty, min_ratio = visibility(out)
        size = os.path.getsize(out)
        verdict = "OK" if empty == 0 else "VANISHES"
        print(
            f"{code}: {size:6d}B frames={n:2d} near-empty={empty}/{n}"
            f" min/max={min_ratio:3d}% -> {verdict}"
        )
