import React, { useEffect, useState } from "react";
import {
  Recycle, Sprout, Bus, Droplet, Zap, Leaf, Award, TreePine,
  Plus, Pencil, Trash2, X, ChevronLeft,
} from "lucide-react";
import { useCurrentUser } from "../../firebase/useCurrentUser";
import {
  listenToAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  CATEGORY_OPTIONS,
  ICON_OPTIONS,
} from "../../firebase/achievementService";

// Maps the icon key stored in Firestore to an actual lucide-react component.
const ICON_MAP = {
  Recycle, Sprout, Bus, Droplet, Zap, Leaf, Award, TreePine,
};

const emptyForm = { title: "", description: "", category: CATEGORY_OPTIONS[0], icon: ICON_OPTIONS[0], points: 100 };

/**
 * Admin CRUD page for the achievement catalog (definitions), not per-user
 * earned records. Wire this up behind your admin route/guard, e.g.:
 *   <AdminAchievementsPage onNavigate={onNavigate} />
 *
 * If you have a `role` field on the user's profile doc, gate this route
 * with something like `profile?.role === "admin"` before rendering it —
 * this component itself does not check that.
 */
export default function AdminAchievementsPage({ onNavigate }) {
  const { profile } = useCurrentUser();
  const [achievements, setAchievements] = useState([]);
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
    const unsub = listenToAchievements((list) => {
      setAchievements(list);
      setLoading(false);
    });
    return unsub;
  }, []);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEditForm = (achievement) => {
    setEditingId(achievement.id);
    setForm({
      title: achievement.title,
      description: achievement.description || "",
      category: achievement.category,
      icon: achievement.icon,
      points: achievement.points,
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
        await updateAchievement(editingId, form);
      } else {
        await createAchievement(form);
      }
      closeForm();
    } catch (err) {
      reportError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (achievement) => {
    const confirmed = window.confirm(`Delete "${achievement.title}"? This can't be undone.`);
    if (!confirmed) return;
    try {
      await deleteAchievement(achievement.id);
    } catch (err) {
      reportError(err);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        {onNavigate && (
          <button type="button" onClick={() => onNavigate(-1)} style={styles.backBtn}>
            <ChevronLeft size={20} />
          </button>
        )}
        <div>
          <div style={styles.headerTitle}>Manage Achievements</div>
          <div style={styles.headerSubtitle}>{achievements.length} achievement{achievements.length !== 1 ? "s" : ""} in catalog</div>
        </div>
        <button type="button" onClick={openCreateForm} style={styles.addBtn}>
          <Plus size={16} />
          New Achievement
        </button>
      </div>

      {pageError && <div style={styles.errorBanner}>⚠️ {pageError}</div>}

      {loading ? (
        <p style={styles.emptyText}>Loading achievements...</p>
      ) : achievements.length === 0 ? (
        <p style={styles.emptyText}>No achievements yet — create one to get started.</p>
      ) : (
        <div style={styles.grid}>
          {achievements.map((a) => {
            const Icon = ICON_MAP[a.icon] || Award;
            return (
              <div key={a.id} style={styles.card}>
                <div style={styles.cardIconWrap}>
                  <Icon size={28} color="#16a34a" />
                </div>
                <div style={styles.cardTitle}>{a.title}</div>
                <div style={styles.cardCategory}>{a.category}</div>
                {a.description && <div style={styles.cardDescription}>{a.description}</div>}
                <div style={styles.cardPoints}>+{a.points} pts</div>
                <div style={styles.cardActions}>
                  <button type="button" onClick={() => openEditForm(a)} style={styles.cardActionBtn}>
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(a)}
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
              <div style={styles.modalTitle}>{editingId ? "Edit Achievement" : "New Achievement"}</div>
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

              <label style={styles.label}>
                Category
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  style={styles.input}
                >
                  {CATEGORY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>

              <label style={styles.label}>
                Icon
                <div style={styles.iconGrid}>
                  {ICON_OPTIONS.map((key) => {
                    const Icon = ICON_MAP[key];
                    const selected = form.icon === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => setForm({ ...form, icon: key })}
                        style={{
                          ...styles.iconOption,
                          borderColor: selected ? "#16a34a" : "#e5e7eb",
                          background: selected ? "#dcfce7" : "#fff",
                        }}
                        title={key}
                      >
                        <Icon size={20} color={selected ? "#15803d" : "#6b7280"} />
                      </button>
                    );
                  })}
                </div>
              </label>

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
                  {saving ? "Saving..." : editingId ? "Save Changes" : "Create Achievement"}
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
  page: {
    minHeight: "100vh",
    background: "#f9fafb",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    padding: "20px 24px 60px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },
  backBtn: {
    border: "none",
    background: "#f3f4f6",
    borderRadius: 10,
    width: 36,
    height: 36,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    color: "#374151",
  },
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
    gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
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
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    background: "#f0fdf4",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  cardTitle: { fontSize: 15.5, fontWeight: 800, color: "#111827" },
  cardCategory: { fontSize: 12, fontWeight: 700, color: "#16a34a", textTransform: "uppercase", letterSpacing: 0.4 },
  cardDescription: { fontSize: 13, color: "#6b7280", marginTop: 4, lineHeight: 1.4 },
  cardPoints: { fontSize: 13, fontWeight: 700, color: "#111827", marginTop: 8 },
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
    maxWidth: 440,
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
  label: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 700, color: "#374151" },
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
  iconGrid: { display: "flex", flexWrap: "wrap", gap: 8 },
  iconOption: {
    width: 42,
    height: 42,
    borderRadius: 10,
    border: "2px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
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