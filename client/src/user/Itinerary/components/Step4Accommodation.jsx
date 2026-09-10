import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Check, BedDouble, Sparkles, Star } from "lucide-react";
import {
  getAccommodationsForMany,
  getDestination,
  nightsBetween,
} from "../constants/itineraryData";
import { listApprovedHotels, normaliseState } from "../services/recommendationService";
import EcoScoreBadge from "./EcoScoreBadge";
import useMediaQuery, { BREAKPOINTS } from "../hooks/useMediaQuery";
import * as w from "./wizardStyles";

/**
 * Step 4 — Select Accommodation
 *
 * Single-select list of certified eco-stays for the chosen destinations.
 *
 * Primary source is the live `hotel_applications` Firestore collection
 * (approved hotels only, safe fields only — see recommendationService). One of
 * those is flagged as the recommendation for this trip, but every hotel in the
 * list is selectable and the recommendation never auto-selects anything.
 *
 * If Firestore can't be read (rules, offline, no approved hotels) the step
 * falls back to the built-in ACCOMMODATIONS list so the wizard never stalls.
 *
 * Selecting a hotel stores both its id (draft.accommodationId) and the hotel
 * object itself (draft.accommodation) so the review step and the save layer can
 * use it without re-querying — a Firebase hotel isn't in the static catalogue.
 *
 * Props: draft, onChange(patch), onNext, onBack
 */

// Clean inline placeholder — hotel_applications documents carry no image, and
// we must never surface the uploaded bill images. Used when no local
// accommodation image matches.
const HOTEL_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='90' viewBox='0 0 120 90'%3E%3Crect width='120' height='90' fill='%23ecfdf5'/%3E%3Crect x='30' y='40' width='60' height='26' rx='3' fill='%2315803d' fill-opacity='0.18'/%3E%3Crect x='36' y='44' width='16' height='12' rx='2' fill='%2315803d' fill-opacity='0.35'/%3E%3Crect x='68' y='44' width='16' height='12' rx='2' fill='%2315803d' fill-opacity='0.35'/%3E%3Crect x='26' y='62' width='68' height='6' rx='3' fill='%2315803d' fill-opacity='0.55'/%3E%3C/svg%3E";

