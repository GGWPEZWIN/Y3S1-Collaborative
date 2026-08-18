import {
  Home,
  Map,
  Navigation,
  Users,
  Trophy,
  Trash2,
  Award,
} from "lucide-react";

/* F5 — National baseline. Per tourist, per day. */
export const BENCHMARKS = {
  foodWaste: 100, // g
  plastic: 3.65, // single-use items
  water: 90, // L
  disposables: 2.5, // amenity items
  showerMin: 8, // minutes
};

/* Carbon equivalence used by the MCC calculation (kg CO2e per unit). */
export const CO2E = {
  foodWaste: 0.0025, // per g  (2.5 kg CO2e per kg food waste)
  plastic: 0.08, // per item
  water: 0.00034, // per L
  disposables: 0.05, // per item
};

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

/* F4 — Registered lodging used as the geofence centre. */
export const LODGING = {
  name: "Hotel Seri Malaysia, Butterworth",
  lat: 5.3991,
  lng: 100.3639,
  radiusM: 120,
};

/* F6 — Hyper-local points of interest surfaced by the nudge engine. */
export const NUDGE_POIS = {
  refill: [
    { name: "Public Refill Point, Chulia Street", km: 0.6, lat: 5.4172, lng: 100.3354 },
    { name: "Komtar Water Station", km: 1.4, lat: 5.4141, lng: 100.3299 },
    { name: "Lobby Refill, Batu Ferringhi", km: 2.1, lat: 5.4752, lng: 100.2469 },
  ],
  zeroWaste: [
    { name: "Bulk & Refill Penang, Jalan Burma", km: 1.1, lat: 5.4283, lng: 100.3181 },
    { name: "Zero Waste Hub, Gurney Drive", km: 2.7, lat: 5.4374, lng: 100.3095 },
    { name: "Pasar Awam Chowrasta (loose produce)", km: 0.9, lat: 5.4159, lng: 100.3312 },
  ],
};

export const NAV_ITEMS = [
  { id: "dashboard", path: "/dashboard", label: "Dashboard", icon: Home },
  { id: "itinerary", path: "/itinerary", label: "Itinerary", icon: Map },
  { id: "recommendations", path: "/recommendations", label: "Recommendations", icon: Navigation },
  { id: "community", path: "/community", label: "Community", icon: Users },
  { id: "challenges", path: "/challenges", label: "Challenges", icon: Trophy },
  { id: "waste", path: "/waste", label: "Waste", icon: Trash2 },
  { id: "certification", path: "/certification", label: "Certification", icon: Award },
];
