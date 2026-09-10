import React, { useEffect, useState } from "react";
import { 
  Leaf, 
  ChevronLeft, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  FileText 
} from "lucide-react";
import { auth } from "../firebase/config";
import { submitHotelApplication } from "../firebase/hotelService";

export default function CertificationApply({ onNavigate }) {
  const [formData, setFormData] = useState({
    hotelName: "",
    address: "",
    state: "",
    roomCount: "",
    contactEmail: "",
    electricityUsage: "",
    waterUsage: "",
    sustainabilityInitiatives: "",
  });

  const [electricityFile, setElectricityFile] = useState(null);
  const [waterFile, setWaterFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Pre-fill contact email if hotel user is logged in
  useEffect(() => {
    const user = auth.currentUser;
    if (user && user.email) {
      setFormData((prev) => ({ ...prev, contactEmail: user.email }));
    }
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
    setStatusMessage("Running AI fraud detection & OCR audit scan...");

    try {
      // Pass single files to submitHotelApplication
      const result = await submitHotelApplication(
        {
          ...formData,
          rooms: formData.roomCount,
          status: "Pending Review",
          certificationTier: null,
        },
        electricityFile,
        waterFile
      );

      if (result?.status === "Flagged") {
        alert(
          `Application Submitted with Discrepancies:\n${result.reason}\n\nYour application has been flagged for human review and spot-checking.`
        );
      } else {
        alert("Application submitted successfully! Baseline under review.");
      }

      if (onNavigate) {
        onNavigate("/hotel-dashboard");
      }
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || "Failed to submit application.");
    } finally {
      setSubmitting(false);
      setStatusMessage("");
    }
  };

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
              {auth.currentUser?.email?.split("@")[0] || "Partner"}
            </div>
            <div style={styles.profileScore}>Hotel Partner Portal</div>
          </div>
          <div style={styles.avatar}>🏨</div>
        </div>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        <div style={styles.titleSection}>
          <h1 style={styles.heading}>Green Certification Application</h1>
          <p style={styles.subheading}>Submit your property metrics and utility bills for verified audit</p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate?.("/hotel-dashboard")}
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
                placeholder="e.g. Rainforest Haven Resort"
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
                <label style={styles.label}>Contact Email</label>
                <input
                  type="email"
                  name="contactEmail"
                  placeholder="partner@hotel.com"
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                />
              </div>
            </div>
          </section>

          {/* Card 2: Utility Usage & Files */}
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Utility Metrics & Documents</h2>
            <p style={styles.cardSubtitle}>Enter monthly consumption and attach your statements (&lt; 800KB)</p>

            <div style={styles.twoColumnGrid}>
              <div>
                <label style={styles.label}>Electricity Usage (kWh/mo)</label>
                <input
                  type="number"
                  name="electricityUsage"
                  placeholder="e.g. 12000"
                  value={formData.electricityUsage}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                />
              </div>

              <div>
                <label style={styles.label}>Water Usage (Liters/mo)</label>
                <input
                  type="number"
                  name="waterUsage"
                  placeholder="e.g. 30000"
                  value={formData.waterUsage}
                  onChange={handleInputChange}
                  required
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
              onClick={() => onNavigate?.("/hotel-dashboard")}
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
    borderBottom: "1px solid #e5e7eb",
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
    backgroundColor: "#fef3c7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 18,
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
    fontWeight: 600,
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