import React, { useState } from "react";
import { ChevronLeft, LogOut, Leaf, Award, Calendar, Mail, Lock, Pencil, X, Check, Trash2, AlertTriangle } from "lucide-react";
import Layout from "../../../shared/components/Layout";
import { useCurrentUser } from "../../../firebase/useCurrentUser";
import {
  logoutUser,
  updateUserName,
  updateUserEmail,
  updateUserPassword,
  deleteAccount,
  reauthenticate,
  friendlyAuthError,
} from "../../../firebase/authService";

const DELETE_PHRASE = "DELETE";

function formatDate(timestamp) {
  if (!timestamp?.toDate) return "—";
  return timestamp.toDate().toLocaleDateString("en-MY", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Which field is currently being edited: null | "name" | "email" | "password"
export default function Profile({ onNavigate }) {
  const { authUser, profile, loading } = useCurrentUser();
  const [loggingOut, setLoggingOut] = useState(false);

  const [editing, setEditing] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  // Delete-account modal state, kept separate from the edit-field state
  // above since it's a standalone destructive flow, not another field.
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const openEdit = (field) => {
    setFieldError("");
    setCurrentPasswordInput("");
    if (field === "name") setNameInput(profile?.name || "");
    if (field === "email") setEmailInput(profile?.email || "");
    if (field === "password") setPasswordInput("");
    setEditing(field);
  };

  const closeEdit = () => {
    setEditing(null);
    setFieldError("");
  };

  const showSuccess = (message) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(""), 3000);
  };

  const handleSaveName = async () => {
    setFieldError("");
    if (!nameInput.trim()) {
      setFieldError("Name can't be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateUserName(nameInput);
      showSuccess("Name updated.");
      closeEdit();
    } catch (err) {
      setFieldError(friendlyAuthError(err));
    } finally {
      setSaving(false);
    }
  };

  // Email and password both require re-authentication first — Firebase
  // rejects these changes with "auth/requires-recent-login" otherwise.
  const handleSaveEmail = async () => {
    setFieldError("");
    if (!emailInput.trim()) {
      setFieldError("Email can't be empty.");
      return;
    }
    if (!currentPasswordInput) {
      setFieldError("Enter your current password to confirm this change.");
      return;
    }
    setSaving(true);
    try {
      await reauthenticate(currentPasswordInput);
      await updateUserEmail(emailInput);
      showSuccess("Email updated.");
      closeEdit();
    } catch (err) {
      setFieldError(friendlyAuthError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    setFieldError("");
    if (!passwordInput || passwordInput.length < 6) {
      setFieldError("New password must be at least 6 characters.");
      return;
    }
    if (!currentPasswordInput) {
      setFieldError("Enter your current password to confirm this change.");
      return;
    }
    setSaving(true);
    try {
      await reauthenticate(currentPasswordInput);
      await updateUserPassword(passwordInput);
      showSuccess("Password updated.");
      closeEdit();
    } catch (err) {
      setFieldError(friendlyAuthError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logoutUser();
      onNavigate("/login");
    } catch (err) {
      alert("Failed to log out: " + err.message);
      setLoggingOut(false);
    }
  };

  const openDeleteModal = () => {
    setDeleteConfirmText("");
    setDeleteError("");
    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleting) return; // don't let them dismiss mid-request
    setDeleteModalOpen(false);
  };

  // Only requires the typed confirmation phrase — no password re-auth.
  // Note: Firebase itself may still reject deleteUser() with
  // "auth/requires-recent-login" if the session is old, regardless of what
  // this UI asks for; friendlyAuthError() surfaces that case with a clear
  // message rather than failing silently.
  const handleDeleteAccount = async () => {
    setDeleteError("");
    if (deleteConfirmText.trim().toUpperCase() !== DELETE_PHRASE) {
      setDeleteError(`Type "${DELETE_PHRASE}" exactly to confirm.`);
      return;
    }

    setDeleting(true);
    try {
      await deleteAccount();
      onNavigate("/login");
    } catch (err) {
      setDeleteError(friendlyAuthError(err));
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <p style={{ color: "#6b7280" }}>Loading profile...</p>
      </div>
    );
  }

  if (!authUser || !profile) {
    return (
      <div style={styles.loadingPage}>
        <p style={{ color: "#6b7280", marginBottom: 16 }}>You're not logged in.</p>
        <button type="button" onClick={() => onNavigate("/login")} style={styles.loginRedirectBtn}>
          Go to Login
        </button>
      </div>
    );
  }

  const layoutUser = { name: profile.name, ecoScore: profile.eco_score ?? 0 };
  const deleteConfirmValid = deleteConfirmText.trim().toUpperCase() === DELETE_PHRASE;

  return (
    <Layout active="" user={layoutUser} onNavigate={onNavigate}>
      <div style={styles.content}>
        <button type="button" onClick={() => onNavigate("/dashboard")} style={styles.backBtn}>
          <ChevronLeft size={16} />
          Back to Dashboard
        </button>

        <h1 style={styles.title}>Profile</h1>
        <p style={styles.subtitle}>Your account details</p>

        {successToast && (
          <div style={styles.toast}>
            <Check size={16} />
            <span>{successToast}</span>
          </div>
        )}

        <div style={styles.card}>
          <div style={styles.avatarRow}>
            {profile.profile_photo_url ? (
              <img src={profile.profile_photo_url} alt={profile.name} style={styles.avatarImg} />
            ) : (
              <div style={styles.avatarFallback}>{(profile.name || "?").charAt(0).toUpperCase()}</div>
            )}
            <div style={{ flex: 1 }}>
              {editing === "name" ? (
                <div style={styles.editRow}>
                  <input
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    style={styles.editInput}
                    autoFocus
                  />
                  <button type="button" onClick={handleSaveName} disabled={saving} style={styles.saveBtn}>
                    <Check size={16} />
                  </button>
                  <button type="button" onClick={closeEdit} style={styles.cancelIconBtn}>
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div style={styles.editableLine}>
                  <div>
                    <div style={styles.name}>{profile.name || "Unnamed traveler"}</div>
                    <div style={styles.role}>{profile.role === "tourist" ? "Traveler" : profile.role}</div>
                  </div>
                  <button type="button" onClick={() => openEdit("name")} style={styles.editIconBtn} title="Edit name">
                    <Pencil size={14} />
                  </button>
                </div>
              )}
              {editing === "name" && fieldError && <p style={styles.fieldError}>{fieldError}</p>}
            </div>
          </div>

          <div style={styles.infoGrid}>
            {/* Email row */}
            <div style={styles.infoBlock}>
              <div style={styles.infoRow}>
                <Mail size={16} color="#9ca3af" />
                <span style={styles.infoLabel}>Email</span>
                {editing !== "email" && (
                  <>
                    <span style={styles.infoValue}>{profile.email}</span>
                    <button type="button" onClick={() => openEdit("email")} style={styles.editIconBtnInline} title="Edit email">
                      <Pencil size={13} />
                    </button>
                  </>
                )}
              </div>
              {editing === "email" && (
                <div style={styles.editPanel}>
                  <label style={styles.editLabel}>New email</label>
                  <input
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    style={styles.editInputFull}
                  />
                  <label style={styles.editLabel}>Current password (to confirm)</label>
                  <input
                    type="password"
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    style={styles.editInputFull}
                  />
                  {fieldError && <p style={styles.fieldError}>{fieldError}</p>}
                  <div style={styles.editActions}>
                    <button type="button" onClick={handleSaveEmail} disabled={saving} style={styles.saveTextBtn}>
                      {saving ? "Saving..." : "Save Email"}
                    </button>
                    <button type="button" onClick={closeEdit} style={styles.cancelTextBtn}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Password row — same pattern as Email: label + value placeholder + edit icon */}
            <div style={styles.infoBlock}>
              <div style={styles.infoRow}>
                <Lock size={16} color="#9ca3af" />
                <span style={styles.infoLabel}>Password</span>
                {editing !== "password" && (
                  <>
                    <span style={styles.infoValue}>••••••••</span>
                    <button type="button" onClick={() => openEdit("password")} style={styles.editIconBtnInline} title="Change password">
                      <Pencil size={13} />
                    </button>
                  </>
                )}
              </div>
              {editing === "password" && (
                <div style={styles.editPanel}>
                  <label style={styles.editLabel}>New password</label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    style={styles.editInputFull}
                    placeholder="At least 6 characters"
                  />
                  <label style={styles.editLabel}>Current password (to confirm)</label>
                  <input
                    type="password"
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    style={styles.editInputFull}
                  />
                  {fieldError && <p style={styles.fieldError}>{fieldError}</p>}
                  <div style={styles.editActions}>
                    <button type="button" onClick={handleSavePassword} disabled={saving} style={styles.saveTextBtn}>
                      {saving ? "Saving..." : "Save Password"}
                    </button>
                    <button type="button" onClick={closeEdit} style={styles.cancelTextBtn}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div style={styles.infoRow}>
              <Leaf size={16} color="#16a34a" />
              <span style={styles.infoLabel}>Eco Score</span>
              <span style={styles.infoValue}>{(profile.eco_score ?? 0).toLocaleString()}</span>
            </div>
            <div style={styles.infoRow}>
              <Award size={16} color="#f97316" />
              <span style={styles.infoLabel}>Level</span>
              <span style={styles.infoValue}>{profile.level ?? 1}</span>
            </div>
            <div style={styles.infoRow}>
              <Calendar size={16} color="#7c3aed" />
              <span style={styles.infoLabel}>Member since</span>
              <span style={styles.infoValue}>{formatDate(profile.created_at)}</span>
            </div>
          </div>

          {/* Neutral, not red — logging out isn't destructive */}
          <button type="button" onClick={handleLogout} disabled={loggingOut} style={styles.logoutBtn}>
            <LogOut size={16} />
            {loggingOut ? "Logging out..." : "Log Out"}
          </button>

          {/* Danger Zone — just opens the confirmation modal, no inline password field */}
          <div style={styles.dangerZone}>
            <p style={styles.dangerTitle}>Danger Zone</p>
            <p style={styles.dangerSubtitle}>Deleting your account is permanent and can't be undone.</p>
            <button type="button" onClick={openDeleteModal} style={styles.deleteBtn}>
              <Trash2 size={16} />
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete account confirmation modal */}
      {deleteModalOpen && (
        <div style={styles.modalOverlay} onClick={closeDeleteModal}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalIconWrap}>
              <AlertTriangle size={22} color="#b91c1c" />
            </div>
            <h2 style={styles.modalTitle}>Delete your account?</h2>
            <p style={styles.modalBody}>
              This permanently deletes your profile, eco-score, and all saved trips. This action can't be undone.
            </p>

            <label style={styles.editLabel}>
              Type <strong>{DELETE_PHRASE}</strong> to confirm
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder={DELETE_PHRASE}
              style={styles.editInputFull}
              autoFocus
            />

            {deleteError && <p style={styles.fieldError}>{deleteError}</p>}

            <div style={styles.modalActions}>
              <button type="button" onClick={closeDeleteModal} disabled={deleting} style={styles.cancelTextBtn}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || !deleteConfirmValid}
                style={{
                  ...styles.modalDeleteBtn,
                  ...(deleting || !deleteConfirmValid ? styles.modalDeleteBtnDisabled : {}),
                }}
              >
                <Trash2 size={16} />
                {deleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

const styles = {
  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    background: "#f9fafb",
  },
  loginRedirectBtn: {
    background: "#16a34a",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "10px 20px",
    fontWeight: 600,
    cursor: "pointer",
  },
  content: { padding: "28px 32px", maxWidth: 640, width: "100%", margin: "0 auto", textAlign: "left" },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "transparent",
    border: "none",
    color: "#374151",
    fontSize: 14.5,
    fontWeight: 500,
    cursor: "pointer",
    padding: 0,
    marginBottom: 20,
  },
  title: { fontSize: 28, fontWeight: 800, color: "#111827", margin: 0 },
  subtitle: { color: "#6b7280", marginTop: 6, marginBottom: 24, fontSize: 14.5 },
  toast: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#dcfce7",
    color: "#15803d",
    border: "1px solid #86efac",
    borderRadius: 12,
    padding: "12px 16px",
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 20,
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 28,
  },
  avatarRow: { display: "flex", alignItems: "center", gap: 16, marginBottom: 28 },
  avatarImg: { width: 64, height: 64, borderRadius: "50%", objectFit: "cover" },
  avatarFallback: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 24,
    fontWeight: 700,
    flexShrink: 0,
  },
  editableLine: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 },
  name: { fontSize: 20, fontWeight: 700, color: "#111827" },
  role: { fontSize: 13.5, color: "#9ca3af", marginTop: 2 },
  editIconBtn: {
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#6b7280",
    borderRadius: 8,
    width: 30,
    height: 30,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
  },
  editIconBtnInline: {
    border: "none",
    background: "transparent",
    color: "#9ca3af",
    cursor: "pointer",
    display: "flex",
    padding: 0,
    marginLeft: 4,
  },
  editRow: { display: "flex", alignItems: "center", gap: 8 },
  editInput: {
    flex: 1,
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "8px 10px",
    fontSize: 16,
    fontWeight: 700,
    outline: "none",
  },
  saveBtn: {
    border: "none",
    background: "#dcfce7",
    color: "#16a34a",
    borderRadius: 8,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  cancelIconBtn: {
    border: "none",
    background: "#fee2e2",
    color: "#b91c1c",
    borderRadius: 8,
    width: 32,
    height: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  infoGrid: { display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 },
  infoBlock: { display: "flex", flexDirection: "column", gap: 8 },
  infoRow: { display: "flex", alignItems: "center", gap: 10, fontSize: 14.5 },
  infoLabel: { color: "#6b7280", minWidth: 100 },
  infoValue: { color: "#111827", fontWeight: 600 },
  editPanel: {
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  editLabel: { fontSize: 12.5, fontWeight: 600, color: "#374151", marginTop: 6 },
  editInputFull: {
    width: "100%",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 14,
    outline: "none",
    boxSizing: "border-box",
  },
  editActions: { display: "flex", gap: 8, marginTop: 10 },
  saveTextBtn: {
    border: "none",
    background: "#16a34a",
    color: "#fff",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
  },
  cancelTextBtn: {
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#6b7280",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  fieldError: { fontSize: 12.5, color: "#b91c1c", margin: "4px 0 0" },
  // Neutral gray — logging out is a routine action, not destructive, so it
  // shouldn't compete visually with the red Danger Zone below it.
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    background: "#f3f4f6",
    color: "#374151",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "12px 0",
    fontSize: 14.5,
    fontWeight: 700,
    cursor: "pointer",
  },
  dangerZone: {
    marginTop: 20,
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 12,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  dangerTitle: { fontSize: 13, fontWeight: 700, color: "#b91c1c", margin: 0 },
  dangerSubtitle: { fontSize: 12.5, color: "#7f1d1d", margin: "2px 0 6px" },
  deleteBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    background: "#b91c1c",
    color: "#fff",
    border: "none",
    borderRadius: 10,
    padding: "11px 0",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 6,
  },
  // Modal
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(17, 24, 39, 0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 1000,
  },
  modalCard: {
    background: "#fff",
    borderRadius: 16,
    padding: 28,
    width: "100%",
    maxWidth: 420,
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "#fee2e2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: 800, color: "#111827", margin: "0 0 6px" },
  modalBody: { fontSize: 13.5, color: "#6b7280", margin: "0 0 18px", lineHeight: 1.5 },
  modalActions: { display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" },
  modalDeleteBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    border: "none",
    background: "#b91c1c",
    color: "#fff",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
  },
  modalDeleteBtnDisabled: {
    background: "#fca5a5",
    cursor: "not-allowed",
  },
};