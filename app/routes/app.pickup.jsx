import { useState } from "react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Pickup() {
  const [pickupSettings, setPickupSettings] = useState({
    enabled: true,
    leadTimeHours: 24,
    maxSelectableDays: 31,
    disableWeekends: false,
    cutoffTime: "18:00",
  });

  return (
    <s-page heading="Pickup Configuration">
      <s-button slot="primary-action" variant="primary">
        Save Changes
      </s-button>

      <s-layout>
        <s-layout-section>
          <s-section heading="Pickup Settings">
            <s-card>
              <s-form-layout>
                <s-checkbox
                  label="Enable Pickup"
                  checked={pickupSettings.enabled}
                  onChange={(value) =>
                    setPickupSettings({ ...pickupSettings, enabled: value })
                  }
                />

                <s-text-field
                  label="Lead Time (hours)"
                  type="number"
                  value={pickupSettings.leadTimeHours}
                  onChange={(value) =>
                    setPickupSettings({
                      ...pickupSettings,
                      leadTimeHours: parseInt(value),
                    })
                  }
                />

                <s-text-field
                  label="Maximum Selectable Days"
                  type="number"
                  value={pickupSettings.maxSelectableDays}
                  onChange={(value) =>
                    setPickupSettings({
                      ...pickupSettings,
                      maxSelectableDays: parseInt(value),
                    })
                  }
                />

                <s-checkbox
                  label="Disable Weekends"
                  checked={pickupSettings.disableWeekends}
                  onChange={(value) =>
                    setPickupSettings({
                      ...pickupSettings,
                      disableWeekends: value,
                    })
                  }
                />

                <s-text-field
                  label="Cutoff Time (HH:MM)"
                  value={pickupSettings.cutoffTime}
                  onChange={(value) =>
                    setPickupSettings({
                      ...pickupSettings,
                      cutoffTime: value,
                    })
                  }
                />
              </s-form-layout>
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
