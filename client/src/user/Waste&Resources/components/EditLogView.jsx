import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Camera, RotateCcw, Upload } from "lucide-react";
import DetectionCanvas from "./DetectionCanvas";
import NumberField from "./NumberField";
import { getBenchmarks } from "../services/baselineService";
import { runInference } from "../services/visionService";
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
   EDIT LOG  (F3)
   ------------------------------------------------------------------
   Mirrors ResourceLoggerView so correcting an entry looks and behaves
   exactly like creating one.

   Scanned masses carry roughly 20-30% error even in the published
   literature, so a user correction is what makes an estimate usable
   rather than a number to argue with. The first save snapshots the
   pre-edit values (see ledgerStore.updateLog), preserving the model's
   prediction alongside the correction.
   ================================================================== */

const WATER_STEP = 5;

export default function EditLogView({ log, onBack, onSave }) {
  const [values, setValues] = useState(() => ({
    foodWaste: Number(log.foodWaste) || 0,
    plastic: Number(log.plastic) || 0,
    water: Number(log.water) || 0,
    disposables: Number(log.disposables) || 0,
  }));
  const [saving, setSaving] = useState(false);

  // A rescan replaces the CV evidence behind foodWaste, not just the
  // number — so it's tracked separately and only folded into the patch
  // on save, rather than living in `values` alongside the plain fields.
  const [rescan, setRescan] = useState(null); // { detections, image } | null
  const [scanning, setScanning] = useState(false);
  const [scanPhase, setScanPhase] = useState("camera"); // camera | analysing | result
  const [scanResult, setScanResult] = useState(null);
  const [scanImage, setScanImage] = useState(null);
  const [scanError, setScanError] = useState(() =>
    isCameraSupported() ? "" : NO_CAMERA_MESSAGE
  );
  const [hasLiveCamera, setHasLiveCamera] = useState(false);

  const videoRef = useRef(null);
  const fileRef = useRef(null);
  const streamRef = useRef(null);
  const aliveRef = useRef(true);

  const benchmarks = getBenchmarks();
  const original = log.original || null;
  // Camera estimation isn't limited to logs that started as a scan — a
  // manually-typed Resource entry's food waste is just as eligible for
  // re-estimation as a Food entry's.
  const alreadyScanned = log.source === "cv";

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!scanning || scanPhase !== "camera" || !isCameraSupported()) return undefined;
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
          setScanError((prev) => prev || CAMERA_DENIED_MESSAGE);
        }
      }
    })();

    return () => {
      cancelled = true;
      stopStream(streamRef.current);
      streamRef.current = null;
      setHasLiveCamera(false);
    };
  }, [scanning, scanPhase]);

  const openRescan = () => {
    setScanError(isCameraSupported() ? "" : NO_CAMERA_MESSAGE);
    setScanResult(null);
    setScanImage(null);
    setScanPhase("camera");
    setScanning(true);
  };

  const closeRescan = () => {
    setScanning(false);
    stopStream(streamRef.current);
    streamRef.current = null;
  };

  const analyse = useCallback(async (canvas) => {
    if (!canvas) {
      setScanError("No camera frame available. Upload a photo instead.");
      return;
    }
    setScanError("");
    setScanImage(toStoredImage(canvas));
    setScanPhase("analysing");

    try {
      const inference = await runInference(canvas);
      if (!aliveRef.current) return;
      setScanResult(inference);
      setScanPhase("result");
    } catch (err) {
      if (!aliveRef.current) return;
      setScanError(err.message);
      setScanPhase("camera");
    }
  }, []);

  const onScanFile = useCallback(
    async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = "";
      if (!file) return;
      try {
        await analyse(await fileToCanvas(file));
      } catch {
        setScanError("Could not read that image. Try another photo.");
      }
    },
    [analyse]
  );

  const acceptRescan = () => {
    if (!scanResult) return;
    setValues((prev) => ({ ...prev, foodWaste: Math.round(scanResult.totalGrams) }));
    setRescan({ detections: { ...scanResult, image: scanImage } });
    closeRescan();
  };

  // A stored log can exceed the logger's 200L default, so the ceiling has to
  // clear the existing value or the slider would silently clamp it down.
  const waterMax = Math.max(200, Math.ceil((Number(log.water) || 0) / 50) * 50);

  const set = (key) => (v) => setValues((prev) => ({ ...prev, [key]: v }));

  const changed =
    Boolean(rescan) ||
    ["foodWaste", "plastic", "water", "disposables"].some(
      (k) => values[k] !== (Number(log[k]) || 0)
    );

  const revert = (key, suffix) =>
    original && original[key] !== values[key] ? (
      <button
        onClick={() => set(key)(original[key])}
        className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 focus:outline-none focus:underline"
      >
        <RotateCcw size={13} aria-hidden="true" />
        Originally {original[key]}
        {suffix}
      </button>
    ) : null;

  const submit = async () => {
    setSaving(true);
    try {
      // A rescan is fresh CV evidence for the entry, not a manual tweak —
      // record it as such even if the log started out as a manual entry.
      const patch = rescan ? { ...values, ...rescan, source: "cv" } : values;
      await onSave(log, patch);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 px-6 lg:px-8 py-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={onBack}
          className="flex items-center gap-3 text-base font-medium hover:text-slate-600 transition-colors focus:outline-none focus:underline"
        >
          <ArrowLeft size={20} aria-hidden="true" />
          Back
        </button>

        <h1 className="mt-6 text-4xl font-bold tracking-tight">Edit Log</h1>
        <p className="mt-2 text-lg text-slate-500">{log.date}</p>

        <section className="mt-8 bg-white border border-slate-200 rounded-xl p-6">
          <h2 className="text-lg font-semibold">Update Your Usage</h2>

          {log.source === "cv" && (
            <p className="mt-2 text-sm text-slate-500">
              This entry came from a plate scan. Correcting it keeps the original
              estimate on record.
            </p>
          )}

          <div className="mt-6 space-y-6">
            <div>
              <NumberField
                label="Food Waste"
                hint="Leftovers on the plate"
                suffix="g"
                value={values.foodWaste}
                onChange={set("foodWaste")}
              />
              {revert("foodWaste", "g")}

              {!scanning && (
                <button
                  onClick={openRescan}
                  className="mt-3 flex items-center gap-2 text-base text-slate-700 hover:text-slate-950 transition-colors focus:outline-none focus:underline"
                >
                  <Camera size={17} aria-hidden="true" />
                  {alreadyScanned ? "Re-scan with camera" : "Scan with camera"}
                </button>
              )}

              {scanning && (
                <div className="mt-4 rounded-lg border border-slate-200 p-5">
                  {scanPhase === "camera" && (
                    <>
                      <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
                        {hasLiveCamera ? (
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="absolute inset-0 w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center px-6">
                            <Camera size={32} className="text-slate-400 mx-auto" aria-hidden="true" />
                            <p className="mt-2 text-sm text-slate-600">
                              Camera not available. Upload a photo instead.
                            </p>
                          </div>
                        )}
                      </div>

                      {scanError && (
                        <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
                          <AlertCircle
                            size={18}
                            className="text-amber-600 mt-0.5 shrink-0"
                            aria-hidden="true"
                          />
                          <p className="text-sm text-amber-900">{scanError}</p>
                        </div>
                      )}

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <button
                          onClick={() => analyse(captureFrame(videoRef.current))}
                          disabled={!hasLiveCamera}
                          className="sm:col-span-1 flex items-center justify-center gap-2 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-white py-2.5 text-sm font-medium transition-colors"
                        >
                          <Camera size={16} aria-hidden="true" />
                          Capture
                        </button>
                        <button
                          onClick={() => fileRef.current && fileRef.current.click()}
                          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 hover:bg-slate-50 py-2.5 text-sm font-medium transition-colors"
                        >
                          <Upload size={16} aria-hidden="true" />
                          Upload photo
                        </button>
                        <button
                          onClick={closeRescan}
                          className="rounded-lg border border-slate-200 hover:bg-slate-50 py-2.5 text-sm font-medium transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={onScanFile}
                        className="hidden"
                      />
                    </>
                  )}

                  {scanPhase === "analysing" && (
                    <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-purple-600 animate-spin mx-auto" />
                        <p className="mt-3 text-sm text-slate-700 font-medium">Analysing plate</p>
                      </div>
                    </div>
                  )}

                  {scanPhase === "result" && scanResult && (
                    <>
                      <DetectionCanvas
                        image={scanImage}
                        result={scanResult}
                        showPlate
                        showConfidence
                        className="w-full rounded-lg bg-slate-900"
                      />
                      <p className="mt-3 text-base">
                        New estimate:{" "}
                        <span className="font-semibold">
                          {Math.round(scanResult.totalGrams)}g
                        </span>
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            setScanResult(null);
                            setScanImage(null);
                            setScanPhase("camera");
                          }}
                          className="rounded-lg border border-slate-200 hover:bg-slate-50 py-2.5 text-sm font-medium transition-colors"
                        >
                          Retake
                        </button>
                        <button
                          onClick={acceptRescan}
                          className="rounded-lg bg-slate-950 hover:bg-slate-800 text-white py-2.5 text-sm font-medium transition-colors"
                        >
                          Use this reading
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {rescan && !scanning && (
                <p className="mt-2 text-sm text-green-700">
                  Updated from a new plate scan — save to keep it.
                </p>
              )}
            </div>

            <div>
              <NumberField
                label="Single-Use Plastic Items"
                hint="Bottles, bags, straws, containers, etc."
                value={values.plastic}
                onChange={set("plastic")}
              />
              {revert("plastic", "")}
            </div>

            <div>
              <label className="block text-base font-semibold">Water Usage (Liters)</label>
              <input
                type="range"
                min={0}
                max={waterMax}
                step={WATER_STEP}
                value={values.water}
                onChange={(e) => set("water")(Number(e.target.value))}
                aria-label="Water usage in liters"
                className="mt-3 w-full accent-slate-950 cursor-pointer"
              />
              <div className="mt-1 flex items-center justify-between text-base">
                <span className="text-slate-500">0L</span>
                <span className="font-semibold tabular-nums">{values.water}L</span>
                <span className="text-slate-500">{waterMax}L</span>
              </div>
              <p className="mt-2 text-sm text-slate-500">Shower, washing, drinking water</p>
              {revert("water", "L")}
            </div>

            <div>
              <NumberField
                label="Disposable Amenities"
                hint="Toothbrushes, razors, slippers, etc."
                value={values.disposables}
                onChange={set("disposables")}
              />
              {revert("disposables", "")}
            </div>
          </div>

          <div className="mt-6 rounded-lg bg-blue-50 px-5 py-4">
            <h3 className="text-base font-semibold">Impact Summary</h3>
            <ul className="mt-3 space-y-1.5 text-base text-slate-700">
              <li>
                • Food waste: {values.foodWaste}g (Avg: {benchmarks.foodWaste}g/day)
              </li>
              <li>
                • Plastic items: {values.plastic} (Avg: {benchmarks.plastic.toFixed(1)}/day)
              </li>
              <li>
                • Water: {values.water}L (Avg: {benchmarks.water}L/day)
              </li>
              <li>
                {/* No published baseline exists for hotel amenities, so this is
                    an app-defined target rather than a statistical average. */}
                • Disposables: {values.disposables} (Target: {benchmarks.disposables}/day)
              </li>
            </ul>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <button
              onClick={onBack}
              className="rounded-lg border border-slate-200 hover:bg-slate-50 py-3.5 text-base font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!changed || saving}
              className="rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-950 text-white py-3.5 text-base font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
            >
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
