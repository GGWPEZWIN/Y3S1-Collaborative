import { useEffect, useRef } from "react";
import { drawDetectionOverlay } from "../services/visionService";

/**
 * F2 — paints a stored or freshly-inferred result onto a canvas.
 * Shared by the live scanner and the ledger viewer.
 *
 * The effect only touches the canvas (an external system) and sets no
 * React state, which is exactly what an effect is for.
 */
export default function DetectionCanvas({
  image,
  result,
  showPlate = false,
  showConfidence = false,
  className = "w-full rounded-lg bg-slate-900",
}) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || !result) return undefined;

    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      drawDetectionOverlay(canvas, img, result, { showPlate, showConfidence });
    };
    img.src = image;

    return () => {
      cancelled = true;
    };
  }, [image, result, showPlate, showConfidence]);

  return <canvas ref={canvasRef} className={className} />;
}
