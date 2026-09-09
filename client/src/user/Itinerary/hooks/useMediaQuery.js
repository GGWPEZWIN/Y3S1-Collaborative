import { useEffect, useState } from "react";

/**
 * useMediaQuery
 *
 * The project styles components with inline style objects, and inline styles
 * can't express a CSS media query. This hook closes that gap: it reports
 * whether a media query currently matches, so a component can pick between
 * two style objects.
 *
 * Usage:
 *   const isPhone = useMediaQuery(BREAKPOINTS.phone);
 *   <div style={{ ...styles.grid, ...(isPhone ? styles.gridPhone : null) }} />
 *
 * @param {string} query — a CSS media query, e.g. "(max-width: 640px)"
 * @returns {boolean}
 */
export default function useMediaQuery(query) {
  // Initialised from matchMedia rather than `false` so the first paint is
  // already correct — starting false makes a phone render the desktop layout
  // for one frame, which shows up as a visible flash of the wrong nav.
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;

    const mql = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);

    // Re-sync on mount: the query string can change between renders, and the
    // state above only ran on the very first render.
    setMatches(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/**
 * Shared breakpoints for the Itinerary module.
 *
 * The design is desktop-first (it follows the Figma mockups), so these are
 * max-width queries describing where the desktop layout has to give way:
 * - phone:  single column, sidebar becomes a bottom tab bar
 * - tablet: two-column grids instead of three, narrower gutters
 */
export const BREAKPOINTS = {
  phone: "(max-width: 640px)",
  tablet: "(max-width: 1024px)",
};
