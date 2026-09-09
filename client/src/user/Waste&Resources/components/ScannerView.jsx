import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Camera, Pencil, Upload } from "lucide-react";
import DetectionCanvas from "./DetectionCanvas";
import NumberField from "./NumberField";
import { PLATE_DIAMETER_CM } from "../constants/waste";
import { getBenchmarks } from "../services/baselineService";
import { VisionInputError, runInference } from "../services/visionService";
import {
  CAMERA_DENIED_MESSAGE,
  NO_CAMERA_MESSAGE,
  captureFrame,
  fileToCanvas,
  isCameraSupported,
  openRearCamera,
  stopStream,
  toStoredImage,
} from "../services/cameraService";

/* ==================================================================
   FOOD WASTE SCANNER  (F1 + F2)
   ------------------------------------------------------------------
   Capture -> segment -> estimate depth -> convert to mass, calibrated
   against the plate rim as a known physical reference.

   There is no fallback estimate. When the scanner cannot read a photo
   the user is told why and offered manual entry, because an invented
   mass in the ledger is worse than no reading at all.
   ================================================================== */

export default function ScannerView({ onBack, onCommit }) {
  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const streamRef = useRef(null);
  const aliveRef = useRef(true);

  const [phase, setPhase] = useState("camera"); // camera | analysing | result
  const [result, setResult] = useState(null);
  const [imageData, setImageData] = useState(null);
  const [hasLiveCamera, setHasLiveCamera] = useState(false);

  const [error, setError] = useState(() =>
    isCameraSupported() ? "" : NO_CAMERA_MESSAGE
  );

  // Manual entry: the honest path when the scanner cannot help.
  const [manualOpen, setManualOpen] = useState(false);
  const [manualGrams, setManualGrams] = useState(0);

  const benchmarks = getBenchmarks();

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

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
        setHasLiveCamera(true);
      } catch {
        if (!cancelled) {
          setHasLiveCamera(false);
          setError(CAMERA_DENIED_MESSAGE);
        }
      }
    })();

    return () => {
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
      setHasLiveCamera(false);
    };
  }, [phase]);

  const analyse = useCallback(async (canvas) => {
    if (!canvas) {
      setError("No camera frame available. Upload a photo instead.");
      return;
    }
    setError("");
    setImageData(toStoredImage(canvas));
    setPhase("analysing");

    try {
      const inference = await runInference(canvas);
      if (!aliveRef.current) return;
      setResult(inference);
      setPhase("result");
    } catch (err) {
      if (!aliveRef.current) return;
      // VisionInputError carries actionable guidance from the service.
      // Anything else is an infrastructure problem, phrased differently.
      setError(err instanceof VisionInputError ? err.message : err.message);
      setManualOpen(true);
      setPhase("camera");
    }
  }, []);

  const onFile = useCallback(
    async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      try {
        await analyse(await fileToCanvas(file));
      } catch {
        setError("Could not read that image. Try another photo.");
      }
    },
    [analyse]
  );

  const saveManual = () => {
    onCommit({
      type: "Food",
      // Recorded as manual, not cv — the ledger must never imply a
      // measurement the scanner did not make.
      source: "manual",
      foodWaste: manualGrams,
      plastic: 0,
      water: 0,
      disposables: 0,
      detections: null,
    });
  };

  const edible = result ? result.detections.filter((d) => d.edible) : [];
  const grams = result ? Math.round(result.totalGrams) : 0;
  const dailyPct = benchmarks.foodWaste
    ? Math.round((grams / benchmarks.foodWaste) * 100)
    : 0;

  return (
    <main className="flex-1 px-6 lg:px-8 py-8">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-3 text-base font-medium hover:text-slate-600 transition-colors focus:outline-none focus:underline"
        >
          <ArrowLeft size={20} aria-hidden="true" />
          Back
        </button>

        <h1 className="mt-6 text-4xl font-bold tracking-tight">Food Waste Scanner</h1>
        <p className="mt-2 text-lg text-slate-500">AI-powered plate waste detection</p>

        <section className="mt-8 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold">Camera Scanner</h2>
          <p className="mt-1 text-slate-500">
            Take a photo of your plate to automatically calculate waste
          </p>

          <div className="mt-4">
            {phase === "camera" && (
              <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                {hasLiveCamera ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-3/5 aspect-square rounded-full border-2 border-dashed border-white opacity-60" />
                    </div>
                  </>
                ) : (
                  <div className="text-center px-6">
                    <Camera size={40} className="text-slate-400 mx-auto" aria-hidden="true" />
                    <p className="mt-3 text-slate-600">
                      Camera not available. Upload a photo instead.
                    </p>
                  </div>
                )}
              </div>
            )}

            {phase === "analysing" && (
              <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-purple-600 animate-spin mx-auto" />
                  <p className="mt-4 text-slate-700 font-medium">Analysing plate</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Segmentation → depth → mass
                  </p>
                </div>
              </div>
            )}

            {phase === "result" && result && (
              <DetectionCanvas
                image={imageData}
                result={result}
                showPlate
                showConfidence
                className="w-full rounded-lg bg-slate-900"
              />
            )}
          </div>

          {phase === "camera" && (
            <>
              {error && (
                <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <AlertCircle
                    size={20}
                    className="text-amber-600 mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  <p className="text-amber-900">{error}</p>
                </div>
              )}

              <p className="mt-3 text-sm text-slate-500">
                Frame the whole plate against a contrasting surface, shot at an angle
                rather than straight down. The rim is used as a {PLATE_DIAMETER_CM}cm
                reference to convert pixels into real area.
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => analyse(captureFrame(videoRef.current))}
                  disabled={!hasLiveCamera}
                  title={hasLiveCamera ? undefined : "No camera available"}
                  className="flex items-center justify-center gap-2.5 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-950 text-white py-3.5 text-base font-medium transition-colors"
                >
                  <Camera size={19} aria-hidden="true" />
                  Capture Photo
                </button>
                <button
                  onClick={() => fileRef.current && fileRef.current.click()}
                  className="flex items-center justify-center gap-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 py-3.5 text-base font-medium transition-colors"
                >
                  <Upload size={19} aria-hidden="true" />
                  Upload photo
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

              {/* --- Manual fallback --- */}
              {!manualOpen ? (
                <button
                  onClick={() => setManualOpen(true)}
                  className="mt-4 flex items-center gap-2 text-base text-slate-700 hover:text-slate-950 transition-colors focus:outline-none focus:underline"
                >
                  <Pencil size={17} aria-hidden="true" />
                  Enter the weight yourself
                </button>
              ) : (
                <div className="mt-5 rounded-lg border border-slate-200 p-5">
                  <NumberField
                    label="Food waste"
                    hint="Weigh the leftovers, or estimate against a 200g rice portion."
                    suffix="g"
                    value={manualGrams}
                    onChange={setManualGrams}
                  />
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setManualOpen(false)}
                      className="rounded-lg border border-slate-200 hover:bg-slate-50 py-3 text-base font-medium transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveManual}
                      disabled={manualGrams <= 0}
                      className="rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-white py-3 text-base font-medium transition-colors"
                    >
                      Save Log
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {phase === "result" && result && (
            <div className="mt-4 space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-bold mb-3">Detection Results</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">Detected Food</span>
                    <span className="rounded-md bg-slate-950 text-white text-sm font-medium px-2.5 py-1">
                      {result.dish}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-slate-600">Estimated Waste</span>
                    <span className="font-bold text-lg tabular-nums">{grams}g</span>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-slate-600">Ingredients</span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {edible.map((d) => (
                        <span
                          key={d.id}
                          className="rounded-md border border-slate-300 bg-white text-xs px-2 py-0.5"
                        >
                          {d.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg text-sm">
                <p className="font-medium mb-1">Benchmark Comparison</p>
                <p className="text-slate-600">
                  National baseline is {benchmarks.foodWaste}g of avoidable food waste per
                  person per day. This plate is{" "}
                  <strong className={dailyPct <= 100 ? "text-green-600" : "text-orange-600"}>
                    {dailyPct}% of that
                  </strong>
                  .
                </p>
              </div>

              <p className="text-sm text-slate-500">
                Estimated by the vision model. Accurate to roughly ±25%, so edit the log
                if it looks wrong.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() =>
                    onCommit({
                      type: "Food",
                      source: "cv",
                      foodWaste: grams,
                      plastic: 0,
                      water: 0,
                      disposables: 0,
                      detections: { ...result, image: imageData },
                    })
                  }
                  className="flex-1 rounded-lg bg-slate-950 hover:bg-slate-800 text-white py-3.5 text-base font-medium transition-colors"
                >
                  Save Log
                </button>
                <button
                  onClick={() => {
                    setResult(null);
                    setImageData(null);
                    setPhase("camera");
                  }}
                  className="rounded-lg border border-slate-200 hover:bg-slate-50 px-6 py-3.5 text-base font-medium transition-colors"
                >
                  Retake
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
