import React, { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  CalendarDays,
  MapPin,
  Camera,
  Navigation,
  Leaf,
  Clock,
  User,
  Share2,
  Users,
  Check,
  Tag,
} from "lucide-react";
import {
  listenToChallenges,
  createChallenge,
  updateChallenge,
  deleteChallenge,
  CHALLENGE_CATEGORY_OPTIONS,
  DIFFICULTY_OPTIONS,
} from "../../firebase/challengeService";

const DEFAULT_CHALLENGE_IMAGE =
  "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&q=80&w=1200";

const THEME_OPTIONS = [
  "Reforestation & Trees",
  "Zero Waste & Recycling",
  "Clean Energy",
  "Sustainable Mobility",
  "Water Conservation",
  "Eco Community",
];

const DUMMY_CHALLENGES = [
  {
    id: 1,
    title: "KL Car-Free Weekend",
    theme: "Sustainable Mobility",
    category: "Low-Carbon Transit",
    tag: "Low-Carbon Transit",
    difficulty: "Medium",
    overview:
      "Complete a full weekend in Kuala Lumpur using only public transport, walking, or cycling. Reduce urban congestion and emissions while exploring the city.",
    description:
      "Complete a full weekend in Kuala Lumpur using only public transport, walking, or cycling. Reduce urban congestion and emissions while exploring the city.",
    organizer: "KL City Council & GreenTrip",
    points: 50,
    carbonKg: 12.5,
    participants: 2847,
    location: "Kuala Lumpur",
    imageUrl:
      "https://images.unsplash.com/photo-1596422846543-75c6fc197f07?w=800&q=80",
    duration: "2 Days (Weekend)",
    startDate: "2026-09-12",
    endDate: "2026-09-13",
    allowedVerification: ["image", "gps"],
    rules: [
      "Must take place within Kuala Lumpur central transit zones.",
      "Photo proof of transit ticket/ride or GPS check-in required.",
      "Carbon savings automatically credited to your Eco Profile upon approval.",
    ],
  },
  {
    id: 2,
    title: "Pasar Malam Plastic-Free",
    theme: "Zero Waste & Recycling",
    category: "Zero-Plastic",
    tag: "Zero-Plastic",
    difficulty: "Easy",
    overview:
      "Visit a night market with your own containers and avoid all single-use plastics completely. Say no to disposable bags, cups, and plastic cutlery.",
    description:
      "Visit a night market with your own containers and avoid all single-use plastics completely. Say no to disposable bags, cups, and plastic cutlery.",
    organizer: "Zero Waste Malaysia",
    points: 30,
    carbonKg: null,
    participants: 5234,
    location: "National",
    imageUrl:
      "https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&q=80",
    duration: "1 Day",
    startDate: "2026-09-15",
    endDate: "2026-09-15",
    allowedVerification: ["image"],
    rules: [
      "Applicable to any registered night market across Malaysia.",
      "Upload a photo showing your food haul inside reusable containers or tiffins.",
      "Must decline all single-use plastic bags and disposable cutlery.",
    ],
  },
  {
    id: 3,
    title: "George Town Heritage Walk",
    theme: "Sustainable Mobility",
    category: "Low-Carbon Transit",
    tag: "Low-Carbon Transit",
    difficulty: "Easy",
    overview:
      "Ditch the car and explore Penang's UNESCO Heritage site entirely on foot or by bicycle for a day. Experience historic landmarks with zero tailpipe emissions.",
    description:
      "Ditch the car and explore Penang's UNESCO Heritage site entirely on foot or by bicycle for a day. Experience historic landmarks with zero tailpipe emissions.",
    organizer: "Penang Heritage Trust & GreenTrip",
    points: 40,
    carbonKg: 8.2,
    participants: 1932,
    location: "Penang",
    imageUrl:
      "https://images.unsplash.com/photo-1599423528441-2a07d3b5b62b?w=800&q=80",
    duration: "1 Day",
    startDate: "2026-09-18",
    endDate: "2026-09-18",
    allowedVerification: ["gps", "image"],
    rules: [
      "Check in via GPS within the George Town UNESCO World Heritage Zone.",
      "Alternatively, upload a photo of your walking or cycling trip at a heritage landmark.",
      "No motorized private transport permitted during the challenge period.",
    ],
  },
  {
    id: 4,
    title: "Kinabalu Reforestation",
    theme: "Reforestation & Trees",
    category: "Reforestation",
    tag: "Reforestation",
    difficulty: "Hard",
    overview:
      "Join local rangers to plant 5 native tree saplings at the base of Mount Kinabalu to restore tropical forest cover and preserve local biodiversity.",
    description:
      "Join local rangers to plant 5 native tree saplings at the base of Mount Kinabalu to restore tropical forest cover and preserve local biodiversity.",
    organizer: "Sabah Parks & Forestry Department",
    points: 150,
    carbonKg: 45.0,
    participants: 412,
    location: "Sabah",
    imageUrl:
      "https://images.unsplash.com/photo-1511497584788-876760111969?w=800&q=80",
    duration: "1 Day",
    startDate: "2026-09-20",
    endDate: "2026-09-20",
    allowedVerification: ["image", "gps"],
    rules: [
      "Must be performed in coordination with registered park authorities or NGO drives.",
      "Upload photo proof of planted saplings or GPS check-in at the park site.",
      "Adhere strictly to official safety and planting instructions provided by rangers.",
    ],
  },
  {
    id: 5,
    title: "Melaka River Cleanup",
    theme: "Zero Waste & Recycling",
    category: "Zero-Plastic",
    tag: "Zero-Plastic",
    difficulty: "Medium",
    overview:
      "Participate in the weekend volunteer drive to collect and sort plastic waste along the Melaka River, preventing ocean pollution and protecting aquatic life.",
    description:
      "Participate in the weekend volunteer drive to collect and sort plastic waste along the Melaka River, preventing ocean pollution and protecting aquatic life.",
    organizer: "Melaka River Development Corp & EcoVolunteers",
    points: 80,
    carbonKg: null,
    participants: 845,
    location: "Melaka",
    imageUrl:
      "https://images.unsplash.com/photo-1618477461853-cf6ed80fbfc9?w=800&q=80",
    duration: "1 Day",
    startDate: "2026-09-22",
    endDate: "2026-09-22",
    allowedVerification: ["image", "gps"],
    rules: [
      "Collect at least 1 bag of recyclable/plastic waste along designated river stretches.",
      "Sort collected waste into designated recycling bins provided at the site.",
      "Upload photo proof of collected waste or perform a GPS check-in.",
    ],
  },
  {
    id: 6,
    title: "Bako Coastal Conservation",
    theme: "Reforestation & Trees",
    category: "Reforestation",
    tag: "Reforestation",
    difficulty: "Hard",
    overview:
      "Help clear washed-up debris and plant mangroves along the Sarawak coastline at Bako National Park to bolster coastal defenses and sequester carbon.",
    description:
      "Help clear washed-up debris and plant mangroves along the Sarawak coastline at Bako National Park to bolster coastal defenses and sequester carbon.",
    organizer: "Sarawak Forestry Corporation",
    points: 120,
    carbonKg: 25.5,
    participants: 320,
    location: "Sarawak",
    imageUrl:
      "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?w=800&q=80",
    duration: "1 Day",
    startDate: "2026-09-25",
    endDate: "2026-09-25",
    allowedVerification: ["image", "gps"],
    rules: [
      "Follow ranger safety guidelines when working along tidal coastal areas.",
      "Upload a photo of your mangrove planting or marine debris collection effort.",
      "Ensure all trash collected is logged with the park entrance station.",
    ],
  },
];

