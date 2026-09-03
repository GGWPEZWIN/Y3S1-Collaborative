export default function TransportationComparison({
  options,
  selectedMode,
  onSelect,
  onUseRecommended,
  onBack,
}) {
  return (
    <section aria-label="Compare transport">
      <div className="m2-compare">
        {options.map((option) => {
          const selected = option.mode === selectedMode;
          return (
            <button
              key={option.mode}
              type="button"
              className={
                selected
                  ? "m2-mode-card m2-mode-card--selected"
                  : "m2-mode-card"
              }
              aria-pressed={selected}
              onClick={() => onSelect(option.mode)}
            >
              <div className="m2-mode-head">
                <h3>{option.label}</h3>
                {option.isRecommended ? (
                  <span className="m2-rec-badge">Recommended</span>
                ) : null}
              </div>
              <dl className="m2-stat-row">
                <div className="m2-stat">
                  <dt>Duration</dt>
                  <dd>{option.estimatedDurationMinutes} min</dd>
                </div>
                <div className="m2-stat">
                  <dt>Distance</dt>
                  <dd>{option.estimatedDistanceKm} km</dd>
                </div>
                <div className="m2-stat">
                  <dt>Estimated carbon</dt>
                  <dd>{option.estimatedCarbonKg} kg CO₂e</dd>
                </div>
                <div className="m2-stat">
                  <dt>Demo Eco-Score</dt>
                  <dd>{option.demoEcoScore}</dd>
                </div>
              </dl>
              <p className="m2-muted" style={{ marginTop: 12 }}>
                Advantages
              </p>
              <ul className="m2-list">
                {option.advantages.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <p className="m2-muted" style={{ marginTop: 12 }}>
                Limitations
              </p>
              <ul className="m2-list">
                {option.limitations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
      <div className="m2-actions">
        <button type="button" className="m2-btn" onClick={onUseRecommended}>
          Use Recommended Option
        </button>
        <button
          type="button"
          className="m2-btn m2-btn--secondary"
          onClick={onBack}
        >
          Back to Recommendation
        </button>
      </div>
    </section>
  );
}
