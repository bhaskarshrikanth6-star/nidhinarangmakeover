"""Turn the supplied logo (gold on a dark vignette, JPEG) into transparent web assets.
Uses only the supplied pixels: the dark backdrop is converted to transparency, nothing is redrawn.
Run:  python3 scripts/prepare-logo.py        (needs Pillow + numpy)"""
from PIL import Image
import numpy as np

SRC = 'source-assets/logo-original.jpg'
im = Image.open(SRC).convert('RGB')
a = np.asarray(im).astype(np.float32)
h, w, _ = a.shape
yy, xx = np.mgrid[0:h, 0:w]
r = np.hypot(xx - w / 2, yy - h / 2)
m = a.max(2)
chroma = a[..., 0] - a[..., 2]

# backdrop brightness as a function of distance from centre (median of non-gold pixels)
bins = np.linspace(0, r.max() + 1, 64)
idx = np.digitize(r, bins)
prof = np.zeros(len(bins) + 1)
for i in range(1, len(bins) + 1):
    sel = (idx == i) & (chroma < 14) & (m < 80)
    prof[i] = np.median(m[sel]) if sel.any() else (prof[i - 1] if i > 1 else 40)
bg = prof[idx]

alpha = np.clip((m - bg - 6) / (170.0 - bg), 0, 1)
alpha = np.where(chroma < 10, np.minimum(alpha, 0.0), alpha)   # neutral grey = backdrop
alpha = np.clip(alpha ** 0.85, 0, 1)
safe = np.maximum(alpha, 1e-3)[..., None]
rgb = (a - bg[..., None] * (1 - alpha[..., None])) / safe
rgb = np.clip(rgb, 0, 255)
rgba = np.dstack([rgb, alpha * 255]).astype(np.uint8)
out = Image.fromarray(rgba, 'RGBA')

# trim to the artwork with a small breathing margin (the artwork itself is untouched)
bbox = out.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
pad = int(0.03 * max(bbox[2] - bbox[0], bbox[3] - bbox[1]))
box = (max(0, bbox[0] - pad), max(0, bbox[1] - pad), min(w, bbox[2] + pad), min(h, bbox[3] + pad))
out = out.crop(box)
side = max(out.size)
sq = Image.new('RGBA', (side, side), (0, 0, 0, 0))
sq.paste(out, ((side - out.width) // 2, (side - out.height) // 2))
print('trimmed square', sq.size)

# transparent ("clear") versions: used directly on the dark sections
for size in (1024, 640, 384):
    s_ = sq.resize((size, size), Image.LANCZOS) if size != sq.width else sq
    s_.save(f'assets/img/logo-clear-{size}.webp', quality=95, method=6)
sq.resize((640, 640), Image.LANCZOS).save('assets/img/logo-clear-640.png', optimize=True)

# exact (opaque) versions of the supplied file: used for the round medallion on the light section
orig = Image.open(SRC).convert('RGB')
for size in (1024, 640, 320):
    o = orig if size == orig.width else orig.resize((size, size), Image.LANCZOS)
    o.save(f'assets/img/logo-{size}.webp', quality=95, method=6)
    o.save(f'assets/img/logo-{size}.jpg', quality=93, optimize=True)

# icons on the dark brand colour
bgc = (14, 12, 10, 255)
for name, size in (('favicon', 64), ('apple-touch-icon', 180)):
    base = Image.new('RGBA', (size, size), bgc)
    inner = sq.resize((int(size * 0.86), int(size * 0.86)), Image.LANCZOS)
    base.alpha_composite(inner, ((size - inner.width) // 2, (size - inner.height) // 2))
    base.convert('RGB').save(f'assets/{name}.png', optimize=True)

# preview for checking
for name, col in (('ink', (14, 12, 10)), ('ivory', (244, 237, 227))):
    bgim = Image.new('RGBA', (900, 900), col + (255,))
    bgim.alpha_composite(sq.resize((860, 860), Image.LANCZOS), (20, 20))
    bgim.convert('RGB').save(f'/tmp/claude-0/logo-on-{name}.png')
