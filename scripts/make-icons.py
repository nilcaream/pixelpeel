"""Makes the site's icons in public/ from the Cactus level (Pillow: python3 -I scripts/make-icons.py).

The picture is the level itself: its rows are read from src/levels.json and its colours from the pool in
src/palette.ts, so the icon is the level square for square. Each square is a whole number of the icon's
pixels, so the picture stays crisp, and it sits centred on the page's background. The maskable icon keeps
the whole picture inside the safe zone, the circle of 40% of the icon's width
(https://web.dev/articles/maskable-icon). Run it again whenever the Cactus scene or the pool changes.
"""

import json
import math
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public"
BACKGROUND = (0x1C, 0x1C, 0x22, 255)  # the page's background, --page in src/style.css
TITLE = "Cactus"


def picture() -> Image.Image:
    level = next(l for l in json.loads((ROOT / "src" / "levels.json").read_text()) if l["title"] == TITLE)
    rows = level["rows"]
    source = (ROOT / "src" / "palette.ts").read_text()
    pool = dict(re.findall(r"char: '(\w)', hex: '#([0-9a-f]{6})'", source))
    image = Image.new("RGBA", (len(rows[0]), len(rows)), BACKGROUND)
    for y, row in enumerate(rows):
        for x, c in enumerate(row):
            if c in pool:
                image.putpixel((x, y), tuple(int(pool[c][i : i + 2], 16) for i in (0, 2, 4)) + (255,))
    return image


def icon(image: Image.Image, size: int, square: int) -> Image.Image:
    """The picture with each of its squares `square` pixels wide, centred on a `size` icon."""
    canvas = Image.new("RGBA", (size, size), BACKGROUND)
    w, h = image.width * square, image.height * square
    canvas.alpha_composite(image.resize((w, h), Image.NEAREST), ((size - w) // 2, (size - h) // 2))
    return canvas


def fill(image: Image.Image, size: int, share: float) -> int:
    """The largest whole square size at which the picture's width takes at most `share` of the icon."""
    return max(1, math.floor(size * share / image.width))


def safe(image: Image.Image, size: int) -> int:
    """The largest whole square size at which the picture's corners stay inside the maskable safe circle."""
    return max(1, math.floor(0.8 * size / math.hypot(image.width, image.height)))


def main() -> None:
    OUT.mkdir(exist_ok=True)
    image = picture()
    icon(image, 180, fill(image, 180, 0.9)).save(OUT / "apple-touch-icon.png")
    icon(image, 192, fill(image, 192, 0.9)).save(OUT / "icon-192.png")
    icon(image, 512, fill(image, 512, 0.9)).save(OUT / "icon-512.png")
    icon(image, 512, safe(image, 512)).save(OUT / "icon-maskable-512.png")
    icon(image, 256, fill(image, 256, 0.94)).save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])


main()
