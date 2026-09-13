import React, { useEffect, useState } from "react";

import {
  ChevronLeft,
  LogOut,
  Leaf,
  Award,
  Calendar,
  Mail,
  Lock,
  Pencil,
  X,
  Check,
  Trash2,
  AlertTriangle,
} from "lucide-react";

import Layout from "../../../shared/components/Layout";
import { useCurrentUser } from "../../../firebase/useCurrentUser";
import { listenToCumulativeEcoScore } from "../../../firebase/ecoScoreService";

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

  return timestamp.toDate().toLocaleDateString(
    "en-MY",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
    }
  );
}

export default function Profile({ onNavigate }) {

  const {
    authUser,
    profile,
    loading,
  } = useCurrentUser();

  const [loggingOut, setLoggingOut] =
    useState(false);

  // Cumulative Eco Score from completed top-level travelHistory records.
  // This is display-only and does not update users/{uid}.eco_score.
  const [cumulativeEcoScore, setCumulativeEcoScore] =
    useState(0);

  useEffect(() => {
    if (!authUser?.uid) {
      setCumulativeEcoScore(0);
      return;
    }

    return listenToCumulativeEcoScore(
      authUser.uid,
      setCumulativeEcoScore
    );
  }, [authUser?.uid]);

  /*
   * ONE EDIT MODE
   *
   * Instead of having 3 pencil buttons,
   * the user clicks one "Edit Profile" button.
   */
  const [editingProfile, setEditingProfile] =
    useState(false);

  const [nameInput, setNameInput] =
    useState("");

  const [emailInput, setEmailInput] =
    useState("");

  const [passwordInput, setPasswordInput] =
    useState("");

  const [currentPasswordInput, setCurrentPasswordInput] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  const [fieldError, setFieldError] =
    useState("");

  const [successToast, setSuccessToast] =
    useState("");

  /*
   * DELETE MODAL
   */
  const [deleteModalOpen, setDeleteModalOpen] =
    useState(false);

  const [deleteConfirmText, setDeleteConfirmText] =
    useState("");

  const [deleting, setDeleting] =
    useState(false);

  const [deleteError, setDeleteError] =
    useState("");

  /*
   * ------------------------------------------------------------
   * OPEN EDIT PROFILE
   * ------------------------------------------------------------
   */
  const openEditProfile = () => {

    setNameInput(profile?.name || "");

    setEmailInput(profile?.email || "");

    setPasswordInput("");

    setCurrentPasswordInput("");

    setFieldError("");

    setEditingProfile(true);
  };

  /*
   * ------------------------------------------------------------
   * CLOSE EDIT PROFILE
   * ------------------------------------------------------------
   */
  const closeEditProfile = () => {

    if (saving) return;

    setEditingProfile(false);

    setFieldError("");

    setPasswordInput("");

    setCurrentPasswordInput("");
  };

  /*
   * ------------------------------------------------------------
   * SUCCESS MESSAGE
   * ------------------------------------------------------------
   */
  const showSuccess = (message) => {

    setSuccessToast(message);

    setTimeout(() => {
      setSuccessToast("");
    }, 3000);
  };

  /*
   * ------------------------------------------------------------
   * SAVE PROFILE
   * ------------------------------------------------------------
   *
   * Name:
   *   no reauthentication
   *
   * Email:
   *   requires current password
   *
   * Password:
   *   requires current password
   */
  const handleSaveProfile = async () => {

    setFieldError("");

    const newName =
      nameInput.trim();

    const newEmail =
      emailInput.trim();

    if (!newName) {
      setFieldError(
        "Name can't be empty."
      );
      return;
    }

    if (!newEmail) {
      setFieldError(
        "Email can't be empty."
      );
      return;
    }

    /*
     * Determine whether email/password
     * actually changed.
     */
    const emailChanged =
      newEmail !==
      (profile?.email || "");

    const passwordChanged =
      passwordInput.length > 0;

    /*
     * Email/password require current password.
     */
    if (
      (emailChanged || passwordChanged) &&
      !currentPasswordInput
    ) {
      setFieldError(
        "Enter your current password to confirm email or password changes."
      );
      return;
    }

    setSaving(true);

    try {

      /*
       * NAME
       */
      if (
        newName !==
        (profile?.name || "")
      ) {
        await updateUserName(
          newName
        );
      }

      /*
       * EMAIL
       */
      if (emailChanged) {

        await reauthenticate(
          currentPasswordInput
        );

        await updateUserEmail(
          newEmail
        );
      }

      /*
       * PASSWORD
       */
      if (passwordChanged) {

        /*
         * If email wasn't changed,
         * we still need to reauthenticate.
         */
        if (!emailChanged) {
          await reauthenticate(
            currentPasswordInput
          );
        }

        await updateUserPassword(
          passwordInput
        );
      }

      showSuccess(
        "Profile updated successfully."
      );

      setEditingProfile(false);

      setPasswordInput("");

      setCurrentPasswordInput("");

    } catch (err) {

      setFieldError(
        friendlyAuthError(err)
      );

    } finally {

      setSaving(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * LOG OUT
   * ------------------------------------------------------------
   */
  const handleLogout = async () => {

    setLoggingOut(true);

    try {

      await logoutUser();

      onNavigate("/login");

    } catch (err) {

      alert(
        "Failed to log out: " +
        err.message
      );

      setLoggingOut(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * DELETE ACCOUNT MODAL
   * ------------------------------------------------------------
   */
  const openDeleteModal = () => {

    setDeleteConfirmText("");

    setDeleteError("");

    setDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {

    if (deleting) return;

    setDeleteModalOpen(false);
  };

  /*
   * ------------------------------------------------------------
   * DELETE ACCOUNT
   * ------------------------------------------------------------
   */
  const handleDeleteAccount = async () => {

    setDeleteError("");

    if (
      deleteConfirmText
        .trim()
        .toUpperCase() !==
      DELETE_PHRASE
    ) {
      setDeleteError(
        `Type "${DELETE_PHRASE}" exactly to confirm.`
      );

      return;
    }

    setDeleting(true);

    try {

      await deleteAccount();

      onNavigate("/login");

    } catch (err) {

      setDeleteError(
        friendlyAuthError(err)
      );

      setDeleting(false);
    }
  };

  /*
   * ------------------------------------------------------------
   * LOADING
   * ------------------------------------------------------------
   */
  if (loading) {

    return (
      <div style={styles.loadingPage}>
        <p style={styles.loadingText}>
          Loading profile...
        </p>
      </div>
    );
  }

  /*
   * ------------------------------------------------------------
   * NOT LOGGED IN
   * ------------------------------------------------------------
   */
  if (!authUser || !profile) {

    return (
      <div style={styles.loadingPage}>

        <p style={styles.notLoggedText}>
          You're not logged in.
        </p>

        <button
          type="button"
          onClick={() =>
            onNavigate("/login")
          }
          style={styles.loginRedirectBtn}
        >
          Go to Login
        </button>

      </div>
    );
  }

  /*
   * Layout receives these as fallback values.
   * Layout itself also listens directly to
   * users/{uid}, so the profile picture stays live.
   */
  const layoutUser = {
    name: profile.name,
    // Use the same cumulative completed-trip Eco Score
    // shown on the dashboard and top navbar.
    ecoScore: cumulativeEcoScore,
    profile_photo_url:
      profile.profile_photo_url || "",
  };

  const profilePhoto =
    profile.profile_photo_url ||
    authUser.photoURL ||
    "";

  const avatarLetter =
    (profile.name || "?")
      .charAt(0)
      .toUpperCase();

  const deleteConfirmValid =
    deleteConfirmText
      .trim()
      .toUpperCase() ===
    DELETE_PHRASE;

  return (
    <Layout
      active=""
      user={layoutUser}
      onNavigate={onNavigate}
    >

      <div style={styles.pageContent}>

        {/* ==================================================
            BACK
        ================================================== */}

        <button
          type="button"
          onClick={() =>
            onNavigate("/dashboard")
          }
          style={styles.backBtn}
        >
          <ChevronLeft size={16} />
          Back to Dashboard
        </button>

        {/* ==================================================
            PAGE HEADER
        ================================================== */}

        <div style={styles.pageHeader}>

          <div>
            <h1 style={styles.title}>
              Profile
            </h1>

            <p style={styles.subtitle}>
              Manage your account details
            </p>
          </div>

        </div>

        {/* ==================================================
            SUCCESS MESSAGE
        ================================================== */}

        {successToast && (
          <div style={styles.successToast}>

            <Check size={17} />

            <span>
              {successToast}
            </span>

          </div>
        )}

        {/* ==================================================
            PROFILE CARD
        ================================================== */}

        <div style={styles.card}>

          {/* ----------------------------------------------
              PROFILE HEADER
          ---------------------------------------------- */}

          <div style={styles.profileHeader}>

            {profilePhoto ? (

              <img
                src={profilePhoto}
                alt={profile.name || "Profile"}
                style={styles.profileAvatar}
              />

            ) : (

              <div
                style={styles.profileAvatarFallback}
              >
                {avatarLetter}
              </div>

            )}

            <div style={styles.profileIdentity}>

              <h2 style={styles.profileName}>
                {profile.name ||
                  "Unnamed traveler"}
              </h2>

              <p style={styles.profileRole}>
                {profile.role === "tourist"
                  ? "Traveler"
                  : profile.role || "Traveler"}
              </p>

            </div>

            {/* ONE EDIT BUTTON */}
            <button
              type="button"
              onClick={openEditProfile}
              style={styles.editProfileBtn}
              disabled={editingProfile}
            >
              <Pencil size={15} />
              Edit Profile
            </button>

          </div>

          {/* ==================================================
              EDIT PROFILE PANEL
          ================================================== */}

          {editingProfile && (

            <div style={styles.editPanel}>

              <div style={styles.editPanelHeader}>

                <div>
                  <h3 style={styles.editPanelTitle}>
                    Edit Profile
                  </h3>

                  <p style={styles.editPanelSubtitle}>
                    Update your account information
                  </p>
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

                <label style={styles.formLabel}>
                  Name
                </label>

                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) =>
                    setNameInput(
                      e.target.value
                    )
                  }
                  style={styles.formInput}
                  disabled={saving}
                  autoFocus
                />

              </div>

              {/* EMAIL */}

              <div style={styles.formGroup}>

                <label style={styles.formLabel}>
                  Email
                </label>

                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) =>
                    setEmailInput(
                      e.target.value
                    )
                  }
                  style={styles.formInput}
                  disabled={saving}
                />

              </div>

              {/* NEW PASSWORD */}

              <div style={styles.formGroup}>

                <label style={styles.formLabel}>
                  New Password
                  <span style={styles.optionalText}>
                    Optional
                  </span>
                </label>

                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) =>
                    setPasswordInput(
                      e.target.value
                    )
                  }
                  placeholder="Leave blank to keep current password"
                  style={styles.formInput}
                  disabled={saving}
                />

              </div>

              {/* CURRENT PASSWORD */}

              <div style={styles.formGroup}>

                <label style={styles.formLabel}>
                  Current Password
                  <span style={styles.requiredHint}>
                    Required for email/password changes
                  </span>
                </label>

                <input
                  type="password"
                  value={currentPasswordInput}
                  onChange={(e) =>
                    setCurrentPasswordInput(
                      e.target.value
                    )
                  }
                  placeholder="Enter current password"
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

                  {saving
                    ? "Saving..."
                    : "Save Changes"}
                </button>

              </div>

            </div>
          )}

          {/* ==================================================
              ACCOUNT INFORMATION
          ================================================== */}

          {!editingProfile && (

            <div style={styles.infoSection}>

              {/* EMAIL */}

              <div style={styles.infoRow}>

                <div style={styles.infoIcon}>
                  <Mail
                    size={18}
                    color="#6b7280"
                  />
                </div>

                <div style={styles.infoText}>

                  <span style={styles.infoLabel}>
                    Email
                  </span>

                  <span style={styles.infoValue}>
                    {profile.email || "—"}
                  </span>

                </div>

              </div>

              {/* PASSWORD */}

              <div style={styles.infoRow}>

                <div style={styles.infoIcon}>
                  <Lock
                    size={18}
                    color="#6b7280"
                  />
                </div>

                <div style={styles.infoText}>

                  <span style={styles.infoLabel}>
                    Password
                  </span>

                  <span style={styles.infoValue}>
                    ••••••••
                  </span>

                </div>

              </div>

              {/* ECO SCORE */}

              <div style={styles.infoRow}>

                <div style={styles.infoIcon}>
                  <Leaf
                    size={18}
                    color="#16a34a"
                  />
                </div>

                <div style={styles.infoText}>

                  <span style={styles.infoLabel}>
                    Eco Score
                  </span>

                  <span style={styles.infoValue}>
                    {cumulativeEcoScore.toLocaleString()}
                  </span>

                </div>

              </div>

              {/* LEVEL */}

              <div style={styles.infoRow}>

                <div style={styles.infoIcon}>
                  <Award
                    size={18}
                    color="#f97316"
                  />
                </div>

                <div style={styles.infoText}>

                  <span style={styles.infoLabel}>
                    Level
                  </span>

                  <span style={styles.infoValue}>
                    {profile.level ?? 1}
                  </span>

                </div>

              </div>

              {/* MEMBER SINCE */}

              <div style={styles.infoRow}>

                <div style={styles.infoIcon}>
                  <Calendar
                    size={18}
                    color="#7c3aed"
                  />
                </div>

                <div style={styles.infoText}>

                  <span style={styles.infoLabel}>
                    Member since
                  </span>

                  <span style={styles.infoValue}>
                    {formatDate(
                      profile.created_at
                    )}
                  </span>

                </div>

              </div>

            </div>
          )}

          {/* ==================================================
              LOGOUT
          ================================================== */}

          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            style={styles.logoutBtn}
          >

            <LogOut size={17} />

            {loggingOut
              ? "Logging out..."
              : "Log Out"}

          </button>

          {/* ==================================================
              DANGER ZONE
          ================================================== */}

          <div style={styles.dangerZone}>

            <div>

              <h3 style={styles.dangerTitle}>
                Danger Zone
              </h3>

              <p style={styles.dangerSubtitle}>
                Permanently delete your account
                and associated profile data.
              </p>

            </div>

            <button
              type="button"
              onClick={openDeleteModal}
              style={styles.deleteBtn}
            >
              <Trash2 size={16} />
              Delete Account
            </button>

          </div>

        </div>
      </div>

      {/* ======================================================
          DELETE MODAL
      ====================================================== */}

      {deleteModalOpen && (

        <div
          style={styles.modalOverlay}
          onClick={closeDeleteModal}
        >

          <div
            style={styles.modalCard}
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div style={styles.modalIconWrap}>

              <AlertTriangle
                size={22}
                color="#b91c1c"
              />

            </div>

            <h2 style={styles.modalTitle}>
              Delete your account?
            </h2>

            <p style={styles.modalBody}>
              This permanently deletes your
              account and profile data. This
              action cannot be undone.
            </p>

            <label style={styles.formLabel}>
              Type{" "}
              <strong>
                {DELETE_PHRASE}
              </strong>{" "}
              to confirm
            </label>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) =>
                setDeleteConfirmText(
                  e.target.value
                )
              }
              placeholder={DELETE_PHRASE}
              style={styles.formInput}
              autoFocus
              disabled={deleting}
            />

            {deleteError && (

              <div style={styles.errorBox}>
                {deleteError}
              </div>

            )}

            <div style={styles.modalActions}>

              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                style={styles.cancelBtn}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={
                  deleting ||
                  !deleteConfirmValid
                }
                style={{
                  ...styles.modalDeleteBtn,
                  ...(deleting ||
                  !deleteConfirmValid
                    ? styles.disabledDeleteBtn
                    : {}),
                }}
              >

                <Trash2 size={16} />

                {deleting
                  ? "Deleting..."
                  : "Permanently Delete"}

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

  loadingText: {
    color: "#6b7280",
  },

  notLoggedText: {
    color: "#6b7280",
    marginBottom: 16,
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

  pageContent: {
    padding: "28px 32px 40px",
    maxWidth: 760,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },

  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    background: "transparent",
    border: "none",
    color: "#6b7280",
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    padding: 0,
    marginBottom: 22,
  },

  pageHeader: {
    marginBottom: 24,
  },

  title: {
    fontSize: 30,
    fontWeight: 800,
    color: "#111827",
    margin: 0,
    letterSpacing: "-0.5px",
  },

  subtitle: {
    color: "#6b7280",
    margin: "6px 0 0",
    fontSize: 14.5,
  },

  successToast: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#ecfdf5",
    color: "#15803d",
    border: "1px solid #bbf7d0",
    borderRadius: 10,
    padding: "11px 14px",
    fontSize: 13.5,
    fontWeight: 600,
    marginBottom: 18,
  },

  card: {
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 18,
    padding: 28,
    boxShadow:
      "0 2px 8px rgba(15, 23, 42, 0.03)",
  },

  profileHeader: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    paddingBottom: 24,
    borderBottom: "1px solid #f3f4f6",
  },

  profileAvatar: {
    width: 76,
    height: 76,
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
    border: "2px solid #dcfce7",
  },

  profileAvatarFallback: {
    width: 76,
    height: 76,
    borderRadius: "50%",
    background: "#dcfce7",
    color: "#15803d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 27,
    fontWeight: 700,
    flexShrink: 0,
  },

  profileIdentity: {
    flex: 1,
    minWidth: 0,
  },

  profileName: {
    fontSize: 22,
    fontWeight: 800,
    color: "#111827",
    margin: 0,
  },

  profileRole: {
    fontSize: 14,
    color: "#9ca3af",
    margin: "5px 0 0",
  },

  editProfileBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    borderRadius: 9,
    padding: "9px 13px",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
    flexShrink: 0,
  },

  infoSection: {
    padding: "22px 0",
    display: "flex",
    flexDirection: "column",
    gap: 19,
  },

  infoRow: {
    display: "flex",
    alignItems: "center",
    gap: 13,
  },

  infoIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    background: "#f9fafb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  infoText: {
    display: "flex",
    alignItems: "center",
    gap: 24,
    minWidth: 0,
  },

  infoLabel: {
    color: "#6b7280",
    fontSize: 14,
    width: 105,
    flexShrink: 0,
  },

  infoValue: {
    color: "#111827",
    fontSize: 14.5,
    fontWeight: 600,
    overflowWrap: "anywhere",
  },

  /*
   * EDIT PANEL
   */

  editPanel: {
    marginTop: 22,
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 14,
    padding: 20,
  },

  editPanelHeader: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },

  editPanelTitle: {
    fontSize: 16,
    fontWeight: 800,
    color: "#111827",
    margin: 0,
  },

  editPanelSubtitle: {
    color: "#6b7280",
    fontSize: 12.5,
    margin: "4px 0 0",
  },

  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
    color: "#6b7280",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  formGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 7,
    marginBottom: 15,
  },

  formLabel: {
    fontSize: 12.5,
    fontWeight: 700,
    color: "#374151",
  },

  optionalText: {
    color: "#9ca3af",
    fontWeight: 500,
    marginLeft: 6,
  },

  requiredHint: {
    color: "#9ca3af",
    fontWeight: 500,
    marginLeft: 6,
  },

  formInput: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #d1d5db",
    borderRadius: 9,
    padding: "10px 12px",
    background: "#fff",
    color: "#111827",
    fontSize: 14,
    outline: "none",
  },

  editActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 9,
    marginTop: 18,
  },

  cancelBtn: {
    border: "1px solid #d1d5db",
    background: "#fff",
    color: "#374151",
    borderRadius: 9,
    padding: "9px 15px",
    fontSize: 13.5,
    fontWeight: 600,
    cursor: "pointer",
  },

  saveBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    border: "none",
    background: "#16a34a",
    color: "#fff",
    borderRadius: 9,
    padding: "9px 15px",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
  },

  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    borderRadius: 9,
    padding: "9px 11px",
    fontSize: 12.5,
    lineHeight: 1.4,
    marginTop: 8,
  },

  logoutBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    background: "#f8fafc",
    color: "#374151",
    border: "1px solid #e5e7eb",
    borderRadius: 11,
    padding: "12px 0",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
  },

  dangerZone: {
    marginTop: 20,
    paddingTop: 20,
    borderTop: "1px solid #f3f4f6",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },

  dangerTitle: {
    fontSize: 13.5,
    fontWeight: 700,
    color: "#b91c1c",
    margin: 0,
  },

  dangerSubtitle: {
    fontSize: 12.5,
    color: "#7f1d1d",
    margin: "4px 0 0",
  },

  deleteBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    background: "#fff",
    color: "#b91c1c",
    border: "1px solid #fecaca",
    borderRadius: 9,
    padding: "9px 13px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    flexShrink: 0,
  },

  /*
   * DELETE MODAL
   */

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
    padding: 26,
    width: "100%",
    maxWidth: 420,
    boxShadow:
      "0 20px 50px rgba(0, 0, 0, 0.18)",
    boxSizing: "border-box",
  },

  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: "50%",
    background: "#fee2e2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  modalTitle: {
    fontSize: 19,
    fontWeight: 800,
    color: "#111827",
    margin: "0 0 7px",
  },

  modalBody: {
    fontSize: 13.5,
    color: "#6b7280",
    lineHeight: 1.5,
    margin: "0 0 18px",
  },

  modalActions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 9,
    marginTop: 18,
  },

  modalDeleteBtn: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    border: "none",
    background: "#b91c1c",
    color: "#fff",
    borderRadius: 9,
    padding: "9px 14px",
    fontSize: 13.5,
    fontWeight: 700,
    cursor: "pointer",
  },

  disabledDeleteBtn: {
    background: "#fca5a5",
    cursor: "not-allowed",
  },
};