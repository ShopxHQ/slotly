# Slotly Admin App UI Documentation

## Overview

This document describes the Admin App UI for **Slotly – Delivery & Pickup Date Selector**, a Shopify embedded admin app built with React Router, Remix, and custom styling.

## Project Structure

```
app/
├── routes/
│   ├── app.jsx                 # Main app layout with sidebar navigation
│   ├── app._index.jsx          # Dashboard page
│   ├── app.schedules.jsx       # Schedule management page
│   ├── app.settings/
│   │   └── route.jsx           # Global settings page
│   ├── app.help.jsx            # Help & documentation page
│   └── ... (auth, webhooks, etc)
├── components/                 # Reusable UI components
│   ├── Button.jsx
│   ├── Badge.jsx
│   ├── Card.jsx
│   ├── FormField.jsx
│   ├── Modal.jsx
│   ├── Toast.jsx
│   └── Toggle.jsx
└── utils/
    └── json.js                 # JSON response utility
```

## Pages

### 1. Dashboard (`/app`)

**Purpose**: Quick overview of app status and analytics

**Features**:
- **Status Overview Cards**: Shows Delivery, Pickup, and Active Schedules status
- **Analytics Placeholder**: "Coming Soon" sections for future chart integration
- **Quick Stats**: Today's orders, weekly, and monthly statistics
- **Quick Actions**: Buttons to navigate to Schedules and Settings

**Components Used**:
- Custom Card component with icon support
- ChartPlaceholder for future analytics
- StatItem for statistics display

**Mock Data**: 
- All data is hardcoded for UI demonstration
- No backend calls required

### 2. Schedules (`/app/schedules`)

**Purpose**: Create and manage delivery/pickup schedules

**Features**:
- **Schedule List Table** with columns:
  - Name
  - Type (Delivery/Pickup/Both)
  - Status (Active/Inactive)
  - Lead Time
  - Cutoff Time
  - Actions (Edit/Remove)
  
- **Create/Edit Modal** with fields:
  - Schedule name (required)
  - Schedule type selector
  - Lead time (hours)
  - Max selectable days
  - Disable weekends toggle
  - Cutoff time picker
  - Timezone selector (7 major timezones)
  - Active toggle
  
- **Empty State**: Guidance when no schedules exist
- **State Management**: Local state with mock CRUD operations

**Form Validation**:
- Schedule name is required
- Shows alert on missing required fields

**Components Used**:
- Button (multiple variants)
- Badge (for status display)
- Modal (for create/edit)
- FormField
- Custom ScheduleRow component

### 3. Settings (`/app/settings`)

**Purpose**: Global configuration for the date picker

**Sections**:

#### Application Status
- Enable/disable entire Slotly app
- Toggle switch with helpful text

#### Default Configuration
- Default mode selector (Delivery/Pickup/Both)
- Make date selection required toggle

#### Date Picker Labels
- Main label customization
- Placeholder text customization
- Date format selector (4 formats)

#### Advanced Settings
- Enable cart notes
- Enable analytics
- Mobile optimization

**UI Features**:
- Two-column layout (main content + sidebar)
- Save and Reset buttons
- Toast notification on save
- Helpful tips sidebar
- Quick links to other pages

**Components Used**:
- FormField
- Toggle
- Section (custom component)
- Toast notification system

### 4. Help & Docs (`/app/help`)

**Purpose**: Self-help resource and support

**Sections**:

#### Quick Start
- 5-step getting started guide with numbered steps
- Clear descriptions for each step

#### Key Features
- Grid of 6 features with icons
- Brief descriptions of capabilities

#### FAQ
- 8 commonly asked questions
- Collapsible/expandable answers
- Covers enable/disable, schedules, holidays, storage, customization, mobile, analytics, timezones

#### Resources & Support
- Video tutorial link
- Support email contact
- Response time guarantee

**Components Used**:
- Step (custom numbered component)
- FAQItem (collapsible FAQ)
- LinkCard (for resources)

## Layout Architecture

### App Layout (`app.jsx`)

The main app layout provides:

```jsx
<AppProvider> (Shopify)
  <Sidebar Navigation>
    - Dashboard
    - Schedules
    - Settings
    - Help & Docs
  </Sidebar>
  <Main Content>
    <Outlet /> (Route content)
  </Main Content>
</AppProvider>
```

**Navigation Features**:
- Active route highlighting
- Hover effects
- Responsive sidebar with icons and labels
- 250px fixed width

## Component Library

Located in `app/components/`, these reusable components provide consistent styling:

### Button.jsx
```jsx
<Button type="primary|secondary|danger|ghost" size="small|medium|large" disabled>
  Label
</Button>
```

### Badge.jsx
```jsx
<Badge type="primary|success|warning|inactive|info">Status</Badge>
```

### Card.jsx
```jsx
<Card title="Title" subtitle="Subtitle" padding="20px">
  Content
</Card>
```

### FormField.jsx
```jsx
<FormField
  label="Label"
  type="text|textarea|select"
  value={value}
  onChange={handleChange}
  helpText="Help text"
  required
  options={[]} // for select type
/>
```

