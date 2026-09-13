import React, { useEffect, useState } from "react";
import { 
  Leaf, 
  ChevronLeft, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  FileText 
} from "lucide-react";
import { auth, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";
import { submitHotelApplication } from "../firebase/hotelService";

export default function CertificationApply({ onNavigate }) {
  const [formData, setFormData] = useState({
    hotelName: "",
    address: "",
    state: "",
    roomCount: "",
    contactEmail: "",
    electricityUsage: "", // Acts as Electricity Bill Fee (RM)
    waterUsage: "",       // Acts as Water Bill Fee (RM)
    sustainabilityInitiatives: "",
  });

  const [electricityFile, setElectricityFile] = useState(null);
  const [waterFile, setWaterFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [partnerDisplayName, setPartnerDisplayName] = useState("Hotel Partner");
  const [partnerEmail, setPartnerEmail] = useState("");

  // Generate a consistent placeholder based on the user's UID (matches HotelProfile & Dashboard)
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

  // Pre-fill email, header display name, and default hotel name placeholder
  useEffect(() => {
    const fetchUserData = async () => {
      const user = auth.currentUser;
      if (user) {
        const email = user.email || "";
        setPartnerEmail(email);

        const defaultTag = getAccountSpecificPlaceholder(user.uid);

        setFormData((prev) => ({ 
          ...prev, 
          contactEmail: email,
          hotelName: defaultTag 
        }));

        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          const customUsername = userSnap.exists()
            ? userSnap.data().username || userSnap.data().displayName
            : null;

          const appRef = doc(db, "hotel_applications", user.uid);
          const appSnap = await getDoc(appRef);

          if (appSnap.exists()) {
            const existingName = appSnap.data().hotelName;
            setPartnerDisplayName(existingName || customUsername || defaultTag);
            if (existingName) {
              setFormData((prev) => ({ ...prev, hotelName: existingName }));
            }
          } else {
            setPartnerDisplayName(customUsername || defaultTag);
          }
        } catch (err) {
          console.error("Error loading application status header:", err);
          setPartnerDisplayName(defaultTag);
        }
      }
    };

    fetchUserData();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Helper for file sizes (Keep under 800KB for Firestore)
  const handleFileSelection = (file, setFileFunction) => {
    if (!file) return;
    if (file.size > 800 * 1024) {
      alert("File exceeds 800KB limit. Please choose a smaller file or compress it.");
      return;
    }
    setFileFunction(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (!electricityFile) {
      setErrorMessage("Please upload your electricity utility bill for verification.");
      return;
    }

    setSubmitting(true);
    setStatusMessage("Running AI OCR audit scan...");

    try {
      // Map electricityUsage/waterUsage input values directly into bill fee fields expected by backend/admin
      await submitHotelApplication(
        {
          ...formData,
          rooms: formData.roomCount,
          electricityBillFee: Number(formData.electricityUsage) || 4500.00,
          waterBillFee: Number(formData.waterUsage) || 0,
          status: "Pending Review",
          certificationTier: null,
        },
        electricityFile,
        waterFile
      );

      alert("Application submitted successfully! It is now under review by Admin.");

      if (onNavigate) {
        onNavigate("/hotel/partner-dashboard");
      } else {
        window.location.hash = "/hotel/partner-dashboard";
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Failed to submit application.");
    } finally {
      setSubmitting(false);
      setStatusMessage("");
    }
  };

  const avatarLetter = (partnerEmail || "u").charAt(0).toUpperCase();

  return (
    <div style={styles.container}>
      {/* Top Navbar */}
      <header style={styles.header}>
        <div style={styles.brand}>
          <div style={styles.logoBadge}>
            <Leaf size={18} color="#fff" />
          </div>
          <span style={styles.brandTitle}>GreenTrip Malaysia</span>
        </div>
        <div style={styles.profileBadge}>
          <div style={{ textAlign: "right" }}>
            <div style={styles.profileName}>
              {partnerDisplayName}
            </div>
            <div style={styles.profileScore}>Hotel Partner Portal</div>
          </div>
          <div style={styles.avatar}>{avatarLetter}</div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.titleSection}>
          <h1 style={styles.heading}>Green Certification Application</h1>
          <p style={styles.subheading}>Submit your property billing details and utility statements for verified audit</p>
        </div>

        <button
          type="button"
          onClick={() => (onNavigate ? onNavigate("/hotel/partner-dashboard") : (window.location.hash = "/hotel/partner-dashboard"))}
          style={styles.backBtn}
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>

        {errorMessage && (
          <div style={styles.errorBanner}>
            <AlertCircle size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {statusMessage && (
          <div style={styles.statusBanner}>
            <CheckCircle2 size={18} color="#0284c7" />
            <span>{statusMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.formContainer}>
          {/* Card 1: Property Details */}
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Hotel Information</h2>
            <p style={styles.cardSubtitle}>Basic details about your property</p>

            <div style={styles.fullWidthGroup}>
              <label style={styles.label}>Hotel Name</label>
              <input
                type="text"
                name="hotelName"
                value={formData.hotelName}
                onChange={handleInputChange}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.twoColumnGrid}>
              <div>
                <label style={styles.label}>Address</label>
                <input
                  type="text"
                  name="address"
                  placeholder="e.g. Jalan Batu Ferringhi"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>State</label>
                <input
                  type="text"
                  name="state"
                  placeholder="e.g. Penang, Kuala Lumpur"
                  value={formData.state}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>Number of Rooms</label>
                <input
                  type="number"
                  name="roomCount"
                  placeholder="e.g. 120"
                  value={formData.roomCount}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>
                  Contact Email
                  <span style={styles.lockedHint}>Locked (Account Identifier)</span>
                </label>
                <input
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  disabled
                  style={{
                    ...styles.input,
                    backgroundColor: "#f3f4f6",
                    color: "#6b7280",
                    cursor: "not-allowed",
                  }}
                />
              </div>
            </div>
          </section>

          {/* Card 2: Utility Usage & Files */}
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Utility Pricing & Documents</h2>
            <p style={styles.cardSubtitle}>Enter monthly billing fees (RM) and attach your statements (&lt; 800KB)</p>

            <div style={styles.twoColumnGrid}>
              <div>
                <label style={styles.label}>Electricity Bill Fee (RM/mo)</label>
                <input
                  type="number"
                  step="0.01"
                  name="electricityUsage"
                  placeholder="e.g. 4500.00"
                  value={formData.electricityUsage}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>Water Bill Fee (RM/mo, Optional)</label>
                <input
                  type="number"
                  step="0.01"
                  name="waterUsage"
                  placeholder="e.g. 1200.00"
                  value={formData.waterUsage}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={{ ...styles.twoColumnGrid, marginTop: 16 }}>
              <div>
                <label style={styles.label}>Electricity Bill (Mandatory)</label>
                <label style={styles.fileUploadBox}>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileSelection(e.target.files[0], setElectricityFile)}
                  />
                  <span style={styles.chooseFilesBtn}>
                    {electricityFile ? electricityFile.name : "Choose Electricity Bill"}
                  </span>
                  <Upload size={16} color="#4b5563" />
                </label>
              </div>

              <div>
                <label style={styles.label}>Water Bill (Optional)</label>
                <label style={styles.fileUploadBox}>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileSelection(e.target.files[0], setWaterFile)}
                  />
                  <span style={styles.chooseFilesBtn}>
                    {waterFile ? waterFile.name : "Choose Water Bill"}
                  </span>
                  <Upload size={16} color="#4b5563" />
                </label>
              </div>
            </div>
          </section>

          {/* Card 3: Eco Practices */}
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Sustainability Initiatives</h2>
            <p style={styles.cardSubtitle}>Describe property green credentials</p>

            <div style={styles.fullWidthGroup}>
              <textarea
                name="sustainabilityInitiatives"
                rows={3}
                value={formData.sustainabilityInitiatives}
                onChange={handleInputChange}
                placeholder="Describe your eco-friendly practices (e.g. solar panels, rainwater harvesting, zero single-use plastic)..."
                style={styles.textarea}
              />
            </div>
          </section>

          {/* Form Actions */}
          <div style={styles.btnRow}>
            <button
              type="submit"
              disabled={submitting}
              style={{
                ...styles.btnSubmit,
                opacity: submitting ? 0.7 : 1,
                cursor: submitting ? "not-allowed" : "pointer",
              }}
            >
              {submitting ? "Submitting Application..." : "Submit Application"}
            </button>
            <button
              type="button"
              onClick={() => (onNavigate ? onNavigate("/hotel/partner-dashboard") : (window.location.hash = "/hotel/partner-dashboard"))}
              style={styles.btnCancel}
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f3f4f6",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    paddingBottom: 60,
  },
  header: {
    backgroundColor: "#fff",
    height: 64,
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 36px",
  },
  brand: { display: "flex", alignItems: "center", gap: 10 },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: { fontSize: 18, fontWeight: 800, color: "#111827" },
  profileBadge: { display: "flex", alignItems: "center", gap: 12 },
  profileName: { fontSize: 14, fontWeight: 700, color: "#111827" },
  profileScore: { fontSize: 11.5, color: "#6b7280" },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    backgroundColor: "#fed7aa",
    color: "#9a3412",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 16,
    fontWeight: 800,
  },
  main: { maxWidth: 780, margin: "0 auto", padding: "36px 20px 0 20px" },
  titleSection: { marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 },
  subheading: { fontSize: 13, color: "#6b7280", marginTop: 4, margin: 0 },
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    border: "none",
    background: "transparent",
    fontSize: 13.5,
    fontWeight: 600,
    color: "#374151",
    cursor: "pointer",
    padding: "4px 0",
    marginBottom: 20,
  },
  errorBanner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fee2e2",
    color: "#b91c1c",
    padding: "12px 16px",
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 13.5,
    fontWeight: 500,
  },
  statusBanner: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#e0f2fe",
    color: "#0369a1",
    padding: "12px 16px",
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 13.5,
    fontWeight: 600,
  },
  formContainer: { display: "flex", flexDirection: "column", gap: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column",
  },
  cardTitle: { fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 },
  cardSubtitle: { fontSize: 12.5, color: "#9ca3af", margin: "4px 0 16px 0" },
  fullWidthGroup: { display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 },
  twoColumnGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" },
  label: { fontSize: 13, fontWeight: 600, color: "#111827", marginBottom: 4, display: "block" },
  lockedHint: { fontSize: 11, fontWeight: 600, color: "#9ca3af", marginLeft: 8 },
  input: {
    width: "100%",
    backgroundColor: "#f3f4f6",
    border: "none",
    borderRadius: 10,
    padding: "12px 14px",
    fontSize: 13.5,
    color: "#111827",
    boxSizing: "border-box",
    outline: "none",
  },
  textarea: {
    width: "100%",
    backgroundColor: "#f3f4f6",
    border: "none",
    borderRadius: 10,
    padding: "12px 14px",
    fontSize: 13.5,
    color: "#111827",
    boxSizing: "border-box",
    outline: "none",
    resize: "vertical",
    fontFamily: "inherit",
  },
  fileUploadBox: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: "6px 12px 6px 6px",
    cursor: "pointer",
  },
  chooseFilesBtn: {
    backgroundColor: "#e5e7eb",
    color: "#374151",
    fontSize: 12,
    fontWeight: "600",
    padding: "6px 12px",
    borderRadius: 6,
    maxWidth: "85%",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  btnRow: { display: "flex", alignItems: "center", gap: 12, marginTop: 6 },
  btnSubmit: {
    backgroundColor: "#262626",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    padding: "10px 22px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  btnCancel: {
    backgroundColor: "#fff",
    color: "#374151",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    padding: "10px 22px",
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
};