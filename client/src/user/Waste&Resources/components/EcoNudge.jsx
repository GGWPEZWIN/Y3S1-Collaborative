import { useState } from "react";
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

export default function EcoNudge({ nudge }) {
  const [open, setOpen] = useState(false);
  const { status, pois, centre, approximate } = useNearbyPois(nudge.poiKind, open);
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
                  {status === "loading" && (
                    <div className="h-64 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center">
                      <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-green-600 animate-spin" />
                    </div>
                  )}

                  {status === "error" && (
                    <p className="text-slate-500">
                      Could not load nearby places right now. Try again shortly.
                    </p>
                  )}

                  {status === "empty" && (
                    <p className="text-slate-500">
                      No mapped locations within 3km. OpenStreetMap coverage varies by
                      area, and you can add missing ones at openstreetmap.org.
                    </p>
                  )}

                  {status === "ready" && (
                    <>
                      <MiniMap centre={centre} pois={pois} />

                      {approximate && (
                        <p className="mt-2 text-sm text-slate-500">
                          Showing results near your lodging — location access was
                          unavailable.
                        </p>
                      )}

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