### Modal.jsx
```jsx
<Modal
  isOpen={bool}
  title="Modal Title"
  onClose={handler}
  onSubmit={handler}
  submitText="Save"
>
  Content
</Modal>
```

### Toast.jsx
```jsx
<Toast
  message="Message"
  type="success|error|info|warning"
  visible={bool}
  onClose={handler}
/>
```

### Toggle.jsx
```jsx
<Toggle
  label="Label"
  checked={bool}
  onChange={handler}
  helpText="Help text"
/>
```

## Styling Approach

- **Inline styles** for component styling (no CSS files)
- **Consistent color palette**:
  - Primary: `#0066cc` (Shopify blue)
  - Success: `#10b981` (Green)
  - Warning: `#f59e0b` (Amber)
  - Danger: `#dc2626` (Red)
  - Text: `#000` (Black), `#666` (Gray)
  - Background: `#fff`, `#f9fafb`, `#f0f7ff`
  - Border: `#e5e7eb`

- **Responsive design** using:
  - CSS Grid
  - Flexbox
  - `repeat(auto-fit, minmax())`
  - Media queries (in progress)

## State Management

Currently using **local React state** with `useState`:

- Dashboard: Mock data only
- Schedules: Local state for CRUD operations (no persistence)
- Settings: Local state for form inputs
- Help: Collapsible state for FAQs

**Future Integration Points**:
- Replace mock data with backend API calls
- Add real data persistence via Shopify Admin API
- Implement GraphQL queries using `useShopifyQuery`

## Form Validation

- Basic required field validation
- Visual error states (ready for implementation)
- Helpful error messages via alerts

**Ready for**: Advanced validation library integration (e.g., `react-hook-form`)

## Accessibility Features

- Semantic HTML (`<button>`, `<input>`, `<label>`)
- Color contrast compliant
- Keyboard navigation ready
- ARIA labels structure (ready for enhancement)

## Mobile Responsiveness

Responsive breakpoints used:
- Mobile: < 480px
- Tablet: 480px - 1024px
- Desktop: > 1024px

**Future**: Add CSS media queries for mobile optimization

## Performance Considerations

- No unnecessary re-renders (using proper React patterns)
- Lightweight components
- Inline styles for fast rendering
- Ready for code splitting via React Router

## Integration Points for Backend

### Loaders (Server-side data)
```jsx
export const loader = async ({ request }) => {
  const data = await fetchFromAPI();
  return json(data);
};
```

### Actions (Form submissions)
```jsx
export const action = async ({ request }) => {
  if (request.method === 'POST') {
    // Handle form submission
  }
};
```

### Authentication
All routes use `await authenticate.admin(request)` from `shopify.server.js`

## UI/UX Patterns Implemented

1. **Empty States**: Guidance when no data exists
2. **Loading States**: Ready for skeleton loaders
3. **Toast Notifications**: Feedback for user actions
4. **Modal Dialogs**: Inline form submission
5. **Badge Status**: Visual status indicators
6. **Sidebar Navigation**: Easy route switching
7. **Quick Actions**: Fast access to common tasks
8. **Helpful Tips**: Contextual guidance
9. **Success Feedback**: Confirmation messages
10. **Two-Column Layout**: Main content + sidebar on settings

## Development Workflow

### Adding a New Page

1. Create route in `app/routes/app.newpage.jsx`
2. Add navigation item in `app.jsx`
3. Use existing components from `app/components/`
4. Follow inline styling patterns
5. Add loader/action as needed

### Using Components

```jsx
import { Button } from '../components/Button';
import { Card } from '../components/Card';

export default function MyPage() {
  return (
    <Card title="Title">
      <Button onClick={handleClick}>Action</Button>
    </Card>
  );
}
```

## Known Limitations & Future Enhancements

### Current
- ✅ UI only (no backend integration)
- ✅ Mock data for demonstration
- ✅ Local state management
- ✅ Inline styling

### Future
- 🔄 Backend API integration
- 🔄 Real data persistence
- 🔄 Advanced form validation
- 🔄 Analytics charts
- 🔄 Export functionality
- 🔄 Bulk operations
- 🔄 Advanced search/filters
- 🔄 Mobile-specific components

## Browser Support

- Chrome (latest)
- Safari (latest)
- Firefox (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

- React 18.3.1
- React Router 7.9.3
- Shopify App Bridge React
- Shopify CLI

No external UI library used. All components are custom-built.

## Notes

- All styling is production-quality but uses inline styles for portability
- Components can be extracted to CSS modules when needed
- The app is embedded in Shopify Admin using `AppProvider embedded`
- Forms are mocked for UI demonstration; ready for real backend integration
- Navigation uses client-side routing via React Router

---

## Quick Start

1. Navigate to `/app` to see the Dashboard
2. Use sidebar to explore all pages
3. Test interactive features (modals, forms, toggles)
4. Review component library in `app/components/`
5. Inspect inline styles for design implementation

All pages are fully functional UI mockups ready for backend integration.
