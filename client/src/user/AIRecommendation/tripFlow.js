export const TRIP_FLOW = {
  OVERVIEW: "route_overview",
  LOADING: "comparison_loading",
  COMPARE: "transport_comparison",
  NAV: "navigation_preview",
};

export const FLOW_STEPS = [
  { id: "route_overview", label: "Route Overview" },
  { id: "choose_transport", label: "Choose Transport" },
  { id: "navigation", label: "Navigation" },
];

export function flowStepIndex(screen) {
  if (screen === TRIP_FLOW.NAV) return 2;
  if (screen === TRIP_FLOW.LOADING || screen === TRIP_FLOW.COMPARE) return 1;
  return 0;
}
