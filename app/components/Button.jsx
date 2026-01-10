export function Button({ children, onClick, type = "primary", disabled = false, size = "medium" }) {
  const styles = {
    primary: {
      backgroundColor: "#0066cc",
      color: "white",
      border: "none",
    },
    secondary: {
      backgroundColor: "white",
      color: "#0066cc",
      border: "1px solid #0066cc",
    },
    danger: {
      backgroundColor: "#fecaca",
      color: "#b91c1c",
      border: "none",
    },
    ghost: {
      backgroundColor: "transparent",
      color: "#0066cc",
      border: "none",
    },
  };

  const sizeStyles = {
    small: { padding: "8px 12px", fontSize: "13px" },
    medium: { padding: "10px 16px", fontSize: "14px" },
    large: { padding: "12px 24px", fontSize: "15px" },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        borderRadius: "6px",
        fontWeight: "500",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.2s",
        ...styles[type],
        ...sizeStyles[size],
      }}
      onMouseEnter={(e) => {
        if (!disabled && type === "primary") {
          e.target.style.backgroundColor = "#0052a3";
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && type === "primary") {
          e.target.style.backgroundColor = "#0066cc";
        }
      }}
    >
      {children}
    </button>
  );
}
