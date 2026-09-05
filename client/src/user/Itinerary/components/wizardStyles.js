/**
 * Style fragments shared by every step of the Create Itinerary wizard.
 *
 * The project styles components with inline objects rather than CSS modules,
 * so "shared styling" means a shared object. Keeping the step header, card,
 * and footer buttons here is what stops the five steps from drifting apart
 * visually as they get edited.
 */

export const stepHead = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 16,
};

export const stepBadge = {
  width: 30,
  height: 30,
  borderRadius: "50%",
  background: "#22c55e",
  color: "#fff",
  fontWeight: 800,
  fontSize: 14,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
};

export const stepTitle = { fontSize: 19, fontWeight: 800, margin: 0 };

export const stepSub = {
  color: "#6b7280",
  fontSize: 13.5,
  margin: "3px 0 0",
};

export const card = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 14,
  padding: 24,
};

/** Tighter padding so card content keeps its width on a 390px screen. */
export const cardPhone = { padding: 16, borderRadius: 12 };

export const searchBox = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  background: "#f3f4f6",
  borderRadius: 10,
  padding: "11px 16px",
};

export const searchInput = {
  border: "none",
  outline: "none",
  background: "transparent",
  flex: 1,
  // 16px stops iOS Safari zooming the viewport on focus.
  fontSize: 16,
  fontFamily: "inherit",
  minWidth: 0,
};

export const sectionLabel = {
  fontSize: 13.5,
  fontWeight: 700,
  color: "#374151",
  margin: "18px 0 12px",
};

export const footer = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginTop: 20,
  paddingBottom: 32,
};

/**
 * On a phone the wizard's Back/Next pair reverses into a stacked column with
 * the primary action on top, so the button you press most is under your thumb
 * and neither one is a narrow tap target.
 */
export const footerPhone = {
  flexDirection: "column-reverse",
  gap: 10,
  alignItems: "stretch",
  marginTop: 16,
  paddingBottom: 8,
};

export const backBtn = {
  padding: "11px 24px",
  borderRadius: 10,
  border: "1px solid #d1d5db",
  background: "#fff",
  color: "#374151",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

export const nextBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  background: "#22c55e",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "12px 20px",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
};

/** Full-width, taller tap targets for the stacked phone footer. */
export const btnPhone = {
  width: "100%",
  justifyContent: "center",
  minHeight: 48,
  fontSize: 15,
};

export const nextBtnDisabled = { background: "#d1d5db", cursor: "not-allowed" };

export const emptyState = {
  background: "#f9fafb",
  border: "1px dashed #d1d5db",
  borderRadius: 12,
  padding: "32px 20px",
  textAlign: "center",
  color: "#6b7280",
  fontSize: 13.5,
};
