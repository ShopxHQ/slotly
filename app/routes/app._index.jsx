import { useNavigate, useLoaderData } from "react-router";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  return { shop: session.shop };
};

export default function Index() {
  const { shop } = useLoaderData();
  const navigate = useNavigate();

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
            <s-button variant="primary" onClick={() => navigate("/app/pickup")}>Manage Pickups</s-button>
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
            <s-button variant="primary" onClick={() => navigate("/app/delivery")}>Configure Delivery</s-button>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "24px", marginBottom: "24px", flexWrap: "wrap" }}>
        {/* Card 3: App Embed */}
        <div style={{
          flex: "1 1 400px",
          background: "#f0f4f9",
          border: "1px solid #d3e3fd",
          borderRadius: "10px",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }}>
          <div style={{ flex: 1 }}>
            <s-text variant="headingMd" style={{ fontWeight: "700", fontSize: "15px", display: "block" }}>
              App Activation
            </s-text>
            <s-text variant="bodyMd" tone="subdued" style={{ fontSize: "13px" }}>
              Please activate it to turn on the functionality on your store front.
            </s-text>
          </div>
          <s-button 
            variant="primary" 
            onClick={() => window.open(`https://${shop}/admin/themes/current/editor?context=apps&activateAppId=2c2828149edd2aa52678d883373118fb/Combined-layout`, '_blank')}
          >
            Activate
          </s-button>
        </div>

        {/* Card 4: App Block */}
        <div style={{
          flex: "1 1 400px",
          background: "#f0f4f9",
          border: "1px solid #d3e3fd",
          borderRadius: "10px",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }}>
          <div style={{ flex: 1 }}>
            <s-text variant="headingMd" style={{ fontWeight: "700", fontSize: "15px", display: "block" }}>
              Cart Page Integration
            </s-text>
            <s-text variant="bodyMd" tone="subdued" style={{ fontSize: "13px" }}>
              Add the widget to your cart page if it is not appearing automatically.
            </s-text>
          </div>
          <s-button 
            variant="primary" 
            onClick={() => window.open(`https://${shop}/admin/themes/current/editor?template=cart&addAppBlockId=2c2828149edd2aa52678d883373118fb/combined_layoutblock&target=main`, '_blank')}
          >
            Add to Cart
          </s-button>
        </div>
      </div>
    </s-page>
  );
}
