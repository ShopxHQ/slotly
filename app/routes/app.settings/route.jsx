import { useState } from "react";
import { authenticate } from "../../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { json } from "../../utils/json.js";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return json({
    settings: {
      appEnabled: true,
      defaultMode: "both",
      isRequired: true,
      label: "Delivery/Pickup Date",
      placeholder: "Select a date",
      dateFormat: "MM/DD/YYYY",
    },
  });
};

export default function Settings() {
  const [settings, setSettings] = useState({
    appEnabled: true,
    defaultMode: "both",
    isRequired: true,
    label: "Delivery/Pickup Date",
    placeholder: "Select a date",
    dateFormat: "MM/DD/YYYY",
  });

  const [showToast, setShowToast] = useState(false);

  const handleSave = () => {
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleReset = () => {
    setSettings({
      appEnabled: true,
      defaultMode: "both",
      isRequired: true,
      label: "Delivery/Pickup Date",
      placeholder: "Select a date",
      dateFormat: "MM/DD/YYYY",
    });
  };

  return (
    <s-page heading="Settings">
      <s-layout>
        <s-layout-section>
          <s-section heading="Application Status">
            <s-card>
              <s-block-stack gap="medium">
                <s-checkbox
                  label="Enable Slotly"
                  helpText="When disabled, the date picker won't appear on product pages"
                  checked={settings.appEnabled}
                  onChange={(value) => setSettings({ ...settings, appEnabled: value })}
                />
              </s-block-stack>
            </s-card>
          </s-section>

          <s-section heading="Default Configuration">
            <s-card>
              <s-form-layout>
                <s-select
                  label="Default Mode"
                  options={[
                    { label: "Delivery Only", value: "delivery" },
                    { label: "Pickup Only", value: "pickup" },
                    { label: "Both (Delivery & Pickup)", value: "both" },
                  ]}
                  value={settings.defaultMode}
                  onChange={(value) => setSettings({ ...settings, defaultMode: value })}
                  helpText="Choose the default scheduling option shown to customers"
                />

                <s-checkbox
                  label="Make Date Selection Required"
                  helpText="Customers must select a date before checkout"
                  checked={settings.isRequired}
                  onChange={(value) => setSettings({ ...settings, isRequired: value })}
                />
              </s-form-layout>
            </s-card>
          </s-section>

          <s-section heading="Date Picker Labels">
            <s-card>
              <s-form-layout>
                <s-text-field
                  label="Main Label"
                  type="text"
                  value={settings.label}
                  onChange={(e) => setSettings({ ...settings, label: e.currentTarget.value })}
                  helpText="This label appears above the date picker"
                />

                <s-text-field
                  label="Placeholder Text"
                  type="text"
                  value={settings.placeholder}
                  onChange={(e) => setSettings({ ...settings, placeholder: e.currentTarget.value })}
                  helpText="Text shown in the date input before selection"
                />

                <s-select
                  label="Date Format"
                  options={[
                    { label: "MM/DD/YYYY", value: "MM/DD/YYYY" },
                    { label: "DD/MM/YYYY", value: "DD/MM/YYYY" },
                    { label: "YYYY-MM-DD", value: "YYYY-MM-DD" },
                    { label: "MMM DD, YYYY", value: "MMM DD, YYYY" },
                  ]}
                  value={settings.dateFormat}
                  onChange={(value) => setSettings({ ...settings, dateFormat: value })}
                  helpText="How dates will be displayed to customers"
                />
              </s-form-layout>
            </s-card>
          </s-section>

          <s-section heading="Advanced Settings">
            <s-card>
              <s-block-stack gap="medium">
                <s-checkbox
                  label="Enable Cart Note"
                  helpText="Add selected date to cart notes"
                  checked={true}
                />

                <s-checkbox
                  label="Enable Analytics"
                  helpText="Track date picker usage and analytics"
                  checked={true}
                />

                <s-checkbox
                  label="Mobile Optimization"
                  helpText="Automatically optimize for mobile devices"
                  checked={true}
                />
              </s-block-stack>
            </s-card>
          </s-section>

          <s-inline-stack gap="medium">
            <s-button onClick={handleSave} variant="primary">
              Save Settings
            </s-button>
            <s-button onClick={handleReset} variant="secondary">
              Reset to Defaults
            </s-button>
          </s-inline-stack>
        </s-layout-section>

        <s-layout-section secondary>
          <s-card>
            <s-block-stack gap="medium">
              <s-text variant="headingMd">Helpful Tips</s-text>
              <s-block-stack gap="small">
                <s-text variant="bodySm">
                  • Changes to settings apply immediately to all storefront pages
                </s-text>
                <s-text variant="bodySm">
                  • Customer selections are always saved to order details
                </s-text>
                <s-text variant="bodySm">
                  • Test the date picker on your product pages after saving
                </s-text>
                <s-text variant="bodySm">
                  • Use schedule management to set availability per date
                </s-text>
              </s-block-stack>
            </s-block-stack>
          </s-card>

          <s-card>
            <s-block-stack gap="medium">
              <s-text variant="headingMd">Quick Links</s-text>
              <s-block-stack gap="small">
                <s-button fullWidth url="/app/schedules" variant="secondary">
                  Manage Schedules
                </s-button>
                <s-button fullWidth url="/app/help" variant="secondary">
                  View Documentation
                </s-button>
              </s-block-stack>
            </s-block-stack>
          </s-card>
        </s-layout-section>
      </s-layout>

      {showToast && (
        <s-banner title="Settings saved successfully!" tone="success" />
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
