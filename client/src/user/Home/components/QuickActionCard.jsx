export default function QuickActionCard({ icon: Icon, iconColor = "#10b981", title, subtitle, onClick }) {
  return (
    <button onClick={onClick} style={styles.card}>
      {Icon && (
        <div style={{ ...styles.iconChip, background: `${iconColor}1A` }}>
          <Icon size={20} color={iconColor} />
        </div>
      )}
      <div style={styles.text}>
        {title && <div style={styles.title}>{title}</div>}
        {subtitle && <div style={styles.subtitle}>{subtitle}</div>}
      </div>
    </button>
  );
}

const styles = {
  card: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    borderRadius: 12,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
    textAlign: "left",
    width: "100%",
  },
  iconChip: {
    width: 36,
    height: 36,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  text: { minWidth: 0 },
  title: { fontSize: 14, fontWeight: 700, color: "#111827" },
  subtitle: { fontSize: 12.5, color: "#6b7280", marginTop: 2 },
};