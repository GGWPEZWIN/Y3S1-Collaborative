/* F5 — Baselines now live in constants/nationalBaseline.js with full
   source attribution, and are read through services/baselineService.js
   so the water figure can come from the data.gov.my Open API. */

/* Carbon equivalence now lives in constants/carbonFactors.js with the
   methodological basis and source for each factor documented. */
export { CO2E } from "./carbonFactors";

/* Weighting of each category in the composite sustainability grade. */
export const GRADE_WEIGHTS = {
  foodWaste: 0.35,
  plastic: 0.25,
  water: 0.25,
  disposables: 0.15,
};

export const GRADE_BANDS = [
  { min: 97, grade: "A+" }, { min: 93, grade: "A" }, { min: 90, grade: "A-" }, { min: 87, grade: "B+" },
  { min: 83, grade: "B" }, { min: 80, grade: "B-" }, { min: 77, grade: "C+" }, { min: 73, grade: "C" },
  { min: 70, grade: "C-" }, { min: 67, grade: "D+" }, { min: 63, grade: "D" }, { min: 60, grade: "D-" },
  { min: 0, grade: "F" },
];

export const CATEGORY_KEYS = ["foodWaste", "plastic", "water", "disposables"];

export const CATEGORY_LABELS = {
  foodWaste: "Food waste",
  plastic: "Plastic items",
  water: "Water",
  disposables: "Disposables",
};

export const CATEGORY_UNITS = {
  foodWaste: "g",
  plastic: "items",
  water: "L",
  disposables: "items",
};

/* F1 — Physical calibration for the monocular mass estimate. */
export const PLATE_DIAMETER_CM = 26; // reference dinner plate used to derive px/cm
export const SHOWER_FLOW_L_PER_MIN = 9;

/* Bulk density and a shape factor per detected class. The shape factor
   accounts for food not filling the full prism implied by area x depth. */
export const FOOD_PROFILE = {
  rice: { label: "Nasi / rice", density: 0.78, shape: 0.55, colour: "#F59E0B" },
  curry: { label: "Kari / gravy", density: 1.02, shape: 0.85, colour: "#DC2626" },
  meat: { label: "Daging / protein", density: 0.95, shape: 0.6, colour: "#B45309" },
  vegetable: { label: "Sayur / vegetable", density: 0.62, shape: 0.5, colour: "#16A34A" },
  noodle: { label: "Mee / noodle", density: 0.7, shape: 0.55, colour: "#CA8A04" },
  sambal: { label: "Sambal", density: 1.05, shape: 0.8, colour: "#B91C1C" },
  egg: { label: "Telur / egg", density: 0.9, shape: 0.65, colour: "#EAB308" },
  bone: { label: "Tulang (non-edible)", density: 1.3, shape: 0.7, colour: "#78716C" },
};

/* F4 — Lodging is now per-user, set via ReminderSettings and stored on the
   user's Firestore profile. See services/lodgingService.js. */

/* F6 — Nearby points of interest are now fetched live from OpenStreetMap;
   see services/poiService.js. The former hardcoded list is gone. */
