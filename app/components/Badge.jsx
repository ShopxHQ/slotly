export function Badge({ children, type = "primary" }) {
  const styles = {
    primary: { backgroundColor: "#0066cc", color: "white" },
    success: { backgroundColor: "#10b981", color: "white" },
    warning: { backgroundColor: "#f59e0b", color: "white" },
    inactive: { backgroundColor: "#e5e7eb", color: "#626262" },
    info: { backgroundColor: "#3b82f6", color: "white" },
  };

  return (
    <span style={{
      display: "inline-block",
      padding: "4px 12px",
      borderRadius: "12px",
      fontSize: "12px",
      fontWeight: "500",
      ...styles[type],
    }}>
      {children}
    </span>
  );
}
