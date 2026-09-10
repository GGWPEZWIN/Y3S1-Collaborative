export const USABLE_GPS_ACCURACY_METERS = 100;
export const ARRIVAL_RADIUS_METERS = 100;
export const DEVIATION_BASE_METERS = 150;
export const CONSECUTIVE_FIXES_REQUIRED = 2;
export const COMPLETED_SEGMENT_VERSION = 1;
export const COMPLETED_SEGMENTS_SUBCOLLECTION = "completedSegments";

export function completedSegmentDocumentId(segmentIndex) {
  if (typeof segmentIndex !== "number" || !Number.isInteger(segmentIndex) || segmentIndex < 0) {
    return null;
  }
  return `segment-${segmentIndex}`;
}