const emptyForm = {
  title: "",
  theme: THEME_OPTIONS[0],
  category: CHALLENGE_CATEGORY_OPTIONS[0],
  tag: CHALLENGE_CATEGORY_OPTIONS[0],
  difficulty: DIFFICULTY_OPTIONS[0],
  overview: "",
  description: "",
  organizer: "",
  points: 100,
  carbonKg: "",
  location: "",
  imageUrl: "",
  duration: "",
  startDate: "",
  endDate: "",
  allowedVerification: ["image"],
  rules: "",
  participants: 0,
};

const DIFFICULTY_COLORS = {
  Easy: { bg: "#dcfce7", text: "#15803d" },
  Medium: { bg: "#fef3c7", text: "#b45309" },
  Hard: { bg: "#fee2e2", text: "#b91c1c" },
};

export default function AdminChallengesPage() {
  const [challenges, setChallenges] = useState(DUMMY_CHALLENGES);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [pageError, setPageError] = useState("");
  const [modalError, setModalError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  // Track deleted dummy challenge IDs so deleted dummy items remain hidden
  const [deletedIds, setDeletedIds] = useState(() => {
    try {
      const saved = localStorage.getItem("greentrip_deleted_challenge_ids");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const reportError = (err) => {
    console.error(err);
    setPageError(err?.message || "Something went wrong.");
    setTimeout(() => setPageError(""), 6000);
  };

  useEffect(() => {
    const unsub = listenToChallenges((list) => {
      const firestoreList = list || [];
      const firestoreIds = new Set(firestoreList.map((item) => String(item.id)));

      // Keep dummy challenges that aren't overridden by Firestore or deleted by admin
      const activeDummies = DUMMY_CHALLENGES.filter(
        (dummy) =>
          !firestoreIds.has(String(dummy.id)) &&
          !deletedIds.includes(String(dummy.id))
      );

      // Merge Firestore challenges with active dummy challenges
      setChallenges([...firestoreList, ...activeDummies]);
      setLoading(false);
    });
    return unsub;
  }, [deletedIds]);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalError("");
    setShowForm(true);
  };

  const openEditForm = (challenge) => {
    setEditingId(challenge.id);
    setModalError("");
    setForm({
      title: challenge.title || "",
      theme: challenge.theme || THEME_OPTIONS[0],
      category: challenge.category || challenge.tag || CHALLENGE_CATEGORY_OPTIONS[0],
      tag: challenge.tag || challenge.category || CHALLENGE_CATEGORY_OPTIONS[0],
      difficulty: challenge.difficulty || DIFFICULTY_OPTIONS[0],
      overview: challenge.overview || challenge.description || "",
      description: challenge.description || challenge.overview || "",
      organizer: challenge.organizer || "",
      points: challenge.points ?? 100,
      carbonKg: challenge.carbonKg ?? "",
      participants: challenge.participants ?? 0,
      location: challenge.location || "",
      imageUrl: challenge.imageUrl || "",
      duration: challenge.duration || "",
      startDate: challenge.startDate || "",
      endDate: challenge.endDate || "",
      allowedVerification: Array.isArray(challenge.allowedVerification)
        ? challenge.allowedVerification
        : ["image"],
      rules: Array.isArray(challenge.rules)
        ? challenge.rules.join("\n")
        : challenge.rules || "",
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setModalError("");
    setForm(emptyForm);
  };

  const handleVerificationToggle = (method) => {
    setForm((prev) => {
      const current = prev.allowedVerification || [];
      if (current.includes(method)) {
        if (current.length === 1) return prev;
        return { ...prev, allowedVerification: current.filter((m) => m !== method) };
      } else {
        return { ...prev, allowedVerification: [...current, method] };
      }
    });
  };

  const handleShare = async (challenge) => {
    const shareUrl = `${window.location.origin}/challenges/${challenge.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: challenge.title,
          text: challenge.overview || challenge.description,
          url: shareUrl,
        });
        return;
      } catch (e) {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(shareUrl);
    setCopiedId(challenge.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError("");

    // --- DATE VALIDATION CHECK ---
    if (form.startDate && form.endDate) {
      const start = new Date(form.startDate);
      const end = new Date(form.endDate);

      if (end < start) {
        setModalError("End date cannot be before start date.");
        return;
      }
    }

    setSaving(true);

    const rulesArray = form.rules
      ? form.rules.split("\n").map((r) => r.trim()).filter(Boolean)
      : [];

    const finalImageUrl = form.imageUrl.trim() || DEFAULT_CHALLENGE_IMAGE;

    const payload = {
      ...form,
      imageUrl: finalImageUrl,
      tag: form.category,
      points: Number(form.points) || 0,
      carbonKg: form.carbonKg !== "" && form.carbonKg !== null ? Number(form.carbonKg) : null,
      participants: editingId ? form.participants : 0,
      rules: rulesArray,
      overview: form.overview || form.description,
      description: form.description || form.overview,
    };

    try {
      if (editingId) {
        await updateChallenge(editingId, payload);
      } else {
        await createChallenge(payload);
      }
      closeForm();
    } catch (err) {
      setModalError(err?.message || "Failed to save challenge.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (challenge) => {
    const confirmed = window.confirm(`Delete "${challenge.title}"? This cannot be undone.`);
    if (!confirmed) return;
    try {
      await deleteChallenge(challenge.id);
      const idStr = String(challenge.id);
      setDeletedIds((prev) => {
        if (!prev.includes(idStr)) {
          const updated = [...prev, idStr];
          try {
            localStorage.setItem("greentrip_deleted_challenge_ids", JSON.stringify(updated));
          } catch (e) {}
          return updated;
        }
        return prev;
      });
    } catch (err) {
      reportError(err);
    }
  };

  return (
    <div>
      <div style={styles.header}>
        <div>
          <div style={styles.headerTitle}>Manage Challenges</div>
          <div style={styles.headerSubtitle}>
            {challenges.length} challenge{challenges.length !== 1 ? "s" : ""} active
          </div>
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
        <p style={styles.emptyText}>No challenges found — create one to get started.</p>
      ) : (
        <div style={styles.grid}>
          {challenges.map((c) => {
            const diffColor = DIFFICULTY_COLORS[c.difficulty] || DIFFICULTY_COLORS.Easy;
            const displayImage = c.imageUrl || DEFAULT_CHALLENGE_IMAGE;

            return (
              <div key={c.id} style={styles.card}>
                <div style={styles.cardImageContainer}>
                  <img src={displayImage} alt={c.title} style={styles.cardImage} />
                </div>

                <div style={styles.cardContent}>
                  <div style={styles.cardTopRow}>
                    <span style={styles.cardThemeTag}>
                      <Tag size={11} /> {c.theme || c.category || c.tag}
                    </span>
                    <span style={{ ...styles.difficultyPill, background: diffColor.bg, color: diffColor.text }}>
                      {c.difficulty}
                    </span>
                  </div>

                  <div style={styles.cardTitle}>{c.title}</div>

                  {c.organizer && (
                    <div style={styles.cardMetaItem}>
                      <User size={13} color="#6b7280" />
                      <span>Organized by <strong>{c.organizer}</strong></span>
                    </div>
                  )}

                  {c.location && (
                    <div style={styles.cardMetaItem}>
                      <MapPin size={13} color="#6b7280" />
                      <span>{c.location}</span>
                    </div>
                  )}

                  {(c.overview || c.description) && (
                    <div style={styles.cardOverview}>
                      <strong>Overview:</strong> {c.overview || c.description}
                    </div>
                  )}

                  <div style={styles.cardMetaGroup}>
                    {c.duration && (
                      <div style={styles.cardMetaItem}>
                        <Clock size={13} color="#9ca3af" /> {c.duration}
                      </div>
                    )}
                    {(c.startDate || c.endDate) && (
                      <div style={styles.cardDates}>
                        <CalendarDays size={13} color="#9ca3af" />
                        {c.startDate} → {c.endDate}
                      </div>
                    )}
                  </div>

                  {/* Metrics */}
                  <div style={styles.metricsRow}>
                    <div style={styles.metricBadge}>
                      <span style={styles.metricValue}>+{c.points}</span>
                      <span style={styles.metricLabel}>pts</span>
                    </div>
                    {c.carbonKg !== null && c.carbonKg !== undefined && (
                      <div style={styles.metricBadge}>
                        <Leaf size={12} color="#16a34a" />
                        <span style={styles.metricValue}>{c.carbonKg} kg</span>
                        <span style={styles.metricLabel}>CO₂</span>
                      </div>
                    )}
                    <div style={styles.metricBadge}>
                      <Users size={12} color="#7c3aed" />
                      <span style={styles.metricValue}>{c.participants || 0}</span>
                      <span style={styles.metricLabel}>Joined</span>
                    </div>
                  </div>

                  {Array.isArray(c.allowedVerification) && c.allowedVerification.length > 0 && (
                    <div style={styles.verificationPills}>
                      {c.allowedVerification.includes("image") && (
                        <span style={styles.verifBadge}><Camera size={11} /> Photo Proof</span>
                      )}
                      {c.allowedVerification.includes("gps") && (
                        <span style={styles.verifBadge}><Navigation size={11} /> GPS Check-In</span>
                      )}
                    </div>
                  )}

                  <div style={styles.cardActions}>
                    <button type="button" onClick={() => handleShare(c)} style={styles.cardActionBtn}>
                      {copiedId === c.id ? <Check size={14} color="#16a34a" /> : <Share2 size={14} />}
                      {copiedId === c.id ? "Copied!" : "Share"}
                    </button>
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
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT FORM MODAL */}
      {showForm && (
        <div style={styles.modalOverlay} onClick={closeForm}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>{editingId ? "Edit Challenge" : "New Challenge"}</div>
              <button type="button" onClick={closeForm} style={styles.modalCloseBtn}>
                <X size={18} />
              </button>
            </div>

            {/* In-Modal Warning Notification */}
            {modalError && (
              <div style={styles.modalErrorBanner}>
                ⚠️ {modalError}
              </div>
            )}

            <form onSubmit={handleSubmit} style={styles.form}>
              {/* Title & Organizer */}
              <div style={styles.formRow}>
                <label style={styles.label}>
                  Title *
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    style={styles.input}
                    placeholder="e.g., Tree Planting at Mount Kinabalu"
                    required
                  />
                </label>

                <label style={styles.label}>
                  Organizer *
                  <input
                    type="text"
                    value={form.organizer}
                    onChange={(e) => setForm({ ...form, organizer: e.target.value })}
                    style={styles.input}
                    placeholder="e.g., Local Rangers & Sabah Parks"
                    required
                  />
                </label>
              </div>

              {/* Theme & Category */}
              <div style={styles.formRow}>
                <label style={styles.label}>
                  Theme *
                  <select
                    value={form.theme}
                    onChange={(e) => setForm({ ...form, theme: e.target.value })}
                    style={styles.input}
                  >
                    {THEME_OPTIONS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </label>

                <label style={styles.label}>
                  Category / Tag
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value, tag: e.target.value })}
                    style={styles.input}
                  >
                    {CHALLENGE_CATEGORY_OPTIONS.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* Overview */}
              <label style={styles.label}>
                Overview Summary *
                <textarea
                  value={form.overview}
                  onChange={(e) => setForm({ ...form, overview: e.target.value, description: e.target.value })}
                  style={{ ...styles.input, minHeight: 70, resize: "vertical" }}
                  placeholder="e.g., Join local rangers to plant 5 native tree saplings at the base of Mount Kinabalu..."
                  required
                />
              </label>

              {/* Header Image URL & Live Preview */}
              <label style={styles.label}>
                Header Image URL (Optional)
                <input
                  type="url"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  style={styles.input}
                  placeholder="Leave blank to use default eco image"
                />
              </label>

              <div style={styles.imagePreviewContainer}>
                <img
                  src={form.imageUrl.trim() || DEFAULT_CHALLENGE_IMAGE}
                  alt="Preview"
                  style={styles.imagePreview}
                />
                <div style={styles.imagePreviewTag}>
                  {form.imageUrl.trim() ? "Custom Image" : "Default Image"}
                </div>
              </div>

              {/* Location & Difficulty */}
              <div style={styles.formRow}>
                <label style={styles.label}>
                  Location / Zone
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    style={styles.input}
                    placeholder="e.g., Mount Kinabalu, Sabah"
                  />
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

              {/* Duration & Start/End Dates */}
              <div style={styles.formRow}>
                <label style={styles.label}>
                  Duration
                  <input
                    type="text"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    style={styles.input}
                    placeholder="e.g., 1 Day or 3 Hours"
                  />
                </label>

                <label style={styles.label}>
                  Start Date *
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => {
                      setModalError("");
                      setForm({ ...form, startDate: e.target.value });
                    }}
                    style={{
                      ...styles.input,
                      borderColor: modalError ? "#ef4444" : "#e5e7eb",
                    }}
                    required
                  />
                </label>

                <label style={styles.label}>
                  End Date *
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => {
                      setModalError("");
                      setForm({ ...form, endDate: e.target.value });
                    }}
                    style={{
                      ...styles.input,
                      borderColor: modalError ? "#ef4444" : "#e5e7eb",
                    }}
                    required
                  />
                </label>
              </div>

              {/* Points & CO2 Savings */}
              <div style={styles.formRow}>
                <label style={styles.label}>
                  Reward Points (+pts) *
                  <input
                    type="number"
                    min="0"
                    value={form.points}
                    onChange={(e) => setForm({ ...form, points: e.target.value })}
                    style={styles.input}
                    required
                  />
                </label>

                <label style={styles.label}>
                  Est. CO₂ Savings (kg)
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={form.carbonKg}
                    onChange={(e) => setForm({ ...form, carbonKg: e.target.value })}
                    style={styles.input}
                    placeholder="e.g., 45"
                  />
                </label>
              </div>

              {/* Verification Options */}
              <div style={styles.label}>
                Allowed Verification Methods
                <div style={styles.checkboxGroup}>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.allowedVerification.includes("image")}
                      onChange={() => handleVerificationToggle("image")}
                    />
                    <Camera size={15} /> Upload Photo Proof
                  </label>
                  <label style={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.allowedVerification.includes("gps")}
                      onChange={() => handleVerificationToggle("gps")}
                    />
                    <Navigation size={15} /> GPS Check-In
                  </label>
                </div>
              </div>

              {/* Rules & Guidelines */}
              <label style={styles.label}>
                Rules & Guidelines (One per line)
                <textarea
                  value={form.rules}
                  onChange={(e) => setForm({ ...form, rules: e.target.value })}
                  style={{ ...styles.input, minHeight: 80, resize: "vertical" }}
                  placeholder="e.g., Must take a photo planting the sapling.&#10;Bring your own water bottle."
                />
              </label>

              {/* Form Actions */}
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
  modalErrorBanner: {
    background: "#fee2e2",
    border: "1px solid #fca5a5",
    color: "#b91c1c",
    padding: "10px 14px",
    borderRadius: 10,
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
    gap: 16,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  cardImageContainer: {
    height: 130,
    width: "100%",
    overflow: "hidden",
    background: "#f3f4f6",
  },
  cardImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  cardContent: {
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    flex: 1,
  },
  cardTopRow: { display: "flex", alignItems: "center", justifyContent: "space-between" },
  cardThemeTag: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    fontWeight: 700,
    color: "#16a34a",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  difficultyPill: { fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 9px" },
  cardTitle: { fontSize: 15.5, fontWeight: 800, color: "#111827", marginTop: 2 },
  cardOverview: { fontSize: 12.5, color: "#4b5563", lineHeight: 1.4, marginTop: 2 },
  cardMetaGroup: { display: "flex", flexDirection: "column", gap: 3, marginTop: 6 },
  cardMetaItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#4b5563" },
  cardDates: { display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#9ca3af" },
  metricsRow: {
    display: "flex",
    gap: 8,
    marginTop: 8,
    padding: "8px 12px",
    background: "#f9fafb",
    borderRadius: 10,
    border: "1px solid #f3f4f6",
  },
  metricBadge: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12,
  },
  metricValue: { fontWeight: 800, color: "#111827" },
  metricLabel: { fontSize: 11, color: "#6b7280" },
  verificationPills: { display: "flex", gap: 6, marginTop: 6 },
  verifBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 10.5,
    fontWeight: 600,
    color: "#2563eb",
    background: "#eff6ff",
    padding: "3px 8px",
    borderRadius: 6,
  },
  cardActions: { display: "flex", gap: 8, marginTop: 12, paddingTop: 10, borderTop: "1px solid #f3f4f6" },
  cardActionBtn: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
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
    maxWidth: 600,
    maxHeight: "90vh",
    overflowY: "auto",
    padding: 24,
  },
  modalHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: 800, color: "#111827" },
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
    fontSize: 13.5,
    fontWeight: 500,
    color: "#111827",
    outline: "none",
    fontFamily: "inherit",
  },
  imagePreviewContainer: {
    position: "relative",
    width: "100%",
    height: 110,
    borderRadius: 10,
    overflow: "hidden",
    marginTop: -4,
    background: "#f3f4f6",
    border: "1px solid #e5e7eb",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  imagePreviewTag: {
    position: "absolute",
    bottom: 8,
    right: 8,
    background: "rgba(0,0,0,0.65)",
    color: "#fff",
    fontSize: 10.5,
    fontWeight: 700,
    padding: "3px 8px",
    borderRadius: 6,
    backdropFilter: "blur(4px)",
  },
  checkboxGroup: {
    display: "flex",
    gap: 16,
    marginTop: 4,
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: "#4b5563",
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