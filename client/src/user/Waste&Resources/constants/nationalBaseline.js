/* ==================================================================
   SUSTAINABILITY BASELINES  (F5)
   ------------------------------------------------------------------
   Every figure below carries its source, its derivation, and the date
   it was retrieved. Nothing here is a placeholder.

   Read the `confidence` field before quoting any of these in the
   report — they are not equally well grounded.
   ================================================================== */

/** Population used to convert national aggregates to per-capita values. */
export const MY_POPULATION = {
  value: 34_100_000,
  source: "Department of Statistics Malaysia (DOSM), Current Population Estimates",
  retrieved: "2026-08",
};

export const BASELINE_SOURCES = {
  /* ----------------------------------------------------------------
     FOOD WASTE — 86 g per person per day (edible / avoidable only)

     Derivation:
       1.17 kg  total solid waste per capita per day        (SWCorp)
       x 30.6%  food share of domestic waste                (SWCorp)
       =  358 g food waste per capita per day
       x 24%    classified as still edible                  (SWCorp)
       =  86 g  avoidable food waste per capita per day

     The 24% step matters: a plate scanner measures leftovers a diner
     chose not to eat, which is the avoidable fraction. Using the full
     358 g would compare leftovers against prep waste and spoilage too,
     and every user would look unrealistically good.
     ---------------------------------------------------------------- */
  foodWaste: {
    value: 86,
    unit: "g/person/day",
    scope: "national",
    source:
      "Solid Waste Management and Public Cleansing Corporation (SWCorp), via The Star, 2 Jan 2024",
    derivation: "1.17 kg/capita/day x 30.6% food share x 24% edible fraction",
    crossCheck:
      "UNEP Food Waste Index 2021 places Malaysia at 91 kg/capita/year (~249 g/day, " +
      "~60 g/day after the edible fraction). The two routes bracket 60-86 g/day.",
    confidence: "high",
    retrieved: "2026-08",
  },

  /* ----------------------------------------------------------------
     PLASTIC — 0.35 single-use items per person per day

     Derivation (global, UNEP primary figures):
       500 bn bags/year      / 8.0 bn people = 62.5 bags/person/year
       1 m bottles/minute -> 525.6 bn/year   = 65.7 bottles/person/year
       total 128.2 items/person/year         = 0.35 items/person/day

     LIMITATION: covers bags and bottles ONLY. Straws, cutlery, cups,
     lids, wrappers and sachets are excluded because no comparable
     per-capita item count is published for them. Treat 0.35 as a floor,
     not a complete figure.

     Malaysian data cannot be used here: SWCorp reports plastic by MASS
     (21.9% of domestic waste, ~256 g/capita/day), and converting mass
     to an item count needs an average item weight nobody publishes.
     ---------------------------------------------------------------- */
  plastic: {
    value: 0.35,
    unit: "items/person/day",
    scope: "global",
    source: "UN Environment Programme, Beat Plastic Pollution",
    derivation:
      "(500e9 bags/yr + 525.6e9 bottles/yr) / 8.0e9 people / 365 days",
    limitation:
      "Bags and bottles only. Excludes straws, cutlery, cups, lids, wrappers, sachets.",
    confidence: "medium",
    retrieved: "2026-08",
  },

  /* ----------------------------------------------------------------
     WATER — fetched live from data.gov.my where available.
     See baselineService.js. This is the offline fallback.

     Domestic consumption divided by population. Note this is a
     RESIDENT figure; hotel guests typically consume more per night,
     so a user beating this baseline is doing genuinely well.
     ---------------------------------------------------------------- */
  water: {
    value: 175,
    unit: "L/person/day",
    scope: "national",
    source:
      "data.gov.my dataset `water_consumption` (SPAN operator returns), divided by DOSM population",
    derivation: "annual domestic consumption / population / 365",
    limitation:
      "Resident domestic consumption, not tourist accommodation usage, which runs higher.",
    confidence: "high",
    retrieved: "2026-08",
  },

  /* ----------------------------------------------------------------
     DISPOSABLE AMENITIES — NO PUBLISHED BASELINE EXISTS.

     Hotel amenity consumption per guest-night is not published by any
     Malaysian or international statistical body I could locate. This
     is therefore an APP-DEFINED REDUCTION TARGET, not a benchmark.

     Do not describe this as a national average anywhere in the report.
     The UI copy should read "target" rather than "vs avg".
     ---------------------------------------------------------------- */
  disposables: {
    value: 2.5,
    unit: "items/person/day",
    scope: "app-defined target",
    source: null,
    derivation: "Behavioural target set by the application, not derived from statistics.",
    confidence: "none — target only",
    retrieved: null,
  },
};

/** Flat map consumed by benchmarkService. */
export const FALLBACK_BENCHMARKS = {
  foodWaste: BASELINE_SOURCES.foodWaste.value,
  plastic: BASELINE_SOURCES.plastic.value,
  water: BASELINE_SOURCES.water.value,
  disposables: BASELINE_SOURCES.disposables.value,
  showerMin: 8,
};
