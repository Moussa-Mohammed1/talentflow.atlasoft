from __future__ import annotations

import logging
from io import BytesIO
from pathlib import Path

import fitz
from PIL import Image

logger = logging.getLogger(__name__)


def render_first_page(file_path: Path, dpi: int = 300) -> Image.Image | None:
    """Render the first page of a PDF at high resolution and return a PIL Image."""
    try:
        doc = fitz.open(str(file_path))
        if len(doc) == 0:
            logger.warning("PDF has no pages: %s", file_path)
            doc.close()
            return None
        page = doc.load_page(0)
        zoom = dpi / 72
        mat = fitz.Matrix(zoom, zoom)
        pix = page.get_pixmap(matrix=mat)
        img_data = pix.tobytes("png")
        doc.close()
        pil_image = Image.open(BytesIO(img_data)).convert("RGB")
        logger.info("Rendered first page at %d dpi (%dx%d)", dpi, pil_image.width, pil_image.height)
        return pil_image
    except Exception as e:
        logger.warning("Failed to render PDF page: %s", e)
        return None


def render_page(file_path: Path, page_number: int, dpi: int = 200) -> Image.Image | None:
    """Render a specific PDF page at given DPI."""
    try:
        doc = fitz.open(str(file_path))
        if page_number < 0 or page_number >= len(doc):
            doc.close()
            return None
        page = doc.load_page(page_number)
        zoom = dpi / 72
        pix = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom))
        img_data = pix.tobytes("png")
        doc.close()
        return Image.open(BytesIO(img_data)).convert("RGB")
    except Exception as e:
        logger.warning("Failed to render page %d: %s", page_number, e)
        return None
