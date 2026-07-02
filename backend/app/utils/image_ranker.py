from __future__ import annotations

import logging
import math
from PIL import Image

logger = logging.getLogger(__name__)


class ScoredImage:
    def __init__(
        self,
        pil_image: Image.Image,
        score: int,
        source_index: int,
        page_number: int | None = None,
        source_type: str = "embedded",
        face_confidence: float = 0.0,
        face_count: int = 0,
        face_box: tuple[int, int, int, int] | None = None,
    ):
        self.pil_image = pil_image
        self.score = score
        self.source_index = source_index
        self.page_number = page_number
        self.source_type = source_type
        self.face_confidence = face_confidence
        self.face_count = face_count
        self.face_box = face_box


class ImageRanker:
    """Scores and selects the best candidate image."""

    @staticmethod
    def is_invalid_image(pil_image: Image.Image) -> bool:
        """Reject obviously invalid images (icons, transparent, tiny)."""
        w, h = pil_image.size
        if w < 120 or h < 120:
            return True
        if pil_image.mode == "RGBA":
            try:
                rgba = pil_image
                ext = rgba.getextrema()
                if len(ext) >= 4 and ext[3] == (0, 0):
                    return True
            except Exception:
                pass
            try:
                alpha = rgba.split()[-1]
                if alpha.getextrema() == (0, 0):
                    return True
            except Exception:
                pass
        return False

    @staticmethod
    def is_icon_like(pil_image: Image.Image) -> bool:
        """Heuristic: icons tend to be small, square, and have few colors."""
        w, h = pil_image.size
        if w < 80 and h < 80:
            return True
        if w < 50 or h < 50:
            return True
        aspect = w / h if h > 0 else 1
        if aspect > 5 or aspect < 0.2:
            return True
        return False

    @staticmethod
    def is_blurry(pil_image: Image.Image, threshold: float = 80.0) -> bool:
        """Reject blurry images using Laplacian variance."""
        try:
            import cv2
            import numpy as np

            img_array = np.array(pil_image.convert("L"))
            laplacian_var = cv2.Laplacian(img_array, cv2.CV_64F).var()
            return laplacian_var < threshold
        except Exception:
            return False

    @staticmethod
    def score_image(
        pil_image: Image.Image,
        face_count: int,
        face_confidence: float,
        face_box: tuple[int, int, int, int] | None,
        page_number: int | None,
    ) -> int:
        """Score an image based on multiple criteria."""
        score = 0
        w, h = pil_image.size
        aspect = w / h if h > 0 else 1

        if face_count == 1:
            score += 50
        elif face_count == 0:
            score -= 100

        if face_box:
            fx, fy, fw, fh = face_box
            face_area = fw * fh
            image_area = w * h
            face_ratio = face_area / image_area if image_area > 0 else 0
            if 0.25 <= face_ratio <= 0.70:
                score += 25

        if page_number == 1:
            score += 15

        if 0.75 <= aspect <= 1.4:
            score += 10

        if w > 300 and h > 300:
            score += 15

        if h > w:
            score += 10

        if aspect > 2.5:
            score -= 30

        if w < 150 or h < 150:
            score -= 30

        if face_confidence < 0.6 and face_count > 0:
            score -= 20

        return score

    @staticmethod
    def best_image(
        images: list[tuple[Image.Image, int, int | None, str, float, int, tuple | None]],
    ) -> tuple[Image.Image, dict] | None:
        """Return the best-scoring image and its metadata."""
        scored: list[ScoredImage] = []
        for img, src_idx, page_num, src_type, conf, face_cnt, face_box in images:
            if ImageRanker.is_invalid_image(img):
                logger.debug("Rejected image #%d: invalid", src_idx)
                continue
            if ImageRanker.is_icon_like(img):
                logger.debug("Rejected image #%d: icon-like", src_idx)
                continue
            score = ImageRanker.score_image(img, face_cnt, conf, face_box, page_num)
            scored.append(
                ScoredImage(
                    pil_image=img,
                    score=score,
                    source_index=src_idx,
                    page_number=page_num,
                    source_type=src_type,
                    face_confidence=conf,
                    face_count=face_cnt,
                    face_box=face_box,
                )
            )
            logger.debug("Image #%d (page %s) score = %d", src_idx, page_num or "N/A", score)

        if not scored:
            return None

        best = max(scored, key=lambda s: s.score)
        logger.info(
            "Best image: #%d (page %s, %s) score = %d",
            best.source_index,
            best.page_number or "N/A",
            best.source_type,
            best.score,
        )
        return best.pil_image, {
            "source_index": best.source_index,
            "page_number": best.page_number,
            "source_type": best.source_type,
            "score": best.score,
            "face_confidence": best.face_confidence,
            "face_count": best.face_count,
        }
