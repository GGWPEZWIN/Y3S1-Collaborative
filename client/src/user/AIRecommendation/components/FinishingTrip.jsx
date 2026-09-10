export default function FinishingTrip() {
  return (
    <section className="m2-loading-screen" aria-label="Finishing your trip">
      <div className="m2-loader" aria-hidden="true" />
      <h1 className="m2-loading-title">Finishing your trip…</h1>
      <p className="m2-muted" role="status" aria-live="polite">
        Saving your completed Eco Report. Please keep this page open.
      </p>
    </section>
  );
}
