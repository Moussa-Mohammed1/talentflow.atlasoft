from __future__ import annotations

import logging
from pathlib import Path

from PIL import Image

from app.utils.face_detector import FaceDetector
from app.utils.image_extractor import ImageExtractorService, ExtractedImage
from app.utils.image_ranker import ImageRanker
from app.utils.image_normalizer import normalize_photo, save_compressed_jpeg
from app.utils.pdf_renderer import render_first_page

logger = logging.getLogger(__name__)

CANDIDATE_PHOTOS_DIR = Path("storage/candidate_photos")


class ResumePhotoService:
    """Service for extracting candidate photos from resumes."""

    def __init__(self):
        self._face_detector = FaceDetector()
        CANDIDATE_PHOTOS_DIR.mkdir(parents=True, exist_ok=True)

    def extract_candidate_photo(
        self,
        resume_path: Path,
        candidate_id: int,
    ) -> str | None:
        """
        Extract candidate photo from a resume file.

        Returns relative storage path if successful, None otherwise.
        """
        logger.info("Extracting candidate photo for candidate_id=%d", candidate_id)
        logger.info("Resume type: %s", resume_path.suffix.lower().lstrip(".").upper())

        if not resume_path.exists():
            logger.warning("Resume file not found: %s", resume_path)
            return None

        # Step 1: Extract all embedded images
        embedded_images = ImageExtractorService.extract_all(resume_path)
        logger.info("Found %d embedded images", len(embedded_images))

        # Step 2: Detect faces in each embedded image
        candidates = []
        for img_data in embedded_images:
            try:
                detection = self._face_detector.detect(img_data.pil_image)
                if detection is None or detection.face_count == 0:
                    logger.debug(
                        "No face in image #%d", img_data.source_index
                    )
                    continue
                if detection.face_count > 1:
                    logger.debug(
                        "Multiple faces (%d) in image #%d, skipping",
                        detection.face_count,
                        img_data.source_index,
                    )
                    continue

                face_box = detection.bounding_boxes[0] if detection.bounding_boxes else None
                face_conf = detection.confidences[0] if detection.confidences else 0.0
                logger.info(
                    "Face detected in image #%d (confidence=%.2f)",
                    img_data.source_index,
                    face_conf,
                )
                candidates.append(
                    (
                        img_data.pil_image,
                        img_data.source_index,
                        img_data.page_number,
                        img_data.source_type,
                        face_conf,
                        detection.face_count,
                        face_box,
                    )
                )
            except Exception as e:
                logger.debug("Error processing image #%d: %s", img_data.source_index, e)

        # Step 3: Score and rank embedded images
        best_result = None
        best_metadata = None
        if candidates:
            result = ImageRanker.best_image(candidates)
            if result:
                best_result, best_metadata = result

        # Step 4: If no embedded face found, render first page for scanned PDFs
        if best_result is None and resume_path.suffix.lower() == ".pdf":
            logger.info("No face found in embedded images, rendering first page")
            rendered = render_first_page(resume_path)
            if rendered:
                detection = self._face_detector.detect(rendered)
                if detection and detection.face_count > 0:
                    rendered_img = self._crop_best_face(rendered, detection)
                    if rendered_img:
                        best_result = rendered_img
                        best_metadata = {
                            "source_type": "rendered",
                            "page_number": 1,
                            "face_count": detection.face_count,
                            "confidence": detection.confidences[0] if detection.confidences else 0.0,
                        }
                        logger.info("Face found on rendered page")

        if best_result is None:
            logger.info("No candidate photo could be extracted")
            return None

        # Step 5: Normalize and save
        normalized = normalize_photo(best_result)
        output_filename = f"candidate_{candidate_id}.jpg"
        output_path = str(CANDIDATE_PHOTOS_DIR / output_filename)
        save_compressed_jpeg(normalized, output_path)

        logger.info("Saved candidate photo: %s", output_path)
        if best_metadata:
            logger.info(
                "Source: %s, page: %s, confidence: %.2f, score: %s",
                best_metadata.get("source_type", "N/A"),
                best_metadata.get("page_number", "N/A"),
                best_metadata.get("confidence", 0.0),
                best_metadata.get("score", "N/A"),
            )

        relative_path = f"candidate_photos/{output_filename}"
        return relative_path

    def _crop_best_face(
        self, pil_image: Image.Image, detection
    ) -> Image.Image | None:
        """Crop the best face from an image (for scanned PDFs)."""
        if detection.face_count == 0:
            return None

        boxes = detection.bounding_boxes
        confidences = detection.confidences
        sizes = detection.face_sizes

        if detection.face_count == 1:
            best_idx = 0
        else:
            scored_indices = []
            w, h = pil_image.size
            for i in range(detection.face_count):
                x, y, bw, bh = boxes[i]
                score = sizes[i]
                face_center_x = x + bw / 2
                top_right_dist = ((face_center_x - w) ** 2 + (y) ** 2) ** 0.5
                score += confidences[i] * 10 if i < len(confidences) else 0
                scored_indices.append((score, -top_right_dist, i))
            scored_indices.sort(key=lambda t: (t[0], t[1]), reverse=True)
            best_idx = scored_indices[0][2]

        x, y, bw, bh = boxes[best_idx]
        margin = int(max(bw, bh) * 0.15)
        x1 = max(0, x - margin)
        y1 = max(0, y - margin)
        x2 = min(pil_image.width, x + bw + margin)
        y2 = min(pil_image.height, y + bh + margin)

        cropped = pil_image.crop((x1, y1, x2, y2))
        logger.info(
            "Cropped face from rendered page (box: %d,%d %dx%d)", x, y, bw, bh
        )
        return cropped
