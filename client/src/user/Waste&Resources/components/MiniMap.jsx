import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

/* ==================================================================
   NEARBY MAP  (F6)
   ------------------------------------------------------------------
   OpenStreetMap tiles via Leaflet. No API key and no billing account.

   CircleMarker is used rather than Marker deliberately: Leaflet's
   default marker loads its icon from a relative image path, which
   bundlers rewrite and break. Circles are drawn as SVG, so there is
   no asset to resolve.
   ================================================================== */

const ZOOM = 14;

export default function MiniMap({ centre, pois }) {
  if (!centre) return null;

  return (
    <div className="rounded-lg overflow-hidden border border-slate-200 h-64">
      <MapContainer
        center={[centre.lat, centre.lng]}
        zoom={ZOOM}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        {/* Attribution is a licence requirement for OSM data, not decoration. */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <CircleMarker
          center={[centre.lat, centre.lng]}
          radius={8}
          pathOptions={{ color: "#16A34A", fillColor: "#16A34A", fillOpacity: 0.9 }}
        >
          <Popup>You are here</Popup>
        </CircleMarker>

        {pois.map((p) => (
          <CircleMarker
            key={p.id}
            center={[p.lat, p.lng]}
            radius={7}
            pathOptions={{ color: "#0EA5E9", fillColor: "#0EA5E9", fillOpacity: 0.85 }}
          >
            <Popup>
              <span className="font-semibold">{p.name}</span>
              <br />
              {p.km} km away
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
