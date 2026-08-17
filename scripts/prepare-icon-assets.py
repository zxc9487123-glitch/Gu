from pathlib import Path

from PIL import Image, ImageOps


SOURCE = Path("/home/ubuntu/upload/59463.jpg")
DESTINATION = Path("/home/ubuntu/bookkeeping-dashboard/assets/images")
OUTPUTS = [
    "icon.png",
    "splash-icon.png",
    "favicon.png",
    "android-icon-foreground.png",
]


def make_icon(source: Image.Image) -> Image.Image:
    # Preserve the user-provided image content within a white square safe area.
    canvas = Image.new("RGB", (512, 512), "white")
    contained = ImageOps.contain(source.convert("RGB"), (448, 448), Image.Resampling.LANCZOS)
    left = (canvas.width - contained.width) // 2
    top = (canvas.height - contained.height) // 2
    canvas.paste(contained, (left, top))
    return canvas.quantize(colors=128, method=Image.Quantize.MEDIANCUT)


def main() -> None:
    with Image.open(SOURCE) as source:
        icon = make_icon(source)
    for filename in OUTPUTS:
        icon.save(DESTINATION / filename, format="PNG", optimize=True)


if __name__ == "__main__":
    main()
