import { useEffect, useState } from "react";



import {
  Plus,
  Edit3,
  Trash2,
  Save,
  Send,
  Image as ImageIcon,
  X,
  Award,
  Recycle,
  Sprout,
  Bus,
  Droplet,
  Zap,
  Leaf,
  TreePine,
  Eye,
  FileText,
} from "lucide-react";

import { useCurrentUser } from "../../firebase/useCurrentUser";

import {
  listenToAchievements,
  createAchievement,
  updateAchievement,
  deleteAchievement,
  publishAchievement,
  uploadAchievementImage,
  CATEGORY_OPTIONS,
  RULE_OPTIONS,
  DEFAULT_ICON_OPTIONS,
  getRandomDefaultIcon,
} from "../../firebase/achievementService";

// ============================================================
// ICON MAP
// ============================================================

const ICON_MAP = {
  Recycle,
  Sprout,
  Bus,
  Droplet,
  Zap,
  Leaf,
  Award,
  TreePine,
};

// ============================================================
// DEFAULT FORM
// ============================================================

const EMPTY_FORM = {
  title: "",
  description: "",
  category: "Eco Travel",
  ruleType: "trips_completed",
  ruleTarget: 1,
  ruleUnit: "trips",
  icon: "",
  iconUrl: "",
};

// ============================================================
// CATEGORY-SPECIFIC UNLOCK RULES
// ============================================================

const CATEGORY_RULE_MAP = {
  "Eco Travel": ["trips_completed", "eco_score"],
  Transportation: ["eco_score", "carbon_saved"],
  "Carbon Saving": ["carbon_saved"],
  Community: ["challenges_completed"],
  Challenges: ["challenges_completed"],
  Milestones: [
    "trips_completed",
    "itineraries_completed",
    "eco_score",
    "itinerary_saved",
  ],
  Special: [
    "user_registered",
    "trips_completed",
    "eco_score",
    "challenges_completed",
    "carbon_saved",
    "waste_reduced",
  ],
};

const getRulesForCategory = (category) => {
  const allowedRuleValues =
    CATEGORY_RULE_MAP[category] ||
    CATEGORY_RULE_MAP.Special;

  return RULE_OPTIONS.filter((rule) =>
    allowedRuleValues.includes(rule.value)
  );
};

const getDefaultRuleForCategory = (category) => {
  const rules = getRulesForCategory(category);
  return rules[0] || RULE_OPTIONS[0];
};

// ============================================================
// COMPONENT
// ============================================================

