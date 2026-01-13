import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Dashboard() {
  return (
    <s-page heading="Dashboard">
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "24px",
        margin: "24px 0",
      }}>
        {/* Card 1 */}
        <div style={{
          background: "white",
          border: "1px solid #e5e5e5",
          borderRadius: "10px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}>
          <s-text variant="headingMd" style={{ fontWeight: "700", fontSize: "16px" }}>
            Store Pickup Overview
          </s-text>
          <s-text variant="bodyMd" tone="subdued">
            Manage your store locations, pickup hours, and special closures to provide a seamless pickup experience for your customers.
          </s-text>
          <div style={{ marginTop: "auto", paddingTop: "8px" }}>
            <s-button variant="primary" url="/app">Manage Pickups</s-button>
          </div>
        </div>

        {/* Card 2 */}
        <div style={{
          background: "white",
          border: "1px solid #e5e5e5",
          borderRadius: "10px",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}>
          <s-text variant="headingMd" style={{ fontWeight: "700", fontSize: "16px" }}>
            Delivery Configuration
          </s-text>
          <s-text variant="bodyMd" tone="subdued">
            Set up your delivery schedule, blocked dates, and lead times to ensure your delivery service meets your business needs.
          </s-text>
          <div style={{ marginTop: "auto", paddingTop: "8px" }}>
            <s-button variant="primary" url="/app/delivery">Configure Delivery</s-button>
          </div>
        </div>
      </div>
    </s-page>
  );
}
