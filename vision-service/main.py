"""
GreenTrip Malaysia — food waste vision service.

Pipeline:
    1. Locate the plate            (ellipse fit -> scale + interior mask)
    2. Segment food regions        (YOLO11-seg, fine-tuned on FoodSeg103)
    3. Estimate relative depth     (Depth Anything V2 Small)
    4. Convert area x depth        (per-class density and shape factor)

Step 1 runs FIRST and constrains everything after it. Hands, cutlery,
table and background must be excluded before depth is normalised, or
their extreme distances compress the plate into a sliver of the depth
range and every food region rounds to zero grams.

Run:
    uvicorn main:app --host 0.0.0.0 --port 8000
"""

import io
import logging
import os
import cv2
import numpy as np
import torch
from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image
from starlette.concurrency import run_in_threadpool
from transformers import AutoImageProcessor, AutoModelForDepthEstimation
from ultralytics import YOLO
from mass_model import estimate_grams, load_profile
from plate_scale import DEFAULT_PLATE_DIAMETER_CM, detect_plate

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("vision-service")

SEG_WEIGHTS = os.environ.get("SEG_WEIGHTS", "weights/food-seg.pt")
DEPTH_MODEL = os.environ.get("DEPTH_MODEL", "depth-anything/Depth-Anything-V2-Small-hf")
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

# Vite falls back to 5174, 5175, ... whenever the default port is already
# taken by another process, which happens often enough in local dev that a
# single hard-coded origin above kept breaking the scanner with a "could not
# reach the service" error that was actually a silent CORS rejection. A
# regex covering any localhost port fixes that without needing ALLOWED_ORIGINS
# updated every time Vite picks a different one.
ALLOWED_ORIGIN_REGEX = os.environ.get(
    "ALLOWED_ORIGIN_REGEX", r"http://(localhost|127\.0\.0\.1):\d+"
)

MIN_CONFIDENCE = float(os.environ.get("MIN_CONFIDENCE", "0.45"))

# A region must be mostly ON the plate to count. Filters hands, cutlery
# and table clutter that segmentation happily labels as food.
MIN_ON_PLATE_FRACTION = float(os.environ.get("MIN_ON_PLATE_FRACTION", "0.6"))

# Two masks of the same class overlapping by more than this are the same
# food. YOLO's box NMS does not always merge these.
DEDUP_IOU = 0.45

# Relative depth is unitless. This maps the normalised range onto a
# plausible physical height for plated food, and remains the largest
# source of error. Fit it with calibrate.py.
MAX_FOOD_DEPTH_CM = float(os.environ.get("MAX_FOOD_DEPTH_CM", "3.5"))

# No single region of leftovers on one plate weighs more than this.
# A larger figure means the pipeline has measured something that is not
# food, so it is dropped rather than reported.
MAX_REGION_GRAMS = float(os.environ.get("MAX_REGION_GRAMS", "800"))

app = FastAPI(title="GreenTrip Vision Service")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=ALLOWED_ORIGIN_REGEX,
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

device = "cuda" if torch.cuda.is_available() else "cpu"
profile = load_profile()

# Captured once, at the moment the model actually loads — /health must report
# what this process has in memory, not re-check the filesystem on every call.
# Re-checking the path let /health claim the fine-tuned weights were active
# whenever the file existed on disk, even on a stale process that loaded the
# stock fallback before that file was created and was never restarted.
_SEG_WEIGHTS_LOADED = SEG_WEIGHTS if os.path.exists(SEG_WEIGHTS) else "yolo11n-seg.pt (NOT fine-tuned)"
seg_model = YOLO(SEG_WEIGHTS) if os.path.exists(SEG_WEIGHTS) else YOLO("yolo11n-seg.pt")
logger.info("[startup] segmentation weights: %s", _SEG_WEIGHTS_LOADED)
depth_processor = AutoImageProcessor.from_pretrained(DEPTH_MODEL)
depth_model = AutoModelForDepthEstimation.from_pretrained(DEPTH_MODEL).to(device).eval()


