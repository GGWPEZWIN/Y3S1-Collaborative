import { haversineM } from "./geoService";

/* ==================================================================
   NEARBY POINTS OF INTEREST  (F6)
   ------------------------------------------------------------------
   Live data from OpenStreetMap via the Overpass API. No API key, no
   billing, and the licence permits use with attribution — which the
   map tile layer carries.

   Tags used:
     amenity=drinking_water        public drinking/refill points
     drinking_water:refill=yes     cafes and bars in a refill network,
                                   a tag created specifically to help
                                   combat single-use plastic
     shop=zero_waste / bulk_purchase=yes / shop=refill
                                   package-free and bulk retail
   ================================================================== */

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const DEFAULT_RADIUS_M = 5000;
const MAX_RESULTS = 6;

// Overpass is a shared public instance with no SLA — a slow or hung
// response otherwise leaves the caller waiting indefinitely on "loading"
// with nothing to force a resolution. Bounding it here turns a silent
// stall into a definite failure the UI can show as an error.
const OVERPASS_TIMEOUT_MS = 15000;

// Three OSM tags at a 3km radius turned up nothing in practice — OSM's
// drinking-water tagging is sparse and inconsistent outside well-mapped
// areas. Widened to every tag combination actually used for public/free
// water access, plus a larger radius, so a real nearby point has more
// chances to match rather than relying on one narrow tag being present.
const FILTERS = {
  refill: [
    '[amenity=drinking_water]',
    '["drinking_water:refill"="yes"]',
    '[amenity=water_point]',
    '[amenity=fountain]["drinking_water"="yes"]',
    '["drinking_water"="yes"]',
    '[man_made=water_tap]["drinking_water"!="no"]',
  ],
  zeroWaste: [
    '[shop=zero_waste]',
    '["bulk_purchase"="yes"]',
    '[shop=refill]',
  ],
};

const FALLBACK_NAMES = {
  refill: "Public refill point",
  zeroWaste: "Package-free shop",
};

/* Overpass is a shared public instance with strict rate limits, so
   results are memoised per rounded location. Rounding to 3 decimals is
   about 110m, which is finer than the query radius. */
const cache = new Map();

function cacheKey(kind, lat, lng, radius) {
  return `${kind}:${lat.toFixed(3)}:${lng.toFixed(3)}:${radius}`;
}

function buildQuery(kind, lat, lng, radius) {
  const clauses = FILTERS[kind]
    .flatMap((f) => [
      `node(around:${radius},${lat},${lng})${f};`,
      `way(around:${radius},${lat},${lng})${f};`,
    ])
    .join("\n  ");

  return `[out:json][timeout:20];\n(\n  ${clauses}\n);\nout center ${MAX_RESULTS * 4};`;
}

/**
 * @param {'refill'|'zeroWaste'} kind
 * @param {{lat:number,lng:number}} centre
 * @returns {Promise<Array<{id,name,lat,lng,km}>>} nearest first
 */
export async function fetchNearbyPois(kind, centre, { radius = DEFAULT_RADIUS_M, signal } = {}) {
  if (!FILTERS[kind]) return [];

  const key = cacheKey(kind, centre.lat, centre.lng, radius);
  if (cache.has(key)) return cache.get(key);

  const timeoutSignal = AbortSignal.timeout(OVERPASS_TIMEOUT_MS);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  const res = await fetch(OVERPASS_ENDPOINT, {
    method: "POST",
    body: `data=${encodeURIComponent(buildQuery(kind, centre.lat, centre.lng, radius))}`,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    signal: combinedSignal,
  });
  if (!res.ok) throw new Error(`Overpass responded ${res.status}`);

  const json = await res.json();

  const pois = (json.elements || [])
    .map((el) => {
      // Nodes carry lat/lon directly; ways return a computed centre.
      const lat = el.lat ?? (el.center && el.center.lat);
      const lng = el.lon ?? (el.center && el.center.lon);
      if (typeof lat !== "number" || typeof lng !== "number") return null;

      const tags = el.tags || {};
      const metres = haversineM(centre, { lat, lng });

      return {
        id: `${el.type}/${el.id}`,
        name: tags.name || tags.operator || FALLBACK_NAMES[kind],
        lat,
        lng,
        km: Math.round((metres / 1000) * 10) / 10,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.km - b.km)
    .slice(0, MAX_RESULTS);

  cache.set(key, pois);
  return pois;
}
