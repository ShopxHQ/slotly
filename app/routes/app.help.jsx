import { useState } from "react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <s-card>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: "100%",
          textAlign: "left",
          backgroundColor: "transparent",
          border: "none",
          padding: "12px 0",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "15px",
          fontWeight: "500",
        }}
      >
        <s-text>{question}</s-text>
        <span>{isOpen ? "▼" : "▶"}</span>
      </button>
      {isOpen && (
        <s-block-stack gap="small" marginTop="medium" marginBottom="small">
          <s-divider />
          <s-text variant="bodySm">{answer}</s-text>
        </s-block-stack>
      )}
    </s-card>
  );
}

export default function Help() {
  return (
    <s-page heading="Help & Documentation">
      <s-layout>
        <s-layout-section>
          <s-section heading="Quick Start">
            <s-card>
              <s-block-stack gap="medium">
                <s-block-stack gap="small">
                  <s-text variant="headingSm">Step 1: Enable Slotly</s-text>
                  <s-text variant="bodySm">
                    Go to Settings and toggle on the 'Enable Slotly' option to activate the date picker across your store.
                  </s-text>
                </s-block-stack>

                <s-divider />

                <s-block-stack gap="small">
                  <s-text variant="headingSm">Step 2: Create a Schedule</s-text>
                  <s-text variant="bodySm">
                    Navigate to Schedules and click 'Create Schedule'. Set your lead time, available days, and any disabled dates.
                  </s-text>
                </s-block-stack>

                <s-divider />

                <s-block-stack gap="small">
                  <s-text variant="headingSm">Step 3: Configure Date Format</s-text>
                  <s-text variant="bodySm">
                    In Settings, choose how dates will display to customers (MM/DD/YYYY, DD/MM/YYYY, etc.).
                  </s-text>
                </s-block-stack>

                <s-divider />

                <s-block-stack gap="small">
                  <s-text variant="headingSm">Step 4: Add to Storefront</s-text>
                  <s-text variant="bodySm">
                    The Slotly Date Picker block is automatically available in your theme. Add it to product, cart, or checkout pages.
                  </s-text>
                </s-block-stack>

                <s-divider />

                <s-block-stack gap="small">
                  <s-text variant="headingSm">Step 5: Test & Monitor</s-text>
                  <s-text variant="bodySm">
                    Test the date picker on your storefront. Monitor usage in the Dashboard analytics to see customer adoption.
                  </s-text>
                </s-block-stack>
              </s-block-stack>
            </s-card>
          </s-section>

          <s-section heading="Key Features">
            <s-block-stack gap="medium">
              <s-card>
                <s-inline-stack gap="medium">
                  <s-text variant="headingSm">📅</s-text>
                  <s-block-stack gap="small">
                    <s-text variant="headingSm">Date Picker</s-text>
                    <s-text variant="bodySm">Calendar-based interface for easy date selection</s-text>
                  </s-block-stack>
                </s-inline-stack>
              </s-card>

              <s-card>
                <s-inline-stack gap="medium">
                  <s-text variant="headingSm">🚚</s-text>
                  <s-block-stack gap="small">
                    <s-text variant="headingSm">Delivery Dates</s-text>
                    <s-text variant="bodySm">Configure delivery window and lead times</s-text>
                  </s-block-stack>
                </s-inline-stack>
              </s-card>

              <s-card>
                <s-inline-stack gap="medium">
                  <s-text variant="headingSm">📍</s-text>
                  <s-block-stack gap="small">
                    <s-text variant="headingSm">Pickup Slots</s-text>
                    <s-text variant="bodySm">Set specific pickup dates and times</s-text>
                  </s-block-stack>
                </s-inline-stack>
              </s-card>

              <s-card>
                <s-inline-stack gap="medium">
                  <s-text variant="headingSm">🔧</s-text>
                  <s-block-stack gap="small">
                    <s-text variant="headingSm">Customizable</s-text>
                    <s-text variant="bodySm">Adjust labels, colors, and text to match your brand</s-text>
                  </s-block-stack>
                </s-inline-stack>
              </s-card>

              <s-card>
                <s-inline-stack gap="medium">
                  <s-text variant="headingSm">📱</s-text>
                  <s-block-stack gap="small">
                    <s-text variant="headingSm">Mobile Friendly</s-text>
                    <s-text variant="bodySm">Fully responsive design for all devices</s-text>
                  </s-block-stack>
                </s-inline-stack>
              </s-card>

              <s-card>
                <s-inline-stack gap="medium">
                  <s-text variant="headingSm">📊</s-text>
                  <s-block-stack gap="small">
                    <s-text variant="headingSm">Analytics</s-text>
                    <s-text variant="bodySm">Track date selections and customer behavior</s-text>
                  </s-block-stack>
                </s-inline-stack>
              </s-card>
            </s-block-stack>
          </s-section>

          <s-section heading="Frequently Asked Questions">
            <s-block-stack gap="small">
              <FAQItem
                question="How do I enable/disable the date picker?"
                answer="Go to Settings > Application Status and toggle the 'Enable Slotly' switch. When enabled, the date picker will appear on your storefront pages where you've added the Slotly Date Picker block."
              />
              <FAQItem
                question="Can I have different schedules for delivery and pickup?"
                answer="Yes! In Schedules, create separate schedules for delivery and pickup. You can set different lead times, available days, and cutoff times for each."
              />
              <FAQItem
                question="How do I disable specific dates like holidays?"
                answer="In Schedules, click 'Edit' on a schedule and add dates to the disabled dates section. These dates won't be available for customers to select."
              />
              <FAQItem
                question="Where are customer selections stored?"
                answer="Selected dates are automatically saved to customer orders in Shopify. You can view them in order details under 'Custom Attributes' or 'Line Item Properties'."
              />
              <FAQItem
                question="Can I customize the date picker appearance?"
                answer="Yes! In Settings, you can customize the label, placeholder text, and date format. The date picker block styling matches your theme by default."
              />
              <FAQItem
                question="Is the date picker mobile friendly?"
                answer="Absolutely! The date picker is fully responsive and works great on phones, tablets, and desktops."
              />
              <FAQItem
                question="How do I track usage?"
                answer="Visit the Dashboard to see quick stats on orders with date selections. Full analytics are coming soon."
              />
              <FAQItem
                question="What timezones are supported?"
                answer="We support major timezones including US Eastern, Central, Mountain, Pacific, and several international timezones (London, Paris, Tokyo, etc.)."
              />
            </s-block-stack>
          </s-section>
        </s-layout-section>

        <s-layout-section secondary>
          <s-section heading="Resources">
            <s-card>
              <s-block-stack gap="medium">
                <s-button fullWidth url="https://www.youtube.com" variant="secondary">
                  🎬 Watch Video Tutorial
                </s-button>
              </s-block-stack>
            </s-card>
          </s-section>

          <s-section heading="Support">
            <s-card>
              <s-block-stack gap="medium">
                <s-text variant="bodySm">
                  Need help? Contact our support team.
                </s-text>
                <s-button fullWidth url="mailto:support@slotly.app" variant="primary">
                  📧 Contact Support
                </s-button>
                <s-text variant="bodySm" tone="subdued">
                  We respond within 24 hours.
                </s-text>
              </s-block-stack>
            </s-card>
          </s-section>

          <s-section heading="Quick Links">
            <s-card>
              <s-block-stack gap="small">
                <s-button fullWidth url="/app" variant="secondary">
                  Back to Dashboard
                </s-button>
                <s-button fullWidth url="/app/schedules" variant="secondary">
                  Manage Schedules
                </s-button>
                <s-button fullWidth url="/app/settings" variant="secondary">
                  Configure Settings
                </s-button>
              </s-block-stack>
            </s-card>
          </s-section>
        </s-layout-section>
      </s-layout>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
