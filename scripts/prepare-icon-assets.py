from pathlib import Path

from PIL import Image, ImageOps


SOURCE = Path("/home/ubuntu/upload/59464.jpg")
DESTINATION = Path("/home/ubuntu/bookkeeping-dashboard/assets/images")
OUTPUTS = [
    "icon.png",
    "splash-icon.png",
    "favicon.png",
    "android-icon-foreground.png",
]


def make_icon(source: Image.Image) -> Image.Image:
    # The supplied close-up is intentionally center-cropped to fill a square app-icon canvas.
    square = ImageOps.fit(source.convert("RGB"), (512, 512), method=Image.Resampling.LANCZOS, centering=(0.5, 0.38))
    return square.quantize(colors=128, method=Image.Quantize.MEDIANCUT)


def main() -> None:
    with Image.open(SOURCE) as source:
        icon = make_icon(source)
    for filename in OUTPUTS:
        icon.save(DESTINATION / filename, format="PNG", optimize=True)


if __name__ == "__main__":
    main()
