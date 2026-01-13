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

        {/* Card 3: App Embed */}
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
            App Activation
          </s-text>
          <s-text variant="bodyMd" tone="subdued">
            Please activate it to turn on the functionality on your store front.
          </s-text>
          <div style={{ marginTop: "auto", paddingTop: "8px" }}>
            <s-button 
              variant="primary" 
              onClick={() => window.open(`https://${shop}/admin/themes/current/editor?context=apps&activateAppId=30fc31b8-7bac-f063-5988-ecff3bc8117e2d879087/pickup-timer`, '_blank')}
            >
              Activate App Embed
            </s-button>
          </div>
        </div>

        {/* Card 4: App Block */}
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
            Cart Page Integration
          </s-text>
          <s-text variant="bodyMd" tone="subdued">
            If it is not showing on cart page then click on this button to add this.
          </s-text>
          <div style={{ marginTop: "auto", paddingTop: "8px" }}>
            <s-button 
              variant="primary" 
              onClick={() => window.open(`https://${shop}/admin/themes/current/editor?template=cart&addAppBlockId=30fc31b8-7bac-f063-5988-ecff3bc8117e2d879087/combined_layoutblock`, '_blank')}
            >
              Add to Cart Page
            </s-button>
          </div>
        </div>
      </div>
    </s-page>
  );
}
