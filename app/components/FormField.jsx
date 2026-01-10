export function FormField({ label, type = "text", value, onChange, placeholder, helpText, required = false, options = [] }) {
  return (
    <div style={{ marginBottom: "16px" }}>
      {label && (
        <label style={{
          display: "block",
          marginBottom: "8px",
          fontSize: "14px",
          fontWeight: "500",
          color: "#000",
        }}>
          {label}
          {required && <span style={{ color: "#dc2626" }}>*</span>}
        </label>
      )}

      {type === "textarea" ? (
        <textarea
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "14px",
            fontFamily: "inherit",
            boxSizing: "border-box",
            minHeight: "80px",
          }}
        />
      ) : type === "select" ? (
        <select
          value={value}
          onChange={onChange}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "14px",
            boxSizing: "border-box",
          }}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #e5e7eb",
            borderRadius: "6px",
            fontSize: "14px",
            boxSizing: "border-box",
          }}
        />
      )}

      {helpText && (
        <p style={{
          margin: "6px 0 0 0",
          fontSize: "12px",
          color: "#999",
        }}>
          {helpText}
        </p>
      )}
    </div>
  );
}
