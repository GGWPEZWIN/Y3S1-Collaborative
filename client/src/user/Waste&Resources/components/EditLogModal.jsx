import { useCallback, useEffect, useRef, useState } from "react";
import { AlertCircle, Camera, RotateCcw, Upload } from "lucide-react";
import Modal from "./Modal";
import NumberField from "./NumberField";
import DetectionCanvas from "./DetectionCanvas";
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
   EDIT LOG
   ------------------------------------------------------------------
   Scanned masses carry roughly 20-30% error even in the published
   literature, so a user correction is the mechanism that makes an
   estimate trustworthy rather than a number to argue with.

   The first save snapshots the pre-edit values (see ledgerStore), so
   a corrected scan keeps the model's original prediction for later
   evaluation.

   Camera estimation isn't limited to logs that started as a scan — a
   manually-typed Resource entry's food waste is just as eligible for
   re-estimation as a Food entry's (mirrors EditLogView).
   ================================================================== */

const FIELDS = [
  { key: "foodWaste", label: "Food waste", suffix: "g", hint: "Leftovers on the plate" },
  { key: "plastic", label: "Plastic items", suffix: null, hint: "Bottles, bags, straws, cutlery" },
  { key: "water", label: "Water", suffix: "L", hint: "Shower, washing, drinking" },
  { key: "disposables", label: "Disposable amenities", suffix: null, hint: "Toiletries, slippers, razors" },
];

export default function EditLogModal({ log, onClose, onSave }) {
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
  const [rescan, setRescan] = useState(null); // { detections: {...result, image} } | null
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

  const set = (key) => (v) => setValues((prev) => ({ ...prev, [key]: v }));

  const original = log.original || null;
  const alreadyScanned = log.source === "cv";
  const changed =
    Boolean(rescan) || FIELDS.some((f) => values[f.key] !== (Number(log[f.key]) || 0));

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

  const save = async () => {
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
    <Modal title={`Edit log · ${log.date}`} onClose={onClose} wide>
      {log.source === "cv" && (
        <p className="text-slate-500">
          This entry came from a plate scan. Correcting it keeps the original estimate on
          record so the model can be measured against real weights.
        </p>
      )}

      <div className="mt-6 space-y-5">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <NumberField
              label={f.label}
              hint={f.hint}
              suffix={f.suffix}
              value={values[f.key]}
              onChange={set(f.key)}
            />
            {original && original[f.key] !== values[f.key] && (
              <button
                onClick={() => set(f.key)(original[f.key])}
                className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 focus:outline-none focus:underline"
              >
                <RotateCcw size={13} aria-hidden="true" />
                Originally {original[f.key]}
                {f.suffix || ""}
              </button>
            )}

            {f.key === "foodWaste" && (
              <>
                {!scanning && (
                  <button
                    onClick={openRescan}
                    className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-700 hover:text-slate-950 transition-colors focus:outline-none focus:underline"
                  >
                    <Camera size={14} aria-hidden="true" />
                    {alreadyScanned ? "Re-scan with camera" : "Scan with camera"}
                  </button>
                )}

                {scanning && (
                  <div className="mt-3 rounded-lg border border-slate-200 p-4">
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
                              <Camera size={28} className="text-slate-400 mx-auto" aria-hidden="true" />
                              <p className="mt-2 text-sm text-slate-600">
                                Camera not available. Upload a photo instead.
                              </p>
                            </div>
                          )}
                        </div>

                        {scanError && (
                          <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3">
                            <AlertCircle
                              size={16}
                              className="text-amber-600 mt-0.5 shrink-0"
                              aria-hidden="true"
                            />
                            <p className="text-sm text-amber-900">{scanError}</p>
                          </div>
                        )}

                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <button
                            onClick={() => analyse(captureFrame(videoRef.current))}
                            disabled={!hasLiveCamera}
                            className="sm:col-span-1 flex items-center justify-center gap-2 rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-white py-2 text-sm font-medium transition-colors"
                          >
                            <Camera size={15} aria-hidden="true" />
                            Capture
                          </button>
                          <button
                            onClick={() => fileRef.current && fileRef.current.click()}
                            className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 hover:bg-slate-50 py-2 text-sm font-medium transition-colors"
                          >
                            <Upload size={15} aria-hidden="true" />
                            Upload photo
                          </button>
                          <button
                            onClick={closeRescan}
                            className="rounded-lg border border-slate-200 hover:bg-slate-50 py-2 text-sm font-medium transition-colors"
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
                          <div className="w-9 h-9 rounded-full border-4 border-slate-200 border-t-purple-600 animate-spin mx-auto" />
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
                        <p className="mt-3 text-sm">
                          New estimate:{" "}
                          <span className="font-semibold">
                            {Math.round(scanResult.totalGrams)}g
                          </span>
                        </p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button
                            onClick={() => {
                              setScanResult(null);
                              setScanImage(null);
                              setScanPhase("camera");
                            }}
                            className="rounded-lg border border-slate-200 hover:bg-slate-50 py-2 text-sm font-medium transition-colors"
                          >
                            Retake
                          </button>
                          <button
                            onClick={acceptRescan}
                            className="rounded-lg bg-slate-950 hover:bg-slate-800 text-white py-2 text-sm font-medium transition-colors"
                          >
                            Use this reading
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {rescan && !scanning && (
                  <p className="mt-1.5 text-sm text-green-700">
                    Updated from a new plate scan — save to keep it.
                  </p>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <button
          onClick={onClose}
          className="rounded-lg border border-slate-200 hover:bg-slate-50 py-3.5 text-base font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!changed || saving}
          className="rounded-lg bg-slate-950 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-slate-950 text-white py-3.5 text-base font-medium transition-colors"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </Modal>
  );
}
