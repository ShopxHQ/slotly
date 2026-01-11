import { useState, useEffect } from "react";
import { useLoaderData, Form, useActionData } from "react-router";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { setDeliveryConfig, getDeliveryConfig } from "../lib/metafield-utils.server";

export const loader = async ({ request }) => {
  console.log('=== DELIVERY LOADER CALLED ===');
  const { admin } = await authenticate.admin(request);
  const savedConfig = await getDeliveryConfig(admin.graphql);
  
  console.log('Loader: savedConfig =', savedConfig);
  
  const config = savedConfig || {
    earliestDays: 1,
    furthestDays: 90,
    availableDays: [],
    blockedDateRules: [],
  };
  
  console.log('Loader: returning config =', config);
  
  return {
    initialConfig: config
  };
};

export const action = async ({ request }) => {
  console.log('=== DELIVERY ACTION CALLED ===');
  console.log('Method:', request.method);
  
  if (request.method !== 'POST') {
    console.log('Not a POST request');
    return { success: false, error: 'Method not allowed' };
  }

  try {
    console.log('Parsing form data...');
    const formData = await request.formData();
    const configStr = formData.get('config');
    console.log('Action: configStr =', configStr?.substring(0, 100));
    
    if (!configStr) {
      console.error('Action: No config in form data');
      return { success: false, error: 'No config provided' };
    }

    let config;
    try {
      config = JSON.parse(configStr);
      console.log('Action: Parsed config:', JSON.stringify(config).substring(0, 200));
    } catch (parseErr) {
      console.error('Action: JSON parse error:', parseErr.message);
      return { success: false, error: `Invalid config format: ${parseErr.message}` };
    }

    console.log('Authenticating...');
    const { admin } = await authenticate.admin(request);
    console.log('Calling setDeliveryConfig...');
    const success = await setDeliveryConfig(admin.graphql, config);
    console.log('setDeliveryConfig returned:', success);

    if (success) {
      console.log('Action: SUCCESS - Returning 200');
      return { success: true };
    } else {
      console.log('Action: FAILED - setDeliveryConfig returned false');
      return { success: false, error: 'Failed to save to metafield' };
    }
  } catch (error) {
    console.error('Action: Caught error:', error?.message);
    console.error('Stack:', error?.stack);
    return { success: false, error: error?.message || 'Unknown server error' };
  }
};

