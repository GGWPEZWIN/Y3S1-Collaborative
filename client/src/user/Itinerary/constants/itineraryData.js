/**
 * Static reference data for the Itinerary module.
 *
 * Everything here is mock data so the UI can be reviewed without a backend.
 * When the module is wired to Firestore, these arrays become the seed for the
 * `destinations` / `activities` / `accommodations` collections, and
 * MOCK_ITINERARIES is replaced by a per-user query.
 */

export const TRAVELLER_STYLES = ["Budget", "Family", "Luxury", "Backpacking"];

export const ACTIVITY_CATEGORIES = [
  "All",
  "Nature",
  "Culture",
  "Adventure",
  "Community",
];

export const ITINERARY_STATUSES = ["All", "Planning", "Active", "Completed"];

/**
 * `latitude` / `longitude` are stored as real numbers (never strings) so
 * Module 1 can order the selected destinations by proximity and Module 2 can
 * reuse the exact same coordinates for routing / transport calculations.
 * `placeId` is left off on purpose — the catalogue is fixed, so a Google Place
 * ID is optional. Add a real one here if it ever becomes available.
 */
export const DESTINATIONS = [
  {
    id: "penang",
    name: "Penang",
    state: "Pulau Pinang",
    latitude: 5.4141,
    longitude: 100.3288,
    // George Town "Kids on Bicycle" street-art mural — Penang-specific.
    // (Previously reused the Kuala Lumpur photo id.)
    imageUrl:
      "https://images.unsplash.com/photo-1664859751688-34c6949923b8?w=600&q=80",
  },
  {
    id: "langkawi",
    name: "Langkawi",
    state: "Kedah",
    latitude: 6.3186,
    longitude: 99.8507,
    imageUrl:
      "https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=600&q=80",
  },
  {
    id: "cameron",
    name: "Cameron Highlands",
    state: "Pahang",
    latitude: 4.4696,
    longitude: 101.3776,
    imageUrl:
      "https://images.unsplash.com/photo-1533050487297-09b450131914?w=600&q=80",
  },
  {
    id: "kl",
    name: "Kuala Lumpur",
    state: "Wilayah Persekutuan",
    latitude: 3.139,
    longitude: 101.6869,
    imageUrl:
      "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=600&q=80",
  },
  {
    id: "ipoh",
    name: "Ipoh",
    state: "Perak",
    latitude: 4.5975,
    longitude: 101.0901,
    imageUrl:
      "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=600&q=80",
  },
  {
    id: "melaka",
    name: "Melaka",
    state: "Melaka",
    latitude: 2.1896,
    longitude: 102.2501,
    // Christ Church / the red Stadthuys square in Melaka — Melaka-specific.
    // (The previous photo id returned 404 on Unsplash.)
    imageUrl:
      "https://images.unsplash.com/photo-1571761348738-f448a9739ff5?w=600&q=80",
  },
];

/**
 * Starting points a traveller can leave from. Same fixed-catalogue idea as
 * DESTINATIONS: numeric coordinates, `locationId` as the stable key. Step 1 of
 * the wizard picks one of these and it is saved on the itinerary as
 * `startLocation` for Module 2 to route from.
 */
export const START_LOCATIONS = [
  {
    id: "kl-sentral",
    name: "KL Sentral",
    state: "Kuala Lumpur",
    latitude: 3.1348,
    longitude: 101.6865,
  },
  {
    id: "klia",
    name: "KLIA (Kuala Lumpur International Airport)",
    state: "Sepang",
    latitude: 2.7456,
    longitude: 101.7072,
  },
  {
    id: "penang-airport",
    name: "Penang International Airport",
    state: "Bayan Lepas",
    latitude: 5.2971,
    longitude: 100.2769,
  },
  {
    id: "butterworth",
    name: "Butterworth Ferry Terminal",
    state: "Seberang Perai",
    latitude: 5.3936,
    longitude: 100.3639,
  },
  {
    id: "jb-sentral",
    name: "JB Sentral",
    state: "Johor Bahru",
    latitude: 1.4637,
    longitude: 103.7647,
  },
  {
    id: "ipoh-station",
    name: "Ipoh Railway Station",
    state: "Perak",
    latitude: 4.5976,
    longitude: 101.0806,
  },
];

