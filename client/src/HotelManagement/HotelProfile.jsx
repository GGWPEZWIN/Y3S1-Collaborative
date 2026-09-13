import { useState, useEffect } from "react";
import {
  ChevronLeft,
  LogOut,
  MapPin,
  Mail,
  Lock,
  Pencil,
  X,
  Check,
  Trash2,
  AlertTriangle,
  Award,
  Calendar,
  Layers
} from "lucide-react";
import { auth, db } from "../firebase/config";
import { useCurrentUser } from "../firebase/useCurrentUser";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
  logoutUser,
  updateUserName,
  updateUserPassword,
  deleteAccount,
  reauthenticate,
  friendlyAuthError,
} from "../firebase/authService";

const DELETE_PHRASE = "DELETE";

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

export default function HotelProfile({ onNavigate }) {
  const { authUser, profile, loading: hookLoading } = useCurrentUser();
  const [currentUser, setCurrentUser] = useState(auth.currentUser || authUser);
  const [authChecking, setAuthChecking] = useState(true);
  const [hotelDoc, setHotelDoc] = useState(null);

  const [loggingOut, setLoggingOut] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  // Form states (Email is read-only)
  const [hotelNameInput, setHotelNameInput] = useState("");
  const [roomCountInput, setRoomCountInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [currentPasswordInput, setCurrentPasswordInput] = useState("");

  const [saving, setSaving] = useState(false);
  const [fieldError, setFieldError] = useState("");
  const [successToast, setSuccessToast] = useState("");

  // Delete modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const snap = await getDoc(doc(db, "hotel_applications", user.uid));
          if (snap.exists()) {
            setHotelDoc(snap.data());
          }
        } catch (e) {
          console.warn("Could not load hotel doc:", e);
        }
      }
      setAuthChecking(false);
    });

    return () => unsubscribe();
  }, []);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else if (onNavigate) {
      onNavigate("/hotel/partner-dashboard");
    } else {
      window.location.hash = "/hotel/partner-dashboard";
    }
  };

  const openEditProfile = () => {
    if (!hotelDoc) {
      alert("Please submit your green certification application first before editing your hotel profile.");
      return;
    }
    setHotelNameInput(hotelDoc?.hotelName || "");
    setRoomCountInput(hotelDoc?.rooms || hotelDoc?.roomCount || "");
    setPasswordInput("");
    setCurrentPasswordInput("");
    setFieldError("");
    setEditingProfile(true);
  };

  const closeEditProfile = () => {
    if (saving) return;
    setEditingProfile(false);
    setFieldError("");
    setPasswordInput("");
    setCurrentPasswordInput("");
  };

  const showSuccess = (message) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast("");
    }, 3000);
  };

  const handleSaveProfile = async () => {
    setFieldError("");

    const newHotelName = hotelNameInput.trim();
    const newRooms = parseInt(roomCountInput, 10) || 1;

    if (!newHotelName) {
      setFieldError("Hotel name cannot be empty.");
      return;
    }

    const passwordChanged = passwordInput.length > 0;

    // Password changes require current password confirmation
    if (passwordChanged && !currentPasswordInput) {
      setFieldError("Enter your current password to confirm password update.");
      return;
    }

    setSaving(true);

    try {
      if (newHotelName !== (profile?.name || currentUser?.displayName || "")) {
        await updateUserName(newHotelName);
      }

      if (currentUser?.uid) {
        await updateDoc(doc(db, "hotel_applications", currentUser.uid), {
          hotelName: newHotelName,
          rooms: newRooms,
        });
        setHotelDoc((prev) => ({
          ...prev,
          hotelName: newHotelName,
          rooms: newRooms,
        }));
      }

      if (passwordChanged) {
        await reauthenticate(currentPasswordInput);
        await updateUserPassword(passwordInput);
      }

      showSuccess("Hotel profile updated successfully.");
      setEditingProfile(false);
      setPasswordInput("");
      setCurrentPasswordInput("");
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
      } else {
        window.location.hash = "/login";
      }
    } catch (err) {
      alert("Failed to log out: " + err.message);
      setLoggingOut(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleteError("");
    if (deleteConfirmText.trim().toUpperCase() !== DELETE_PHRASE) {
      setDeleteError(`Type "${DELETE_PHRASE}" exactly to confirm.`);
      return;
    }

    setDeleting(true);
    try {
      await deleteAccount();
      if (onNavigate) {
        onNavigate("/login");
      } else {
        window.location.hash = "/login";
      }
    } catch (err) {
      setDeleteError(friendlyAuthError(err));
      setDeleting(false);
    }
  };

  if (authChecking || hookLoading) {
    return (
      <div style={styles.loadingPage}>
        <p style={styles.loadingText}>Loading Hotel Profile...</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={styles.loadingPage}>
        <p style={styles.notLoggedText}>Session expired or you are not logged in.</p>
        <button
          type="button"
          onClick={() => (onNavigate ? onNavigate("/login") : (window.location.hash = "/login"))}
          style={styles.loginRedirectBtn}
        >
          Go to Login
        </button>
      </div>
    );
  }

  // Generate a consistent placeholder based on the user's UID so it stays fixed for this specific account
  const getAccountSpecificPlaceholder = (uid) => {
    if (!uid) return "Hotel-1234";
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = (hash << 5) - hash + uid.charCodeAt(i);
      hash |= 0;
    }
    const randomNum = Math.abs(hash % 9000) + 1000;
    return `Hotel-${randomNum}`;
  };

  const partnerEmail = profile?.email || currentUser?.email || "user@gmail.com";
  const accountPlaceholderId = getAccountSpecificPlaceholder(currentUser?.uid);
  const hotelName = hotelDoc?.hotelName || accountPlaceholderId;
  const avatarLetter = partnerEmail.charAt(0).toUpperCase();
  const currentTier = hotelDoc?.certificationTier || (hotelDoc?.status ? hotelDoc.status : "Not Applied");

  return (
    <div style={styles.container}>
      <div style={styles.pageContent}>
        {/* TOP DYNAMIC BACK BUTTON */}
        <button
          type="button"
          onClick={handleBack}
          style={styles.backBtn}
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>

        {/* PAGE HEADER */}
        <div style={styles.pageHeader}>
          <h1 style={styles.title}>Hotel Profile</h1>
          <p style={styles.subtitle}>Manage your property details, eco tier, and partner account</p>
        </div>

        {/* SUCCESS TOAST */}
        {successToast && (
          <div style={styles.successToast}>
            <Check size={18} />
            <span>{successToast}</span>
          </div>
        )}

        {/* PROFILE CARD */}
        <div style={styles.card}>
          <div style={styles.profileHeader}>
            <div style={styles.profileAvatarFallback}>
              {avatarLetter}
            </div>

            <div style={styles.profileIdentity}>
              <h2 style={styles.profileName}>{hotelName}</h2>
              <p style={styles.profileRole}>
                {hotelDoc ? "Registered Eco-Partner Hotel" : "Pending Application"}
              </p>
            </div>

            <button
              type="button"
              onClick={openEditProfile}
              style={{
                ...styles.editProfileBtn,
                opacity: hotelDoc ? 1 : 0.4,
                cursor: hotelDoc ? "pointer" : "not-allowed",
              }}
              disabled={!hotelDoc || editingProfile}
              title={hotelDoc ? "Edit Profile" : "Submit application first to unlock editing"}
            >
              <Pencil size={15} />
              <span>Edit Profile</span>
            </button>
          </div>

          {/* EDIT PROFILE FORM */}
          {editingProfile && hotelDoc && (
            <div style={styles.editPanel}>
              <div style={styles.editPanelHeader}>
                <div>
                  <h3 style={styles.editPanelTitle}>Edit Hotel Profile</h3>
                  <p style={styles.editPanelSubtitle}>Update your property details and password</p>
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

              {/* HOTEL NAME */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Hotel / Property Name</label>
                <input
                  type="text"
                  value={hotelNameInput}
                  onChange={(e) => setHotelNameInput(e.target.value)}
                  style={styles.formInput}
                  disabled={saving}
                  autoFocus
                />
              </div>

              {/* ROOM COUNT */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Total Room Capacity</label>
                <input
                  type="number"
                  value={roomCountInput}
                  onChange={(e) => setRoomCountInput(e.target.value)}
                  style={styles.formInput}
                  disabled={saving}
                />
              </div>

              {/* READ-ONLY EMAIL (CANNOT BE CHANGED) */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  Registered Partner Email
                  <span style={styles.lockedHint}>Locked (Account Identifier)</span>
                </label>
                <input
                  type="email"
                  value={partnerEmail}
                  disabled
                  style={{
                    ...styles.formInput,
                    backgroundColor: "#f3f4f6",
                    color: "#6b7280",
                    cursor: "not-allowed",
                  }}
                />
              </div>

              {/* NEW PASSWORD */}
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

              {/* CURRENT PASSWORD */}
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>
                  Current Password <span style={styles.requiredHint}>Required only if updating password</span>
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

              {fieldError && (
                <div style={styles.errorBox}>
                  {fieldError}
                </div>
              )}

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

          {/* READ-ONLY INFORMATION LIST */}
          {!editingProfile && (
            <div style={styles.infoSection}>
              <div style={styles.infoRow}>
                <div style={styles.infoIcon}>
                  <Mail size={18} color="#6b7280" />
                </div>
                <div style={styles.infoText}>
                  <span style={styles.infoLabel}>Email</span>
                  <span style={styles.infoValue}>{partnerEmail}</span>
                </div>
              </div>

              <div style={styles.infoRow}>
                <div style={styles.infoIcon}>
                  <Lock size={18} color="#6b7280" />
                </div>
                <div style={styles.infoText}>
                  <span style={styles.infoLabel}>Password</span>
                  <span style={styles.infoValue}>••••••••</span>
                </div>
              </div>

              <div style={styles.infoRow}>
                <div style={styles.infoIcon}>
                  <Award size={18} color="#f59e0b" />
                </div>
                <div style={styles.infoText}>
                  <span style={styles.infoLabel}>Certification Status</span>
                  <span style={styles.infoValue}>{currentTier}</span>
                </div>
              </div>

              <div style={styles.infoRow}>
                <div style={styles.infoIcon}>
                  <MapPin size={18} color="#16a34a" />
                </div>
                <div style={styles.infoText}>
                  <span style={styles.infoLabel}>Registered Location</span>
                  <span style={styles.infoValue}>
                    {hotelDoc?.address ? `${hotelDoc.address}, ${hotelDoc.state || ""}` : "Not provided"}
                  </span>
                </div>
              </div>

              <div style={styles.infoRow}>
                <div style={styles.infoIcon}>
                  <Layers size={18} color="#2563eb" />
                </div>
                <div style={styles.infoText}>
                  <span style={styles.infoLabel}>Capacity</span>
                  <span style={styles.infoValue}>
                    {hotelDoc?.rooms || hotelDoc?.roomCount ? `${hotelDoc.rooms || hotelDoc.roomCount} rooms` : "Not provided"}
                  </span>
                </div>
              </div>

              <div style={styles.infoRow}>
                <div style={styles.infoIcon}>
                  <Calendar size={18} color="#7c3aed" />
                </div>
                <div style={styles.infoText}>
                  <span style={styles.infoLabel}>Member Since</span>
                  <span style={styles.infoValue}>{formatDate(profile?.createdAt || hotelDoc?.createdAt)}</span>
                </div>
              </div>

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

        {/* DANGER ZONE */}
        <div style={styles.dangerZoneRow}>
          <div>
            <div style={styles.dangerZoneTitle}>Danger Zone</div>
            <div style={styles.dangerZoneSubtitle}>
              Permanently delete your partner account and unregister this property.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDeleteModalOpen(true)}
            style={styles.deleteActionBtn}
          >
            <Trash2 size={15} />
            <span>Delete Account</span>
          </button>
        </div>
      </div>

      {/* DELETE MODAL */}
      {deleteModalOpen && (
        <div style={styles.modalBackdrop}>
          <div style={styles.modalContent}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "#b91c1c" }}>
              <AlertTriangle size={24} />
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Delete Partner Account</h2>
            </div>
            <p style={{ fontSize: 13, color: "#4b5563", marginTop: 10, lineHeight: 1.5 }}>
              This action cannot be undone. This will permanently remove your hotel credentials, eco certifications, and audit submissions.
            </p>
            <p style={{ fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 }}>
              Type <span style={{ color: "#b91c1c" }}>{DELETE_PHRASE}</span> to confirm:
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              style={styles.modalInput}
            />

            {deleteError && (
              <div style={{ color: "#dc2626", fontSize: 12, marginTop: 6, fontWeight: 600 }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 }}>
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                disabled={deleting}
                style={styles.cancelModalBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting || deleteConfirmText.trim().toUpperCase() !== DELETE_PHRASE}
                style={{
                  ...styles.deleteModalConfirmBtn,
                  opacity: deleteConfirmText.trim().toUpperCase() === DELETE_PHRASE ? 1 : 0.5,
                  cursor: deleteConfirmText.trim().toUpperCase() === DELETE_PHRASE ? "pointer" : "not-allowed",
                }}
              >
                {deleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
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
    padding: "32px 20px 0 20px",
  },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "none",
    background: "transparent",
    fontSize: 13.5,
    fontWeight: 600,
    color: "#374151",
    cursor: "pointer",
    padding: 0,
    marginBottom: 18,
  },
  pageHeader: { marginBottom: 20 },
  title: { fontSize: 28, fontWeight: 800, color: "#111827", margin: 0 },
  subtitle: { fontSize: 13.5, color: "#6b7280", marginTop: 4, margin: 0 },
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
    backgroundColor: "#fed7aa",
    color: "#9a3412",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 26,
    fontWeight: 800,
  },
  profileIdentity: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 },
  profileRole: { fontSize: 13, color: "#6b7280", marginTop: 3, margin: 0 },
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
  editPanelTitle: { fontSize: 16, fontWeight: 700, color: "#111827", margin: 0 },
  editPanelSubtitle: { fontSize: 12.5, color: "#6b7280", margin: "2px 0 0" },
  closeBtn: { border: "none", background: "transparent", cursor: "pointer", padding: 4, color: "#6b7280" },
  formGroup: { marginBottom: 14 },
  formLabel: { display: "block", fontSize: 12.5, fontWeight: 600, color: "#374151", marginBottom: 6 },
  optionalText: { fontSize: 11.5, fontWeight: 500, color: "#9ca3af", marginLeft: 6 },
  requiredHint: { fontSize: 11.5, fontWeight: 500, color: "#dc2626", marginLeft: 6 },
  lockedHint: { fontSize: 11, fontWeight: 600, color: "#9ca3af", marginLeft: 8 },
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
  editActions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 18 },
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
  infoSection: { marginTop: 16, display: "flex", flexDirection: "column" },
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
  infoText: { display: "flex", flexDirection: "column" },
  infoLabel: { fontSize: 12, color: "#6b7280", fontWeight: 500 },
  infoValue: { fontSize: 14, color: "#111827", fontWeight: 600, marginTop: 1 },
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
  dangerZoneTitle: { fontSize: 13.5, fontWeight: 700, color: "#991b1b" },
  dangerZoneSubtitle: { fontSize: 12, color: "#6b7280", marginTop: 3, maxWidth: 480 },
  deleteActionBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    border: "1px solid #fca5a5",
    color: "#b91c1c",
    padding: "8px 16px",
    borderRadius: 8,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
  },
  modalBackdrop: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: "24px 28px",
    width: "100%",
    maxWidth: 480,
  },
  modalInput: {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 13,
    boxSizing: "border-box",
    outline: "none",
  },
  cancelModalBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    backgroundColor: "#fff",
    color: "#374151",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  deleteModalConfirmBtn: {
    padding: "8px 18px",
    borderRadius: 8,
    border: "none",
    backgroundColor: "#b91c1c",
    color: "#fff",
    fontSize: 13,
    fontWeight: 700,
  },
  loadingPage: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: { fontSize: 14, fontWeight: 600, color: "#6b7280" },
  notLoggedText: { fontSize: 14, color: "#374151", marginBottom: 12 },
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