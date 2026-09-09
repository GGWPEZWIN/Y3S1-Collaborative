"""
Derives the pixels-per-centimetre scale from the plate rim, and returns
a mask of the plate interior.

A round plate photographed off-axis projects as an ellipse. Fitting that
ellipse gives the scale (major axis vs the known diameter) and, via the
axis ratio, the camera tilt.

The INTERIOR MASK matters as much as the scale. Everything outside the
plate — hands, table, background — must be excluded before depth is
normalised or masses are computed, or those regions dominate the depth
range and get measured as food.
"""

import cv2
import numpy as np

DEFAULT_PLATE_DIAMETER_CM = 26.0


def _ellipse_mask(shape, centre, axes, angle):
    mask = np.zeros(shape[:2], np.uint8)
    cv2.ellipse(
        mask,
        (int(centre[0]), int(centre[1])),
        (int(axes[0] / 2), int(axes[1] / 2)),
        angle,
        0,
        360,
        255,
        -1,
    )
    return mask > 0


def detect_plate(bgr, plate_diameter_cm=DEFAULT_PLATE_DIAMETER_CM):
    """
    Returns dict with px_per_cm, bbox (normalised x,y,w,h), tilt, mask,
    or None when no plate is found.
    """
    h, w = bgr.shape[:2]
    grey = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    blurred = cv2.medianBlur(grey, 5)

    circles = cv2.HoughCircles(
        blurred,
        cv2.HOUGH_GRADIENT,
        dp=1.2,
        minDist=min(h, w) / 2,
        param1=100,
        param2=60,
        minRadius=int(min(h, w) * 0.18),
        maxRadius=int(min(h, w) * 0.60),
    )

    if circles is not None:
        cx, cy, r = np.round(circles[0][0]).astype(float)
        return {
            "px_per_cm": (2.0 * r) / plate_diameter_cm,
            "bbox": ((cx - r) / w, (cy - r) / h, (2 * r) / w, (2 * r) / h),
            "tilt": 1.0,
            "mask": _ellipse_mask(bgr.shape, (cx, cy), (2 * r, 2 * r), 0),
        }

    # Fallback: fit an ellipse to the largest bright contour.
    _, binary = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    if not contours:
        return None

    largest = max(contours, key=cv2.contourArea)
    if len(largest) < 5 or cv2.contourArea(largest) < (h * w * 0.05):
        return None

    (cx, cy), (minor, major), angle = cv2.fitEllipse(largest)
    if major <= 0:
        return None

    # fitEllipse returns axes in (width, height) of the rotated box; the
    # larger of the two is the plate's true diameter in pixels.
    major, minor = max(major, minor), min(major, minor)

    return {
        "px_per_cm": major / plate_diameter_cm,
        "bbox": ((cx - major / 2) / w, (cy - minor / 2) / h, major / w, minor / h),
        "tilt": float(minor / major),  # 1.0 = straight down
        "mask": _ellipse_mask(bgr.shape, (cx, cy), (major, minor), angle),
    }
