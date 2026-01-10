export function Toggle({ label, checked, onChange, helpText }) {
  return (
    <div style={{ marginBottom: "16px", display: "flex", alignItems: "flex-start", gap: "12px" }}>
      <div style={{ marginTop: "4px" }}>
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          style={{ width: "18px", height: "18px", cursor: "pointer" }}
        />
      </div>
      <div>
        {label && (
          <label style={{
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
            color: "#000",
            cursor: "pointer",
          }}>
            {label}
          </label>
        )}
        {helpText && (
          <p style={{
            margin: "4px 0 0 0",
            fontSize: "12px",
            color: "#999",
          }}>
            {helpText}
          </p>
        )}
      </div>
    </div>
  );
}
