import { FOOD_PROFILE, PLATE_DIAMETER_CM } from "../constants/waste";

/* ==================================================================
   COMPUTER VISION PIPELINE  (F1 + F2)
   ------------------------------------------------------------------
   runInference() is the single integration point. Swap the mock body
   for a tfjs / onnxruntime-web session and keep the return shape:
   boxes are normalised 0–1 so the overlay scales to any canvas size.
   ================================================================== */

const MOCK_SCENES = [
  {
    plate: { x: 0.08, y: 0.1, w: 0.84, h: 0.8 },
    items: [
      { cls: "rice", x: 0.2, y: 0.24, w: 0.34, h: 0.3, fill: 0.72, depthCm: 1.5, conf: 0.94 },
      { cls: "sambal", x: 0.56, y: 0.3, w: 0.16, h: 0.14, fill: 0.8, depthCm: 0.8, conf: 0.88 },
      { cls: "egg", x: 0.3, y: 0.58, w: 0.2, h: 0.18, fill: 0.68, depthCm: 1.1, conf: 0.91 },
    ],
    dish: "Nasi Lemak",
  },
  {
    plate: { x: 0.06, y: 0.08, w: 0.88, h: 0.84 },
    items: [
      { cls: "noodle", x: 0.22, y: 0.3, w: 0.4, h: 0.32, fill: 0.66, depthCm: 1.3, conf: 0.9 },
      { cls: "vegetable", x: 0.58, y: 0.26, w: 0.2, h: 0.2, fill: 0.6, depthCm: 1.0, conf: 0.83 },
    ],
    dish: "Char Kway Teow",
  },
  {
    plate: { x: 0.1, y: 0.12, w: 0.8, h: 0.76 },
    items: [
      { cls: "rice", x: 0.24, y: 0.28, w: 0.28, h: 0.26, fill: 0.6, depthCm: 1.2, conf: 0.92 },
      { cls: "curry", x: 0.52, y: 0.34, w: 0.24, h: 0.22, fill: 0.85, depthCm: 1.0, conf: 0.87 },
      { cls: "meat", x: 0.3, y: 0.6, w: 0.18, h: 0.16, fill: 0.7, depthCm: 1.6, conf: 0.89 },
      { cls: "bone", x: 0.6, y: 0.62, w: 0.12, h: 0.1, fill: 0.55, depthCm: 1.2, conf: 0.76 },
    ],
    dish: "Nasi Kandar",
  },
];

/**
 * Area x depth x density, calibrated against the detected plate.
 * @param {object} det      normalised detection
 * @param {number} pxPerCm  scale derived from the plate bounding box
 * @param {number} imgW     captured image width in px
 * @param {number} imgH     captured image height in px
 */
function estimateMass(det, pxPerCm, imgW, imgH) {
  const profile = FOOD_PROFILE[det.cls];
  const areaPx = det.w * imgW * det.h * imgH * det.fill; // segmentation fill inside the box
  const areaCm2 = areaPx / (pxPerCm * pxPerCm);
  const volumeCm3 = areaCm2 * det.depthCm * profile.shape;
  return volumeCm3 * profile.density; // grams
}

export function runInference(imgW, imgH) {
  // === INTEGRATION POINT =========================================
  // const seg   = await segmentationModel.executeAsync(tensor);
  // const depth = await depthModel.executeAsync(tensor);
  // return decode(seg, depth);
  // ===============================================================
  const scene = MOCK_SCENES[Math.floor(Math.random() * MOCK_SCENES.length)];
  const pxPerCm = (scene.plate.w * imgW) / PLATE_DIAMETER_CM;

  const detections = scene.items.map((it, i) => {
    const jitter = 0.85 + Math.random() * 0.3;
    const grams = estimateMass(it, pxPerCm, imgW, imgH) * jitter;
    return {
      id: i,
      cls: it.cls,
      label: FOOD_PROFILE[it.cls].label,
      colour: FOOD_PROFILE[it.cls].colour,
      box: { x: it.x, y: it.y, w: it.w, h: it.h },
      confidence: it.conf,
      grams: Math.round(grams),
      edible: it.cls !== "bone",
    };
  });

  const totalGrams = detections
    .filter((d) => d.edible)
    .reduce((s, d) => s + d.grams, 0);

  return { dish: scene.dish, plate: scene.plate, detections, totalGrams, pxPerCm };
}

/** Draws a synthetic plate so the pipeline is demonstrable without a camera. */
export function drawSamplePlate(ctx, w, h) {
  ctx.fillStyle = "#1F2937";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#F8FAFC";
  ctx.beginPath();
  ctx.ellipse(w / 2, h / 2, w * 0.42, h * 0.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = w * 0.02;
  ctx.stroke();
  const blobs = [
    { x: 0.38, y: 0.4, r: 0.13, c: "#FDE68A" },
    { x: 0.62, y: 0.38, r: 0.08, c: "#DC2626" },
    { x: 0.44, y: 0.64, r: 0.09, c: "#FCD34D" },
  ];
  blobs.forEach((b) => {
    ctx.fillStyle = b.c;
    ctx.beginPath();
    ctx.ellipse(b.x * w, b.y * h, b.r * w, b.r * h * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();
  });
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

    const text = showConfidence
      ? `${d.label} · ${d.grams}g · ${Math.round(d.confidence * 100)}%`
      : `${d.label} · ${d.grams}g`;

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
