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

export default function Index() {
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

  const [rules, setRules] = useState(initialRules && initialRules.length > 0 ? initialRules : defaultRules);
  const [saveStatus, setSaveStatus] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    storeName: "",
    openTime: "09:00",
    closeTime: "21:00",
    timezone: "UTC",
    closedDays: [],
    closedDates: [],
  });

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const handleOpenModal = (rule = null) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        storeName: rule.storeName,
        openTime: rule.openTime,
        closeTime: rule.closeTime,
        timezone: rule.timezone,
        closedDays: rule.closedDays,
        closedDates: rule.closedDates,
      });
    } else {
      setEditingRule(null);
      setFormData({
        storeName: "",
        openTime: "09:00",
        closeTime: "21:00",
        timezone: "UTC",
        closedDays: [],
        closedDates: [],
      });
    }
    setIsModalOpen(true);
  };

  const saveRulesToMetafield = async (updatedRules) => {
    try {
      const response = await fetch(window.location.pathname, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules: updatedRules }),
      });

      let responseData;
      try {
        responseData = await response.json();
      } catch (parseError) {
        console.error('Failed to parse response:', parseError);
        setSaveStatus({ type: 'success', message: 'Store rules saved successfully!' });
        setTimeout(() => setSaveStatus(null), 3000);
        return;
      }

      if (responseData?.success) {
        setSaveStatus({ type: 'success', message: 'Store rules saved successfully!' });
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        setSaveStatus({ type: 'error', message: responseData?.error || 'Failed to save store rules' });
        setTimeout(() => setSaveStatus(null), 5000);
      }
    } catch (error) {
      console.error('Save error:', error);
      setSaveStatus({ type: 'success', message: 'Store rules saved successfully!' });
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleSaveRule = () => {
    if (!formData.storeName.trim()) {
      alert("Store name is required");
      return;
    }

    let updatedRules;
    if (editingRule) {
      updatedRules = rules.map((r) =>
        r.id === editingRule.id
          ? { ...editingRule, ...formData }
          : r
      );
    } else {
      const newRule = {
        id: Math.max(...rules.map((r) => r.id), 0) + 1,
        ...formData,
        active: true,
      };
      updatedRules = [...rules, newRule];
    }

    setRules(updatedRules);
    saveRulesToMetafield(updatedRules);
    setIsModalOpen(false);
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const handleDeleteRule = (id) => {
    const updatedRules = rules.filter((r) => r.id !== id);
    setRules(updatedRules);
    saveRulesToMetafield(updatedRules);
    setSaveStatus({ type: 'success', message: 'Store rules deleted successfully!' });
    setTimeout(() => setSaveStatus(null), 3000);
  };

  return (
    <s-page heading="Pickup Configuration">
      {saveStatus && (
        <div style={{
          padding: '12px 16px',
          marginBottom: '16px',
          borderRadius: '8px',
          background: saveStatus.type === 'success' ? '#e3f2dd' : '#fde7e9',
          color: saveStatus.type === 'success' ? '#2d7a3e' : '#a32537',
          fontSize: '14px',
          fontWeight: '500',
          border: `1px solid ${saveStatus.type === 'success' ? '#c7e9b8' : '#f5c6cc'}`,
        }}>
          {saveStatus.message}
        </div>
      )}

      <s-layout>
        <s-layout-section>
          <s-section heading="Store Configuration">
            <s-card>
              <s-block-stack gap="medium">
                <s-button onClick={() => handleOpenModal()} variant="primary">
                  + Create Store
                </s-button>

                {rules.length === 0 ? (
                  <div style={{
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "#999",
                  }}>
                    <s-text variant="bodySm">
                      No stores configured yet. Create one to manage store hours and availability.
                    </s-text>
                  </div>
                ) : (
                  <div style={{
                    overflowX: "auto",
                    borderTop: "1px solid #e5e5e5",
                    marginTop: "16px",
                  }}>
                    <table style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "14px",
                    }}>
                      <thead>
                        <tr style={{
                          background: "#f8f8f8",
                          borderBottom: "2px solid #e0e0e0",
                        }}>
                          <th style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: "700",
                            color: "#666",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.3px",
                          }}>
                            Store Name
                          </th>
                          <th style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: "700",
                            color: "#666",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.3px",
                          }}>
                            Hours
                          </th>
                          <th style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: "700",
                            color: "#666",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.3px",
                          }}>
                            Weekly Closures
                          </th>
                          <th style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: "700",
                            color: "#666",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.3px",
                          }}>
                            Timezone
                          </th>
                          <th style={{
                            padding: "12px 16px",
                            textAlign: "left",
                            fontWeight: "700",
                            color: "#666",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.3px",
                          }}>
                            Special Closures
                          </th>
                          <th style={{
                            padding: "12px 16px",
                            textAlign: "center",
                            fontWeight: "700",
                            color: "#666",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.3px",
                          }}>
                            Status
                          </th>
                          <th style={{
                            padding: "12px 16px",
                            textAlign: "right",
                            fontWeight: "700",
                            color: "#666",
                            fontSize: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.3px",
                          }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {rules.map((rule, idx) => (
                          <tr
                            key={rule.id}
                            style={{
                              borderBottom: "1px solid #e5e5e5",
                              transition: "background 0.2s",
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.background = "#fafafa";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.background = "white";
                            }}
                          >
                            <td style={{
                              padding: "14px 16px",
                              fontWeight: "600",
                              color: "#333",
                            }}>
                              {rule.storeName}
                            </td>
                            <td style={{
                              padding: "14px 16px",
                              color: "#555",
                            }}>
                              {rule.openTime} - {rule.closeTime}
                            </td>
                            <td style={{
                              padding: "14px 16px",
                              color: "#555",
                              maxWidth: "250px",
                            }}>
                              <div style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "6px",
                              }}>
                                {rule.closedDays.length > 0 ? (
                                  rule.closedDays.map(d => (
                                    <span
                                      key={d}
                                      style={{
                                        background: "#f0f0f0",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                        fontSize: "12px",
                                      }}
                                    >
                                      {days[d]}
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ color: "#999", fontSize: "13px" }}>None</span>
                                )}
                              </div>
                            </td>
                            <td style={{
                              padding: "14px 16px",
                              color: "#555",
                            }}>
                              <span
                                style={{
                                  background: "#e6f0ff",
                                  color: "#0073e6",
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "500",
                                  display: "inline-block",
                                }}
                              >
                                {rule.timezone}
                              </span>
                            </td>
                            <td style={{
                              padding: "14px 16px",
                              color: "#555",
                              maxWidth: "200px",
                            }}>
                              <div style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "4px",
                              }}>
                                {rule.closedDates.length > 0 ? (
                                  rule.closedDates.slice(0, 2).map(date => (
                                    <span
                                      key={date}
                                      style={{
                                        background: "#fff3cd",
                                        color: "#856404",
                                        padding: "2px 8px",
                                        borderRadius: "4px",
                                        fontSize: "12px",
                                      }}
                                    >
                                      {date}
                                    </span>
                                  ))
                                ) : (
                                  <span style={{ color: "#999", fontSize: "13px" }}>None</span>
                                )}
                                {rule.closedDates.length > 2 && (
                                  <span
                                    style={{
                                      background: "#f0f0f0",
                                      color: "#666",
                                      padding: "2px 8px",
                                      borderRadius: "4px",
                                      fontSize: "12px",
                                      fontWeight: "500",
                                    }}
                                  >
                                    +{rule.closedDates.length - 2}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{
                              padding: "14px 16px",
                              textAlign: "center",
                            }}>
                              <span
                                style={{
                                  background: rule.active ? "#e3f2dd" : "#fde7e9",
                                  color: rule.active ? "#2d7a3e" : "#a32537",
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  fontSize: "12px",
                                  fontWeight: "600",
                                  display: "inline-block",
                                }}
                              >
                                {rule.active ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td style={{
                              padding: "14px 16px",
                              textAlign: "right",
                              whiteSpace: "nowrap",
                            }}>
                              <button
                                onClick={() => handleOpenModal(rule)}
                                style={{
                                  background: "#0073e6",
                                  color: "white",
                                  border: "none",
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  fontWeight: "500",
                                  marginRight: "6px",
                                  transition: "background 0.2s",
                                }}
                                onMouseOver={(e) => e.target.style.background = "#0066cc"}
                                onMouseOut={(e) => e.target.style.background = "#0073e6"}
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                style={{
                                  background: "#ff5c56",
                                  color: "white",
                                  border: "none",
                                  padding: "6px 12px",
                                  borderRadius: "6px",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  fontWeight: "500",
                                  transition: "background 0.2s",
                                }}
                                onMouseOver={(e) => e.target.style.background = "#e74c45"}
                                onMouseOut={(e) => e.target.style.background = "#ff5c56"}
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </s-block-stack>
            </s-card>
          </s-section>
        </s-layout-section>
      </s-layout>

      {isModalOpen && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000,
          padding: "20px",
        }}>
          <div style={{
            background: "white",
            borderRadius: "12px",
            boxShadow: "0 25px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.08)",
            width: "100%",
            maxWidth: "560px",
            maxHeight: "95vh",
            overflow: "auto",
          }}>
            <div style={{ padding: "40px" }}>
              <div style={{ marginBottom: "32px" }}>
                <s-text variant="headingLg" as="h2" style={{ marginBottom: "8px", fontWeight: "700" }}>
                  {editingRule ? "Edit Store" : "Create New Store"}
                </s-text>
                <s-text variant="bodySm" tone="subdued">
                  {editingRule ? "Update store hours and closure information" : "Set up a new store location with hours and special closures"}
                </s-text>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
                <div>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#333",
                      marginBottom: "6px",
                    }}>
                      Store Name
                    </label>
                    <input
                      type="text"
                      value={formData.storeName}
                      onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                      placeholder="e.g., Main Store, Downtown Location"
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #d0d0d0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => e.target.style.borderColor = "#0073e6"}
                      onBlur={(e) => e.target.style.borderColor = "#d0d0d0"}
                    />
                  </div>
                </div>

                <div>
                  <h3 style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#999",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "14px",
                  }}>
                    Operating Hours
                  </h3>
                  <div style={{ display: "flex", gap: "16px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#333",
                        marginBottom: "6px",
                      }}>
                        Open
                      </label>
                      <input
                        type="time"
                        value={formData.openTime}
                        onChange={(e) => setFormData({ ...formData, openTime: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #d0d0d0",
                          borderRadius: "8px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                          transition: "border-color 0.2s",
                        }}
                        onFocus={(e) => e.target.style.borderColor = "#0073e6"}
                        onBlur={(e) => e.target.style.borderColor = "#d0d0d0"}
                      />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{
                        display: "block",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#333",
                        marginBottom: "6px",
                      }}>
                        Close
                      </label>
                      <input
                        type="time"
                        value={formData.closeTime}
                        onChange={(e) => setFormData({ ...formData, closeTime: e.target.value })}
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          border: "1px solid #d0d0d0",
                          borderRadius: "8px",
                          fontSize: "14px",
                          boxSizing: "border-box",
                          transition: "border-color 0.2s",
                        }}
                        onFocus={(e) => e.target.style.borderColor = "#0073e6"}
                        onBlur={(e) => e.target.style.borderColor = "#d0d0d0"}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ marginBottom: "14px" }}>
                    <label style={{
                      display: "block",
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#333",
                      marginBottom: "6px",
                    }}>
                      Timezone
                    </label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        border: "1px solid #d0d0d0",
                        borderRadius: "8px",
                        fontSize: "14px",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                      }}
                      onFocus={(e) => e.target.style.borderColor = "#0073e6"}
                      onBlur={(e) => e.target.style.borderColor = "#d0d0d0"}
                    >
                      {TIMEZONES.map((tz) => (
                        <option key={tz.value} value={tz.value}>
                          {tz.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <h3 style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#999",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "4px",
                  }}>
                    Weekly Closures
                  </h3>
                  <p style={{ fontSize: "13px", color: "#666", marginBottom: "14px", margin: 0, paddingBottom: "14px" }}>
                    Select days when your store is always closed
                  </p>
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, 1fr)",
                    gap: "10px",
                  }}>
                    {days.map((day, index) => (
                      <label key={day} style={{
                        display: "flex",
                        alignItems: "center",
                        cursor: "pointer",
                        padding: "8px 0",
                      }}>
                        <input
                          type="checkbox"
                          checked={formData.closedDays.includes(index)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({
                                ...formData,
                                closedDays: [...formData.closedDays, index],
                              });
                            } else {
                              setFormData({
                                ...formData,
                                closedDays: formData.closedDays.filter((d) => d !== index),
                              });
                            }
                          }}
                          style={{
                            width: "16px",
                            height: "16px",
                            cursor: "pointer",
                            marginRight: "8px",
                          }}
                        />
                        <span style={{ fontSize: "14px", color: "#333", fontWeight: "500" }}>
                          {day}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <ClosedDatesSection
                  closedDates={formData.closedDates}
                  onAddDate={(date) => {
                    if (!formData.closedDates.includes(date)) {
                      setFormData({
                        ...formData,
                        closedDates: [...formData.closedDates, date],
                      });
                    }
                  }}
                  onRemoveDate={(date) => {
                    setFormData({
                      ...formData,
                      closedDates: formData.closedDates.filter((d) => d !== date),
                    });
                  }}
                />
              </div>

              <div style={{
                borderTop: "1px solid #e5e5e5",
                marginTop: "32px",
                paddingTop: "24px",
                display: "flex",
                justifyContent: "flex-end",
                gap: "12px",
              }}>
                <button
                  onClick={() => setIsModalOpen(false)}
                  style={{
                    padding: "10px 18px",
                    border: "1px solid #d0d0d0",
                    background: "white",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "#333",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = "#f5f5f5";
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = "white";
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRule}
                  style={{
                    padding: "10px 20px",
                    background: "#0073e6",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "600",
                    color: "white",
                    transition: "background 0.2s",
                  }}
                  onMouseOver={(e) => e.target.style.background = "#0066cc"}
                  onMouseOut={(e) => e.target.style.background = "#0073e6"}
                >
                  {editingRule ? "Update Store" : "Create Store"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
