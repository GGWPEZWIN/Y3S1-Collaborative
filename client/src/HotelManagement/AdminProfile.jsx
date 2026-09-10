import React, { useState } from "react";
import {
  LogOut,
  ShieldCheck,
  Shield,
  Calendar,
  Mail,
  Lock,
  Pencil,
  X,
  Check,
  AlertTriangle,
  KeyRound
} from "lucide-react";
import { useCurrentUser } from "../firebase/useCurrentUser";
import {
  logoutUser,
  updateUserName,
  updateUserPassword,
  reauthenticate,
  friendlyAuthError,
} from "../firebase/authService";

function formatDate(timestamp) {
  if (!timestamp?.toDate) {
    return new Date().toLocaleDateString("en-MY", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  return timestamp.toDate().toLocaleDateString("en-MY", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function AdminProfile({ onNavigate }) {
  const { authUser, profile, loading } = useCurrentUser();

  const [loggingOut, setLoggingOut] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  // Form states
  const [nameInput, setNameInput] = useState("");
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  const openEditProfile = () => {
    setNameInput(profile?.name || profile?.username || authUser?.displayName || "GreenTrip Admin");
    setCurrentPasswordInput("");
    setPasswordInput("");
    setFieldError("");
    setEditingProfile(true);
  };

  const closeEditProfile = () => {
    if (saving) return;
    setEditingProfile(false);
    setFieldError("");
    setCurrentPasswordInput("");
    setPasswordInput("");
  };

  const showSuccess = (message) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast("");
    }, 3000);
  };

  const handleSaveProfile = async () => {
    setFieldError("");

    const newName = nameInput.trim();
    const passwordChanged = passwordInput.length > 0;

    if (!newName) {
      setFieldError("Admin display name cannot be empty.");
      return;
    }

    if (passwordChanged && !currentPasswordInput) {
      setFieldError("Enter your current password to authorize a new password.");
      return;
    }

    setSaving(true);

    try {
      // 1. Update Display Name if changed
      if (newName !== (profile?.name || authUser?.displayName || "")) {
        await updateUserName(newName);
      }

      // 2. Update Password if provided
      if (passwordChanged) {
        await reauthenticate(currentPasswordInput);
        await updateUserPassword(passwordInput);
      }

      showSuccess("Admin profile updated successfully.");
      setEditingProfile(false);
      setCurrentPasswordInput("");
      setPasswordInput("");
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
      if (onNavigate) {
        onNavigate("/login");
      }
    } catch (err) {
      alert("Failed to log out: " + err.message);
      setLoggingOut(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingPage}>
        <p style={styles.loadingText}>Loading Admin Profile...</p>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div style={styles.loadingPage}>
        <p style={styles.notLoggedText}>You are not logged in as Admin.</p>
        <button
          type="button"
          onClick={() => onNavigate?.("/login")}
          style={styles.loginRedirectBtn}
        >
          Go to Login
        </button>
      </div>
    );
  }

  const adminName = profile?.name || profile?.username || authUser?.displayName || "System Admin";
  const avatarLetter = (adminName || "A").charAt(0).toUpperCase();
  const workEmail = profile?.email || authUser?.email || "—";

  return (
    <div style={styles.container}>
      <div style={styles.pageContent}>
        {/* ==================================================
            PAGE HEADER (NO REDUNDANT BACK BUTTON)
        ================================================== */}
        <div style={styles.pageHeader}>
          <h1 style={styles.title}>Admin Profile</h1>
          <p style={styles.subtitle}>Manage your system credentials and administrative settings</p>
        </div>

        {/* ==================================================
            SUCCESS TOAST
        ================================================== */}
        {successToast && (
          <div style={styles.successToast}>
            <Check size={18} />
            <span>{successToast}</span>
          </div>
        )}

        {/* ==================================================
            PROFILE CARD
        ================================================== */}
        <div style={styles.card}>
          {/* PROFILE HEADER */}
          <div style={styles.profileHeader}>
            <div style={styles.profileAvatarFallback}>
              {avatarLetter}
            </div>

            <div style={styles.profileIdentity}>
              <h2 style={styles.profileName}>{adminName}</h2>
              <div style={styles.adminRoleBadge}>
                <ShieldCheck size={13} color="#15803d" />
                <span>System Administrator</span>
              </div>
            </div>

            <button
              type="button"
              onClick={openEditProfile}
              style={styles.editProfileBtn}
              disabled={editingProfile}
            >
              <Pencil size={15} />
              <span>Edit Profile</span>
            </button>
          </div>

          {/* ==================================================
              EDIT PROFILE PANEL
          ================================================== */}
          {editingProfile && (
            <div style={styles.editPanel}>
              <div style={styles.editPanelHeader}>
                <div>
                  <h3 style={styles.editPanelTitle}>Edit Admin Profile</h3>
                  <p style={styles.editPanelSubtitle}>Update administrative credentials</p>
                </div>

                <button
                  type="button"
                  onClick={closeEditProfile}
                  style={styles.closeBtn}
                  disabled={saving}
                  title="Close"
                >
                  <X size={17} />
                </button>
              </div>

              {/* NAME */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Admin Display Name</label>
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  style={styles.formInput}
                  disabled={saving}
                  autoFocus
                />
              </div>

              {/* WORK EMAIL (LOCKED / NON-EDITABLE) */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  Work Email <span style={styles.lockedHint}>(Organization email locked)</span>
                </label>
                <input
                  type="email"
                  value={workEmail}
                  disabled
                  style={styles.formInputDisabled}
                  title="Admin email addresses cannot be altered"
                />
              </div>

              {/* 1. CURRENT PASSWORD (FIRST IN SEQUENCE) */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  Current Password <span style={styles.requiredHint}>Required if setting a new password</span>
                </label>
                <input
                  type="password"
                  value={currentPasswordInput}
                  onChange={(e) => setCurrentPasswordInput(e.target.value)}
                  placeholder="Enter current password"
                  style={styles.formInput}
                  disabled={saving}
                />
              </div>

              {/* 2. NEW PASSWORD (SECOND IN SEQUENCE) */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  New Password <span style={styles.optionalText}>Optional</span>
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Leave blank to keep current password"
                  style={styles.formInput}
                  disabled={saving}
                />
              </div>

              {/* ERROR */}
              {fieldError && (
                <div style={styles.errorBox}>
                  {fieldError}
                </div>
              )}

              {/* ACTIONS */}
              <div style={styles.editActions}>
                <button
                  type="button"
                  onClick={closeEditProfile}
                  style={styles.cancelBtn}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  style={styles.saveBtn}
                  disabled={saving}
                >
                  <Check size={16} />
                  <span>{saving ? "Saving..." : "Save Changes"}</span>
                </button>
              </div>
            </div>
          )}

          {/* ==================================================
              ADMIN INFORMATION LIST
          ================================================== */}
          {!editingProfile && (
            <div style={styles.infoSection}>
              {/* EMAIL */}
              <div style={styles.infoRow}>
                <div style={styles.infoIcon}>
                  <Mail size={18} color="#6b7280" />
                </div>
                <div style={styles.infoText}>
                  <span style={styles.infoLabel}>Email</span>
                  <span style={styles.infoValue}>{workEmail}</span>
                </div>
              </div>

              {/* PASSWORD */}
              <div style={styles.infoRow}>
                <div style={styles.infoIcon}>
                  <Lock size={18} color="#6b7280" />
                </div>
                <div style={styles.infoText}>
                  <span style={styles.infoLabel}>Password</span>
                  <span style={styles.infoValue}>••••••••</span>
                </div>
              </div>

              {/* PRIVILEGE LEVEL */}
              <div style={styles.infoRow}>
                <div style={styles.infoIcon}>
                  <Shield size={18} color="#2563eb" />
                </div>
                <div style={styles.infoText}>
                  <span style={styles.infoLabel}>Access Privilege</span>
                  <span style={styles.infoValue}>Root Admin (Full Audit Authority)</span>
                </div>
              </div>

              {/* SYSTEM ROLE */}
              <div style={styles.infoRow}>
                <div style={styles.infoIcon}>
                  <KeyRound size={18} color="#f59e0b" />
                </div>
                <div style={styles.infoText}>
                  <span style={styles.infoLabel}>Role Assigned</span>
                  <span style={styles.infoValue}>Auditor & Verification Manager</span>
                </div>
              </div>

              {/* MEMBER SINCE */}
              <div style={styles.infoRow}>
                <div style={styles.infoIcon}>
                  <Calendar size={18} color="#7c3aed" />
                </div>
                <div style={styles.infoText}>
                  <span style={styles.infoLabel}>Admin Since</span>
                  <span style={styles.infoValue}>{formatDate(profile?.createdAt)}</span>
                </div>
              </div>

              {/* LOGOUT BUTTON */}
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                style={styles.logoutRowBtn}
              >
                <LogOut size={16} />
                <span>{loggingOut ? "Logging out..." : "Log Out"}</span>
              </button>
            </div>
          )}
        </div>

        {/* ==================================================
            DANGER ZONE
        ================================================== */}
        <div style={styles.dangerZoneRow}>
          <div>
            <div style={styles.dangerZoneTitle}>Administrative Account Restriction</div>
            <div style={styles.dangerZoneSubtitle}>
              Root administrator accounts cannot be deleted directly from client browsers to prevent platform lockouts.
            </div>
          </div>
          <button
            type="button"
            disabled
            style={styles.deleteDisabledBtn}
            title="Admin account deletion is restricted"
          >
            Delete Account (Locked)
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f9fafb",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    paddingBottom: 60,
  },
  pageContent: {
    maxWidth: 780,
    margin: "0 auto",
    padding: "24px 20px 0 20px",
  },
  pageHeader: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 800,
    color: "#111827",
    margin: 0,
  },
  subtitle: {
    fontSize: 13.5,
    color: "#6b7280",
    marginTop: 4,
    margin: 0,
  },
  successToast: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#dcfce7",
    border: "1px solid #86efac",
    color: "#15803d",
    padding: "12px 18px",
    borderRadius: 12,
    fontSize: 13.5,
    fontWeight: 600,
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: "24px 28px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  profileHeader: {
    display: "flex",
    alignItems: "center",
    gap: 18,
    paddingBottom: 22,
    borderBottom: "1px solid #f3f4f6",
  },
  profileAvatarFallback: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    backgroundColor: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 26,
    fontWeight: 800,
  },
  profileIdentity: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: 800,
    color: "#111827",
    margin: 0,
  },
  adminRoleBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    color: "#15803d",
    fontSize: 12,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 12,
    marginTop: 6,
  },
  editProfileBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid #d1d5db",
    backgroundColor: "#fff",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    cursor: "pointer",
  },
  editPanel: {
    backgroundColor: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: "20px 22px",
    marginTop: 20,
  },
  editPanelHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  editPanelTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  editPanelSubtitle: {
    fontSize: 12.5,
    color: "#6b7280",
    margin: "2px 0 0",
  },
  closeBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    padding: 4,
    color: "#6b7280",
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    display: "block",
    fontSize: 12.5,
    fontWeight: 600,
    color: "#374151",
    marginBottom: 6,
  },
  optionalText: {
    fontSize: 11.5,
    fontWeight: 500,
    color: "#9ca3af",
    marginLeft: 6,
  },
  requiredHint: {
    fontSize: 11.5,
    fontWeight: 500,
    color: "#dc2626",
    marginLeft: 6,
  },
  lockedHint: {
    fontSize: 11.5,
    fontWeight: 500,
    color: "#6b7280",
    marginLeft: 6,
  },
  formInput: {
    width: "100%",
    backgroundColor: "#fff",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13.5,
    boxSizing: "border-box",
    outline: "none",
  },
  formInputDisabled: {
    width: "100%",
    backgroundColor: "#f3f4f6",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "10px 14px",
    fontSize: 13.5,
    color: "#6b7280",
    cursor: "not-allowed",
    boxSizing: "border-box",
    outline: "none",
  },
  errorBox: {
    backgroundColor: "#fee2e2",
    border: "1px solid #fca5a5",
    color: "#b91c1c",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 500,
    marginBottom: 14,
  },
  editActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    backgroundColor: "#fff",
    border: "1px solid #d1d5db",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 600,
    color: "#374151",
    cursor: "pointer",
  },
  saveBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#16a34a",
    border: "none",
    padding: "8px 18px",
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 700,
    color: "#fff",
    cursor: "pointer",
  },
  infoSection: {
    marginTop: 16,
    display: "flex",
    flexDirection: "column",
  },
  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: "14px 0",
    borderBottom: "1px solid #f3f4f6",
  },
  infoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#f9fafb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    display: "flex",
    flexDirection: "column",
  },
  infoLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: 500,
  },
  infoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: 600,
    marginTop: 1,
  },
  logoutRowBtn: {
    marginTop: 20,
    width: "100%",
    border: "1px solid #e5e7eb",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: "11px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    fontSize: 13.5,
    fontWeight: 700,
    color: "#374151",
    cursor: "pointer",
  },
  dangerZoneRow: {
    marginTop: 24,
    padding: "16px 20px",
    backgroundColor: "#fff",
    border: "1px solid #fee2e2",
    borderRadius: 14,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dangerZoneTitle: {
    fontSize: 13.5,
    fontWeight: 700,
    color: "#991b1b",
  },
  dangerZoneSubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 3,
    maxWidth: 480,
  },
  deleteDisabledBtn: {
    backgroundColor: "#f3f4f6",
    border: "1px solid #e5e7eb",
    color: "#9ca3af",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "not-allowed",
  },
  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: {
    fontSize: 14,
    fontWeight: 600,
    color: "#6b7280",
  },
  notLoggedText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 12,
  },
  loginRedirectBtn: {
    backgroundColor: "#16a34a",
    color: "#fff",
    border: "none",
    padding: "8px 18px",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
  },
};