import Modal from "./Modal";
import DetectionCanvas from "./DetectionCanvas";

/** Re-opens a stored CV result from the ledger. */
export default function DetectionModal({ log, onClose }) {
  const det = log.detections;
  if (!det) return null;

  // The overlay labels show the model's per-region estimate, so they still
  // sum to the original total after a correction. Say so rather than let the
  // figures appear to disagree.
  const corrected = log.original && log.original.foodWaste !== log.foodWaste;

  return (
    <Modal title={`Scan · ${log.date}`} onClose={onClose} wide>
      <DetectionCanvas image={det.image} result={det} />
      <p className="mt-4 text-lg">
        <span className="font-semibold">Leftover {det.dish} detected:</span>{" "}
        {corrected ? `~${log.original.foodWaste}g` : `~${log.foodWaste}g`}
      </p>
      {corrected && (
        <p className="mt-1 text-slate-500">
          Corrected by you to {log.foodWaste}g. Labels above show the model&apos;s estimate.
        </p>
      )}
    </Modal>
  );
}
