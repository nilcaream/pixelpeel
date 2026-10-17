"""Makes the site's icons in public/ from the house picture in src/level.ts (Pillow: python3 -I scripts/make-icons.py).

The picture's rows and colours are read from src/level.ts, so the icon is the first level itself, drawn with
square pixels on the page's background. The maskable icon has the picture at MASKABLE_SCALE so that most of
it sits inside the safe zone, the circle of 40% of the icon's width (https://web.dev/articles/maskable-icon).
"""

import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public"
BACKGROUND = (0x1C, 0x1C, 0x22, 255)  # the page's background, --page in src/style.css
MASKABLE_SCALE = 0.7


def picture() -> Image.Image:
    source = (ROOT / "src" / "level.ts").read_text()
    rows = re.findall(r"^\s*'([A-Z]+)',$", source, re.M)
    palette = {k: v for k, v in re.findall(r"([A-Z]): '#([0-9a-f]{6})'", source)}
    image = Image.new("RGBA", (len(rows[0]), len(rows)))
    for y, row in enumerate(rows):
        for x, c in enumerate(row):
            image.putpixel((x, y), tuple(int(palette[c][i : i + 2], 16) for i in (0, 2, 4)) + (255,))
    return image


def icon(image: Image.Image, size: int, scale: float) -> Image.Image:
    canvas = Image.new("RGBA", (size, size), BACKGROUND)
    inner = round(size * scale)
    offset = round((size - inner) / 2)
    canvas.alpha_composite(image.resize((inner, inner), Image.NEAREST), (offset, offset))
    return canvas


def main() -> None:
    OUT.mkdir(exist_ok=True)
    image = picture()
    icon(image, 180, 0.9).save(OUT / "apple-touch-icon.png")
    icon(image, 192, 0.9).save(OUT / "icon-192.png")
    icon(image, 512, 0.9).save(OUT / "icon-512.png")
    icon(image, 512, MASKABLE_SCALE).save(OUT / "icon-maskable-512.png")
    icon(image, 256, 0.94).save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])


main()
