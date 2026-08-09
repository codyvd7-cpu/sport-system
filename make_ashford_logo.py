"""Crest for the Ashford Grammar demo school.

Deliberately different in both shape and colour from Ridgemont's (navy/gold
shield): Ashford is a rounded green/gold crest with a chevron and book motif.
Having visually distinct crests makes a branding leak between schools obvious
at a glance during demos and isolation testing.
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

S = 900
img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)

GREEN = (15, 118, 110, 255)     # matches schools.primary_color for Ashford
GOLD = (234, 179, 8, 255)
CREAM = (245, 245, 240, 255)
DARK = (6, 45, 42, 255)

cx = S // 2

# Crest outline: rounded shoulders tapering to a point
crest = [
    (170, 120), (730, 120),
    (730, 470),
    (700, 570), (620, 660), (cx, 780),
    (280, 660), (200, 570), (170, 470),
]
d.polygon(crest, fill=DARK)
d.line(crest + [crest[0]], fill=GOLD, width=12, joint='curve')

# Inner keyline
inner = [(x + (18 if x < cx else -18 if x > cx else 0),
          y + (18 if y < 300 else -14 if y > 600 else 0)) for x, y in crest]
d.line(inner + [inner[0]], fill=GREEN, width=5, joint='curve')

# Upper band
d.rectangle([190, 140, 710, 265], fill=GREEN)
d.line([(190, 265), (710, 265)], fill=GOLD, width=6)

# Chevron
d.polygon([(cx - 190, 430), (cx, 320), (cx + 190, 430),
           (cx + 190, 490), (cx, 380), (cx - 190, 490)], fill=GOLD)

# Open book motif beneath the chevron
d.polygon([(cx - 150, 560), (cx - 10, 530), (cx - 10, 640), (cx - 150, 665)], fill=CREAM)
d.polygon([(cx + 150, 560), (cx + 10, 530), (cx + 10, 640), (cx + 150, 665)], fill=CREAM)
d.line([(cx, 532), (cx, 640)], fill=GREEN, width=5)

# "AG" in the upper band
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 96)
except Exception:
    font = ImageFont.load_default()
text = 'AG'
bbox = d.textbbox((0, 0), text, font=font)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
d.text((cx - tw / 2 - bbox[0], 200 - th / 2 - bbox[1]), text, font=font, fill=CREAM)

img.save('public/schools/ashford-logo.png')
print('written public/schools/ashford-logo.png')