export default function Step4Accommodation({ draft, onChange, onNext, onBack }) {
  const isPhone = useMediaQuery(BREAKPOINTS.phone);

  const destinationIds = useMemo(
    () => draft.destinationIds ?? [],
    [draft.destinationIds]
  );
  const options = useMemo(
    () => getAccommodationsForMany(destinationIds),
    [destinationIds]
  );
  const nights = nightsBetween(draft.startDate, draft.endDate);

  const destinations = useMemo(
    () => destinationIds.map((id) => getDestination(id)).filter(Boolean),
    [destinationIds]
  );

  // The set of states the chosen destinations are in, normalised with the exact
  // same mapping the recommendation service uses ("Penang" / "Pulau Pinang" →
  // "penang"). A certified hotel is only shown when its own normalised state is
  // in here.
  const allowedStates = useMemo(
    () =>
      new Set(
        destinations.map((d) => normaliseState(d.state)).filter(Boolean)
      ),
    [destinations]
  );

  // Local accommodation image to borrow for a Firebase hotel with no image of
  // its own — first pick one whose destination state matches, else any.
  const staticImageForState = useMemo(() => {
    const byState = new Map();
    options.forEach((o) => {
      const dest = getDestination(o.destinationId);
      const key = String(dest?.state || "").trim().toLowerCase();
      if (key && o.imageUrl && !byState.has(key)) byState.set(key, o.imageUrl);
    });
    return byState;
  }, [options]);

  const hotelImage = (hotel) => {
    if (hotel.imageUrl) return hotel.imageUrl;
    const key = String(hotel.state || "").trim().toLowerCase();
    return staticImageForState.get(key) || options[0]?.imageUrl || HOTEL_PLACEHOLDER;
  };

  // Certified-hotel list from Firestore. status: loading | ready | error.
  // "error" also covers "read succeeded but there are no approved hotels".
  // State is only ever updated from the async callbacks below.
  const [fb, setFb] = useState({ status: "loading", data: null });

  useEffect(() => {
    if (destinations.length === 0) return undefined;

    let active = true;

    listApprovedHotels({ destinations })
      .then((result) => {
        if (!active) return;
        setFb(
          !result || result.error || !result.hotels || result.hotels.length === 0
            ? { status: "error", data: null }
            : { status: "ready", data: result }
        );
      })
      .catch(() => {
        if (active) setFb({ status: "error", data: null });
      });

    return () => {
      active = false;
    };
  }, [destinations]);

  const noDestinations = destinations.length === 0;
  const fbReady = fb.status === "ready" && !noDestinations;

  // Guard: only ever show certified hotels whose normalised state is one of the
  // chosen destinations' states, never certified hotels from other states/
  // cities. The service already filters to these; this is a defensive second
  // pass using the same normalisation so a data quirk can't leak a hotel through.
  const destinationHotels = fbReady
    ? fb.data.hotels.filter(
        (h) => h.stateMatch && allowedStates.has(normaliseState(h.state))
      )
    : [];

  const recommended =
    destinationHotels.find((h) => h.id === fb.data.recommendedId) ?? null;
  const otherHotels = destinationHotels.filter(
    (h) => h.id !== fb.data.recommendedId
  );

  // Only show the Firestore list once it's ready AND it has at least one hotel
  // for a chosen destination.
  const showFirebaseHotels = fbReady && destinationHotels.length > 0;

  // Fall back to the built-in list when Firestore failed / is blocked / empty,
  // when there are no certified hotels at the chosen destination, or when there
  // is no destination to query hotels for.
  const showStatic =
    noDestinations ||
    fb.status === "error" ||
    (fbReady && destinationHotels.length === 0);
  const showLoading = !noDestinations && fb.status === "loading";

  const selectOption = (option) => {
    const isSelected = option.id === draft.accommodationId;
    // Re-clicking the chosen stay clears it, so a traveller can undo without a
    // separate "none" option. Store the object too — a Firebase hotel is not in
    // the static catalogue the review / save steps look through.
    onChange(
      isSelected
        ? { accommodationId: null, accommodation: null }
        : { accommodationId: option.id, accommodation: option }
    );
  };

  return (
    <>
      <div style={w.stepHead}>
        <span style={w.stepBadge}>4</span>
        <div>
          <h2 style={w.stepTitle}>Select Accommodation</h2>
          <p style={w.stepSub}>
            Certified eco-stays across your destinations
            {nights > 0 ? ` · ${nights} ${nights === 1 ? "night" : "nights"}` : ""}
          </p>
        </div>
      </div>

      {showLoading && (
        <div style={{ ...w.card, ...(isPhone ? w.cardPhone : null) }}>
          <div style={w.emptyState}>Loading certified hotels…</div>
        </div>
      )}

      {/* Recommended certified hotel (suggestion only). */}
      {showFirebaseHotels && recommended && (
        <div style={styles.recCard}>
          <div style={styles.recHead}>
            <Sparkles size={15} color="#15803d" />
            <span>Hotel Recommendation</span>
          </div>
          <div style={styles.recBadge}>
            <Star size={12} fill="#f59e0b" color="#f59e0b" /> Recommended for your
            trip
          </div>

          <div style={styles.list}>
            <AccommodationRow
              option={recommended}
              isSelected={recommended.id === draft.accommodationId}
              onToggle={() => selectOption(recommended)}
              isPhone={isPhone}
              nights={nights}
              image={hotelImage(recommended)}
              highlighted
            />
          </div>

          <p style={styles.recReason}>{fb.data.reason}</p>
          <p style={styles.recNote}>
            This is a certified hotel from GreenTrip&apos;s partner list. It&apos;s
            a suggestion only — pick any hotel below to continue.
          </p>
        </div>
      )}

      {/* Every other approved certified hotel. */}
      {showFirebaseHotels && (
        <div style={{ ...w.card, ...(isPhone ? w.cardPhone : null) }}>
          <h3 style={styles.blockTitle}>Available Certified Hotels</h3>
          {otherHotels.length === 0 ? (
            <div style={w.emptyState}>
              No other approved certified hotels to show right now.
            </div>
          ) : (
            <div style={styles.list}>
              {otherHotels.map((h) => (
                <AccommodationRow
                  key={h.id}
                  option={h}
                  isSelected={h.id === draft.accommodationId}
                  onToggle={() => selectOption(h)}
                  isPhone={isPhone}
                  nights={nights}
                  image={hotelImage(h)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Existing general accommodation options for the same destinations.
          Shown alongside the certified hotels so a traveller always has the
          full local catalogue to choose from, not just certified stays. These
          come from the built-in ACCOMMODATIONS list via getAccommodationsForMany,
          which is already scoped to the chosen destinations only. */}
      {showFirebaseHotels && options.length > 0 && (
        <div style={{ ...w.card, ...(isPhone ? w.cardPhone : null) }}>
          <h3 style={styles.blockTitle}>More Accommodation Options</h3>
          <div style={styles.list}>
            {options.map((a) => (
              <AccommodationRow
                key={a.id}
                option={a}
                isSelected={a.id === draft.accommodationId}
                onToggle={() => selectOption(a)}
                isPhone={isPhone}
                nights={nights}
                image={a.imageUrl || HOTEL_PLACEHOLDER}
              />
            ))}
          </div>
        </div>
      )}

      {/* Fallback: Firestore unavailable / blocked / empty. */}
      {showStatic && (
        <div style={{ ...w.card, ...(isPhone ? w.cardPhone : null) }}>
          <div style={styles.fallbackNote}>
            Certified hotel recommendations are currently unavailable. You can
            continue with the available accommodation options.
          </div>

          {options.length === 0 ? (
            <div style={w.emptyState}>
              No eco-certified stays listed for this destination yet.
            </div>
          ) : (
            <div style={styles.list}>
              {options.map((a) => (
                <AccommodationRow
                  key={a.id}
                  option={a}
                  isSelected={a.id === draft.accommodationId}
                  onToggle={() => selectOption(a)}
                  isPhone={isPhone}
                  nights={nights}
                  image={a.imageUrl || HOTEL_PLACEHOLDER}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ ...w.footer, ...(isPhone ? w.footerPhone : null) }}>
        <button type="button" onClick={onBack} style={{ ...w.backBtn, ...(isPhone ? w.btnPhone : null) }}>
          Back
        </button>
        <button
          type="button"
          disabled={!draft.accommodationId}
          onClick={onNext}
          style={{
            ...w.nextBtn,
            ...(isPhone ? w.btnPhone : null),
            ...(draft.accommodationId ? {} : w.nextBtnDisabled),
          }}
        >
          Next: Review <ArrowRight size={16} />
        </button>
      </div>
    </>
  );
}

/**
 * One selectable stay row. Shared by the recommended hotel, the Firebase hotel
 * list and the static fallback list so all three read identically.
 *
 * A row shows a price column only when the option carries `pricePerNight`
 * (the static catalogue). Firebase hotels have no rate stored, so they show the
 * eco indicator and certification tier instead.
 */
function AccommodationRow({
  option,
  isSelected,
  onToggle,
  isPhone,
  nights,
  image,
  highlighted = false,
}) {
  const hasPrice = option.pricePerNight != null;
  const subLine = option.description || option.address || option.state || "";
  const certs = Array.isArray(option.certifications) ? option.certifications : [];

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={isSelected}
      style={{
        ...styles.row,
        ...(isPhone ? styles.rowPhone : null),
        ...(highlighted ? styles.rowHighlight : null),
        ...(isSelected ? styles.rowActive : {}),
      }}
    >
      <span style={{ ...styles.radio, ...(isSelected ? styles.radioOn : {}) }}>
        {isSelected && <Check size={12} color="#fff" strokeWidth={3} />}
      </span>

      {!isPhone && (
        <img src={image} alt={option.name} style={styles.thumb} />
      )}

      <div style={styles.rowText}>
        <div style={styles.rowTitleLine}>
          <span style={styles.rowTitle}>{option.name}</span>
          {option.type && (
            <span style={styles.typePill}>
              <BedDouble size={11} /> {option.type}
            </span>
          )}
          {option.state && (
            <span style={styles.statePill}>{option.state}</span>
          )}
        </div>
        {subLine && <div style={styles.rowDesc}>{subLine}</div>}

        {certs.length > 0 && (
          <div style={styles.certRow}>
            {certs.map((cert) => (
              <span key={cert} style={styles.certPill}>
                {cert}
              </span>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          ...styles.priceCol,
          ...(isPhone ? styles.priceColPhone : null),
        }}
      >
        <EcoScoreBadge
          score={option.ecoScore}
          label={hasPrice ? "Eco Score" : "Eco"}
          size="sm"
        />

        {hasPrice ? (
          isPhone ? (
            <div style={styles.priceInline}>
              <span style={{ ...styles.price, ...styles.priceFlat }}>
                RM {option.pricePerNight}
              </span>
              <span style={styles.priceSub}> / night</span>
            </div>
          ) : (
            <>
              <div style={styles.price}>RM {option.pricePerNight}</div>
              <div style={styles.priceSub}>per night</div>
            </>
          )
        ) : (
          option.ecoLabel && (
            <div style={styles.ecoLabel}>{option.ecoLabel}</div>
          )
        )}

        {hasPrice && nights > 0 && (
          <div
            style={{
              ...styles.priceTotal,
              ...(isPhone ? styles.priceFlat : null),
            }}
          >
            RM {option.pricePerNight * nights} total
          </div>
        )}
      </div>
    </button>
  );
}

const styles = {
  recCard: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 14,
    padding: "16px 18px",
    marginBottom: 16,
  },
  recHead: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 14,
    fontWeight: 800,
    color: "#15803d",
  },
  recBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    fontSize: 12,
    fontWeight: 800,
    color: "#b45309",
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 999,
    padding: "3px 10px",
    margin: "10px 0",
  },
  recReason: { fontSize: 12.5, color: "#4b5563", margin: "10px 0 0", lineHeight: 1.5 },
  recNote: { fontSize: 12, color: "#6b7280", margin: "8px 0 0", fontStyle: "italic" },

  fallbackNote: {
    background: "#fffbeb",
    border: "1px solid #fde68a",
    color: "#92400e",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 12.5,
    lineHeight: 1.5,
    marginBottom: 14,
  },

  blockTitle: { fontSize: 16, fontWeight: 800, margin: "0 0 12px" },

  list: { display: "flex", flexDirection: "column", gap: 10 },
  row: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: 12,
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  },
  rowPhone: { flexWrap: "wrap", gap: 10, padding: 12, alignItems: "flex-start" },
  rowActive: { borderColor: "#22c55e", background: "#f0fdf4" },
  rowHighlight: { borderColor: "#f59e0b", background: "#fff" },
  radio: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    border: "1.5px solid #d1d5db",
    background: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioOn: { background: "#22c55e", borderColor: "#22c55e" },
  thumb: {
    width: 88,
    height: 66,
    borderRadius: 8,
    objectFit: "cover",
    flexShrink: 0,
  },
  rowText: { flex: 1, minWidth: 0 },
  rowTitleLine: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  rowTitle: { fontWeight: 700, fontSize: 14.5 },
  typePill: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 999,
    background: "#f3f4f6",
    color: "#6b7280",
  },
  statePill: {
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 999,
    background: "#ecfdf5",
    color: "#15803d",
  },
  rowDesc: { color: "#6b7280", fontSize: 13, marginTop: 3 },
  certRow: { display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 },
  certPill: {
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 9px",
    borderRadius: 999,
    background: "#dbeafe",
    color: "#2563eb",
  },
  priceCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: 2,
    flexShrink: 0,
  },
  priceColPhone: {
    flexBasis: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 10,
    marginTop: 2,
    borderTop: "1px solid #f3f4f6",
  },
  price: { fontWeight: 800, fontSize: 15.5, marginTop: 6 },
  priceSub: { color: "#9ca3af", fontSize: 11.5 },
  priceTotal: { color: "#15803d", fontSize: 12, fontWeight: 700, marginTop: 3 },
  priceFlat: { marginTop: 0 },
  priceInline: { display: "flex", alignItems: "baseline", gap: 2 },
  ecoLabel: {
    color: "#15803d",
    fontSize: 11.5,
    fontWeight: 700,
    marginTop: 6,
    textAlign: "right",
  },
};
