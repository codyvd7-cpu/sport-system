"""
Generates per-sport hero backgrounds for the Altus portal.

Each is a stylised overhead view of that sport's actual playing surface —
real pitch markings, drawn in the sport's own brand colour, over a dark
base so white text and glass cards stay legible on top.

No photography, so no licensing or model-release exposure.
"""
from PIL import Image, ImageDraw, ImageFilter
import math
import os

W, H = 1600, 1000


def base_canvas(bg, accent, seed=0):
    """Dark base + soft directional glow in the sport's colour.

    Computed per-pixel at low resolution then upscaled — drawing concentric
    ellipses produced visible banding rings.
    """
    small_w, small_h = 200, 125
    glow = Image.new('RGB', (small_w, small_h))
    px = glow.load()
    sources = [(0.21, 0.12, 0.62, 0.34), (0.84, 0.88, 0.50, 0.22)]
    for y in range(small_h):
        for x in range(small_w):
            r = g = b = 0.0
            for sx, sy, rad, strength in sources:
                dx = (x / small_w - sx)
                dy = (y / small_h - sy) * (small_h / small_w) * (W / H)
                dist = math.sqrt(dx * dx + dy * dy) / rad
                if dist < 1:
                    f = (1 - dist) ** 2 * strength
                    r += accent[0] * f
                    g += accent[1] * f
                    b += accent[2] * f
            px[x, y] = (
                min(255, int(bg[0] + r)),
                min(255, int(bg[1] + g)),
                min(255, int(bg[2] + b)),
            )
    return glow.resize((W, H), Image.BICUBIC).filter(ImageFilter.GaussianBlur(12))


