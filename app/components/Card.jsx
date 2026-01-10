export function Card({ children, padding = "20px", title, subtitle, noBorder = false }) {
  return (
    <div style={{
      padding,
      borderRadius: "8px",
      backgroundColor: "#fff",
      border: noBorder ? "none" : "1px solid #e5e7eb",
      boxShadow: noBorder ? "0 1px 3px rgba(0, 0, 0, 0.1)" : "none",
    }}>
      {title && (
        <>
          <h3 style={{
            margin: "0 0 4px 0",
            fontSize: "16px",
            fontWeight: "600",
            color: "#000",
          }}>
            {title}
          </h3>
          {subtitle && (
            <p style={{
              margin: "0 0 16px 0",
              fontSize: "13px",
              color: "#666",
            }}>
              {subtitle}
            </p>
          )}
        </>
      )}
      {children}
    </div>
  );
}
