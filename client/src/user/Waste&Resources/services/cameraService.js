import { drawSamplePlate } from "./visionService";

/* ==================================================================
   WebRTC CAPTURE ADAPTER  (F1)
   ================================================================== */

export const NO_CAMERA_MESSAGE =
  "This browser does not expose a camera. Upload a photo instead.";
export const CAMERA_DENIED_MESSAGE =
  "Camera unavailable or permission denied. Upload a photo instead.";

/** Capability probe. Safe to call during render — reads only, never writes. */
export function isCameraSupported() {
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices) &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

export function openRearCamera() {
  return navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } },
    audio: false,
  });
}

export function stopStream(stream) {
  if (stream) stream.getTracks().forEach((t) => t.stop());
}

/** Grabs the current video frame, falling back to a synthetic plate. */
export function captureFrame(video) {
  const canvas = document.createElement("canvas");
  if (video && video.videoWidth) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
  } else {
    canvas.width = 960;
    canvas.height = 720;
    drawSamplePlate(canvas.getContext("2d"), canvas.width, canvas.height);
  }
  return canvas;
}

export function sampleFrame() {
  const canvas = document.createElement("canvas");
  canvas.width = 960;
  canvas.height = 720;
  drawSamplePlate(canvas.getContext("2d"), canvas.width, canvas.height);
  return canvas;
}

/** Reads a picked file into a canvas, revoking the object URL afterwards. */
export function fileToCanvas(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      canvas.getContext("2d").drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode that image."));
    };
    img.src = url;
  });
}

/* ------------------------------------------------------------------
   Stored-image encoding
   ------------------------------------------------------------------
   The scan image is embedded in the Firestore log document, and a
   document caps at 1 MiB. A full 1280px capture at quality 0.85 often
   exceeds that once base64-encoded, so downscale before persisting.
   Detection boxes are normalised 0–1, so the overlay is unaffected.

   For production, upload the full frame to Firebase Storage and keep
   only the download URL here.
   ------------------------------------------------------------------ */

const MAX_STORED_EDGE = 720;
const STORED_QUALITY = 0.7;

export function toStoredImage(canvas) {
  const longest = Math.max(canvas.width, canvas.height);
  const scale = Math.min(1, MAX_STORED_EDGE / longest);
  if (scale === 1) return canvas.toDataURL("image/jpeg", STORED_QUALITY);

  const small = document.createElement("canvas");
  small.width = Math.round(canvas.width * scale);
  small.height = Math.round(canvas.height * scale);
  small.getContext("2d").drawImage(canvas, 0, 0, small.width, small.height);
  return small.toDataURL("image/jpeg", STORED_QUALITY);
}
