const MODES = [
  { id: "WALK", label: "Walking" },
  { id: "TRANSIT", label: "Public transit" },
  { id: "DRIVE", label: "Driving" },
];

export default function ComparisonLoadingScreen({
  originName,
  destinationName,
}) {
  return (
    <section className="m2-loading-screen" aria-label="Finding transport options">
      <div className="m2-loader" aria-hidden="true" />
      <h2 className="m2-loading-title">
        Finding greener ways to your next destination
      </h2>
      <p className="m2-loading-route">
        {originName} <span aria-hidden="true">→</span> {destinationName}
      </p>
      <p className="m2-status m2-status--loading" role="status" aria-live="polite">
        Searching walking, public transit, and driving routes…
      </p>
      <ul className="m2-loading-modes">
        {MODES.map((mode) => (
          <li key={mode.id} className={`m2-loading-mode m2-loading-mode--${mode.id.toLowerCase()}`}>
            <span className="m2-loading-mode-label">{mode.label}</span>
            <span className="m2-loading-mode-state">Searching</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
