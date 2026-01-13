import { useState } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { TIMEZONES, getTimezoneLabel } from "../lib/timezones";
import { getStoreRules } from "../lib/metafield-utils.server";

export const loader = async ({ request }) => {
  try {
    const { admin } = await authenticate.admin(request);
    
    let storeRules = [];
    
    try {
      console.log('Loader: Fetching store rules...');
      storeRules = await getStoreRules(admin.graphql);
      console.log('Loader: Store rules fetched:', storeRules);
    } catch (error) {
      console.error('Loader: Failed to load store rules:', error);
    }

    try {
      console.log('Loader: Creating free shipping discount...');
      const mutation = `#graphql
        mutation discountCodeFreeShippingCreate($freeShippingCodeDiscount: DiscountCodeFreeShippingInput!) {
          discountCodeFreeShippingCreate(freeShippingCodeDiscount: $freeShippingCodeDiscount) {
            codeDiscountNode {
              id
            }
            userErrors {
              field
              code
              message
            }
          }
        }
      `;
      
      const response = await admin.graphql(mutation, {
        variables: {
          freeShippingCodeDiscount: {
            startsAt: new Date().toISOString(),
            appliesOncePerCustomer: false,
            title: "Free Pickup",
            code: "FREEPICKUP",
            customerSelection: {
              all: true
            },
            destination: {
              all: true
            },
            minimumRequirement: {
              subtotal: {
                greaterThanOrEqualToSubtotal: 0.01
              }
            }
          }
        }
      });

      let responseData = response;
      if (response instanceof Response) {
        responseData = await response.json();
      }
      console.log('Discount creation response:', JSON.stringify(responseData, null, 2));
      const errors = responseData.data?.discountCodeFreeShippingCreate?.userErrors || [];
      if (errors.length > 0) {
        if (errors[0]?.message?.includes('already exists')) {
          console.log('Free Pickup discount already exists');
        } else {
          console.error('Error creating discount:', errors);
        }
      } else {
        console.log('Free Pickup discount created successfully');
      }
    } catch (error) {
      console.error('Loader: Failed to create discount:', error);
    }
    
    return { storeRules };
  } catch (error) {
    console.error('Loader authentication error:', error);
    return { storeRules: [] };
  }
};

