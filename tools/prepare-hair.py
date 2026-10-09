#!/usr/bin/env python3
"""Prepare a hair photograph for the website.

Usage:  python3 tools/prepare-hair.py path/to/original.jpg
Needs:  pip install pillow

Writes responsive WebP + JPEG files and assets/img/hair-feature.json. The next `npm run build`
detects the manifest and adds the photograph to the Gallery automatically.
The photograph is never upscaled: widths larger than the original are skipped.
Enhancement is deliberately light: gentle contrast, mild sharpening, no skin or face edits.
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageEnhance, ImageFilter, ImageOps

src = Path(sys.argv[1])
out = Path(__file__).resolve().parent.parent / "assets" / "img"
im = ImageOps.exif_transpose(Image.open(src)).convert("RGB")
w, h = im.size
print(f"source: {w}x{h}")

widths = sorted({min(w, t) for t in (800, 1400, 2000)})
variants = []
for target in widths:
    t = im if target == w else im.resize((target, round(h * target / w)), Image.LANCZOS)
    t = ImageEnhance.Contrast(t).enhance(1.04)
    t = t.filter(ImageFilter.UnsharpMask(radius=1.0, percent=45, threshold=3))
    webp = f"hair-feature-{target}.webp"
    t.save(out / webp, quality=90, method=6)
    t.save(out / f"hair-feature-{target}.jpg", quality=91, optimize=True)
    variants.append({"w": target, "webp": webp})
    print("wrote", target, t.size)

best = variants[-1]["w"]
(out / "hair-feature.json").write_text(json.dumps({
    "variants": variants,
    "jpg": f"hair-feature-{best}.jpg",
    "w": best,
    "h": round(h * best / w),
}, indent=2))
print("wrote hair-feature.json")
