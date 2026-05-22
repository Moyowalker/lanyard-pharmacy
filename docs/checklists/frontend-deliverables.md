# Frontend Deliverables — Detailed Checklist

Granular screen-level tracking for `apps/web` and `apps/admin`. The high-level summary lives in `project-deliverables.md`; mark items here first, then roll the high-level item done only when all sub-items below are checked.

---

## Web Storefront (`apps/web`)

### Foundation

- [x] Shared storefront data module — session helpers, cart persistence, API client factory, fallback data (`storefront-data.ts`)
- [x] Global layout, fonts, Tailwind palette, and design tokens (`globals.css`, `layout.tsx`)
- [x] Typed API client wiring for storefront (`createStorefrontClient`, `getOrCreateDemoCustomerSession`)

### Landing Page (`/`)

- [x] Hero section with brand identity and service summary
- [x] Branch selector — pickup/delivery mode toggle and branch dropdown
- [x] Service planner validation with inline feedback (`validatePlanner`, `buildPlannerFeedback`)
- [x] Live catalog feed from API with category filter chips and keyword search
- [x] Product cards — Rx badge, price, stock status, add-to-cart action
- [x] Floating cart drawer — line items, quantity controls, and order total
- [x] Cart checkout — calls API to create order, clears cart and shows confirmation on success
- [x] Demo session auto-login (no manual login step in storefront MVP)
- [x] Navigation links to account and prescription pages

### Product Detail Page (`/products/[slug]`)

- [x] Product metadata display — name, dosage form, category, description, Rx badge
- [x] Branch-aware stock indicator driven by `branchId` search param
- [x] Add-to-cart action from the detail page

### Customer Account Page (`/account`)

- [x] Profile summary display — name, email, role
- [x] Branch selector for order context
- [x] Order history table with status badges and branch info
- [x] Prescription history table with status badges
- [x] Sign-out action

### Prescription Request Page (`/prescriptions`)

- [x] Prescription upload / request form — product, dosage, prescriber, notes
- [x] Order linkage selector for Rx-required products
- [x] Form validation and submission to API
- [x] Prescription history table with current statuses

### Out of Current Scope (not yet committed)

- [ ] Real authentication — login and registration pages (currently demo auto-login)
- [ ] Dedicated `/orders/[id]` order detail and live-tracking page
- [ ] Post-checkout confirmation / thank-you page
- [ ] Dedicated SEO-friendly category browsing routes (e.g. `/catalog/[category]`)

---

## Admin Operations (`apps/admin`)

### Foundation

- [x] `admin-session.ts` — session read/write helpers, branch persistence, admin API client factory
- [x] Role-aware navigation — branch badge, links to all admin screens (`admin-home.tsx`)

### Admin Shell / Login (`/`)

- [x] Demo admin auto-login on mount
- [x] Branch selector with localStorage persistence
- [x] Navigation skeleton linking to all top-level admin pages
- [x] UI component showcase (Queue health, Access states demo sections)

### Operations Dashboard (`/dashboard`)

- [x] Branch selector with localStorage persistence
- [x] 4 metric cards — branch orders, needing attention, prescriptions pending, health alerts
- [x] Platform health alerts panel
- [x] Orders queue DataTable with inline status-transition selects
- [x] Prescriptions queue DataTable — Start Review / Approve / Reject / Clarify / Fulfill actions

### Catalog Management (`/catalog`)

- [x] Product search input and category filter chips
- [x] Products DataTable — name, category, price, Rx flag, branch count
- [x] Per-product branch availability expansion panel
- [x] Add / remove branch availability toggles via API
- [x] Optimistic local state updates for availability changes

### Inventory Management (`/inventory`)

- [x] Branch selector (persisted to localStorage)
- [x] 4 metric cards — batch count, total available, total reserved, low-stock alert count
- [x] Low-stock alerts DataTable
- [x] Inventory batches DataTable — expiry color-coding, Adjust row action
- [x] Stock adjustment form — batch select, quantity delta with sign, reason field
- [x] Form validation (`validateAdjustForm`) and success reload of alerts

### Order Management (`/orders`) — NOT YET BUILT

- [ ] Order list with filters — branch, status, date range
- [ ] Order summary DataTable — order ID, customer, branch, status badge, total, created date
- [ ] Order detail panel or drawer — line items, customer info, delivery / pickup details, payment status
- [ ] Order status transitions — accept, ready for pickup, dispatch, mark delivered, cancel
- [ ] Bulk status update for multiple orders

### Prescription Review (`/prescriptions`) — NOT YET BUILT

- [ ] Prescription queue DataTable with filter by status — pending, under_review, clarification_requested
- [ ] Prescription detail panel — product, dosage, prescriber, notes, order link
- [ ] Start Review action (claims the prescription for the current pharmacist)
- [ ] Approve / Reject / Request Clarification actions
- [ ] Free-text note input on reject or clarify
- [ ] Fulfill action when linked order is ready

### Customer Support (`/customers`) — NOT YET BUILT

- [ ] Customer search — by name, email, or order ID
- [ ] Customer list DataTable — name, email, branch, account status
- [ ] Customer profile view — contact info, branch, registration date
- [ ] Customer order history within the support view (read-only)
- [ ] Customer prescription history within the support view (read-only)

### Audit & Notification Monitoring (`/audit`) — NOT YET BUILT

- [ ] Audit event log DataTable — actor, action, resource type, resource ID, timestamp
- [ ] Filters — actor, action type, date range
- [ ] Notification delivery log — channel, recipient, status, timestamp
- [ ] Failed / dead-letter notification summary with retry count