@app.get("/health")
def health():
    return {
        "status": "ok",
        "device": device,
        "segmentation_weights": _SEG_WEIGHTS_LOADED,
        "calibrated": os.path.exists(os.environ.get("CALIBRATION_PATH", "calibration.json")),
    }


def raw_depth(rgb):
    """Depth Anything output at image resolution, unnormalised."""
    inputs = depth_processor(images=Image.fromarray(rgb), return_tensors="pt").to(device)
    with torch.no_grad():
        predicted = depth_model(**inputs).predicted_depth
    return torch.nn.functional.interpolate(
        predicted.unsqueeze(1), size=rgb.shape[:2], mode="bicubic", align_corners=False
    ).squeeze().cpu().numpy()


def fit_plate_plane(depth, surface_mask):
    """
    Least-squares plane through the EMPTY plate surface.

    A plate photographed at an angle has a front-to-back depth gradient
    far larger than the height of the food sitting on it. Measuring food
    against a flat reference makes thin items (leafy greens) round to
    zero while tall ones (a rice mound) survive — which is exactly the
    artefact this removes.

    Returns (plane, gradient_magnitude_per_px) or (None, None).
    """
    ys, xs = np.nonzero(surface_mask)
    if ys.size < 500:
        return None, None

    # Subsample: a full plate is ~100k pixels and 5k fits the plane fine.
    if ys.size > 5000:
        pick = np.random.default_rng(0).choice(ys.size, 5000, replace=False)
        ys, xs = ys[pick], xs[pick]

    A = np.column_stack([xs, ys, np.ones_like(xs, dtype=float)])
    coeffs, *_ = np.linalg.lstsq(A, depth[ys, xs], rcond=None)
    a, b, c = coeffs

    h, w = depth.shape
    grid_y, grid_x = np.mgrid[0:h, 0:w]
    plane = a * grid_x + b * grid_y + c
    return plane, float(np.hypot(a, b))


def depth_units_per_cm(gradient_per_px, px_per_cm, tilt):
    """
    Converts the model's arbitrary depth units into centimetres, using
    the plate itself as a ruler.

    The plate is a known 26cm disc. The ellipse axis ratio gives the
    viewing angle, so the depth gradient measured ACROSS the plate
    corresponds to a known physical rise. That fixes the scale without
    camera intrinsics.

        moving 1 cm along the plate  ->  tan(theta) cm of depth change
        theta = acos(tilt)

    Returns None when the plate is near head-on (tilt ~ 1), where
    tan(theta) approaches zero and the estimate becomes unstable.
    """
    if gradient_per_px is None or not (0.45 < tilt < 0.94):
        return None
    tan_theta = np.sqrt(max(1e-6, 1.0 - tilt ** 2)) / tilt
    units_per_cm = (gradient_per_px * px_per_cm) / tan_theta
    return float(units_per_cm) if units_per_cm > 1e-9 else None


def mask_iou(a, b):
    union = np.logical_or(a, b).sum()
    return float(np.logical_and(a, b).sum() / union) if union else 0.0


@app.post("/infer")
async def infer(image: UploadFile = File(...)):
    """
    The upload read is genuinely async; everything after it (OpenCV, YOLO,
    the depth model) is blocking CPU/GPU work with no awaits of its own. An
    `async def` body that blocks freezes the whole event loop — including
    /health and every other in-flight request — until it returns, so that
    work runs in a worker thread instead via run_in_threadpool.
    """
    raw = await image.read()
    return await run_in_threadpool(_infer_sync, raw)