/**
 * Activities are keyed by destination id so step 3 can show only what is
 * actually available at the place chosen in step 2. `ecoScore` is the
 * sustainability rating (0–100) shown on the right of each row.
 */
export const ACTIVITIES = {
  penang: [
    {
      id: "penang-heritage-walk",
      title: "Penang Heritage Walk",
      description: "Explore George Town's heritage sites",
      category: "Culture",
      ecoScore: 90,
      durationHours: 3,
      priceMyr: 45,
      carbonKg: 0.4,
      imageUrl:
        "https://images.unsplash.com/photo-1508062878650-88b52897f298?w=400&q=80",
    },
    {
      id: "penang-hill-trail",
      title: "Penang Hill Nature Trail",
      description: "Hiking with beautiful city view",
      category: "Nature",
      ecoScore: 85,
      durationHours: 4,
      priceMyr: 30,
      carbonKg: 0.6,
      imageUrl:
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80",
    },
    {
      id: "pulau-betong-eco-tour",
      title: "Pulau Betong Eco Tour",
      description: "Mangrove & wildlife experience",
      category: "Nature",
      ecoScore: 88,
      durationHours: 5,
      priceMyr: 120,
      carbonKg: 1.2,
      imageUrl:
        "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=80",
    },
    {
      id: "penang-kayaking",
      title: "Sungai Kelian Kayaking",
      description: "Paddle through calm coastal waters",
      category: "Adventure",
      ecoScore: 82,
      durationHours: 3,
      priceMyr: 95,
      carbonKg: 0.3,
      imageUrl:
        "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=400&q=80",
    },
    {
      id: "penang-community-batik",
      title: "Community Batik Workshop",
      description: "Learn batik from local artisans",
      category: "Community",
      ecoScore: 92,
      durationHours: 2,
      priceMyr: 60,
      carbonKg: 0.2,
      imageUrl:
        "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=400&q=80",
    },
  ],
  langkawi: [
    {
      id: "langkawi-mangrove",
      title: "Kilim Geoforest Mangrove Tour",
      description: "UNESCO geopark by electric boat",
      category: "Nature",
      ecoScore: 89,
      durationHours: 4,
      priceMyr: 150,
      carbonKg: 1.0,
      imageUrl:
        "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=80",
    },
    {
      id: "langkawi-skybridge",
      title: "Sky Bridge Rainforest Walk",
      description: "Canopy views over ancient forest",
      category: "Adventure",
      ecoScore: 78,
      durationHours: 3,
      priceMyr: 85,
      carbonKg: 1.4,
      imageUrl:
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80",
    },
    {
      id: "langkawi-village",
      title: "Kampung Homestay Experience",
      description: "Cook and farm with a local family",
      category: "Community",
      ecoScore: 94,
      durationHours: 6,
      priceMyr: 110,
      carbonKg: 0.5,
      imageUrl:
        "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=400&q=80",
    },
  ],
  cameron: [
    {
      id: "cameron-tea",
      title: "Organic Tea Plantation Tour",
      description: "Walk the terraces, taste the harvest",
      category: "Nature",
      ecoScore: 91,
      durationHours: 3,
      priceMyr: 40,
      carbonKg: 0.4,
      imageUrl:
        "https://images.unsplash.com/photo-1533050487297-09b450131914?w=400&q=80",
    },
    {
      id: "cameron-mossy",
      title: "Mossy Forest Guided Trek",
      description: "Rare highland flora with a ranger",
      category: "Adventure",
      ecoScore: 86,
      durationHours: 4,
      priceMyr: 75,
      carbonKg: 0.8,
      imageUrl:
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80",
    },
    {
      id: "cameron-farm",
      title: "Orang Asli Village Visit",
      description: "Indigenous crafts and forest knowledge",
      category: "Community",
      ecoScore: 93,
      durationHours: 3,
      priceMyr: 55,
      carbonKg: 0.6,
      imageUrl:
        "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=400&q=80",
    },
  ],
  kl: [
    {
      id: "kl-transit",
      title: "Car-Free City Transit Tour",
      description: "See KL entirely by MRT and on foot",
      category: "Culture",
      ecoScore: 95,
      durationHours: 5,
      priceMyr: 25,
      carbonKg: 0.3,
      imageUrl:
        "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=400&q=80",
    },
    {
      id: "kl-forest",
      title: "KL Eco Forest Park Walk",
      description: "Rainforest canopy in the city centre",
      category: "Nature",
      ecoScore: 88,
      durationHours: 2,
      priceMyr: 0,
      carbonKg: 0.1,
      imageUrl:
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&q=80",
    },
    {
      id: "kl-market",
      title: "Zero-Waste Pasar Malam Trail",
      description: "Night market with your own containers",
      category: "Community",
      ecoScore: 90,
      durationHours: 3,
      priceMyr: 35,
      carbonKg: 0.2,
      imageUrl:
        "https://images.unsplash.com/photo-1555126634-323283e090fa?w=400&q=80",
    },
  ],
  ipoh: [
    {
      id: "ipoh-cave",
      title: "Limestone Cave Temple Trail",
      description: "Cycle between Ipoh's cave temples",
      category: "Culture",
      ecoScore: 87,
      durationHours: 4,
      priceMyr: 50,
      carbonKg: 0.4,
      imageUrl:
        "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=400&q=80",
    },
    {
      id: "ipoh-kinta",
      title: "Kinta Nature Park Birding",
      description: "Wetland birdwatching at sunrise",
      category: "Nature",
      ecoScore: 92,
      durationHours: 3,
      priceMyr: 45,
      carbonKg: 0.3,
      imageUrl:
        "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=400&q=80",
    },
  ],
  melaka: [
    {
      id: "melaka-river",
      title: "Melaka River Clean-Up Cruise",
      description: "Heritage cruise with a clean-up stop",
      category: "Community",
      ecoScore: 93,
      durationHours: 2,
      priceMyr: 40,
      carbonKg: 0.3,
      // Melaka River winding past the riverfront shophouses.
      imageUrl:
        "https://images.unsplash.com/photo-1720511849359-4fa5df588340?w=400&q=80",
    },
    {
      id: "melaka-heritage",
      title: "Jonker Street Heritage Walk",
      description: "Peranakan culture on foot",
      category: "Culture",
      ecoScore: 89,
      durationHours: 3,
      priceMyr: 30,
      carbonKg: 0.2,
      imageUrl:
        "https://images.unsplash.com/photo-1508062878650-88b52897f298?w=400&q=80",
    },
  ],
};

