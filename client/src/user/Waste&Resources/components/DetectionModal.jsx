import Modal from "./Modal";
import DetectionCanvas from "./DetectionCanvas";

/** Re-opens a stored CV result from the ledger. */
export default function DetectionModal({ log, onClose }) {
  const det = log.detections;
  if (!det) return null;

  return (
    <Modal title={`Scan · ${log.date}`} onClose={onClose} wide>
      <DetectionCanvas image={det.image} result={det} />
      <p className="mt-4 text-lg">
        <span className="font-semibold">Leftover {det.dish} detected:</span> ~{log.foodWaste}g
      </p>
    </Modal>
  );
}
