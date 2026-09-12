import { useEffect, useState } from "react";
import {
  Leaf,
  ChevronLeft,
  Upload,
  AlertCircle,
  CheckCircle2,
  Calculator,
  Calendar
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

  // 3-Month Electricity Data & Files
  const [electricityMonths, setElectricityMonths] = useState({
    m1_kwh: "",
    m2_kwh: "",
    m3_kwh: "",
  });
  const [electricityFiles, setElectricityFiles] = useState({
    m1_file: null,
    m2_file: null,
    m3_file: null,
  });

  // 3-Month Water Data & Files
  const [waterMonths, setWaterMonths] = useState({
    m1_liters: "",
    m2_liters: "",
    m3_liters: "",
  });
  const [waterFiles, setWaterFiles] = useState({
    m1_file: null,
    m2_file: null,
    m3_file: null,
  });

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

  const handleElecMonthChange = (e) => {
    const { name, value } = e.target;
    setElectricityMonths((prev) => ({ ...prev, [name]: value }));
  };

  const handleWaterMonthChange = (e) => {
    const { name, value } = e.target;
    setWaterMonths((prev) => ({ ...prev, [name]: value }));
  };

  // Calculate 3-month averages
  const calcElecAverage = () => {
    const v1 = parseFloat(electricityMonths.m1_kwh) || 0;
    const v2 = parseFloat(electricityMonths.m2_kwh) || 0;
    const v3 = parseFloat(electricityMonths.m3_kwh) || 0;
    const count = [electricityMonths.m1_kwh, electricityMonths.m2_kwh, electricityMonths.m3_kwh].filter(Boolean).length;
    return count > 0 ? Math.round((v1 + v2 + v3) / count) : 0;
  };

  const calcWaterAverage = () => {
    const v1 = parseFloat(waterMonths.m1_liters) || 0;
    const v2 = parseFloat(waterMonths.m2_liters) || 0;
    const v3 = parseFloat(waterMonths.m3_liters) || 0;
    const count = [waterMonths.m1_liters, waterMonths.m2_liters, waterMonths.m3_liters].filter(Boolean).length;
    return count > 0 ? Math.round((v1 + v2 + v3) / count) : 0;
  };

  // Helper for file sizes
  const handleFileSelection = (file, setFunction, keyName) => {
    if (!file) return;
    if (file.size > 800 * 1024) {
      alert("File exceeds 800KB. Please compress the file.");
      return;
    }
    setFunction((prev) => ({ ...prev, [keyName]: file }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    // Verification: ensure all 3 electricity bills are provided
    if (!electricityFiles.m1_file || !electricityFiles.m2_file || !electricityFiles.m3_file) {
      setErrorMessage("Please upload all 3 consecutive electricity bills for baseline verification.");
      return;
    }

    // Duplicate detection check
    const elecNames = [electricityFiles.m1_file?.name, electricityFiles.m2_file?.name, electricityFiles.m3_file?.name];
    if (new Set(elecNames).size !== elecNames.length) {
      setErrorMessage("Duplicate files detected in electricity uploads. Please provide 3 distinct consecutive monthly statements.");
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
        electricityFiles.m1_file,
        waterFiles.m1_file || electricityFiles.m1_file
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

          {/* Card 2: 3-Month Electricity Data & Uploads */}
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
              <div style={{ flex: 1.5 }}>
                <label style={styles.fileUploadBox}>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileSelection(e.target.files[0], setElectricityFiles, "m1_file")}
                  />
                  <span style={styles.chooseFilesBtn}>
                    {electricityFiles.m1_file ? electricityFiles.m1_file.name : "Upload Month 1 Bill"}
                  </span>
                  <Upload size={16} color="#4b5563" />
                </label>
              </div>
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
              <div style={{ flex: 1.5 }}>
                <label style={styles.fileUploadBox}>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileSelection(e.target.files[0], setElectricityFiles, "m2_file")}
                  />
                  <span style={styles.chooseFilesBtn}>
                    {electricityFiles.m2_file ? electricityFiles.m2_file.name : "Upload Month 2 Bill"}
                  </span>
                  <Upload size={16} color="#4b5563" />
                </label>
              </div>
            </div>

            {/* Month 3 */}
            <div style={styles.monthUploadRow}>
              <div style={styles.monthLabelCol}>
                <Calendar size={14} color="#6b7280" />
                <strong>Month 3 (Oldest)</strong>
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  name="m3_kwh"
                  placeholder="Usage (kWh)"
                  value={electricityMonths.m3_kwh}
                  onChange={handleElecMonthChange}
                  required
                  style={styles.input}
                />
              </div>
              <div style={{ flex: 1.5 }}>
                <label style={styles.fileUploadBox}>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileSelection(e.target.files[0], setElectricityFiles, "m3_file")}
                  />
                  <span style={styles.chooseFilesBtn}>
                    {electricityFiles.m3_file ? electricityFiles.m3_file.name : "Upload Month 3 Bill"}
                  </span>
                  <Upload size={16} color="#4b5563" />
                </label>
              </div>
            </div>
          </section>

          {/* Card 3: 3-Month Water Data & Uploads */}
          <section style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div>
                <h2 style={styles.cardTitle}>Water Utility Audit (Last 3 Months)</h2>
                <p style={styles.cardSubtitle}>Submit 3 consecutive statements for baseline water benchmarking</p>
              </div>
              <div style={styles.averagePill}>
                <Calculator size={14} color="#0284c7" />
                <span>Average: <strong>{calcWaterAverage().toLocaleString()} L/mo</strong></span>
              </div>
            </div>

            {/* Month 1 */}
            <div style={styles.monthUploadRow}>
              <div style={styles.monthLabelCol}>
                <Calendar size={14} color="#6b7280" />
                <strong>Month 1 (Latest)</strong>
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  name="m1_liters"
                  placeholder="Usage (Liters)"
                  value={waterMonths.m1_liters}
                  onChange={handleWaterMonthChange}
                  style={styles.input}
                />
              </div>
              <div style={{ flex: 1.5 }}>
                <label style={styles.fileUploadBox}>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileSelection(e.target.files[0], setWaterFiles, "m1_file")}
                  />
                  <span style={styles.chooseFilesBtn}>
                    {waterFiles.m1_file ? waterFiles.m1_file.name : "Upload Month 1 Bill"}
                  </span>
                  <Upload size={16} color="#4b5563" />
                </label>
              </div>
            </div>

            {/* Month 2 */}
            <div style={styles.monthUploadRow}>
              <div style={styles.monthLabelCol}>
                <Calendar size={14} color="#6b7280" />
                <strong>Month 2 (Prior)</strong>
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  name="m2_liters"
                  placeholder="Usage (Liters)"
                  value={waterMonths.m2_liters}
                  onChange={handleWaterMonthChange}
                  style={styles.input}
                />
              </div>
              <div style={{ flex: 1.5 }}>
                <label style={styles.fileUploadBox}>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileSelection(e.target.files[0], setWaterFiles, "m2_file")}
                  />
                  <span style={styles.chooseFilesBtn}>
                    {waterFiles.m2_file ? waterFiles.m2_file.name : "Upload Month 2 Bill"}
                  </span>
                  <Upload size={16} color="#4b5563" />
                </label>
              </div>
            </div>

            {/* Month 3 */}
            <div style={styles.monthUploadRow}>
              <div style={styles.monthLabelCol}>
                <Calendar size={14} color="#6b7280" />
                <strong>Month 3 (Oldest)</strong>
              </div>
              <div style={{ flex: 1 }}>
                <input
                  type="number"
                  name="m3_liters"
                  placeholder="Usage (Liters)"
                  value={waterMonths.m3_liters}
                  onChange={handleWaterMonthChange}
                  style={styles.input}
                />
              </div>
              <div style={{ flex: 1.5 }}>
                <label style={styles.fileUploadBox}>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf"
                    style={{ display: "none" }}
                    onChange={(e) => handleFileSelection(e.target.files[0], setWaterFiles, "m3_file")}
                  />
                  <span style={styles.chooseFilesBtn}>
                    {waterFiles.m3_file ? waterFiles.m3_file.name : "Upload Month 3 Bill"}
                  </span>
                  <Upload size={16} color="#4b5563" />
                </label>
              </div>
            </div>
          </section>

          {/* Card 4: Eco Practices */}
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
              {submitting ? "Processing 3-Month Audit..." : "Submit Application"}
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
  averagePill: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#f0f9ff",
    border: "1px solid #bae6fd",
    color: "#0369a1",
    padding: "4px 12px",
    borderRadius: 12,
    fontSize: 12,
  },
  monthUploadRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 12,
  },
  monthLabelCol: {
    width: 140,
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12.5,
    color: "#374151",
  },
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