/**
 * Accommodation options for step 4, also keyed by destination id.
 * `certifications` mirror the badges awarded by the Certification module.
 */
export const ACCOMMODATIONS = {
  penang: [
    {
      id: "penang-green-hostel",
      name: "George Town Green Hostel",
      type: "Hostel",
      description: "Solar-powered dorms in a restored shophouse",
      ecoScore: 94,
      pricePerNight: 65,
      certifications: ["Solar Powered", "Zero Plastic"],
      imageUrl:
        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80",
    },
    {
      id: "penang-eco-resort",
      name: "Batu Ferringhi Eco Resort",
      type: "Resort",
      description: "Beachfront resort with rainwater harvesting",
      ecoScore: 86,
      pricePerNight: 240,
      certifications: ["Rainwater Harvest"],
      imageUrl:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80",
    },
    {
      id: "penang-homestay",
      name: "Balik Pulau Kampung Homestay",
      type: "Homestay",
      description: "Family-run stay supporting the local village",
      ecoScore: 91,
      pricePerNight: 90,
      certifications: ["Community Owned", "Farm to Table"],
      imageUrl:
        "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=400&q=80",
    },
  ],
  langkawi: [
    {
      id: "langkawi-eco-lodge",
      name: "Kilim Rainforest Eco Lodge",
      type: "Lodge",
      description: "Off-grid chalets inside the geopark buffer",
      ecoScore: 95,
      pricePerNight: 180,
      certifications: ["Off Grid", "Wildlife Safe"],
      imageUrl:
        "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&q=80",
    },
    {
      id: "langkawi-beach",
      name: "Pantai Cenang Green Stay",
      type: "Hotel",
      description: "Reef-safe operations and refill stations",
      ecoScore: 83,
      pricePerNight: 210,
      certifications: ["Zero Plastic"],
      imageUrl:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80",
    },
  ],
  cameron: [
    {
      id: "cameron-farmstay",
      name: "Highlands Organic Farmstay",
      type: "Farmstay",
      description: "Sleep on a working organic tea farm",
      ecoScore: 93,
      pricePerNight: 120,
      certifications: ["Farm to Table", "Community Owned"],
      imageUrl:
        "https://images.unsplash.com/photo-1533050487297-09b450131914?w=400&q=80",
    },
    {
      id: "cameron-guesthouse",
      name: "Tanah Rata Eco Guesthouse",
      type: "Guesthouse",
      description: "Compact rooms, composting, no single-use amenities",
      ecoScore: 88,
      pricePerNight: 85,
      certifications: ["Zero Plastic"],
      imageUrl:
        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80",
    },
  ],
  kl: [
    {
      id: "kl-transit-hotel",
      name: "Bukit Bintang Transit Hotel",
      type: "Hotel",
      description: "Zero-car stay, two minutes from the MRT",
      ecoScore: 90,
      pricePerNight: 160,
      certifications: ["Low Carbon Transit"],
      imageUrl:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80",
    },
    {
      id: "kl-capsule",
      name: "Chinatown Capsule Green",
      type: "Capsule",
      description: "Low-footprint pods with shared facilities",
      ecoScore: 87,
      pricePerNight: 55,
      certifications: ["Energy Efficient"],
      imageUrl:
        "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&q=80",
    },
  ],
  ipoh: [
    {
      id: "ipoh-heritage",
      name: "Old Town Heritage Stay",
      type: "Boutique",
      description: "Restored 1920s shophouse, no new build",
      ecoScore: 89,
      pricePerNight: 130,
      certifications: ["Heritage Restored"],
      imageUrl:
        "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=400&q=80",
    },
  ],
  melaka: [
    {
      id: "melaka-riverside",
      name: "Riverside Peranakan Guesthouse",
      type: "Guesthouse",
      description: "Family-run, walkable to every heritage site",
      ecoScore: 90,
      pricePerNight: 110,
      certifications: ["Community Owned"],
      // Lantern-strung Jonker Street lane in Melaka's heritage core.
      imageUrl:
        "https://images.unsplash.com/photo-1654428168579-a8c200df6848?w=400&q=80",
    },
  ],
};

