import { normalizeCompletedSegmentRecords } from "./segmentCompletion.js";
import { normalizeSkippedSegmentRecords } from "./segmentSkip.js";

export const DESTINATION_OUTCOME = {
  REACHED: "reached",
  SKIPPED: "skipped",
};

export const PROGRESS_STOP_KIND = {
  START: "START",
  CURRENT: "CURRENT",
  REACHED: "REACHED",
  SKIPPED: "SKIPPED",
  NEXT: "NEXT DESTINATION",
  UPCOMING: "UPCOMING",
};

function recordByIndex(records) {
  const map = new Map();
  if (!Array.isArray(records)) return map;
  records.forEach((record) => {
    if (!record || !Number.isInteger(record.segmentIndex) || record.segmentIndex < 0) {
      return;
    }
    if (!map.has(record.segmentIndex)) {
      map.set(record.segmentIndex, record);
    }
  });
  return map;
}

/**
 * One ordered view of reached/skipped/next/upcoming destinations.
 * currentSegmentIndex is the next unresolved destination.
 */
export function buildProgressOutcomes({
  totalSegments,
  currentSegmentIndex,
  completions = [],
  skips = [],
} = {}) {
  const completed = recordByIndex(normalizeCompletedSegmentRecords(completions));
  const skipped = recordByIndex(normalizeSkippedSegmentRecords(skips));
  const items = [];
  let reachedCount = 0;
  let skippedCount = 0;
  let conflict = false;
  let gapBeforeCursor = false;

  const total =
    Number.isInteger(totalSegments) && totalSegments > 0 ? totalSegments : 0;
  const cursor =
    Number.isInteger(currentSegmentIndex) && currentSegmentIndex >= 0
      ? currentSegmentIndex
      : 0;

  for (let segmentIndex = 0; segmentIndex < total; segmentIndex += 1) {
    const completion = completed.get(segmentIndex) || null;
    const skip = skipped.get(segmentIndex) || null;
    let outcome = null;
    let kind = PROGRESS_STOP_KIND.UPCOMING;

    if (completion && skip) {
      conflict = true;
      outcome = null;
      kind = PROGRESS_STOP_KIND.UPCOMING;
    } else if (completion) {
      outcome = DESTINATION_OUTCOME.REACHED;
      kind = PROGRESS_STOP_KIND.REACHED;
      reachedCount += 1;
    } else if (skip) {
      outcome = DESTINATION_OUTCOME.SKIPPED;
      kind = PROGRESS_STOP_KIND.SKIPPED;
      skippedCount += 1;
    } else if (segmentIndex < cursor) {
      gapBeforeCursor = true;
      kind = PROGRESS_STOP_KIND.UPCOMING;
    } else if (segmentIndex === cursor && cursor < total) {
      kind = PROGRESS_STOP_KIND.NEXT;
    }

    items.push({
      segmentIndex,
      outcome,
      kind,
      completion,
      skip,
    });
  }

  return {
    items,
    reachedCount,
    skippedCount,
    plannedCount: total,
    conflict,
    gapBeforeCursor,
    allResolved: total > 0 && cursor >= total && !conflict && !gapBeforeCursor,
  };
}

export function outcomesBySegmentIndex(progress) {
  const map = {};
  (progress?.items || []).forEach((item) => {
    if (item.outcome) map[item.segmentIndex] = item.outcome;
  });
  return map;
}
