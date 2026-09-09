/* ==================================================================
   CARBON EQUIVALENCE FACTORS
   ------------------------------------------------------------------
   Used by computeMCC() and the per-month carbon chart.

   METHODOLOGICAL NOTE — read before citing any of this.

   DEFRA/DESNZ publish two different families of waste factor and they
   are NOT interchangeable:

     * "Waste disposal" factors cover ONLY collection and transport to
       an energy-recovery or materials-reclamation facility. The
       lifecycle approach was dropped after 2011.
     * "Material use" factors cover production, and DEFRA explicitly
       states the waste factors are not appropriate for procurement.

   For this application the relevant quantity is the EMBODIED footprint
   of what was consumed and then wasted — the farming, processing and
   transport already spent on food that got scraped into a bin. That is
   a lifecycle figure, so the disposal factors would understate it by
   roughly two orders of magnitude.

   Every factor below therefore states which basis it uses.
   ================================================================== */

export const CARBON_FACTORS = {
  /* ----------------------------------------------------------------
     FOOD WASTE — 0.0025 kg CO2e per gram (2.5 kg CO2e per kg)
     ---------------------------------------------------------------- */
  foodWaste: {
    value: 0.0025,
    unit: "kg CO2e per g",
    basis: "lifecycle (embodied production)",
    source: "WRAP / FAO household food waste lifecycle estimates",
    verify:
      "Cross-check against WRAP's Household Food and Drink Waste report for the current UK figure.",
    confidence: "medium — widely used, but a global average rather than Malaysia-specific",
  },

  /* ----------------------------------------------------------------
     WATER — 0.00034 kg CO2e per litre (0.34 kg CO2e per m3)
     ---------------------------------------------------------------- */
  water: {
    value: 0.00034,
    unit: "kg CO2e per L",
    basis: "operational (supply + wastewater treatment energy)",
    source: "UK Government (DESNZ/DEFRA) GHG conversion factors, water supply + water treatment",
    verify:
      "Confirm the current values in the 2025 flat file: " +
      "https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting",
    confidence: "medium — UK grid intensity, applied to a Malaysian context",
  },

  /* ----------------------------------------------------------------
     PLASTIC — 0.08 kg CO2e per single-use item
     ---------------------------------------------------------------- */
  plastic: {
    value: 0.08,
    unit: "kg CO2e per item",
    basis: "lifecycle, approximated on a 500ml PET bottle",
    source: "PET bottle lifecycle assessments (representative value)",
    verify:
      "If the Resource Logger is ever split by item type, replace this single " +
      "factor with per-type values — the spread across bag/straw/bottle is large.",
    confidence: "low — one factor standing in for a heterogeneous category",
  },

  /* ----------------------------------------------------------------
     DISPOSABLE AMENITIES — 0.05 kg CO2e per item
     ---------------------------------------------------------------- */
  disposables: {
    value: 0.05,
    unit: "kg CO2e per item",
    basis: "assumption",
    source: null,
    verify: "No authoritative source located. Declare as a stated assumption.",
    confidence: "none — placeholder",
  },
};

/** Flat map consumed by reportingService. */
export const CO2E = {
  foodWaste: CARBON_FACTORS.foodWaste.value,
  water: CARBON_FACTORS.water.value,
  plastic: CARBON_FACTORS.plastic.value,
  disposables: CARBON_FACTORS.disposables.value,
};