/** Itineraries shown on the list page before anything is created this session. */
export const MOCK_ITINERARIES = [
  {
    id: "itn-001",
    name: "Borneo Wildlife Adventure",
    destinationId: "langkawi",
    destinationName: "Sabah",
    status: "Planning",
    startDate: "2026-10-15",
    endDate: "2026-10-20",
    travellers: "2 Adults",
    budget: 1800,
    travellerStyle: "Budget",
    ecoScore: 88,
    carbonKg: 18.7,
    activityIds: [],
    accommodationId: null,
    imageUrl:
      "https://images.unsplash.com/photo-1516426122078-c23e76319801?w=600&q=80",
  },
  {
    id: "itn-002",
    name: "Penang Heritage & Nature Trip",
    destinationId: "penang",
    destinationName: "Penang",
    status: "Active",
    startDate: "2026-09-01",
    endDate: "2026-09-05",
    travellers: "2 Adults",
    budget: 800,
    travellerStyle: "Budget",
    ecoScore: 91,
    carbonKg: 9.4,
    activityIds: ["penang-heritage-walk", "penang-hill-trail"],
    accommodationId: "penang-green-hostel",
    imageUrl:
      "https://images.unsplash.com/photo-1508062878650-88b52897f298?w=600&q=80",
  },
  {
    id: "itn-003",
    name: "Cameron Highlands Tea Escape",
    destinationId: "cameron",
    destinationName: "Cameron Highlands",
    status: "Completed",
    startDate: "2026-06-12",
    endDate: "2026-06-15",
    travellers: "4 Adults",
    budget: 1200,
    travellerStyle: "Family",
    ecoScore: 94,
    carbonKg: 6.2,
    activityIds: ["cameron-tea", "cameron-mossy"],
    accommodationId: "cameron-farmstay",
    imageUrl:
      "https://images.unsplash.com/photo-1533050487297-09b450131914?w=600&q=80",
  },
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export function getActivitiesFor(destinationId) {
  return ACTIVITIES[destinationId] ?? [];
}

export function getAccommodationsFor(destinationId) {
  return ACCOMMODATIONS[destinationId] ?? [];
}

export function getDestination(destinationId) {
  return DESTINATIONS.find((d) => d.id === destinationId) ?? null;
}

export function getStartLocation(locationId) {
  return START_LOCATIONS.find((l) => l.id === locationId) ?? null;
}

/** Activities across every chosen destination, tagged with where they belong. */
export function getActivitiesForMany(destinationIds = []) {
  return destinationIds.flatMap((id) =>
    getActivitiesFor(id).map((a) => ({ ...a, destinationId: id }))
  );
}

/** Accommodation options across every chosen destination. */
export function getAccommodationsForMany(destinationIds = []) {
  return destinationIds.flatMap((id) =>
    getAccommodationsFor(id).map((a) => ({ ...a, destinationId: id }))
  );
}

/* ------------------------------------------------------------------ */
/* Route ordering (Module 1 only — no Routes API, no transport calc)   */
/* ------------------------------------------------------------------ */

const EARTH_RADIUS_KM = 6371;

/** Great-circle distance in km between two { latitude, longitude } points. */
export function haversineKm(a, b) {
  if (!a || !b) return 0;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Orders destinations into a sensible visiting sequence with a nearest-
 * neighbour walk from the starting location. This is intentionally simple:
 * it only needs to produce a stable `order` for each destination. Module 2
 * does the real routing later using the coordinates saved on the itinerary.
 */
export function orderDestinationsByProximity(startLocation, destinations = []) {
  const remaining = destinations.filter(
    (d) => Number.isFinite(d?.latitude) && Number.isFinite(d?.longitude)
  );
  // Destinations without coordinates can't be ordered — keep them at the end.
  const noCoords = destinations.filter((d) => !remaining.includes(d));

  const ordered = [];
  let cursor = startLocation ?? remaining[0] ?? null;

  while (remaining.length > 0) {
    let bestIndex = 0;
    let bestDistance = Infinity;
    remaining.forEach((d, i) => {
      const dist = cursor ? haversineKm(cursor, d) : 0;
      if (dist < bestDistance) {
        bestDistance = dist;
        bestIndex = i;
      }
    });
    const [next] = remaining.splice(bestIndex, 1);
    ordered.push(next);
    cursor = next;
  }

  return [...ordered, ...noCoords];
}

/**
 * Spreads `count` ordered destinations across the trip's days as evenly as
 * possible. Returns an array of 1-based day numbers, one per destination.
 */
export function assignDays(count, tripDays) {
  const days = Math.max(1, Number(tripDays) || 1);
  if (count <= 0) return [];
  const perDay = Math.ceil(count / days);
  return Array.from({ length: count }, (_, i) =>
    Math.min(days, Math.floor(i / perDay) + 1)
  );
}

/** Whole days a trip spans (inclusive). 1 day minimum. */
export function tripDayCount(startDate, endDate) {
  return nightsBetween(startDate, endDate) + 1;
}

/** Inclusive night count between two yyyy-mm-dd strings; 0 if either is missing. */
export function nightsBetween(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
  if (Number.isNaN(ms) || ms < 0) return 0;
  return Math.round(ms / 86_400_000);
}

/**
 * Trip eco score = average of the chosen activities' scores and the
 * accommodation's score. Empty selection scores 0 rather than NaN.
 */
export function calcEcoScore(activities, accommodation) {
  const scores = activities.map((a) => a.ecoScore);
  if (accommodation) scores.push(accommodation.ecoScore);
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((sum, n) => sum + n, 0) / scores.length);
}

/** Estimated trip carbon in kg — activities plus a flat 1.5 kg per night stayed. */
export function calcCarbon(activities, nights) {
  const fromActivities = activities.reduce((sum, a) => sum + a.carbonKg, 0);
  return Number((fromActivities + nights * 1.5).toFixed(1));
}

/* ------------------------------------------------------------------ */
/* Budget                                                              */
/* ------------------------------------------------------------------ */

/**
 * Estimated itinerary cost from the data Module 1 actually captures: the chosen
 * activities' prices plus the nightly accommodation rate × nights. Transport is
 * added by Module 2 and is not included here.
 *
 * Costs are treated as a trip total, not per-person — this matches the model
 * the wizard's review step and the details page have always used.
 *
 * @param {object}  args
 * @param {Array}   [args.activities]     objects with a numeric `priceMyr`
 * @param {object}  [args.accommodation]  object with a numeric `pricePerNight`
 * @param {number}  [args.nights]         number of nights stayed
 * @returns {{ activityCost: number, stayCost: number, total: number }}
 */
export function estimateItineraryCost({
  activities = [],
  accommodation = null,
  nights = 0,
} = {}) {
  const activityCost = (activities || []).reduce(
    (sum, a) => sum + (Number(a?.priceMyr) || 0),
    0
  );
  const nightlyRate = Number(accommodation?.pricePerNight) || 0;
  const stayCost = nightlyRate * Math.max(0, Number(nights) || 0);
  return { activityCost, stayCost, total: activityCost + stayCost };
}

/**
 * Compares an estimated total against the selected budget.
 *
 * @param {number} estimatedTotal
 * @param {number} budget
 * @returns {{
 *   hasBudget: boolean, budget: number, total: number,
 *   overBudget: boolean, overBy: number, withinBudget: boolean
 * }}  `overBy` is only positive when the trip is over budget.
 */
export function evaluateBudget(estimatedTotal, budget) {
  const total = Number(estimatedTotal) || 0;
  const limit = Number(budget) || 0;
  const hasBudget = limit > 0;
  const overBy = total - limit;
  return {
    hasBudget,
    budget: limit,
    total,
    overBudget: hasBudget && overBy > 0,
    overBy: overBy > 0 ? overBy : 0,
    withinBudget: !hasBudget || overBy <= 0,
  };
}

/* ------------------------------------------------------------------ */
/* Date-range overlap (Step 1 — block double-booked itineraries)       */
/* ------------------------------------------------------------------ */

/**
 * True when two inclusive date ranges overlap by at least one day.
 *
 * Two ranges overlap iff:  aStart <= bEnd && aEnd >= bStart
 *
 * yyyy-mm-dd strings sort chronologically as plain strings, so they can be
 * compared directly. Any missing bound => no overlap (nothing to compare).
 */
export function dateRangesOverlap(aStart, aEnd, bStart, bEnd) {
  if (!aStart || !aEnd || !bStart || !bEnd) return false;
  return aStart <= bEnd && aEnd >= bStart;
}

/**
 * Returns the first existing itinerary whose dates overlap [startDate, endDate],
 * or null when the range is clear.
 *
 * @param {string} startDate           yyyy-mm-dd
 * @param {string} endDate             yyyy-mm-dd
 * @param {Array}  existingRanges      [{ id, itineraryId, title, startDate, endDate }]
 * @param {string} [excludeId]         itinerary id to skip (the one being edited)
 * @returns {{ id, itineraryId, title, startDate, endDate } | null}
 */
export function findDateConflict(
  startDate,
  endDate,
  existingRanges = [],
  excludeId = null
) {
  if (!startDate || !endDate) return null;

  return (
    existingRanges.find((row) => {
      if (!row) return false;
      if (excludeId && (row.id === excludeId || row.itineraryId === excludeId)) {
        return false;
      }
      return dateRangesOverlap(
        startDate,
        endDate,
        row.startDate,
        row.endDate
      );
    }) || null
  );
}

/** Formats yyyy-mm-dd as dd/mm/yyyy for display, matching the mockups. */
export function formatDate(value) {
  if (!value) return "—";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}/${m}/${y}`;
}