export const action = async ({ request }) => {
  try {
    const { admin, session } = await authenticate.admin(request);
    const body = await request.json();
    const { rules } = body;

    if (!Array.isArray(rules)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid rules payload" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const mutation = `#graphql
      mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          userErrors { message }
        }
      }
    `;

    let result;
    try {
      result = await admin.graphql(mutation, {
        variables: {
          metafields: [
            {
              namespace: "pickup",
              key: "store_rules",
              type: "json",
              value: JSON.stringify(rules),
              ownerId: `gid://shopify/Shop/${session.shop}`,
            },
          ],
        },
      });
    } catch (graphqlError) {
      console.error("GraphQL request error:", graphqlError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to communicate with Shopify" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    let data;
    try {
      if (result instanceof Response) {
        data = await result.json();
      } else {
        data = result;
      }
    } catch (parseError) {
      console.error("Failed to parse GraphQL response:", parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid response from Shopify" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const errors = data?.data?.metafieldsSet?.userErrors || [];

    if (errors.length) {
      return new Response(
        JSON.stringify({ success: false, error: errors[0].message }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("ACTION ERROR:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

function ClosedDatesSection({ closedDates, onAddDate, onRemoveDate }) {
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1));
  };

  const handleDateClick = (day) => {
    const selected = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
    const dateString = selected.toISOString().split('T')[0];
    onAddDate(dateString);
  };

  const isDateSelected = (day) => {
    const dateString = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day).toISOString().split('T')[0];
    return closedDates.includes(dateString);
  };

  const monthName = calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const daysInMonth = getDaysInMonth(calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarMonth);
  const days = [];

  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div>
      <s-text variant="headingSm" tone="subdued" style={{ marginBottom: "4px", display: "block", textTransform: "uppercase", fontSize: "12px", letterSpacing: "0.5px" }}>
        Special Closures
      </s-text>
      <s-text variant="bodySm" tone="subdued" style={{ marginBottom: "16px", display: "block" }}>
        Click dates on the calendar when your store is closed
      </s-text>

      <div style={{
        background: "white",
        border: "1px solid #e0e0e0",
        borderRadius: "10px",
        padding: "20px",
        marginBottom: "16px",
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}>
          <button
            onClick={handlePrevMonth}
            style={{
              background: "none",
              border: "none",
              color: "#0073e6",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              padding: "4px 8px",
              borderRadius: "4px",
              transition: "background 0.2s",
            }}
            onMouseOver={(e) => e.target.style.background = "#f0f7ff"}
            onMouseOut={(e) => e.target.style.background = "none"}
          >
            ← Prev
          </button>
          <s-text variant="headingSm" style={{ minWidth: "160px", textAlign: "center", fontWeight: "600" }}>
            {monthName}
          </s-text>
          <button
            onClick={handleNextMonth}
            style={{
              background: "none",
              border: "none",
              color: "#0073e6",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              padding: "4px 8px",
              borderRadius: "4px",
              transition: "background 0.2s",
            }}
            onMouseOver={(e) => e.target.style.background = "#f0f7ff"}
            onMouseOut={(e) => e.target.style.background = "none"}
          >
            Next →
          </button>
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
          marginBottom: "12px",
        }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} style={{
              textAlign: "center",
              fontWeight: "700",
              fontSize: "11px",
              color: "#999",
              padding: "8px 0",
              textTransform: "uppercase",
              letterSpacing: "0.3px",
            }}>
              {day}
            </div>
          ))}
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: "4px",
        }}>
          {days.map((day, idx) => (
            day ? (
              <button
                key={idx}
                onClick={() => handleDateClick(day)}
                style={{
                  padding: "10px 0",
                  border: isDateSelected(day) ? "2px solid #0073e6" : "1px solid #e0e0e0",
                  background: isDateSelected(day) ? "#e8f4ff" : "white",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: isDateSelected(day) ? "600" : "400",
                  color: isDateSelected(day) ? "#0073e6" : "#333",
                  transition: "all 0.15s ease",
                }}
                onMouseOver={(e) => {
                  if (!isDateSelected(day)) {
                    e.target.style.background = "#f8f8f8";
                    e.target.style.borderColor = "#d0d0d0";
                  }
                }}
                onMouseOut={(e) => {
                  if (!isDateSelected(day)) {
                    e.target.style.background = "white";
                    e.target.style.borderColor = "#e0e0e0";
                  }
                }}
              >
                {day}
              </button>
            ) : (
              <div key={idx} />
            )
          ))}
        </div>
      </div>

      {closedDates.length > 0 && (
        <div>
          <s-text variant="bodySm" tone="subdued" style={{ marginBottom: "12px", display: "block", fontWeight: "500" }}>
            Selected: {closedDates.length} date{closedDates.length !== 1 ? 's' : ''}
          </s-text>
          <s-block-stack gap="small">
            {closedDates.sort().map((date) => (
              <div key={date} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "#fafafa",
                padding: "12px 14px",
                borderRadius: "8px",
                border: "1px solid #e5e5e5",
              }}>
                <s-text variant="bodySm" style={{ fontWeight: "500" }}>
                  {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </s-text>
                <button
                  onClick={() => onRemoveDate(date)}
                  style={{
                    background: "#ff5c56",
                    color: "white",
                    border: "none",
                    padding: "4px 10px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "500",
                    transition: "background 0.2s",
                  }}
                  onMouseOver={(e) => e.target.style.background = "#e74c45"}
                  onMouseOut={(e) => e.target.style.background = "#ff5c56"}
                >
                  Remove
                </button>
              </div>
            ))}
          </s-block-stack>
        </div>
      )}
    </div>
  );
}

