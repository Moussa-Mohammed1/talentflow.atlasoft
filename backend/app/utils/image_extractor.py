from __future__ import annotations

import logging
import zipfile
from io import BytesIO
from pathlib import Path
from typing import Generator

import fitz
from PIL import Image

logger = logging.getLogger(__name__)

SUPPORTED_IMAGE_EXTS = {".png", ".jpg", ".jpeg"}


class ExtractedImage:
    def __init__(
        self,
        pil_image: Image.Image,
        source_index: int,
        page_number: int | None = None,
        source_type: str = "embedded",
    ):
        self.pil_image = pil_image
        self.source_index = source_index
        self.page_number = page_number
        self.source_type = source_type  # "embedded" | "rendered" | "direct"


def extract_images_from_pdf(file_path: Path) -> list[ExtractedImage]:
    """Extract all embedded images from a PDF using PyMuPDF."""
    images: list[ExtractedImage] = []
    doc = None
    try:
        doc = fitz.open(str(file_path))
    except Exception as e:
        logger.warning("Failed to open PDF %s: %s", file_path, e)
        return images

    try:
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            image_list = page.get_images(full=True)
            for img_idx, img in enumerate(image_list):
                try:
                    xref = img[0]
                    base_image = doc.extract_image(xref)
                    img_bytes = base_image["image"]
                    pil_image = Image.open(BytesIO(img_bytes)).convert("RGBA")
                    images.append(
                        ExtractedImage(
                            pil_image=pil_image,
                            source_index=len(images),
                            page_number=page_num + 1,
                            source_type="embedded",
                        )
                    )
                except Exception as e:
                    logger.debug("Failed to extract image xref %s on page %s: %s", img[0], page_num + 1, e)
    finally:
        if doc is not None:
            doc.close()
    logger.info("Extracted %d embedded images from PDF", len(images))
    return images


def extract_images_from_docx(file_path: Path) -> list[ExtractedImage]:
    """Extract all images from DOCX word/media/."""
    images: list[ExtractedImage] = []
    try:
        with zipfile.ZipFile(str(file_path), "r") as z:
            media_files = [n for n in z.namelist() if n.startswith("word/media/")]
            for idx, media_path in enumerate(media_files):
                try:
                    img_bytes = z.read(media_path)
                    pil_image = Image.open(BytesIO(img_bytes)).convert("RGBA")
                    images.append(
                        ExtractedImage(
                            pil_image=pil_image,
                            source_index=idx,
                            page_number=None,
                            source_type="embedded",
                        )
                    )
                except Exception as e:
                    logger.debug("Failed to extract image %s from DOCX: %s", media_path, e)
    except Exception as e:
        logger.warning("Failed to open DOCX %s: %s", file_path, e)
    logger.info("Extracted %d images from DOCX", len(images))
    return images


def extract_image_from_file(file_path: Path) -> list[ExtractedImage]:
    """Treat the file itself as an image."""
    try:
        pil_image = Image.open(str(file_path)).convert("RGBA")
        return [
            ExtractedImage(
                pil_image=pil_image,
                source_index=0,
                page_number=None,
                source_type="direct",
            )
        ]
    except Exception as e:
        logger.warning("Failed to open image file %s: %s", file_path, e)
        return []


class ImageExtractorService:
    """Detects file type and extracts all possible candidate images."""

    @staticmethod
    def extract_all(file_path: Path) -> list[ExtractedImage]:
        ext = file_path.suffix.lower()

        if ext == ".pdf":
            images = extract_images_from_pdf(file_path)
            return images

        if ext == ".docx":
            return extract_images_from_docx(file_path)

        if ext in SUPPORTED_IMAGE_EXTS:
            return extract_image_from_file(file_path)

        logger.warning("Unsupported file type: %s", ext)
        return []
