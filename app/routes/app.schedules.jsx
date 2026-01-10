import { useState } from "react";
import { authenticate } from "../shopify.server";
import { boundary } from "@shopify/shopify-app-react-router/server";

export const loader = async ({ request }) => {
  await authenticate.admin(request);
  return null;
};

export default function Schedules() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "both",
    leadTime: 24,
    maxDays: 30,
    disableWeekends: false,
    cutoffTime: "",
    timezone: "America/New_York",
    active: true,
  });

  const [schedules, setSchedules] = useState([
    {
      id: 1,
      name: "Standard Delivery",
      type: "Delivery",
      active: true,
      leadTime: 24,
      cutoffTime: "18:00",
    },
    {
      id: 2,
      name: "Weekend Pickup",
      type: "Pickup",
      active: true,
      leadTime: 48,
      cutoffTime: "12:00",
    },
  ]);

  const handleOpenModal = (schedule = null) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setFormData({
        name: schedule.name,
        type: schedule.type === "Delivery" ? "delivery" : "pickup",
        leadTime: schedule.leadTime,
        maxDays: 30,
        disableWeekends: false,
        cutoffTime: schedule.cutoffTime || "",
        timezone: "America/New_York",
        active: schedule.active,
      });
    } else {
      setEditingSchedule(null);
      setFormData({
        name: "",
        type: "both",
        leadTime: 24,
        maxDays: 30,
        disableWeekends: false,
        cutoffTime: "",
        timezone: "America/New_York",
        active: true,
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      alert("Schedule name is required");
      return;
    }

    if (editingSchedule) {
      setSchedules(schedules.map(s =>
        s.id === editingSchedule.id
          ? {
              ...s,
              name: formData.name,
              type: formData.type === "both" ? "Both" : formData.type.charAt(0).toUpperCase() + formData.type.slice(1),
              leadTime: formData.leadTime,
              cutoffTime: formData.cutoffTime,
              active: formData.active,
            }
          : s
      ));
    } else {
      const newSchedule = {
        id: Math.max(...schedules.map(s => s.id), 0) + 1,
        name: formData.name,
        type: formData.type === "both" ? "Both" : formData.type.charAt(0).toUpperCase() + formData.type.slice(1),
        active: formData.active,
        leadTime: formData.leadTime,
        cutoffTime: formData.cutoffTime,
      };
      setSchedules([...schedules, newSchedule]);
    }

    setIsModalOpen(false);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this schedule?")) {
      setSchedules(schedules.filter(s => s.id !== id));
    }
  };

  const rows = schedules.map((schedule) => [
    <s-text key={`${schedule.id}-name`}>{schedule.name}</s-text>,
    <s-badge key={`${schedule.id}-type`}>{schedule.type}</s-badge>,
    <s-badge key={`${schedule.id}-status`} tone={schedule.active ? "success" : "warning"}>
      {schedule.active ? "Active" : "Inactive"}
    </s-badge>,
    <s-text key={`${schedule.id}-lead`}>{schedule.leadTime}h</s-text>,
    <s-text key={`${schedule.id}-cutoff`}>{schedule.cutoffTime || "—"}</s-text>,
    <s-inline-stack key={`${schedule.id}-actions`} gap="small">
      <s-button
        size="small"
        variant="secondary"
        onClick={() => handleOpenModal(schedule)}
      >
        Edit
      </s-button>
      <s-button
        size="small"
        variant="primary"
        tone="critical"
        onClick={() => handleDelete(schedule.id)}
      >
        Remove
      </s-button>
    </s-inline-stack>,
  ]);

  return (
    <s-page heading="Schedules">
      <s-button
        slot="primary-action"
        onClick={() => handleOpenModal()}
      >
        Create Schedule
      </s-button>

      {schedules.length === 0 ? (
        <s-section>
          <s-card>
            <s-block-stack gap="medium" align="center">
              <s-text variant="headingLg">No schedules yet</s-text>
              <s-text tone="subdued">Create your first schedule to get started</s-text>
              <s-button onClick={() => handleOpenModal()} variant="primary">
                Create Schedule
              </s-button>
            </s-block-stack>
          </s-card>
        </s-section>
      ) : (
        <s-section>
          <s-data-table
            columnContentTypes={["text", "text", "text", "text", "text", "text"]}
            headings={["Name", "Type", "Status", "Lead Time", "Cutoff Time", "Actions"]}
            rows={rows}
          />
        </s-section>
      )}

      {isModalOpen && (
        <s-modal open onClose={() => setIsModalOpen(false)}>
          <s-modal-header title={editingSchedule ? "Edit Schedule" : "Create New Schedule"} />
          <s-block-stack gap="medium" padding="medium">
            <s-form-layout>
              <s-text-field
                label="Schedule Name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.currentTarget.value })}
              />

              <s-select
                label="Schedule Type"
                options={[
                  { label: "Delivery Only", value: "delivery" },
                  { label: "Pickup Only", value: "pickup" },
                  { label: "Both (Delivery & Pickup)", value: "both" },
                ]}
                value={formData.type}
                onChange={(value) => setFormData({ ...formData, type: value })}
              />

              <s-text-field
                label="Lead Time (hours)"
                type="number"
                value={String(formData.leadTime)}
                onChange={(e) => setFormData({ ...formData, leadTime: parseInt(e.currentTarget.value) || 0 })}
              />

              <s-text-field
                label="Max Selectable Days"
                type="number"
                value={String(formData.maxDays)}
                onChange={(e) => setFormData({ ...formData, maxDays: parseInt(e.currentTarget.value) || 30 })}
              />

              <s-checkbox
                label="Disable Weekends"
                checked={formData.disableWeekends}
                onChange={(value) => setFormData({ ...formData, disableWeekends: value })}
              />

              <s-text-field
                label="Cutoff Time"
                type="time"
                value={formData.cutoffTime}
                onChange={(e) => setFormData({ ...formData, cutoffTime: e.currentTarget.value })}
              />

              <s-select
                label="Timezone"
                options={[
                  { label: "America/New_York (Eastern)", value: "America/New_York" },
                  { label: "America/Chicago (Central)", value: "America/Chicago" },
                  { label: "America/Denver (Mountain)", value: "America/Denver" },
                  { label: "America/Los_Angeles (Pacific)", value: "America/Los_Angeles" },
                  { label: "Europe/London", value: "Europe/London" },
                  { label: "Europe/Paris", value: "Europe/Paris" },
                  { label: "Asia/Tokyo", value: "Asia/Tokyo" },
                ]}
                value={formData.timezone}
                onChange={(value) => setFormData({ ...formData, timezone: value })}
              />

              <s-checkbox
                label="Active Schedule"
                checked={formData.active}
                onChange={(value) => setFormData({ ...formData, active: value })}
              />
            </s-form-layout>
          </s-block-stack>
          <s-modal-footer>
            <s-button onClick={() => setIsModalOpen(false)} variant="secondary">
              Cancel
            </s-button>
            <s-button onClick={handleSubmit} variant="primary">
              Save Schedule
            </s-button>
          </s-modal-footer>
        </s-modal>
      )}
    </s-page>
  );
}

export const headers = (headersArgs) => {
  return boundary.headers(headersArgs);
};