def finish(img, accent, vignette=200):
    """Grain, blur and vignette so foreground content always has contrast."""
    d = ImageDraw.Draw(img, 'RGBA')
    for y in range(0, H, 3):
        d.line([(0, y), (W, y)], fill=(255, 255, 255, 4))
    img = img.filter(ImageFilter.GaussianBlur(0.6))

    v = Image.new('L', (W, H), 0)
    vd = ImageDraw.Draw(v)
    vd.ellipse([-W // 4, -H // 4, W + W // 4, H + H // 4], fill=vignette)
    v = v.filter(ImageFilter.GaussianBlur(170))
    dark = Image.new('RGB', (W, H), (3, 5, 12))
    return Image.composite(img, dark, v)


def hex_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


# ── Hockey: astro pitch — 23m lines, shooting circles (D) ────────────────────
def hockey(accent):
    img = base_canvas((6, 16, 30), accent)
    d = ImageDraw.Draw(img, 'RGBA')
    L, R, T, B = 90, W - 90, 150, H - 150
    d.rectangle([L, T, R, B], outline=accent + (70,), width=3)
    d.line([(W // 2, T), (W // 2, B)], fill=accent + (45,), width=2)          # halfway
    for x in (L + 300, R - 300):                                              # 23m lines
        d.line([(x, T), (x, B)], fill=accent + (38,), width=2)
    for side in (0, 1):                                                        # shooting circles
        cx = L if side == 0 else R
        for i in range(0, 181, 3):
            a = math.radians(i - 90 if side == 0 else i + 90)
            d.ellipse([cx + 260 * math.cos(a) - 2, (T + B) // 2 + 260 * math.sin(a) - 2,
                       cx + 260 * math.cos(a) + 2, (T + B) // 2 + 260 * math.sin(a) + 2],
                      fill=accent + (55,))
        d.rectangle([cx - 8 if side else cx - 8, (T + B) // 2 - 60,
                     cx + 8, (T + B) // 2 + 60], fill=accent + (90,))          # goal
    return finish(img, accent)


# ── Rugby: pitch — try line, 22m, halfway, dead-ball, posts ──────────────────
def rugby(accent):
    img = base_canvas((26, 8, 10), accent)
    d = ImageDraw.Draw(img, 'RGBA')
    L, R, T, B = 80, W - 80, 140, H - 140
    d.rectangle([L, T, R, B], outline=accent + (65,), width=3)
    d.line([(W // 2, T), (W // 2, B)], fill=accent + (50,), width=3)          # halfway
    for x in (L + 180, R - 180):                                              # try lines
        d.line([(x, T), (x, B)], fill=accent + (58,), width=3)
    for x in (L + 400, R - 400):                                              # 22m
        d.line([(x, T), (x, B)], fill=accent + (34,), width=2)
    for x in (L + 290, R - 290):                                              # posts
        d.line([(x, (T + B) // 2 - 90), (x, (T + B) // 2 + 90)], fill=accent + (85,), width=5)
        d.line([(x - 26, (T + B) // 2 - 40), (x + 26, (T + B) // 2 - 40)], fill=accent + (85,), width=5)
    for x in range(L + 60, R - 40, 70):                                       # 5m dashes
        d.line([(x, T + 60), (x + 22, T + 60)], fill=accent + (26,), width=2)
        d.line([(x, B - 60), (x + 22, B - 60)], fill=accent + (26,), width=2)
    return finish(img, accent)


# ── Cricket: oval boundary, pitch strip, crease, inner ring ──────────────────
def cricket(accent):
    img = base_canvas((28, 20, 4), accent)
    d = ImageDraw.Draw(img, 'RGBA')
    cx, cy = W // 2, H // 2
    d.ellipse([cx - 640, cy - 400, cx + 640, cy + 400], outline=accent + (62,), width=3)
    d.ellipse([cx - 360, cy - 225, cx + 360, cy + 225], outline=accent + (30,), width=2)
    d.rectangle([cx - 26, cy - 165, cx + 26, cy + 165], fill=accent + (34,),
                outline=accent + (72,), width=2)
    for y in (cy - 150, cy + 150):                                            # creases
        d.line([(cx - 62, y), (cx + 62, y)], fill=accent + (88,), width=3)
    for y, s in ((cy - 158, 1), (cy + 158, -1)):                              # stumps
        for off in (-9, 0, 9):
            d.line([(cx + off, y), (cx + off, y + 16 * s)], fill=accent + (95,), width=2)
    return finish(img, accent)


# ── Swimming: lane ropes and pool markings ──────────────────────────────────
def swimming(accent):
    img = base_canvas((10, 12, 34), accent)
    d = ImageDraw.Draw(img, 'RGBA')
    lanes = 8
    lane_h = (H - 240) / lanes
    for i in range(lanes + 1):                                                # lane dividers
        y = 120 + i * lane_h
        d.line([(70, y), (W - 70, y)], fill=accent + (52,), width=3)
    for i in range(lanes):                                                    # lane floor lines
        y = 120 + i * lane_h + lane_h / 2
        d.line([(180, y), (W - 180, y)], fill=accent + (30,), width=8)
        d.line([(180, y), (240, y)], fill=accent + (60,), width=8)            # T at each end
        d.line([(W - 240, y), (W - 180, y)], fill=accent + (60,), width=8)
    d.line([(70, 120), (70, H - 120)], fill=accent + (75,), width=4)
    d.line([(W - 70, 120), (W - 70, H - 120)], fill=accent + (75,), width=4)
    return finish(img, accent)


# ── Rowing: water lanes with wake ripples ───────────────────────────────────
def rowing(accent):
    img = base_canvas((4, 26, 20), accent)
    d = ImageDraw.Draw(img, 'RGBA')
    for i in range(6):                                                        # buoy lanes
        y = 150 + i * ((H - 300) / 5)
        for x in range(90, W - 60, 46):
            d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=accent + (48,))
    for i in range(70):                                                       # ripples
        y = 130 + (i * 12) % (H - 260)
        x0 = (i * 137) % (W - 300)
        d.arc([x0, y - 7, x0 + 210, y + 7], 0, 180, fill=accent + (20,), width=2)
    return finish(img, accent)


# ── Water polo: pool with 2m / 5m / 6m markers ──────────────────────────────
def waterpolo(accent):
    img = base_canvas((4, 22, 30), accent)
    d = ImageDraw.Draw(img, 'RGBA')
    L, R, T, B = 90, W - 90, 150, H - 150
    d.rectangle([L, T, R, B], outline=accent + (66,), width=3)
    d.line([(W // 2, T), (W // 2, B)], fill=accent + (44,), width=2)
    for x, alpha in ((L + 110, 70), (L + 260, 46), (R - 110, 70), (R - 260, 46)):
        d.line([(x, T), (x, B)], fill=accent + (alpha,), width=3)
    for cx in (L, R):                                                          # goals
        d.rectangle([cx - 6, (T + B) // 2 - 75, cx + 6, (T + B) // 2 + 75], fill=accent + (92,))
    for i in range(45):                                                        # surface ripples
        y = 165 + (i * 17) % (B - T - 30)
        x0 = (i * 191) % (W - 260)
        d.arc([x0, y - 6, x0 + 175, y + 6], 0, 180, fill=accent + (16,), width=2)
    return finish(img, accent)


# ── Football: pitch — centre circle, penalty areas, goals ───────────────────
def football(accent):
    img = base_canvas((10, 22, 6), accent)
    d = ImageDraw.Draw(img, 'RGBA')
    L, R, T, B = 90, W - 90, 150, H - 150
    cy = (T + B) // 2
    d.rectangle([L, T, R, B], outline=accent + (66,), width=3)
    d.line([(W // 2, T), (W // 2, B)], fill=accent + (46,), width=2)
    d.ellipse([W // 2 - 120, cy - 120, W // 2 + 120, cy + 120], outline=accent + (52,), width=3)
    d.ellipse([W // 2 - 6, cy - 6, W // 2 + 6, cy + 6], fill=accent + (80,))
    for side in (0, 1):
        x = L if side == 0 else R
        sgn = 1 if side == 0 else -1
        px0, px1 = sorted([x, x + sgn * 210])
        d.rectangle([px0, cy - 200, px1, cy + 200], outline=accent + (50,), width=3)  # penalty area
        sx0, sx1 = sorted([x, x + sgn * 80])
        d.rectangle([sx0, cy - 100, sx1, cy + 100], outline=accent + (44,), width=2)  # six-yard
        gx0, gx1 = sorted([x, x + sgn * 10])
        d.rectangle([gx0, cy - 62, gx1, cy + 62], fill=accent + (88,))                # goal
    return finish(img, accent)


# ── Neutral: for login pages and generic screens ────────────────────────────
def neutral(accent, bg):
    img = base_canvas(bg, accent)
    d = ImageDraw.Draw(img, 'RGBA')
    for i in range(9):                                                         # motion sweeps
        x = -300 + i * 240
        d.polygon([(x, 0), (x + 120, 0), (x + 120 - 460, H), (x - 460, H)],
                  fill=accent + (10,))
    for gx in range(0, W, 64):
        d.line([(gx, 0), (gx, H)], fill=(255, 255, 255, 5))
    for gy in range(0, H, 64):
        d.line([(0, gy), (W, gy)], fill=(255, 255, 255, 5))
    return finish(img, accent, vignette=185)


SPORTS = {
    'hockey':    (hockey,    '#38bdf8'),
    'rugby':     (rugby,     '#f87171'),
    'cricket':   (cricket,   '#fbbf24'),
    'swimming':  (swimming,  '#818cf8'),
    'rowing':    (rowing,    '#34d399'),
    'waterpolo': (waterpolo, '#06b6d4'),
    'football':  (football,  '#a3e635'),
}

import os
os.makedirs('public/sports', exist_ok=True)

for name, (fn, colour) in SPORTS.items():
    img = fn(hex_rgb(colour))
    path = f'public/sports/{name}.jpg'
    img.save(path, quality=84, optimize=True)
    print(f'{path}  ({os.path.getsize(path)//1024}KB)')

for i, (colour, bg) in enumerate([('#3b82f6', (8, 14, 30)), ('#6366f1', (10, 12, 26)),
                                  ('#14b8a6', (6, 18, 24)), ('#8b5cf6', (14, 10, 26))], 1):
    img = neutral(hex_rgb(colour), bg)
    path = f'public/bg-hero-{i}.jpg'
    img.save(path, quality=84, optimize=True)
    print(f'{path}  ({os.path.getsize(path)//1024}KB)')