def _infer_sync(raw: bytes) -> dict:
    bgr = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if bgr is None:
        raise HTTPException(status_code=400, detail="Could not decode image")

    height, width = bgr.shape[:2]
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)

    # --- 1. Plate: the scale reference AND the region of interest ---
    plate = detect_plate(bgr)
    if plate is None:
        raise HTTPException(
            status_code=422,
            detail="No plate detected. The plate rim is the size reference — "
                   "frame the whole plate against a contrasting surface and retake.",
        )

    plate_mask = plate["mask"]
    px_per_cm = plate["px_per_cm"]
    # An oblique angle foreshortens area; the axis ratio recovers the
    # true top-down footprint.
    area_correction = 1.0 / max(plate["tilt"], 0.35)

    plate_payload = {
        "x": plate["bbox"][0], "y": plate["bbox"][1],
        "w": plate["bbox"][2], "h": plate["bbox"][3],
    }

    logger.info(
        "[infer] image=%dx%d plate tilt=%.3f px_per_cm=%.2f",
        width, height, plate["tilt"], px_per_cm,
    )

    # --- 2. Segmentation ---
    predictions = seg_model.predict(bgr, conf=MIN_CONFIDENCE, verbose=False)[0]
    if predictions.masks is None:
        logger.info("[infer] no masks at all (conf>=%.2f) -> Unrecognised", MIN_CONFIDENCE)
        return {
            "dish": "Unrecognised", "plate": plate_payload, "detections": [],
            "totalGrams": 0, "pxPerCm": round(px_per_cm, 2),
        }
    logger.info("[infer] raw detections=%d", len(predictions.boxes))

    # --- 3. Depth, raw. The plane fit below supplies the reference. ---
    depth = raw_depth(rgb)

    names = predictions.names
    candidates = []

    for mask, box, conf, cls_id in zip(
        predictions.masks.data.cpu().numpy(),
        predictions.boxes.xyxy.cpu().numpy(),
        predictions.boxes.conf.cpu().numpy(),
        predictions.boxes.cls.cpu().numpy().astype(int),
    ):
        cls = names.get(cls_id, str(cls_id))
        spec = profile.get(cls)
        if spec is None:
            logger.info("[infer]   reject %-10s conf=%.2f: not in food profile", cls, conf)
            continue

        binary = cv2.resize(mask, (width, height), interpolation=cv2.INTER_NEAREST) > 0.5
        total_px = int(binary.sum())
        if total_px < 200:
            logger.info("[infer]   reject %-10s conf=%.2f: mask too small (%dpx)", cls, conf, total_px)
            continue

        # Reject anything mostly off the plate: hands, cutlery, table.
        on_plate = np.logical_and(binary, plate_mask)
        on_plate_frac = on_plate.sum() / total_px
        if on_plate_frac < MIN_ON_PLATE_FRACTION:
            logger.info(
                "[infer]   reject %-10s conf=%.2f: only %.0f%% on plate (need %.0f%%)",
                cls, conf, on_plate_frac * 100, MIN_ON_PLATE_FRACTION * 100,
            )
            continue

        logger.info("[infer]   keep   %-10s conf=%.2f px=%d", cls, conf, int(on_plate.sum()))
        candidates.append({
            "cls": cls, "spec": spec, "mask": on_plate,
            "box": box, "conf": float(conf), "px": int(on_plate.sum()),
        })

    # Merge duplicate regions of the same class, keeping the confident one.
    candidates.sort(key=lambda c: c["conf"], reverse=True)
    kept = []
    for cand in candidates:
        if any(
            k["cls"] == cand["cls"] and mask_iou(k["mask"], cand["mask"]) > DEDUP_IOU
            for k in kept
        ):
            continue
        kept.append(cand)

    if not kept:
        logger.info("[infer] all candidates filtered out -> Unrecognised")
        return {
            "dish": "Unrecognised", "plate": plate_payload, "detections": [],
            "totalGrams": 0, "pxPerCm": round(px_per_cm, 2),
        }

    # Fit the plate plane using surface NOT covered by food.
    food_union = np.zeros_like(plate_mask)
    for cand in kept:
        food_union |= cand["mask"]
    plane, gradient = fit_plate_plane(depth, plate_mask & ~food_union)

    if plane is None:
        raise HTTPException(
            status_code=422,
            detail="Not enough visible plate surface to establish a reference. "
                   "Frame the whole plate and retake.",
        )

    # Food sits above the plate. Depth Anything returns inverse depth,
    # so nearer to the camera is a LARGER value and the residual is
    # positive for anything standing proud of the surface.
    residual = np.clip(depth - plane, 0.0, None)

    units_per_cm = depth_units_per_cm(gradient, px_per_cm, plate["tilt"])
    if units_per_cm is None:
        # Head-on shot: no usable geometric scale. Fall back to assuming
        # the tallest region on the plate is MAX_FOOD_DEPTH_CM and
        # scaling the rest against it. Relative, not absolute.
        peak = float(np.percentile(residual[food_union], 98)) if food_union.any() else 0.0
        units_per_cm = (peak / MAX_FOOD_DEPTH_CM) if peak > 1e-9 else None
        scale_basis = "relative (head-on, no tilt reference)"
        logger.info(
            "[infer] scale=relative gradient=%s tilt=%.3f peak_residual=%.5f units_per_cm=%s",
            gradient, plate["tilt"], peak, units_per_cm,
        )
    else:
        scale_basis = "geometric (plate tilt)"
        logger.info(
            "[infer] scale=geometric gradient=%.5f tilt=%.3f units_per_cm=%.5f",
            gradient, plate["tilt"], units_per_cm,
        )

    detections = []
    for i, cand in enumerate(kept):
        binary = cand["mask"]
        area_cm2 = (cand["px"] / (px_per_cm ** 2)) * area_correction

        if units_per_cm is None:
            mean_depth_cm = 0.0
        else:
            # Median over the mask resists the gaps between leaves and
            # grains that would drag a mean toward the plate surface.
            mean_depth_cm = float(np.median(residual[binary]) / units_per_cm)
            # Plated leftovers are not 20cm tall, nor perfectly flat.
            mean_depth_cm = float(np.clip(mean_depth_cm, 0.15, 8.0))

        grams = estimate_grams(cand["cls"], area_cm2, mean_depth_cm, profile)
        logger.info(
            "[infer]   %-10s area=%.1fcm2 depth=%.2fcm -> %.1fg",
            cand["cls"], area_cm2, mean_depth_cm, grams,
        )
        if grams > MAX_REGION_GRAMS:
            logger.info("[infer]   %-10s dropped: %.1fg exceeds MAX_REGION_GRAMS=%.0f", cand["cls"], grams, MAX_REGION_GRAMS)
            continue  # not food; a misfired mask

        x1, y1, x2, y2 = cand["box"]
        detections.append({
            "id": i,
            "cls": cand["cls"],
            "label": cand["spec"]["label"],
            "colour": cand["spec"]["colour"],
            "box": {
                "x": float(max(0.0, x1 / width)),
                "y": float(max(0.0, y1 / height)),
                "w": float(min(1.0, (x2 - x1) / width)),
                "h": float(min(1.0, (y2 - y1) / height)),
            },
            "confidence": cand["conf"],
            "grams": int(round(grams)),
            "edible": bool(cand["spec"]["edible"]),
            "areaCm2": round(area_cm2, 1),
            "depthCm": round(mean_depth_cm, 2),
        })

    total = sum(d["grams"] for d in detections if d["edible"])
    dominant = max(detections, key=lambda d: d["grams"], default=None)

    return {
        "dish": dominant["label"] if dominant else "Unrecognised",
        "plate": plate_payload,
        "detections": detections,
        "totalGrams": int(total),
        "pxPerCm": round(px_per_cm, 2),
        "plateDiameterCm": DEFAULT_PLATE_DIAMETER_CM,
        "tilt": round(plate["tilt"], 2),
        "scaleBasis": scale_basis,
    }
