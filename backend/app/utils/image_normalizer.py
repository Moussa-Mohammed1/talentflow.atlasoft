from __future__ import annotations

import logging
from PIL import Image, ImageOps

logger = logging.getLogger(__name__)


def normalize_photo(pil_image: Image.Image, max_long_side: int = 512) -> Image.Image:
    """Normalize a candidate photo:
    - Convert to RGB
    - Remove alpha
    - Auto-rotate using EXIF
    - Resize longest side to max_long_side keeping aspect ratio
    """
    img = pil_image.copy()

    if img.mode == "RGBA":
        background = Image.new("RGB", img.size, (255, 255, 255))
        background.paste(img, mask=img.split()[3])
        img = background
    elif img.mode != "RGB":
        img = img.convert("RGB")

    try:
        img = ImageOps.exif_transpose(img)
    except Exception:
        pass

    w, h = img.size
    if max(w, h) > max_long_side:
        if w > h:
            new_w = max_long_side
            new_h = int(h * (max_long_side / w))
        else:
            new_h = max_long_side
            new_w = int(w * (max_long_side / h))
        img = img.resize((new_w, new_h), Image.LANCZOS)

    return img


def save_compressed_jpeg(pil_image: Image.Image, output_path: str, quality: int = 90) -> str:
    """Save image as compressed JPEG."""
    img = pil_image.copy()
    if img.mode != "RGB":
        img = img.convert("RGB")
    img.save(output_path, "JPEG", quality=quality, optimize=True)
    logger.info("Saved compressed JPEG to %s", output_path)
    return output_path
