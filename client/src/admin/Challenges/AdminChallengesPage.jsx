import React, { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, CalendarDays } from "lucide-react";
import {
  listenToChallenges,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  CHALLENGE_CATEGORY_OPTIONS,
  DIFFICULTY_OPTIONS,
} from "../../firebase/challengeService";

const emptyForm = {
  title: "",
  description: "",
  category: CHALLENGE_CATEGORY_OPTIONS[0],
  difficulty: DIFFICULTY_OPTIONS[0],
  points: 100,
  startDate: "",
  endDate: "",
};

const DIFFICULTY_COLORS = {
  Easy: { bg: "#dcfce7", text: "#15803d" },
  Medium: { bg: "#fef3c7", text: "#b45309" },
  Hard: { bg: "#fee2e2", text: "#b91c1c" },
};

/**
 * Admin CRUD content for challenges. Meant to be rendered inside
 * AdminDashboard as a tab — no full-page wrapper of its own.
 */
export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");

  const reportError = (err) => {
    console.error(err);
    setPageError(err?.message || "Something went wrong.");
    setTimeout(() => setPageError(""), 6000);
  };

  useEffect(() => {
    const unsub = listenToChallenges((list) => {
      setChallenges(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (challenge) => {
    setEditingId(challenge.id);
    setForm({
      title: challenge.title,
      description: challenge.description || "",
      category: challenge.category,
      difficulty: challenge.difficulty,
      points: challenge.points,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateChallenge(editingId, form);
      } else {
        await createChallenge(form);
      }
      closeForm();
    } catch (err) {
      reportError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (challenge) => {
    const confirmed = window.confirm(`Delete "${challenge.title}"? This can't be undone.`);
    if (!confirmed) return;
    try {
      await deleteChallenge(challenge.id);
    } catch (err) {
      reportError(err);
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>Manage Challenges</div>
          <div style={styles.headerSubtitle}>{challenges.length} challenge{challenges.length !== 1 ? "s" : ""} active</div>
        </div>
        <button type="button" onClick={openCreateForm} style={styles.addBtn}>
          <Plus size={16} />
          New Challenge
        </button>
      </div>

      {pageError && <div style={styles.errorBanner}>⚠️ {pageError}</div>}

      {loading ? (
        <p style={styles.emptyText}>Loading challenges...</p>
      ) : challenges.length === 0 ? (
        <p style={styles.emptyText}>No challenges yet — create one to get started.</p>
      ) : (
        <div style={styles.grid}>
          {challenges.map((c) => {
            const diffColor = DIFFICULTY_COLORS[c.difficulty] || DIFFICULTY_COLORS.Easy;
            return (
              <div key={c.id} style={styles.card}>
                <div style={styles.cardTopRow}>
                  <span style={styles.cardCategory}>{c.category}</span>
                  <span style={{ ...styles.difficultyPill, background: diffColor.bg, color: diffColor.text }}>
                    {c.difficulty}
                  </span>
                </div>
                <div style={styles.cardTitle}>{c.title}</div>
                {c.description && <div style={styles.cardDescription}>{c.description}</div>}
                <div style={styles.cardDates}>
                  <CalendarDays size={13} color="#9ca3af" />
                  {c.startDate} → {c.endDate}
                </div>
                <div style={styles.cardPoints}>+{c.points} pts</div>
                <div style={styles.cardActions}>
                  <button type="button" onClick={() => openEditForm(c)} style={styles.cardActionBtn}>
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(c)}
                    style={{ ...styles.cardActionBtn, color: "#b91c1c" }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div style={styles.modalOverlay} onClick={closeForm}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>{editingId ? "Edit Challenge" : "New Challenge"}</div>
              <button type="button" onClick={closeForm} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={styles.form}>
              <label style={styles.label}>
                Title
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={styles.input}
                  required
                />
              </label>

              <label style={styles.label}>
                Description
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  style={{ ...styles.input, minHeight: 70, resize: "vertical" }}
                />
              </label>

              <div style={styles.formRow}>
                <label style={styles.label}>
                  Category
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={styles.input}
                  >
                    {CHALLENGE_CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>

                <label style={styles.label}>
                  Difficulty
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    style={styles.input}
                  >
                    {DIFFICULTY_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </label>
              </div>

              <div style={styles.formRow}>
                <label style={styles.label}>
                  Start Date
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    style={styles.input}
                    required
                  />
                </label>

                <label style={styles.label}>
                  End Date
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    style={styles.input}
                    required
                  />
                </label>
              </div>

              <label style={styles.label}>
                Points
                <input
                  type="number"
                  min="0"
                  value={form.points}
                  onChange={(e) => setForm({ ...form, points: e.target.value })}
                  style={styles.input}
                  required
                />
              </label>

              <div style={styles.formActions}>
                <button type="button" onClick={closeForm} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={styles.saveBtn}>
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Challenge"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  header: { display: "flex", alignItems: "center", gap: 14, marginBottom: 24 },
  headerTitle: { fontSize: 20, fontWeight: 800, color: "#111827" },
  headerSubtitle: { fontSize: 13, color: "#9ca3af" },
  addBtn: {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    gap: 6,
    border: "none",
    background: "#16a34a",
    color: "#fff",
    fontWeight: 700,
    fontSize: 13.5,
    borderRadius: 10,
    padding: "10px 16px",
    cursor: "pointer",
  },
  emptyText: { textAlign: "center", color: "#9ca3af", fontSize: 14, marginTop: 60 },
  errorBanner: {
    textAlign: "center",
    fontSize: 13,
    color: "#b91c1c",
    fontWeight: 600,
    padding: "10px 16px",
    background: "#fee2e2",
    borderRadius: 10,
    marginBottom: 20,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: 16,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 18,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  cardTopRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  cardCategory: { fontSize: 11.5, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: 0.4 },
  difficultyPill: { fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 9px" },
  cardTitle: { fontSize: 15.5, fontWeight: 800, color: "#111827" },
  cardDescription: { fontSize: 13, color: "#6b7280", marginTop: 4, lineHeight: 1.4 },
  cardDates: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#9ca3af", marginTop: 10 },
  cardPoints: { fontSize: 13, fontWeight: 700, color: "#111827", marginTop: 6 },
  cardActions: { display: "flex", gap: 8, marginTop: 12 },
  cardActionBtn: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12.5,
    fontWeight: 600,
    color: "#374151",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    padding: 20,
  },
  modal: {
    background: "#fff",
    borderRadius: 16,
    width: "100%",
    maxWidth: 460,
    maxHeight: "90vh",
    overflowY: "auto",
    padding: 22,
  },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: 800, color: "#111827" },
  modalCloseBtn: {
    border: "none",
    background: "#f3f4f6",
    borderRadius: 8,
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#374151",
  },
  form: { display: "flex", flexDirection: "column", gap: 14 },
  formRow: { display: "flex", gap: 12 },
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 700, color: "#374151", flex: 1 },
  input: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "10px 12px",
    fontSize: 14,
    fontWeight: 500,
    color: "#111827",
    outline: "none",
    fontFamily: "inherit",
  },
  formActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 },
  cancelBtn: {
    border: "1px solid #e5e7eb",
    background: "#fff",
    borderRadius: 10,
    padding: "10px 18px",
    fontSize: 13.5,
    fontWeight: 700,
    color: "#374151",
    cursor: "pointer",
  },
  saveBtn: {
    border: "none",
    background: "#16a34a",
    color: "#fff",
    borderRadius: 10,
    padding: "10px 18px",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
  },
};