export default function Pickup() {
  const { storeRules: initialRules } = useLoaderData();
  
  const defaultRules = [
    {
      id: 1,
      storeName: "Main Store",
      openTime: "09:00",
      closeTime: "21:00",
      closedDays: [0, 6],
      closedDates: ["2025-01-01"],
      timezone: "UTC",
      active: true,
    },
  ];

  const [rules, setRules] = useState(
    initialRules && initialRules.length > 0 ? initialRules : defaultRules
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);

  const handleUpdateRule = (id, field, value) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, [field]: value } : rule
    ));
  };

  const handleToggleDay = (id, dayIndex) => {
    setRules(rules.map(rule => {
      if (rule.id === id) {
        const closedDays = rule.closedDays.includes(dayIndex)
          ? rule.closedDays.filter(d => d !== dayIndex)
          : [...rule.closedDays, dayIndex];
        return { ...rule, closedDays };
      }
      return rule;
    }));
  };

  const handleAddDate = (id, dateString) => {
    setRules(rules.map(rule => {
      if (rule.id === id) {
        if (!rule.closedDates.includes(dateString)) {
          return { ...rule, closedDates: [...rule.closedDates, dateString] };
        }
      }
      return rule;
    }));
  };

  const handleRemoveDate = (id, dateString) => {
    setRules(rules.map(rule => {
      if (rule.id === id) {
        return { ...rule, closedDates: rule.closedDates.filter(d => d !== dateString) };
      }
      return rule;
    }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    try {
      const response = await fetch("/app", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rules }),
      });
      const result = await response.json();
      if (result.success) {
        setSaveStatus({ type: 'success', message: 'Settings saved successfully' });
      } else {
        setSaveStatus({ type: 'error', message: result.error || 'Failed to save' });
      }
    } catch (error) {
      setSaveStatus({ type: 'error', message: 'Network error occurred' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <s-page
      heading="Pickup Configuration"
      primaryAction={{
        content: isSaving ? "Saving..." : "Save Settings",
        onAction: handleSave,
        disabled: isSaving,
      }}
    >
      <s-layout>
        <s-layout-section>
          {saveStatus && (
            <div style={{
              padding: "12px 16px",
              borderRadius: "8px",
              marginBottom: "20px",
              background: saveStatus.type === 'success' ? "#e7f4e7" : "#fbeae5",
              color: saveStatus.type === 'success' ? "#1e5128" : "#8e1f0b",
              border: `1px solid ${saveStatus.type === 'success' ? "#b7dab7" : "#f1b3a5"}`,
              fontSize: "14px",
              fontWeight: "500",
            }}>
              {saveStatus.message}
            </div>
          )}

          <s-block-stack gap="loose">
            {rules.map((rule) => (
              <s-card key={rule.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <s-text variant="headingMd" style={{ fontWeight: "600" }}>Location: {rule.storeName}</s-text>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <s-text variant="bodySm" tone="subdued">Status:</s-text>
                    <button 
                      onClick={() => handleUpdateRule(rule.id, 'active', !rule.active)}
                      style={{
                        padding: "4px 12px",
                        borderRadius: "20px",
                        border: "none",
                        fontSize: "12px",
                        fontWeight: "600",
                        cursor: "pointer",
                        background: rule.active ? "#e7f4e7" : "#f4f4f4",
                        color: rule.active ? "#1e5128" : "#666",
                      }}
                    >
                      {rule.active ? '● Active' : '○ Inactive'}
                    </button>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "24px" }}>
                  <s-box>
                    <s-text variant="headingSm" tone="subdued" style={{ marginBottom: "12px", display: "block", textTransform: "uppercase", fontSize: "12px" }}>
                      Operating Hours
                    </s-text>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                      <div>
                        <s-text variant="bodySm" tone="subdued" style={{ marginBottom: "4px", display: "block" }}>Open From</s-text>
                        <input 
                          type="time" 
                          value={rule.openTime}
                          onChange={(e) => handleUpdateRule(rule.id, 'openTime', e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "6px",
                            border: "1px solid #d1d1d1",
                            fontSize: "14px"
                          }}
                        />
                      </div>
                      <div>
                        <s-text variant="bodySm" tone="subdued" style={{ marginBottom: "4px", display: "block" }}>Until</s-text>
                        <input 
                          type="time" 
                          value={rule.closeTime}
                          onChange={(e) => handleUpdateRule(rule.id, 'closeTime', e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            borderRadius: "6px",
                            border: "1px solid #d1d1d1",
                            fontSize: "14px"
                          }}
                        />
                      </div>
                    </div>
                    
                    <div style={{ marginTop: "16px" }}>
                      <s-text variant="bodySm" tone="subdued" style={{ marginBottom: "4px", display: "block" }}>Timezone</s-text>
                      <select 
                        value={rule.timezone}
                        onChange={(e) => handleUpdateRule(rule.id, 'timezone', e.target.value)}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #d1d1d1",
                          fontSize: "14px",
                          background: "white"
                        }}
                      >
                        {TIMEZONES.map(tz => (
                          <option key={tz.value} value={tz.value}>{tz.label}</option>
                        ))}
                      </select>
                    </div>
                  </s-box>

                  <s-box>
                    <s-text variant="headingSm" tone="subdued" style={{ marginBottom: "12px", display: "block", textTransform: "uppercase", fontSize: "12px" }}>
                      Weekly Closures
                    </s-text>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                        <button
                          key={day}
                          onClick={() => handleToggleDay(rule.id, index)}
                          style={{
                            padding: "8px 12px",
                            borderRadius: "6px",
                            border: rule.closedDays.includes(index) ? "1px solid #ff5c56" : "1px solid #e1e1e1",
                            background: rule.closedDays.includes(index) ? "#fff5f5" : "white",
                            color: rule.closedDays.includes(index) ? "#ff5c56" : "#333",
                            fontSize: "13px",
                            fontWeight: rule.closedDays.includes(index) ? "600" : "400",
                            cursor: "pointer",
                            minWidth: "50px",
                            transition: "all 0.2s"
                          }}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </s-box>
                </div>

                <div style={{ borderTop: "1px solid #f1f1f1", paddingTop: "24px" }}>
                  <ClosedDatesSection 
                    closedDates={rule.closedDates}
                    onAddDate={(date) => handleAddDate(rule.id, date)}
                    onRemoveDate={(date) => handleRemoveDate(rule.id, date)}
                  />
                </div>
              </s-card>
            ))}
          </s-block-stack>
        </s-layout-section>
      </s-layout>
    </s-page>
  );
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
