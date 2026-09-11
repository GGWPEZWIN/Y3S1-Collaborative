export function skipDialogCopy({ destinationName, isFinalDestination = false } = {}) {
  const name = destinationName || "this destination";
  if (isFinalDestination) {
    return {
      title: "Skip this destination?",
      body: `You haven’t reached ${name}. Skipping opens the trip summary. This stop’s transportation carbon and Eco-Score will not be included in your report.`,
    };
  }
  return {
    title: "Skip this destination?",
    body: `You haven’t reached ${name}. Skipping moves to the next stop. This stop’s transportation carbon and Eco-Score will not be included in your report.`,
  };
}

export function skipDialogDismissResult() {
  return {
    writes: false,
    advances: false,
    requestsRoutes: false,
    changesIndex: false,
  };
}
