export function Toast({ message, type = "success", visible, onClose }) {
  if (!visible) return null;

  const colors = {
    success: { backgroundColor: "#d1fae5", color: "#065f46", borderColor: "#6ee7b7" },
    error: { backgroundColor: "#fee2e2", color: "#991b1b", borderColor: "#fca5a5" },
    info: { backgroundColor: "#dbeafe", color: "#0c2d6b", borderColor: "#93c5fd" },
    warning: { backgroundColor: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" },
  };

  return (
    <div style={{
      position: "fixed",
      bottom: "20px",
      right: "20px",
      padding: "16px",
      borderRadius: "6px",
      border: `1px solid ${colors[type].borderColor}`,
      fontSize: "14px",
      zIndex: 2000,
      display: "flex",
      alignItems: "center",
      gap: "12px",
      ...colors[type],
    }}>
      {message}
      {onClose && (
        <button
          onClick={onClose}
          style={{
            backgroundColor: "transparent",
            border: "none",
            color: "inherit",
            cursor: "pointer",
            fontSize: "18px",
            padding: "0",
            marginLeft: "8px",
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
}