export default function AdminAchievementsPage() {
  const { authUser } = useCurrentUser();

  const [achievements, setAchievements] = useState([]);

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(EMPTY_FORM);

  const [selectedFile, setSelectedFile] =
    useState(null);

  const [previewUrl, setPreviewUrl] =
    useState("");

  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

  // ============================================================
  // LISTEN
  // ============================================================

  useEffect(() => {
    /*
     * IMPORTANT:
     * This is a GLOBAL admin achievement catalogue.
     *
     * Every admin sees every achievement created by
     * every admin. There is intentionally NO createdBy
     * filter here.
     *
     * The createdBy field is only audit metadata.
     */
    const unsubscribe =
      listenToAchievements((list) => {
        setAchievements(list);
      });

    return () => {
      unsubscribe?.();
    };
  }, []);

  // ============================================================
  // FORM CHANGE
  // ============================================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    if (name === "category") {
      const defaultRule =
        getDefaultRuleForCategory(value);

      setForm((previous) => ({
        ...previous,
        category: value,
        ruleType: defaultRule?.value || "trips_completed",
        ruleUnit: defaultRule?.unit || "trips",
      }));

      return;
    }

    if (name === "ruleType") {
      const selectedRule =
        getRulesForCategory(form.category).find(
          (rule) => rule.value === value
        );

      if (!selectedRule) return;

      setForm((previous) => ({
        ...previous,
        ruleType: value,
        ruleUnit: selectedRule.unit || "",
      }));

      return;
    }

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  // ============================================================
  // IMAGE SELECT
  // ============================================================

  const handleImageChange = (event) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage(
        "Please select an image file."
      );
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setMessage(
        "Image must be smaller than 5 MB."
      );
      return;
    }

    setSelectedFile(file);

    const localPreview =
      URL.createObjectURL(file);

    setPreviewUrl(localPreview);

    setMessage("");
  };

  // ============================================================
  // OPEN CREATE FORM
  // ============================================================

  const handleCreate = () => {
    const randomIcon =
      getRandomDefaultIcon();

    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      icon: randomIcon,
    });

    setSelectedFile(null);
    setPreviewUrl("");
    setMessage("");

    setShowForm(true);
  };

  // ============================================================
  // OPEN EDIT FORM
  // ============================================================

  const handleEdit = (achievement) => {
    setEditingId(achievement.id);

    const category =
      achievement.category ||
      "Eco Travel";

    const categoryRules =
      getRulesForCategory(category);

    const existingRule =
      categoryRules.find(
        (rule) => rule.value === achievement.ruleType
      ) || getDefaultRuleForCategory(category);

    setForm({
      title: achievement.title || "",
      description: achievement.description || "",
      category,
      ruleType: existingRule?.value || "trips_completed",
      ruleTarget: achievement.ruleTarget ?? 1,
      ruleUnit:
        existingRule?.unit ||
        achievement.ruleUnit ||
        "trips",
      icon: achievement.icon || getRandomDefaultIcon(),
      iconUrl: achievement.iconUrl || "",
    });

    setSelectedFile(null);

    setPreviewUrl(
      achievement.iconUrl || ""
    );

    setMessage("");

    setShowForm(true);
  };

  // ============================================================
  // CLOSE FORM
  // ============================================================

  const handleClose = () => {
    if (saving) {
      return;
    }

    setShowForm(false);
    setEditingId(null);
    setSelectedFile(null);
    setPreviewUrl("");
    setMessage("");
  };

  // ============================================================
  // SAVE
  // ============================================================

  const handleSave = async (status) => {
    if (!form.title.trim()) {
      setMessage(
        "Please enter an achievement title."
      );
      return;
    }

    if (!form.description.trim()) {
      setMessage(
        "Please enter an achievement description."
      );
      return;
    }

    if (
      !form.ruleTarget ||
      Number(form.ruleTarget) < 1
    ) {
      setMessage(
        "Rule target must be at least 1."
      );
      return;
    }

    const selectedRule =
      getRulesForCategory(form.category).find(
        (rule) => rule.value === form.ruleType
      );

    if (!selectedRule) {
      setMessage(
        "Please select a valid unlock rule for this category."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      let finalIconUrl =
        form.iconUrl || "";

      // Upload new image if selected
      if (selectedFile) {
        finalIconUrl =
          await uploadAchievementImage(
            selectedFile
          );
      }

      const data = {
        title: form.title,
        description: form.description,
        category: form.category,
        ruleType: form.ruleType,
        ruleTarget:
          Number(form.ruleTarget) || 1,
        ruleUnit: form.ruleUnit,
        icon:
          form.icon ||
          getRandomDefaultIcon(),
        iconUrl: finalIconUrl,
        status,
      };

      if (editingId) {
        await updateAchievement(
          editingId,
          data
        );
      } else {
        await createAchievement({
          ...data,
          /*
           * createdBy is audit metadata only.
           * It does NOT restrict visibility to this admin.
           */
          createdBy:
            authUser?.uid || null,
        });
      }

      setMessage(
        status === "published"
          ? "Achievement published successfully."
          : "Achievement saved as draft."
      );

      setShowForm(false);
      setEditingId(null);
      setSelectedFile(null);
      setPreviewUrl("");
    } catch (error) {
      console.error(
        "Failed to save achievement:",
        error
      );

      setMessage(
        error?.message ||
          "Failed to save achievement."
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // PUBLISH
  // ============================================================

  const handlePublish = async (
    achievement
  ) => {
    const confirmed = window.confirm(
      `Publish "${achievement.title}"?\n\nOnce published, users will be able to see this achievement.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await publishAchievement(
        achievement.id
      );

      setMessage(
        "Achievement published successfully."
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Failed to publish achievement."
      );
    }
  };

  // ============================================================
  // DELETE
  // ============================================================

  const handleDelete = async (
    achievement
  ) => {
    const confirmed = window.confirm(
      `Delete "${achievement.title}"?\n\nThis action cannot be undone.`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteAchievement(
        achievement.id,
        achievement.iconUrl || ""
      );

      setMessage(
        "Achievement deleted."
      );
    } catch (error) {
      console.error(error);

      setMessage(
        "Failed to delete achievement."
      );
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div style={styles.page}>
      {/* HEADER */}

      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            Achievements
          </h1>

          <p style={styles.subtitle}>
            Create, manage and publish
            achievements for users.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          style={styles.addButton}
        >
          <Plus size={17} />
          Create Achievement
        </button>
      </div>

      {/* MESSAGE */}

      {message && (
        <div style={styles.message}>
          {message}
        </div>
      )}

      {/* ACHIEVEMENT LIST */}

      <div style={styles.list}>
        {achievements.length === 0 ? (
          <div style={styles.empty}>
            <Award
              size={40}
              color="#9ca3af"
            />

            <div style={styles.emptyTitle}>
              No achievements yet
            </div>

            <div style={styles.emptyText}>
              Create your first achievement.
            </div>
          </div>
        ) : (
          achievements.map(
            (achievement) => {
              const Icon =
                ICON_MAP[
                  achievement.icon
                ] || Award;

              const isDraft =
                achievement.status !==
                "published";

              return (
                <div
                  key={achievement.id}
                  style={styles.achievementCard}
                >
                  {/* ICON */}

                  <div style={styles.imageWrap}>
                    {achievement.iconUrl ? (
                      <img
                        src={
                          achievement.iconUrl
                        }
                        alt={
                          achievement.title
                        }
                        style={styles.image}
                      />
                    ) : (
                      <Icon
                        size={30}
                        color="#16a34a"
                      />
                    )}
                  </div>

                  {/* CONTENT */}

                  <div
                    style={
                      styles.achievementContent
                    }
                  >
                    <div
                      style={
                        styles.achievementTop
                      }
                    >
                      <div>
                        <div
                          style={
                            styles.achievementTitle
                          }
                        >
                          {achievement.title}
                        </div>

                        <div
                          style={
                            styles.achievementCategory
                          }
                        >
                          {achievement.category}
                        </div>
                      </div>

                      <div
                        style={{
                          ...styles.status,
                          ...(isDraft
                            ? styles.draftStatus
                            : styles.publishedStatus),
                        }}
                      >
                        {isDraft ? (
                          <>
                            <FileText
                              size={12}
                            />
                            Draft
                          </>
                        ) : (
                          <>
                            <Eye
                              size={12}
                            />
                            Published
                          </>
                        )}
                      </div>
                    </div>

                    <p
                      style={
                        styles.description
                      }
                    >
                      {
                        achievement.description
                      }
                    </p>

                    {/* RULE */}

                    <div
                      style={
                        styles.ruleBox
                      }
                    >
                      <strong>
                        Requirement:
                      </strong>{" "}
                      {getRuleText(
                        achievement
                      )}
                    </div>

                  </div>

                  {/* ACTIONS */}

                  <div
                    style={
                      styles.actions
                    }
                  >
                    <button
                      type="button"
                      onClick={() =>
                        handleEdit(
                          achievement
                        )
                      }
                      style={
                        styles.editButton
                      }
                    >
                      <Edit3
                        size={15}
                      />
                      Edit
                    </button>

                    {isDraft && (
                      <button
                        type="button"
                        onClick={() =>
                          handlePublish(
                            achievement
                          )
                        }
                        style={
                          styles.publishButton
                        }
                      >
                        <Send
                          size={15}
                        />
                        Publish
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(
                          achievement
                        )
                      }
                      style={
                        styles.deleteButton
                      }
                    >
                      <Trash2
                        size={15}
                      />
                    </button>
                  </div>
                </div>
              );
            }
          )
        )}
      </div>

      {/* CREATE / EDIT MODAL */}

      {showForm && (
        <div
          style={styles.overlay}
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              handleClose();
            }
          }}
        >
          <div style={styles.modal}>
            {/* MODAL HEADER */}

            <div
              style={
                styles.modalHeader
              }
            >
              <div>
                <div
                  style={
                    styles.modalTitle
                  }
                >
                  {editingId
                    ? "Edit Achievement"
                    : "Create Achievement"}
                </div>

                <div
                  style={
                    styles.modalSubtitle
                  }
                >
                  Configure the achievement
                  and its unlock rule.
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                style={
                  styles.closeButton
                }
              >
                <X size={19} />
              </button>
            </div>

            {/* FORM */}

            <div style={styles.form}>
              {/* TITLE */}

              <label style={styles.label}>
                Achievement Name

                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="e.g. First Eco Trip"
                  style={styles.input}
                />
              </label>

              {/* DESCRIPTION */}

              <label style={styles.label}>
                Description

                <textarea
                  name="description"
                  value={
                    form.description
                  }
                  onChange={handleChange}
                  placeholder="e.g. Complete your first sustainable trip."
                  rows={3}
                  style={
                    styles.textarea
                  }
                />
              </label>

              {/* CATEGORY */}

              <label style={styles.label}>
                Category

                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  style={styles.input}
                >
                  {CATEGORY_OPTIONS.map(
                    (category) => (
                      <option
                        key={category}
                        value={category}
                      >
                        {category}
                      </option>
                    )
                  )}
                </select>

                <span style={styles.fieldHint}>
                  Unlock rules are filtered based on the selected category.
                </span>
              </label>

              {/* RULE */}

              <div style={styles.ruleSection}>
                <div
                  style={
                    styles.ruleTitle
                  }
                >
                  Unlock Rule
                </div>

                <div style={styles.ruleHint}>
                  Available rules for <strong>{form.category}</strong>.
                </div>

                <div
                  style={
                    styles.ruleGrid
                  }
                >
                  <label
                    style={styles.label}
                  >
                    Rule

                    <select
                      name="ruleType"
                      value={
                        form.ruleType
                      }
                      onChange={
                        handleChange
                      }
                      style={
                        styles.input
                      }
                    >
                      {getRulesForCategory(
                        form.category
                      ).map(
                        (rule) => (
                          <option
                            key={rule.value}
                            value={rule.value}
                          >
                            {rule.label}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label
                    style={styles.label}
                  >
                    Target

                    <input
                      type="number"
                      name="ruleTarget"
                      min="1"
                      value={
                        form.ruleTarget
                      }
                      onChange={
                        handleChange
                      }
                      style={
                        styles.input
                      }
                    />
                  </label>

                  <label
                    style={styles.label}
                  >
                    Unit

                    <input
                      name="ruleUnit"
                      value={
                        form.ruleUnit
                      }
                      readOnly
                      style={{
                        ...styles.input,
                        background: "#f3f4f6",
                        color: "#6b7280",
                        cursor: "not-allowed",
                      }}
                    />
                  </label>
                </div>

                <div
                  style={
                    styles.ruleExample
                  }
                >
                  Example:{" "}
                  <strong>
                    {getRuleText({
                      ruleType:
                        form.ruleType,
                      ruleTarget:
                        form.ruleTarget,
                      ruleUnit:
                        form.ruleUnit,
                    })}
                  </strong>
                </div>
              </div>

              {/* ICON */}

              <div style={styles.iconSection}>
                <div
                  style={
                    styles.iconSectionTitle
                  }
                >
                  Achievement Icon
                </div>

                <div
                  style={
                    styles.iconUploadRow
                  }
                >
                  {/* PREVIEW */}

                  <div
                    style={
                      styles.largePreview
                    }
                  >
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        alt="Preview"
                        style={
                          styles.previewImage
                        }
                      />
                    ) : (
                      (() => {
                        const Icon =
                          ICON_MAP[
                            form.icon
                          ] || Award;

                        return (
                          <Icon
                            size={34}
                            color="#16a34a"
                          />
                        );
                      })()
                    )}
                  </div>

                  {/* UPLOAD */}

                  <div
                    style={
                      styles.uploadControls
                    }
                  >
                    <label
                      htmlFor="achievement-image"
                      style={
                        styles.uploadButton
                      }
                    >
                      <ImageIcon
                        size={16}
                      />
                      Upload Image
                    </label>

                    <input
                      id="achievement-image"
                      type="file"
                      accept="image/*"
                      onChange={
                        handleImageChange
                      }
                      style={
                        styles.hiddenInput
                      }
                    />

                    <div
                      style={
                        styles.uploadHint
                      }
                    >
                      JPG, PNG, WEBP
                      <br />
                      Maximum 5 MB
                    </div>

                    {selectedFile && (
                      <div
                        style={
                          styles.fileName
                        }
                      >
                        {selectedFile.name}
                      </div>
                    )}
                  </div>
                </div>

                {/* DEFAULT ICON */}

                <div
                  style={
                    styles.defaultIconTitle
                  }
                >
                  Or use a default icon
                </div>

                <div
                  style={
                    styles.iconGrid
                  }
                >
                  {DEFAULT_ICON_OPTIONS.map(
                    (iconName) => {
                      const Icon =
                        ICON_MAP[
                          iconName
                        ];

                      const selected =
                        !selectedFile &&
                        form.icon ===
                          iconName &&
                        !form.iconUrl;

                      return (
                        <button
                          type="button"
                          key={iconName}
                          onClick={() => {
                            setSelectedFile(
                              null
                            );

                            setPreviewUrl(
                              ""
                            );

                            setForm(
                              (
                                previous
                              ) => ({
                                ...previous,
                                icon: iconName,
                                iconUrl:
                                  "",
                              })
                            );
                          }}
                          style={{
                            ...styles.iconButton,
                            ...(selected
                              ? styles.selectedIconButton
                              : {}),
                          }}
                        >
                          <Icon
                            size={20}
                          />
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            </div>

            {/* FOOTER */}

            <div
              style={
                styles.modalFooter
              }
            >
              <button
                type="button"
                onClick={handleClose}
                disabled={saving}
                style={
                  styles.cancelButton
                }
              >
                Cancel
              </button>

              <div
                style={
                  styles.footerRight
                }
              >
                <button
                  type="button"
                  onClick={() =>
                    handleSave(
                      "draft"
                    )
                  }
                  disabled={saving}
                  style={
                    styles.draftButton
                  }
                >
                  <Save size={15} />

                  {saving
                    ? "Saving..."
                    : "Save Draft"}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleSave(
                      "published"
                    )
                  }
                  disabled={saving}
                  style={
                    styles.publishMainButton
                  }
                >
                  <Send size={15} />

                  {saving
                    ? "Publishing..."
                    : "Publish"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// RULE TEXT
// ============================================================

function getRuleText(achievement) {
  const target =
    Number(
      achievement.ruleTarget
    ) || 1;

  const unit =
    achievement.ruleUnit || "";

  switch (
    achievement.ruleType
  ) {
    case "user_registered":
      return "Register a GreenTrip account";

    case "itinerary_saved":
      return "Save your first itinerary";

    case "trips_completed":
      if (target === 1) {
        return "Complete your first trip";
      }

      return `Complete ${target} ${unit}`;

    case "eco_score":
      return `Reach ${target} ${unit}`;

    case "challenges_completed":
      return `Complete ${target} ${unit}`;

    default:
      return `Reach ${target} ${unit}`;
  }
}

// ============================================================
// STYLES
// ============================================================

const styles = {
  page: {
    width: "100%",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },

  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    color: "#111827",
  },

  subtitle: {
    margin: "5px 0 0",
    color: "#6b7280",
    fontSize: 13.5,
  },

  addButton: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    border: "none",
    borderRadius: 10,
    padding: "10px 15px",
    background: "#16a34a",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
  },

  message: {
    marginBottom: 16,
    padding: "11px 14px",
    borderRadius: 10,
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#166534",
    fontSize: 13,
    fontWeight: 600,
  },

  list: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  empty: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 15,
    padding: 50,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },

  emptyTitle: {
    marginTop: 12,
    fontWeight: 800,
    color: "#374151",
  },

  emptyText: {
    marginTop: 5,
    fontSize: 13,
    color: "#9ca3af",
  },

  achievementCard: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 15,
    padding: 16,
  },

  imageWrap: {
    width: 58,
    height: 58,
    flexShrink: 0,
    borderRadius: 14,
    background: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },

  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  achievementContent: {
    flex: 1,
    minWidth: 0,
  },

  achievementTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    justifyContent: "space-between",
  },

  achievementTitle: {
    fontSize: 15,
    fontWeight: 800,
    color: "#111827",
  },

  achievementCategory: {
    marginTop: 3,
    color: "#16a34a",
    fontSize: 10.5,
    fontWeight: 800,
    textTransform: "uppercase",
  },

  status: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: "5px 9px",
    borderRadius: 999,
    fontSize: 10.5,
    fontWeight: 800,
    flexShrink: 0,
  },

  draftStatus: {
    background: "#fef3c7",
    color: "#92400e",
  },

  publishedStatus: {
    background: "#dcfce7",
    color: "#15803d",
  },

  description: {
    margin: "7px 0",
    color: "#6b7280",
    fontSize: 12.5,
  },

  ruleBox: {
    display: "inline-block",
    padding: "5px 8px",
    borderRadius: 7,
    background: "#f9fafb",
    border: "1px solid #f3f4f6",
    color: "#6b7280",
    fontSize: 11.5,
  },

  actions: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    flexShrink: 0,
  },

  editButton: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#374151",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 11.5,
    fontWeight: 700,
    cursor: "pointer",
  },

  publishButton: {
    display: "flex",
    alignItems: "center",
    gap: 5,
    border: "none",
    background: "#16a34a",
    color: "#fff",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 11.5,
    fontWeight: 700,
    cursor: "pointer",
  },

  deleteButton: {
    width: 34,
    height: 34,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid #fecaca",
    background: "#fff",
    color: "#dc2626",
    borderRadius: 8,
    cursor: "pointer",
  },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(15, 23, 42, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 1000,
  },

  modal: {
    width: "100%",
    maxWidth: 720,
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#fff",
    borderRadius: 18,
    boxShadow:
      "0 25px 60px rgba(0,0,0,0.2)",
  },

  modalHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "20px 22px",
    borderBottom: "1px solid #f3f4f6",
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: 800,
    color: "#111827",
  },

  modalSubtitle: {
    marginTop: 4,
    fontSize: 12.5,
    color: "#9ca3af",
  },

  closeButton: {
    width: 34,
    height: 34,
    border: "none",
    borderRadius: 8,
    background: "#f3f4f6",
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  form: {
    padding: 22,
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },

  label: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    color: "#374151",
    fontSize: 12,
    fontWeight: 700,
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: 9,
    padding: "10px 11px",
    outline: "none",
    color: "#111827",
    background: "#fff",
    fontSize: 13,
  },

  textarea: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: 9,
    padding: "10px 11px",
    outline: "none",
    color: "#111827",
    resize: "vertical",
    fontSize: 13,
    fontFamily: "inherit",
  },

  fieldHint: {
    color: "#9ca3af",
    fontSize: 10.5,
    fontWeight: 500,
    lineHeight: 1.4,
  },

  ruleSection: {
    padding: 14,
    borderRadius: 12,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
  },

  ruleTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: "#111827",
    marginBottom: 4,
  },

  ruleHint: {
    color: "#9ca3af",
    fontSize: 10.5,
    marginBottom: 10,
  },

  ruleGrid: {
    display: "grid",
    gridTemplateColumns:
      "1.5fr 0.7fr 1fr",
    gap: 10,
  },

  ruleExample: {
    marginTop: 10,
    padding: "8px 10px",
    borderRadius: 8,
    background: "#f0fdf4",
    color: "#166534",
    fontSize: 11.5,
  },

  iconSection: {
    borderTop: "1px solid #f3f4f6",
    paddingTop: 16,
  },

  iconSectionTitle: {
    fontSize: 13,
    fontWeight: 800,
    color: "#111827",
    marginBottom: 10,
  },

  iconUploadRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },

  largePreview: {
    width: 72,
    height: 72,
    borderRadius: 16,
    background: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },

  previewImage: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },

  uploadControls: {
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },

  uploadButton: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "fit-content",
    padding: "9px 12px",
    borderRadius: 8,
    background: "#111827",
    color: "#fff",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },

  hiddenInput: {
    display: "none",
  },

  uploadHint: {
    color: "#9ca3af",
    fontSize: 10.5,
    lineHeight: 1.4,
  },

  fileName: {
    color: "#16a34a",
    fontSize: 10.5,
    maxWidth: 350,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },

  defaultIconTitle: {
    marginTop: 15,
    marginBottom: 8,
    color: "#6b7280",
    fontSize: 11.5,
    fontWeight: 700,
  },

  iconGrid: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 9,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  selectedIconButton: {
    background: "#dcfce7",
    border:
      "2px solid #22c55e",
    color: "#15803d",
  },

  modalFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 22px",
    borderTop: "1px solid #f3f4f6",
  },

  cancelButton: {
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#6b7280",
    borderRadius: 9,
    padding: "9px 13px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },

  footerRight: {
    display: "flex",
    gap: 8,
  },

  draftButton: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    borderRadius: 9,
    padding: "9px 13px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },

  publishMainButton: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    border: "none",
    background: "#16a34a",
    color: "#fff",
    borderRadius: 9,
    padding: "9px 14px",
    fontSize: 12,
    fontWeight: 700,
    cursor: "pointer",
  },
};