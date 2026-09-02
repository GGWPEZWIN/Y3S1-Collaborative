import { FALLBACK_BENCHMARKS, MY_POPULATION } from "../constants/nationalBaseline";

/* ==================================================================
   LIVE BASELINE SOURCE  —  data.gov.my Open API
   ------------------------------------------------------------------
   Only WATER is available as a queryable dataset. Malaysia publishes
   no open-API endpoint for food waste or plastic waste; those figures
   are derived constants documented in constants/nationalBaseline.js.

   The API needs no token and is a plain GET:
     https://api.data.gov.my/data-catalogue?id=water_consumption
   Rows are shaped { date, state, value, sector }.

   Design note: baselines change annually at most, so this refreshes
   once at startup and falls back to the documented constant on any
   failure. The stat cards must never depend on a live network call.
   ================================================================== */

const ENDPOINT = "https://api.data.gov.my/data-catalogue";
const DATASET = "water_consumption";

/**
 * The API returns annual domestic consumption as a bare number.
 * VERIFY THIS against the dataset metadata page before submission:
 *   https://open.dosm.gov.my/data-catalogue/water_consumption
 * A 2003 value of 4394 divided by that year's population yields
 * ~175 L/person/day, which matches published Malaysian figures and
 * supports the million-litres-per-day reading.
 */
const UNIT_TO_LITRES = 1_000_000;

let cached = null;

/** Synchronous read used by benchmarkService. Never throws. */
export function getBenchmarks() {
  return cached || FALLBACK_BENCHMARKS;
}

export function getBenchmarkOrigin() {
  return cached ? "data.gov.my (live)" : "documented constant (offline fallback)";
}

/**
 * Fetches the most recent national domestic water figure and converts
 * it to litres per person per day. Call once at app startup.
 *
 * @returns {Promise<object>} the benchmark set actually in use
 */
export async function refreshBenchmarks({ signal } = {}) {
  try {
    const url = `${ENDPOINT}?id=${DATASET}&filter=domestic@sector`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`data.gov.my responded ${res.status}`);

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error("empty dataset");
    }

    const national = rows
      .filter((r) => r.state === "Malaysia" && Number.isFinite(Number(r.value)))
      .sort((a, b) => (a.date < b.date ? 1 : -1));

    if (national.length === 0) throw new Error("no national rows");

    const latest = national[0];
    const litresPerPersonPerDay =
      (Number(latest.value) * UNIT_TO_LITRES) / MY_POPULATION.value / 365;

    // Guard against a schema change silently producing nonsense.
    if (litresPerPersonPerDay < 50 || litresPerPersonPerDay > 600) {
      throw new Error(`implausible value: ${litresPerPersonPerDay.toFixed(1)} L/person/day`);
    }

    cached = {
      ...FALLBACK_BENCHMARKS,
      water: Math.round(litresPerPersonPerDay),
      _waterYear: String(latest.date).slice(0, 4),
    };
    return cached;
  } catch {
    // Offline, rate-limited, or schema drift — the documented constant stands.
    return FALLBACK_BENCHMARKS;
  }
}
