export default function Footer() {
  return (
    <footer style={{
      padding: "0.75rem 1.5rem",
      borderTop: "1px solid var(--color-border)",
      background: "var(--color-surface)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      fontSize: "0.8125rem",
      color: "var(--color-text-muted)",
      flexShrink: 0,
    }}>
      <span>🐄 VetAssist Cattle Clinic</span>
      <span>Bovine Veterinary Management System &copy; {new Date().getFullYear()}</span>
    </footer>
  );
}
