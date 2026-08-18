import { useState } from "react";
import { MapPin } from "lucide-react";
import MiniMap from "./MiniMap";

/* ==================================================================
   ECO-NUDGE CARD  (F6)
   ================================================================== */

export default function EcoNudge({ nudge }) {
  const [open, setOpen] = useState(false);
  const Icon = nudge.icon;

  return (
    <section className="mt-6 bg-white border border-slate-200 rounded-xl p-6">
      <div className="flex items-start gap-3">
        <Icon size={22} className={nudge.tone + " mt-0.5 shrink-0"} aria-hidden="true" />
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{nudge.title}</h2>
          <p className="mt-2 text-lg text-slate-500">{nudge.body}</p>

          {nudge.pois.length > 0 && (
            <>
              <button
                onClick={() => setOpen((v) => !v)}
                className="mt-4 flex items-center gap-2.5 text-base font-medium hover:text-slate-600 focus:outline-none focus:underline"
              >
                <MapPin size={19} />
                {open ? "Hide map" : `Show ${nudge.pois.length} nearby`}
              </button>

              {open && (
                <div className="mt-4">
                  <MiniMap pois={nudge.pois} />
                  <ul className="mt-4 space-y-3">
                    {nudge.pois.map((p) => (
                      <li key={p.name} className="flex items-center justify-between gap-4">
                        <span className="text-base">{p.name}</span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-base font-medium text-green-700 hover:text-green-900 whitespace-nowrap tabular-nums"
                        >
                          {p.km} km →
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
