import { skipDialogCopy } from "../services/navigation/skipDialog.js";

export default function SkipDestinationDialog({
  open = false,
  destinationName,
  isFinalDestination = false,
  confirming = false,
  error = null,
  onKeepNavigating,
  onSkipDestination,
}) {
  if (!open) return null;

  const copy = skipDialogCopy({ destinationName, isFinalDestination });

  return (
    <div className="m2-dialog-backdrop" role="presentation">
      <div
        className="m2-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="m2-skip-title"
        aria-describedby="m2-skip-body"
      >
        <h2 id="m2-skip-title">{copy.title}</h2>
        <p id="m2-skip-body" className="m2-muted">
          {copy.body}
        </p>
        {error ? (
          <p className="m2-status m2-status--error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="m2-action-row">
          <div className="m2-action-row__buttons">
            <div className="m2-action-row__slot">
              <button
                type="button"
                className="m2-btn m2-btn--secondary"
                onClick={onKeepNavigating}
                disabled={confirming}
              >
                Keep Navigating
              </button>
            </div>
            <div className="m2-action-row__slot">
              <button
                type="button"
                className="m2-btn"
                onClick={onSkipDestination}
                disabled={confirming}
              >
                {confirming ? "Skipping…" : "Skip Destination"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
