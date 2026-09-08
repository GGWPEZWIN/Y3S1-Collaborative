import React, { useState } from "react";
import { Leaf, ChevronLeft, Upload } from "lucide-react";

export default function CertificationApply({ onNavigate }) {
  // Form State
  const [formData, setFormData] = useState({
    hotelName: "",
    address: "",
    state: "",
    roomCount: "",
    contactEmail: "",
    waterUsage: "",
    electricityUsage: "",
    sustainabilityInitiatives: "",
  });

  const [waterBillFile, setWaterBillFile] = useState(null);
  const [electricityBillFile, setElectricityBillFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitting(true);

    // Mock API submission
    setTimeout(() => {
      setSubmitting(false);
      alert("Application submitted successfully for audit review!");
      if (onNavigate) {
        onNavigate("/hotel-dashboard");
      }
    }, 600);
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
            <div style={styles.profileName}>Keshi</div>
            <div style={styles.profileScore}>Eco Score: 8,750</div>
          </div>
          <div style={styles.avatar}>🐱</div>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={styles.main}>
        {/* Title Section */}
        <div style={styles.titleSection}>
          <h1 style={styles.heading}>Green Certification Application</h1>
          <p style={styles.subheading}>Apply for eco-certification for your hotel</p>
        </div>

        {/* Back Link */}
        <button
          type="button"
          onClick={() => onNavigate?.("/hotel-dashboard")}
          style={styles.backBtn}
        >
          <ChevronLeft size={16} />
          <span>Back</span>
        </button>

        {/* Form */}
        <form onSubmit={handleSubmit} style={styles.formContainer}>
          {/* Card 1: Hotel Information */}
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
                  value={formData.contactEmail}
                  onChange={handleInputChange}
                  required
                  style={styles.input}
                />
              </div>
            </div>
          </section>

          {/* Card 2: Utility Data */}
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Utility Data</h2>
            <p style={styles.cardSubtitle}>Monthly average consumption</p>

            <div style={styles.fullWidthGroup}>
              <label style={styles.label}>Water Usage (liters / month)</label>
              <input
                type="number"
                name="waterUsage"
                value={formData.waterUsage}
                onChange={handleInputChange}
                required
                style={styles.input}
              />
            </div>

            <div style={styles.fullWidthGroup}>
              <label style={styles.label}>Electricity Usage (kWh / month)</label>
              <input
                type="number"
                name="electricityUsage"
                value={formData.electricityUsage}
                onChange={handleInputChange}
                required
                style={styles.input}
              />
            </div>
          </section>

          {/* Card 3: Supporting Documents */}
          <section style={styles.card}>
            <h2 style={styles.cardTitle}>Supporting Documents</h2>
            <p style={styles.cardSubtitle}>Upload utility bills and proof of eco-initiatives</p>

            {/* Water Bill Upload */}
            <div style={styles.fullWidthGroup}>
              <label style={styles.label}>Water Bill (Last 3 months)</label>
              <label style={styles.fileUploadBox}>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  style={{ display: "none" }}
                  onChange={(e) => setWaterBillFile(e.target.files[0])}
                />
                <span style={styles.chooseFilesBtn}>
                  {waterBillFile ? waterBillFile.name : "Choose Files"}
                </span>
                <Upload size={18} color="#4b5563" />
              </label>
            </div>

            {/* Electricity Bill Upload */}
            <div style={styles.fullWidthGroup}>
              <label style={styles.label}>Electricity Bill (Last 3 months)</label>
              <label style={styles.fileUploadBox}>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  style={{ display: "none" }}
                  onChange={(e) => setElectricityBillFile(e.target.files[0])}
                />
                <span style={styles.chooseFilesBtn}>
                  {electricityBillFile ? electricityBillFile.name : "Choose Files"}
                </span>
                <Upload size={18} color="#4b5563" />
              </label>
            </div>

            {/* Sustainability Initiatives */}
            <div style={styles.fullWidthGroup}>
              <label style={styles.label}>Sustainability Initiatives</label>
              <textarea
                name="sustainabilityInitiatives"
                rows={4}
                value={formData.sustainabilityInitiatives}
                onChange={handleInputChange}
                placeholder="Describe your eco-friendly practices...."
                style={styles.textarea}
              />
            </div>
          </section>

          {/* Form Action Buttons */}
          <div style={styles.btnRow}>
            <button
              type="submit"
              disabled={submitting}
              style={styles.btnSubmit}
            >
              {submitting ? "Submitting..." : "Submit Application"}
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
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: 800,
    color: "#111827",
  },
  profileBadge: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  profileName: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
  },
  profileScore: {
    fontSize: 11.5,
    color: "#6b7280",
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    backgroundColor: "#e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 20,
  },
  main: {
    maxWidth: 780,
    margin: "0 auto",
    padding: "36px 20px 0 20px",
  },
  titleSection: {
    marginBottom: 16,
  },
  heading: {
    fontSize: 24,
    fontWeight: 800,
    color: "#111827",
    margin: 0,
  },
  subheading: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
    margin: 0,
  },
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
  formContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    padding: "24px 28px",
    display: "flex",
    flexDirection: "column",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 700,
    color: "#111827",
    margin: 0,
  },
  cardSubtitle: {
    fontSize: 12.5,
    color: "#9ca3af",
    margin: "4px 0 18px 0",
  },
  fullWidthGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 16,
  },
  twoColumnGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "16px 20px",
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: "#111827",
    marginBottom: 4,
    display: "block",
  },
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
  btnRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginTop: 6,
  },
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