import { useMemo, useState } from "react";
import { MapPin } from "lucide-react";
import MiniMap from "./MiniMap";
import useNearbyPois from "../hooks/useNearbyPois";

/* ==================================================================
   ECO-NUDGE CARD  (F6)
   ------------------------------------------------------------------
   The POI lookup is deferred until the card is expanded. Overpass is a
   shared public endpoint with strict rate limits, so firing a query for
   every nudge on page load would be both slow and impolite.
   ================================================================== */

export default function EcoNudge({ nudge, lodging }) {
  const [open, setOpen] = useState(false);
  // Keyed on the coordinates themselves, not on `lodging` — the Firestore
  // subscription hands back a new object on every snapshot even when the
  // data hasn't changed, and a fresh object identity here is a dependency
  // of useNearbyPois's effect below. Without this, any unrelated re-render
  // (e.g. the geofence watch ticking while reminders are on) recreated the
  // fallback centre, which tore down and restarted the POI lookup before
  // it could ever finish — stuck forever on "Looking for nearby places…".
  const fallbackCentre = useMemo(() => {
    return lodging ? { lat: lodging.lat, lng: lodging.lng } : null;
    // lodging?.lat/lng are the real deps; `lodging` itself churns identity
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lodging?.lat, lodging?.lng]);
  const { status, pois, centre, approximate, live } = useNearbyPois(
    nudge.poiKind,
    open,
    fallbackCentre
  );
  const Icon = nudge.icon;

  return (
    <section className="mt-6 bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-start gap-3">
        <Icon size={22} className={nudge.tone + " mt-0.5 shrink-0"} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-semibold">{nudge.title}</h2>
          <p className="mt-2 text-lg text-slate-500">{nudge.body}</p>

          {nudge.poiKind && (
            <>
              <button
                onClick={() => setOpen((v) => !v)}
                className="mt-4 flex items-center gap-2.5 text-base font-medium hover:text-slate-600 focus:outline-none focus:underline"
              >
                <MapPin size={19} aria-hidden="true" />
                {open ? "Hide map" : "Show nearby"}
              </button>

              {open && (
                <div className="mt-4">
                  {/* The map only needs a centre — render it as soon as one is
                      known instead of waiting on the slower POI lookup too. */}
                  {!centre && status === "error" ? (
                    // No lodging to fall back to and live location failed —
                    // without this branch the card was stuck on the spinner
                    // forever, since it never gets a centre to render past.
                    <p className="mt-2 text-sm text-slate-500">
                      Could not determine your location. Check that location access is
                      allowed for this site, or set your lodging in Logging Reminders
                      below so this can fall back to it.
                    </p>
                  ) : !centre ? (
                    <div className="h-64 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-green-600 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <MiniMap centre={centre} pois={pois} />

                      {approximate && (
                        <p className="mt-2 text-sm text-slate-500">
                          Showing results near your lodging — location access was
                          unavailable.
                        </p>
                      )}

                      {live && (
                        <p className="mt-2 text-sm text-slate-500">
                          Updating as you move.
                        </p>
                      )}

                      {status === "loading" && (
                        <p className="mt-2 text-sm text-slate-500">
                          Looking for nearby places…
                        </p>
                      )}

                      {status === "error" && (
                        <p className="mt-2 text-sm text-slate-500">
                          Could not load nearby places right now. Try again shortly.
                        </p>
                      )}

                      {status === "empty" && (
                        <p className="mt-2 text-sm text-slate-500">
                          No mapped locations within 5km. OpenStreetMap coverage
                          varies by area, and you can add missing ones at
                          openstreetmap.org.
                        </p>
                      )}

                      {status === "ready" && (
                        <ul className="mt-4 space-y-3">
                          {pois.map((p) => (
                            <li key={p.id} className="flex items-center justify-between gap-4">
                              <span className="text-base truncate">{p.name}</span>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-base font-medium text-green-700 hover:text-green-900 whitespace-nowrap tabular-nums shrink-0"
                              >
                                {p.km} km →
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