function CalendarPreview({ availableDays, blockedDates }) {
  const [previewMonth, setPreviewMonth] = useState(new Date());

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const monthName = previewMonth.toLocaleDateString('en-US', { month: 'long' });
  const year = previewMonth.getFullYear();
  const daysInMonth = getDaysInMonth(previewMonth);
  const firstDay = getFirstDayOfMonth(previewMonth);
  const days = [];

  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const firstDayAdjusted = (firstDay === 0) ? 6 : firstDay - 1;
  for (let i = 0; i < firstDayAdjusted; i++) {
    days.push(null);
  }

  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const isDayAvailable = (dayIndex) => {
    const dayName = dayNames[dayIndex];
    return availableDays.includes(dayName);
  };

  const isDateBlocked = (day) => {
    const dateString = `${year}-${String(previewMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return blockedDates && blockedDates.includes(dateString);
  };

  const handlePrevMonth = () => {
    setPreviewMonth(new Date(previewMonth.getFullYear(), previewMonth.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setPreviewMonth(new Date(previewMonth.getFullYear(), previewMonth.getMonth() + 1));
  };

  return (
    <div style={{
      background: "white",
      border: "1px solid #e5e5e5",
      borderRadius: "10px",
      padding: "24px",
      position: "sticky",
      top: "20px",
    }}>
      <h3 style={{
        fontSize: "16px",
        fontWeight: "700",
        color: "#333",
        margin: "0 0 20px 0",
      }}>
        Calendar Preview
      </h3>

      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px",
      }}>
        <button
          onClick={handlePrevMonth}
          style={{
            background: "none",
            border: "none",
            color: "#0073e6",
            cursor: "pointer",
            fontSize: "18px",
            padding: "4px 8px",
          }}
        >
          ‹
        </button>
        <select
          value={previewMonth.getMonth()}
          onChange={(e) => setPreviewMonth(new Date(previewMonth.getFullYear(), parseInt(e.target.value)))}
          style={{
            border: "none",
            background: "none",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            color: "#333",
          }}
        >
          {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
        <span style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>{year}</span>
        <button
          onClick={handleNextMonth}
          style={{
            background: "none",
            border: "none",
            color: "#0073e6",
            cursor: "pointer",
            fontSize: "18px",
            padding: "4px 8px",
          }}
        >
          ›
        </button>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: "2px",
        marginBottom: "12px",
      }}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayLabel, dayIndex) => (
          <div key={dayLabel} style={{
            textAlign: "center",
            fontSize: "11px",
            fontWeight: "700",
            color: isDayAvailable(dayIndex) ? "#999" : "#d0d0d0",
            padding: "6px 0",
            textTransform: "uppercase",
            transition: "color 0.2s",
          }}>
            {dayLabel}
          </div>
        ))}
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        gap: "2px",
      }}>
        {days.map((day, idx) => {
          const dayOfWeek = idx % 7;
          const isDayAvailableToday = day && isDayAvailable(dayOfWeek);
          const isBlocked = day && isDateBlocked(day);
          const isAvailable = isDayAvailableToday && !isBlocked;

          return (
            <div
              key={idx}
              style={{
                textAlign: "center",
                padding: "8px 0",
                fontSize: "13px",
                color: isAvailable ? "#0073e6" : "#ccc",
                fontWeight: isAvailable ? "600" : "300",
                opacity: isAvailable ? 1 : 0.4,
                transition: "all 0.2s",
              }}
            >
              {day}
            </div>
          );
        })}
      </div>

      <p style={{
        fontSize: "12px",
        color: "#999",
        textAlign: "center",
        marginTop: "16px",
        margin: "16px 0 0 0",
      }}>
        This is what your calendar will look like for customers
      </p>
    </div>
  );
}

export default function Delivery() {
  const { initialConfig } = useLoaderData();
  const actionData = useActionData();
  
  console.log('=== DELIVERY COMPONENT RENDER ===');
  console.log('Component received initialConfig:', initialConfig);
  
  const [earliestDays, setEarliestDays] = useState(initialConfig?.earliestDays || 1);
  const [furthestDays, setFurthestDays] = useState(initialConfig?.furthestDays || 90);
  const [availableDays, setAvailableDays] = useState(initialConfig?.availableDays || []);
  const [blockedDateRules, setBlockedDateRules] = useState(initialConfig?.blockedDateRules || []);
  const [expandedRuleId, setExpandedRuleId] = useState(null);

  console.log('Current state - earliestDays:', earliestDays, 'furthestDays:', furthestDays, 'availableDays:', availableDays);

  useEffect(() => {
    console.log('=== USEEFFECT TRIGGERED ===');
    console.log('useEffect: initialConfig changed:', initialConfig);
    setEarliestDays(initialConfig?.earliestDays || 1);
    setFurthestDays(initialConfig?.furthestDays || 90);
    setAvailableDays(initialConfig?.availableDays || []);
    setBlockedDateRules(initialConfig?.blockedDateRules || []);
    setExpandedRuleId(null);
    console.log('useEffect: State reset complete');
  }, [initialConfig]);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const handleSubmit = (e) => {
    const config = {
      earliestDays: parseInt(earliestDays),
      furthestDays: furthestDays ? parseInt(furthestDays) : null,
      availableDays: Array.isArray(availableDays) ? availableDays : [],
      blockedDateRules: Array.isArray(blockedDateRules) ? blockedDateRules.filter(r => r.id && (r.applyTo === 'all' || (r.applyTo === 'single' && r.singleDate) || (r.applyTo === 'range' && r.fromDate && r.toDate))) : [],
    };
    const input = e.currentTarget.querySelector('input[name="config"]');
    if (input) {
      input.value = JSON.stringify(config);
    }
  };

  const handleDayToggle = (day) => {
    if (availableDays.includes(day)) {
      setAvailableDays(availableDays.filter(d => d !== day));
    } else {
      setAvailableDays([...availableDays, day]);
    }
  };

  const addBlockedDateRule = () => {
    const newRule = {
      id: Date.now(),
      applyTo: "all",
      fromDate: "",
      toDate: "",
      singleDate: "",
    };
    setBlockedDateRules([...blockedDateRules, newRule]);
    setExpandedRuleId(newRule.id);
  };

  const deleteBlockedDateRule = (id) => {
    setBlockedDateRules(blockedDateRules.filter(rule => rule.id !== id));
  };

  const updateBlockedDateRule = (id, updates) => {
    setBlockedDateRules(blockedDateRules.map(rule =>
      rule.id === id ? { ...rule, ...updates } : rule
    ));
  };

  const getBlockedDatesFromRules = () => {
    const blockedSet = new Set();
    const today = new Date();

    blockedDateRules.forEach(rule => {
      if (rule.applyTo === "range" && rule.fromDate && rule.toDate) {
        const [fromYear, fromMonth, fromDay] = rule.fromDate.split('-').map(Number);
        const [toYear, toMonth, toDay] = rule.toDate.split('-').map(Number);
        
        const from = new Date(fromYear, fromMonth - 1, fromDay);
        const to = new Date(toYear, toMonth - 1, toDay);
        const current = new Date(from);

        while (current <= to) {
          const dateStr = current.getFullYear() + '-' + 
                         String(current.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(current.getDate()).padStart(2, '0');
          blockedSet.add(dateStr);
          current.setDate(current.getDate() + 1);
        }
      } else if (rule.applyTo === "single" && rule.singleDate) {
        blockedSet.add(rule.singleDate);
      } else if (rule.applyTo === "all") {
        for (let i = 0; i < 365; i++) {
          const date = new Date(today);
          date.setDate(date.getDate() + i);
          const dateStr = date.getFullYear() + '-' + 
                         String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                         String(date.getDate()).padStart(2, '0');
          blockedSet.add(dateStr);
        }
      }
    });

    return Array.from(blockedSet);
  };

  return (
    <s-page heading="Delivery Configuration">
      {actionData?.success && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          backgroundColor: '#d4edda',
          color: '#155724',
          border: '1px solid #c3e6cb',
        }}>
          Delivery configuration saved successfully!
        </div>
      )}
      {actionData?.error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          marginBottom: '16px',
          backgroundColor: '#f8d7da',
          color: '#721c24',
          border: '1px solid #f5c6cb',
        }}>
          {actionData.error}
        </div>
      )}
      <Form method="POST" onSubmit={handleSubmit} style={{ display: 'contents' }}>
        <input type="hidden" name="config" />
        <s-button slot="primary-action" variant="primary" type="submit">
          Save Changes
        </s-button>
      </Form>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 380px",
        gap: "24px",
        margin: "24px 0",
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div style={{
            background: "white",
            border: "1px solid #e5e5e5",
            borderRadius: "10px",
            padding: "20px",
          }}>
            <h3 style={{
              fontSize: "14px",
              fontWeight: "700",
              color: "#333",
              margin: "0 0 12px 0",
            }}>
              Choose earliest available date
            </h3>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <input
                type="number"
                min="0"
                value={earliestDays}
                onChange={(e) => setEarliestDays(parseInt(e.target.value) || 0)}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  border: "1px solid #d0d0d0",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              />
              <span style={{
                fontSize: "13px",
                color: "#666",
              }}>
                days ahead
              </span>
            </div>
          </div>

          <div style={{
            background: "white",
            border: "1px solid #e5e5e5",
            borderRadius: "10px",
            padding: "20px",
          }}>
            <h3 style={{
              fontSize: "14px",
              fontWeight: "700",
              color: "#333",
              margin: "0 0 12px 0",
            }}>
              Choose furthest available date
            </h3>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}>
              <input
                type="number"
                min="0"
                value={furthestDays}
                onChange={(e) => setFurthestDays(parseInt(e.target.value) || 0)}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  border: "1px solid #d0d0d0",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
              />
              <span style={{
                fontSize: "13px",
                color: "#666",
              }}>
                days ahead
              </span>
            </div>
          </div>

          <div style={{
            background: "white",
            border: "1px solid #e5e5e5",
            borderRadius: "10px",
            padding: "20px",
          }}>
            <h3 style={{
              fontSize: "14px",
              fontWeight: "700",
              color: "#333",
              margin: "0 0 12px 0",
            }}>
              Available delivery dates:
            </h3>
            <div style={{
              position: "relative",
              marginBottom: "12px",
            }}>
              <div style={{
                padding: "10px 12px",
                border: "1px solid #d0d0d0",
                borderRadius: "8px",
                fontSize: "13px",
                color: "#999",
                cursor: "pointer",
                background: "white",
              }}>
                ⚙ Select days
              </div>
            </div>

            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
            }}>
              {days.map(day => (
                <button
                  key={day}
                  onClick={() => handleDayToggle(day)}
                  style={{
                    background: availableDays.includes(day) ? "#f0f0f0" : "white",
                    border: "1px solid #d0d0d0",
                    padding: "6px 12px",
                    borderRadius: "6px",
                    fontSize: "13px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    transition: "all 0.2s",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = availableDays.includes(day) ? "#e8e8e8" : "#f9f9f9";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = availableDays.includes(day) ? "#f0f0f0" : "white";
                  }}
                >
                  {day}
                  {availableDays.includes(day) && (
                    <span style={{ fontSize: "12px", fontWeight: "bold" }}>✕</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            background: "white",
            border: "1px solid #e5e5e5",
            borderRadius: "10px",
            padding: "20px",
          }}>
            <h3 style={{
              fontSize: "14px",
              fontWeight: "700",
              color: "#333",
              margin: "0 0 16px 0",
            }}>
              Blocked dates
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
              {blockedDateRules.map((rule, index) => {
                const isExpanded = expandedRuleId === rule.id;

                return (
                  <div
                    key={rule.id}
                    style={{
                      border: "1px solid #e5e5e5",
                      borderRadius: "8px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px 16px",
                        background: "#f9f9f9",
                        cursor: "pointer",
                      }}
                      onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}
                    >
                      <span style={{ fontSize: "14px", fontWeight: "600", color: "#333" }}>
                        Blocked dates {index + 1}
                      </span>
                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteBlockedDateRule(rule.id);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "#dc3545",
                            cursor: "pointer",
                            fontSize: "18px",
                            padding: "0",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          🗑️
                        </button>
                        <span style={{
                          fontSize: "16px",
                          color: "#999",
                          transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                          transition: "transform 0.2s",
                        }}>
                          ▼
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{
                        padding: "16px",
                        background: "white",
                        borderTop: "1px solid #e5e5e5",
                      }}>
                        <div style={{ marginBottom: "16px" }}>
                          <label style={{
                            display: "block",
                            fontSize: "13px",
                            fontWeight: "600",
                            color: "#333",
                            marginBottom: "8px",
                          }}>
                            Apply to
                          </label>
                          <select
                            value={rule.applyTo}
                            onChange={(e) => updateBlockedDateRule(rule.id, { applyTo: e.target.value })}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid #d0d0d0",
                              borderRadius: "6px",
                              fontSize: "13px",
                              cursor: "pointer",
                            }}
                          >
                            <option value="all">All dates</option>
                            <option value="range">Date range</option>
                            <option value="single">Single date</option>
                          </select>
                        </div>

                        {rule.applyTo === "range" && (
                          <div style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "12px",
                            marginBottom: "16px",
                          }}>
                            <div>
                              <label style={{
                                display: "block",
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#666",
                                marginBottom: "6px",
                              }}>
                                From
                              </label>
                              <input
                                type="date"
                                value={rule.fromDate}
                                onChange={(e) => updateBlockedDateRule(rule.id, { fromDate: e.target.value })}
                                style={{
                                  width: "100%",
                                  padding: "8px 12px",
                                  border: "1px solid #d0d0d0",
                                  borderRadius: "6px",
                                  fontSize: "13px",
                                }}
                              />
                            </div>
                            <div>
                              <label style={{
                                display: "block",
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#666",
                                marginBottom: "6px",
                              }}>
                                To
                              </label>
                              <input
                                type="date"
                                value={rule.toDate}
                                onChange={(e) => updateBlockedDateRule(rule.id, { toDate: e.target.value })}
                                style={{
                                  width: "100%",
                                  padding: "8px 12px",
                                  border: "1px solid #d0d0d0",
                                  borderRadius: "6px",
                                  fontSize: "13px",
                                }}
                              />
                            </div>
                          </div>
                        )}

                        {rule.applyTo === "single" && (
                          <div style={{ marginBottom: "16px" }}>
                            <label style={{
                              display: "block",
                              fontSize: "12px",
                              fontWeight: "600",
                              color: "#666",
                              marginBottom: "6px",
                            }}>
                              Pick a date
                            </label>
                            <input
                              type="date"
                              value={rule.singleDate}
                              onChange={(e) => updateBlockedDateRule(rule.id, { singleDate: e.target.value })}
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                border: "1px solid #d0d0d0",
                                borderRadius: "6px",
                                fontSize: "13px",
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={addBlockedDateRule}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid #d0d0d0",
                borderRadius: "8px",
                background: "white",
                fontSize: "13px",
                color: "#0073e6",
                cursor: "pointer",
                fontWeight: "500",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "#f9f9f9";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "white";
              }}
            >
              + Add blocked dates
            </button>
          </div>
        </div>

        <CalendarPreview availableDays={availableDays} blockedDates={getBlockedDatesFromRules()} />
      </div>
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
