import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, CheckCircle2, RefreshCw, Upload } from "lucide-react";
import Modal from "./Modal";
import DetectionCanvas from "./DetectionCanvas";
import { PLATE_DIAMETER_CM } from "../constants/waste";
import { runInference } from "../services/visionService";
import {
  CAMERA_DENIED_MESSAGE,
  NO_CAMERA_MESSAGE,
  captureFrame,
  fileToCanvas,
  isCameraSupported,
  openRearCamera,
  sampleFrame,
  stopStream,
  toStoredImage,
} from "../services/cameraService";

/* ==================================================================
   FOOD WASTE SCANNER  (F1 + F2)
   ================================================================== */

const INFERENCE_LATENCY_MS = 1400; // model latency stand-in

export default function ScannerModal({ onClose, onCommit }) {
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const [phase, setPhase] = useState("camera"); // camera | analysing | result
  const [result, setResult] = useState(null);
  const [imageData, setImageData] = useState(null);

  // Resolved once during the first render. Probing capability here rather
  // than in an effect avoids setting state synchronously on mount.
  const [cameraError, setCameraError] = useState(() =>
    isCameraSupported() ? "" : NO_CAMERA_MESSAGE
  );

  /* --- WebRTC capture: an effect that talks to an external system --- */
  useEffect(() => {
    if (phase !== "camera" || !isCameraSupported()) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const stream = await openRearCamera();
        if (cancelled) {
          stopStream(stream);
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        // Runs after an await, so this is a callback update, not a
        // synchronous setState inside the effect body.
        if (!cancelled) setCameraError(CAMERA_DENIED_MESSAGE);
      }
    })();

    return () => {
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
    };
  }, [phase]);

  /* Clear any pending inference timer if the modal unmounts mid-run. */
  useEffect(() => () => clearTimeout(timerRef.current), []);

  const analyse = useCallback((canvas) => {
    setImageData(toStoredImage(canvas));
    setPhase("analysing");
    // Replace with the awaited inference call at the integration point.
    timerRef.current = setTimeout(() => {
      setResult(runInference(canvas.width, canvas.height));
      setPhase("result");
    }, INFERENCE_LATENCY_MS);
  }, []);

  const onFile = useCallback(
    async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = ""; // allow re-picking the same file
      if (!file) return;
      try {
        analyse(await fileToCanvas(file));
      } catch {
        setCameraError("Could not read that image. Try another photo.");
      }
    },
    [analyse]
  );

  const edible = result ? result.detections.filter((d) => d.edible) : [];

  return (
    <Modal title="Food Waste Scanner" onClose={onClose} wide>
      {phase === "camera" && (
        <div>
          <div className="relative rounded-lg overflow-hidden bg-slate-900 aspect-video flex items-center justify-center">
            {!cameraError ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-center px-6">
                <AlertCircle size={30} className="text-slate-400 mx-auto" />
                <p className="mt-3 text-slate-300">{cameraError}</p>
              </div>
            )}
            {/* plate alignment guide */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-3/5 aspect-square rounded-full border-2 border-dashed border-white opacity-40" />
            </div>
          </div>

          <p className="mt-4 text-slate-500">
            Frame the whole plate inside the circle. The plate rim is used as the
            {" "}{PLATE_DIAMETER_CM}cm reference that converts pixels to real area.
          </p>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => analyse(captureFrame(videoRef.current))}
              className="sm:col-span-1 flex items-center justify-center gap-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white py-3.5 text-base font-medium transition-colors"
            >
              <Camera size={19} />
              Capture
            </button>
            <button
              onClick={() => fileRef.current && fileRef.current.click()}
              className="flex items-center justify-center gap-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 py-3.5 text-base font-medium transition-colors"
            >
              <Upload size={19} />
              Upload photo
            </button>
            <button
              onClick={() => analyse(sampleFrame())}
              className="flex items-center justify-center gap-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 py-3.5 text-base font-medium transition-colors"
            >
              <RefreshCw size={19} />
              Sample plate
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFile}
            className="hidden"
          />
        </div>
      )}

      {phase === "analysing" && (
        <div className="py-16 text-center">
          <div className="w-14 h-14 rounded-full border-4 border-slate-200 border-t-purple-600 animate-spin mx-auto" />
          <p className="mt-5 text-lg font-medium">Running on-device inference</p>
          <p className="mt-1 text-slate-500">Segmentation → depth estimation → mass</p>
        </div>
      )}

      {phase === "result" && result && (
        <div>
          {/* F2 — diagnostic overlay */}
          <DetectionCanvas image={imageData} result={result} showPlate showConfidence />

          <div className="mt-5 rounded-lg bg-slate-50 border border-slate-200 p-5">
            <p className="text-lg">
              <span className="font-semibold">Leftover {result.dish} detected:</span>{" "}
              <span className="font-semibold">~{Math.round(result.totalGrams)}g</span>
            </p>
            <p className="mt-1 text-slate-500">
              {edible.length} edible region{edible.length === 1 ? "" : "s"} segmented ·
              scale {result.pxPerCm.toFixed(1)} px/cm
            </p>
          </div>

          <ul className="mt-4 space-y-2.5">
            {result.detections.map((d) => (
              <li key={d.id} className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: d.colour }}
                />
                <span className="flex-1 text-base">
                  {d.label}
                  {!d.edible && (
                    <span className="ml-2 text-sm text-slate-500">excluded from total</span>
                  )}
                </span>
                <span className="text-base text-slate-500 tabular-nums">
                  {Math.round(d.confidence * 100)}%
                </span>
                <span className="text-base font-semibold tabular-nums w-16 text-right">
                  {d.grams}g
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={() => {
                setResult(null);
                setImageData(null);
                setPhase("camera");
              }}
              className="rounded-lg border border-slate-200 hover:bg-slate-50 py-3.5 text-base font-medium transition-colors"
            >
              Rescan
            </button>
            <button
              onClick={() =>
                onCommit({
                  type: "Food",
                  source: "cv",
                  foodWaste: Math.round(result.totalGrams),
                  plastic: 0,
                  water: 0,
                  disposables: 0,
                  detections: { ...result, image: imageData },
                })
              }
              className="flex items-center justify-center gap-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-white py-3.5 text-base font-medium transition-colors"
            >
              <CheckCircle2 size={19} />
              Add to ledger
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
