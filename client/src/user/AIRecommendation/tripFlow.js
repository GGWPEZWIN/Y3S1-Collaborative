export const TRIP_FLOW = {
  OVERVIEW: "route_overview",
  LOADING: "comparison_loading",
  COMPARE: "transport_comparison",
  NAV: "navigation_preview",
  DESTINATION_REACHED: "destination_reached",
  ALL_REACHED: "all_destinations_reached",
};

export const FLOW_STEPS = [
  { id: "route_overview", label: "Route Overview" },
  { id: "choose_transport", label: "Choose Transport" },
  { id: "navigation", label: "Navigation" },
];

export function flowStepIndex(screen) {
  if (screen === TRIP_FLOW.NAV || screen === TRIP_FLOW.DESTINATION_REACHED) {
    return 2;
  }
  if (screen === TRIP_FLOW.LOADING || screen === TRIP_FLOW.COMPARE) return 1;
  return 0;
}
