/* ==================================================================
   COMPUTER VISION PIPELINE  (F1 + F2)
   ------------------------------------------------------------------
   All inference happens in the Python vision service. There is no
   local fallback and no synthetic data: if the service cannot read a
   photo, the user is told why and offered manual entry.

   An earlier version substituted a mock result on any failure. That
   put invented masses into the ledger indistinguishably from real
   measurements, which is worse than showing an error.
   ================================================================== */

const API_URL = import.meta.env.VITE_VISION_API_URL || "";
const INFERENCE_TIMEOUT_MS = 30000;

/**
 * The service was reached and rejected the PHOTO, not the request.
 * Carries guidance the user can act on ("no plate detected").
 */
export class VisionInputError extends Error {
  constructor(message) {
    super(message);
    this.name = "VisionInputError";
  }
}

/** The service could not be reached at all. */
export class VisionUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "VisionUnavailableError";
  }
}

/**
 * @param {HTMLCanvasElement} canvas  the captured frame
 * @returns {Promise<object>} { dish, plate, detections, totalGrams, pxPerCm }
 * @throws {VisionInputError}       photo rejected, message is user-facing
 * @throws {VisionUnavailableError} service unreachable or misconfigured
 */
export async function runInference(canvas) {
  if (!API_URL) {
    throw new VisionUnavailableError(
      "The scanner is not configured. Set VITE_VISION_API_URL and restart the app."
    );
  }

  const blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Could not encode frame"))),
      "image/jpeg",
      0.9
    )
  );

  const form = new FormData();
  form.append("image", blob, "plate.jpg");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), INFERENCE_TIMEOUT_MS);

  try {
    let res;
    try {
      res = await fetch(`${API_URL.replace(/\/$/, "")}/infer`, {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
    } catch {
      throw new VisionUnavailableError(
        "Could not reach the scanner service. Check it is running, then try again."
      );
    }

    if (!res.ok) {
      // 4xx means the service ran and rejected this photo. Its message
      // tells the user what to change, so surface it verbatim.
      if (res.status >= 400 && res.status < 500) {
        const body = await res.json().catch(() => ({}));
        throw new VisionInputError(
          body.detail || "That photo could not be analysed. Try another angle."
        );
      }
      throw new VisionUnavailableError(`Scanner service error (${res.status}).`);
    }

    const result = await res.json();
    if (!Array.isArray(result.detections)) {
      throw new VisionUnavailableError("The scanner returned an unexpected response.");
    }

    if (result.detections.length === 0) {
      throw new VisionInputError(
        "No food was recognised on the plate. Try a clearer photo, or enter the weight yourself."
      );
    }

    return result;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * F2 — paints the diagnostic overlay onto a canvas. Shared by the live
 * scanner and the stored-result viewer so both stay pixel-identical.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {HTMLImageElement}  img          already-loaded source frame
 * @param {object}            result       { plate, detections }
 * @param {object}            [opts]
 * @param {boolean}           [opts.showPlate]       draw the plate reference box
 * @param {boolean}           [opts.showConfidence]  append % to each label
 */
export function drawDetectionOverlay(canvas, img, result, opts = {}) {
  const { showPlate = false, showConfidence = false } = opts;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const scale = img.width / 960; // keeps stroke weight readable at any resolution
  const font = Math.max(14, 20 * scale);

  if (showPlate && result.plate) {
    const p = result.plate;
    ctx.strokeStyle = "rgba(255,255,255,0.65)";
    ctx.setLineDash([8 * scale, 6 * scale]);
    ctx.lineWidth = 2 * scale;
    ctx.strokeRect(p.x * img.width, p.y * img.height, p.w * img.width, p.h * img.height);
    ctx.setLineDash([]);
  }

  result.detections.forEach((d) => {
    const x = d.box.x * img.width;
    const y = d.box.y * img.height;
    const w = d.box.w * img.width;
    const h = d.box.h * img.height;

    ctx.strokeStyle = d.colour;
    ctx.lineWidth = 3 * scale;
    ctx.strokeRect(x, y, w, h);

    // No class name shown — the model's food-type guess isn't reliable
    // enough to present as fact, and the user only needs the weight.
    const text = showConfidence
      ? `${d.grams}g · ${Math.round(d.confidence * 100)}%`
      : `${d.grams}g`;

    ctx.font = `600 ${font}px system-ui, sans-serif`;
    const tw = ctx.measureText(text).width;
    const th = font * 1.5;
    const ly = y - th < 0 ? y + h : y - th;

    ctx.fillStyle = d.colour;
    ctx.fillRect(x, ly, tw + 16 * scale, th);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(text, x + 8 * scale, ly + th * 0.7);
  });
}
