import { WASTE_IMPACT_LOAD } from "../../../firebase/useTripWasteImpact";

/* ==================================================================
   RESOURCE IMPACT  —  Waste & Resource module data on the trip card
   ------------------------------------------------------------------
   Additive only: reads the trip's waste logs independently of the
   Eco Report snapshot, so it never touches that versioned schema.
   ================================================================== */

export default function ResourceImpactCard({ impact, status }) {
  if (status === WASTE_IMPACT_LOAD.LOADING) {
    return (
      <article className="m2-card" aria-label="Resource impact">
        <h3>Resource Impact</h3>
        <p className="m2-muted">Loading waste &amp; resource logs…</p>
      </article>
    );
  }

  if (!impact || impact.logCount === 0) {
    return (
      <article className="m2-card" aria-label="Resource impact">
        <h3>Resource Impact</h3>
        <p className="m2-muted">
          No waste &amp; resource logs recorded for this trip yet. Log food waste,
          water and plastic use from the Waste tab while the trip is active.
        </p>
      </article>
    );
  }

  return (
    <article className="m2-card" aria-label="Resource impact">
      <h3>Resource Impact</h3>
      <p className="m2-muted">
        From {impact.logCount} waste log{impact.logCount === 1 ? "" : "s"} recorded during
        this trip.
      </p>
      <dl className="m2-stat-row" style={{ marginTop: 16 }}>
        <div className="m2-stat">
          <dt>Food waste</dt>
          <dd>{impact.foodWasteG}g</dd>
        </div>
        <div className="m2-stat">
          <dt>Water used</dt>
          <dd>{impact.waterL}L</dd>
        </div>
        <div className="m2-stat">
          <dt>Plastic items</dt>
          <dd>{impact.plasticItems}</dd>
        </div>
      </dl>
    </article>
  );
}
