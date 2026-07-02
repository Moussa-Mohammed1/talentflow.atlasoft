from __future__ import annotations

import cv2
import logging
import numpy as np
from pathlib import Path
from PIL import Image

logger = logging.getLogger(__name__)


class FaceDetection:
    def __init__(
        self,
        face_count: int,
        bounding_boxes: list[tuple[int, int, int, int]],
        confidences: list[float],
        face_sizes: list[int],
    ):
        self.face_count = face_count
        self.bounding_boxes = bounding_boxes
        self.confidences = confidences
        self.face_sizes = face_sizes


class FaceDetector:
    """Face detection using MediaPipe task API as primary, OpenCV Haar as fallback."""

    def __init__(self):
        self._mediapipe_detector = None
        self._haar_cascade = None

    def _get_mediapipe(self):
        if self._mediapipe_detector is None:
            try:
                import mediapipe as mp

                try:
                    # New API (0.10+) - use tasks vision FaceDetector
                    model_path = Path(mp.__file__).parent / "models" / "face_detection.tflite"
                    if not model_path.exists():
                        logger.warning("MediaPipe face detection model not found at %s", model_path)
                        raise FileNotFoundError(f"Model not found: {model_path}")

                    options = mp.tasks.vision.FaceDetectorOptions(
                        base_options=mp.tasks.BaseOptions(model_asset_path=str(model_path)),
                        running_mode=mp.tasks.vision.RunningMode.IMAGE,
                        min_detection_confidence=0.5,
                    )
                    self._mediapipe_detector = mp.tasks.vision.FaceDetector.create_from_options(options)
                    self._mediapipe_is_new_api = True
                    self._mp = mp
                    logger.info("MediaPipe task API face detector initialized")
                except (AttributeError, Exception) as e:
                    # Fallback: old API (pre-0.10)
                    logger.debug("MediaPipe new API failed, trying old API: %s", e)
                    try:
                        self._mediapipe_detector = mp.solutions.face_detection.FaceDetection(
                            model_selection=1, min_detection_confidence=0.5
                        )
                        self._mediapipe_is_new_api = False
                        self._mp = mp
                        logger.info("MediaPipe old API face detector initialized")
                    except Exception as e2:
                        logger.warning("Failed to initialize MediaPipe: %s", e2)
                        self._mediapipe_detector = None
            except Exception as e:
                logger.warning("Failed to initialize MediaPipe: %s", e)
                self._mediapipe_detector = None
        return self._mediapipe_detector

    def _detect_mediapipe_new(self, detector, img_array, w, h):
        """Detect faces using new MediaPipe task API."""
        mp = self._mp
        rgb_data = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB) if img_array.shape[2] == 3 else img_array
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_data)
        result = detector.detect(mp_image)

        if result.detections:
            boxes = []
            confs = []
            sizes = []
            for detection in result.detections:
                bbox = detection.bounding_box
                x = int(bbox.origin_x)
                y = int(bbox.origin_y)
                bw = int(bbox.width)
                bh = int(bbox.height)
                confidence = detection.categories[0].score if detection.categories else 0.0
                boxes.append((x, y, bw, bh))
                confs.append(float(confidence))
                sizes.append(max(bw, bh))
            logger.debug("MediaPipe (new API) detected %d faces", len(boxes))
            return FaceDetection(len(boxes), boxes, confs, sizes)
        return None

    def _detect_mediapipe_old(self, detector, img_array, w, h):
        """Detect faces using old MediaPipe solutions API."""
        results = detector.process(cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR))
        if results.detections:
            boxes = []
            confs = []
            sizes = []
            for detection in results.detections:
                bbox = detection.location_data.relative_bounding_box
                x = int(bbox.xmin * w)
                y = int(bbox.ymin * h)
                bw = int(bbox.width * w)
                bh = int(bbox.height * h)
                confidence = detection.score[0]
                boxes.append((x, y, bw, bh))
                confs.append(float(confidence))
                sizes.append(max(bw, bh))
            logger.debug("MediaPipe (old API) detected %d faces", len(boxes))
            return FaceDetection(len(boxes), boxes, confs, sizes)
        return None

    def _get_haar(self):
        if self._haar_cascade is None:
            try:
                cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
                if not Path(cascade_path).exists():
                    logger.warning("Haar cascade file not found at %s", cascade_path)
                    self._haar_cascade = None
                    return None
                self._haar_cascade = cv2.CascadeClassifier(cascade_path)
                if self._haar_cascade.empty():
                    logger.warning("Haar cascade file is empty/invalid")
                    self._haar_cascade = None
                else:
                    logger.info("Haar cascade face detector initialized")
            except Exception as e:
                logger.warning("Failed to initialize Haar cascade: %s", e)
                self._haar_cascade = None
        return self._haar_cascade

    def detect(self, pil_image: Image.Image) -> FaceDetection | None:
        """Detect faces in a PIL image. Returns FaceDetection or None."""
        if pil_image.mode != "RGB":
            pil_image = pil_image.convert("RGB")

        img_array = np.array(pil_image)
        h, w = img_array.shape[:2]

        if h < 30 or w < 30:
            return FaceDetection(0, [], [], [])

        # Try MediaPipe first
        mp_detector = self._get_mediapipe()
        if mp_detector is not None:
            try:
                if getattr(self, '_mediapipe_is_new_api', False):
                    result = self._detect_mediapipe_new(mp_detector, img_array, w, h)
                else:
                    result = self._detect_mediapipe_old(mp_detector, img_array, w, h)
                if result is not None:
                    return result
                logger.debug("MediaPipe found no faces")
            except Exception as e:
                logger.warning("MediaPipe detection error: %s", e)

        # Fallback: OpenCV Haar Cascade
        haar = self._get_haar()
        if haar is not None:
            try:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
                faces = haar.detectMultiScale(
                    gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60)
                )
                if len(faces) > 0:
                    boxes = [(int(x), int(y), int(w), int(h)) for (x, y, w, h) in faces]
                    confs = [0.8] * len(boxes)  # Haar doesn't give confidence
                    sizes = [max(w, h) for (_, _, w, h) in faces]
                    logger.debug("Haar Cascade detected %d faces", len(boxes))
                    return FaceDetection(len(boxes), boxes, confs, sizes)
            except Exception as e:
                logger.warning("Haar detection error: %s", e)

        return FaceDetection(0, [], [], [])
