"""Prepare FAST branding images for the footer band.

- FAST Motion Tech Logo: 2172x724 622KB -> 1200w optimized PNG (text needs crisp edges)
- You Are Loved banner:  2048x768 1.5MB -> 1600w JPEG q84 (photographic, JPEG wins)
Both keep their original aspect ratio and land in public/images/.
"""
from PIL import Image
import os

os.makedirs("public/images", exist_ok=True)

logo = Image.open("upload/FAST Motion Tech Logo.png").convert("RGB")
lw = 1200
lh = round(logo.height * lw / logo.width)
logo = logo.resize((lw, lh), Image.LANCZOS)
logo.save("public/images/fast-logo.png", optimize=True)
print("fast-logo.png", logo.size, os.path.getsize("public/images/fast-logo.png") // 1024, "KB")

banner = Image.open("upload/You Are Loved_ United in Hope.png").convert("RGB")
bw = 1600
bh = round(banner.height * bw / banner.width)
banner = banner.resize((bw, bh), Image.LANCZOS)
banner.save("public/images/you-are-loved-banner.jpg", quality=84, optimize=True, progressive=True)
print("you-are-loved-banner.jpg", banner.size, os.path.getsize("public/images/you-are-loved-banner.jpg") // 1024, "KB")
