"""Makes the site's icons in public/ from the logo (Pillow: python3 -I scripts/make-icons.py).

The logo is the Cactus level made square: src/logo.ts draws the scene on for a few rows of sky above and
sand below, and scripts/logo-rows.ts prints those rows with the pool's colours. Each square is a whole
number of the icon's pixels, so the picture stays crisp, and every icon is the logo edge to edge. The
maskable icon too: the system cuts it to its own shape, and the cactus stands in the middle, inside the
safe zone (https://web.dev/articles/maskable-icon). Run it again whenever the Cactus scene or the pool
changes.
"""

import json
import math
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public"
BACKGROUND = (0x1C, 0x1C, 0x22, 255)  # the page's background, --page in src/style.css


def picture() -> Image.Image:
    printed = subprocess.run(["node", str(ROOT / "scripts" / "logo-rows.ts")], check=True, capture_output=True, text=True)
    logo = json.loads(printed.stdout)
    rows, pool = logo["rows"], logo["pool"]
    image = Image.new("RGBA", (len(rows[0]), len(rows)), BACKGROUND)
    for y, row in enumerate(rows):
        for x, c in enumerate(row):
            if c in pool:
                image.putpixel((x, y), tuple(int(pool[c][i : i + 2], 16) for i in (1, 3, 5)) + (255,))
    return image


def edge(image: Image.Image, size: int) -> Image.Image:
    """The picture filling the whole icon: whole squares as large as fit, the last few pixels cropped evenly."""
    square = math.ceil(size / image.width)
    big = image.resize((image.width * square, image.height * square), Image.NEAREST)
    left = (big.width - size) // 2
    top = (big.height - size) // 2
    return big.crop((left, top, left + size, top + size))


def main() -> None:
    OUT.mkdir(exist_ok=True)
    image = picture()
    edge(image, 180).save(OUT / "apple-touch-icon.png")
    edge(image, 192).save(OUT / "icon-192.png")
    edge(image, 512).save(OUT / "icon-512.png")
    edge(image, 512).save(OUT / "icon-maskable-512.png")
    edge(image, 256).save(OUT / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)])


main()
