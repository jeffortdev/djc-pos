# DJC Point of Sale

A **laundry-focused Point-of-Sale** app built with **Ionic Framework + Angular + Capacitor**, targeting Android APK generation. Supports laundry services, retail products, transaction management, customer loyalty tracking, sales reports, and full admin management out of the box.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Data Models](#data-models)
3. [Services](#services)
4. [Pages & Components](#pages--components)
   - [Tab Navigation Shell](#tab-navigation-shell)
   - [POS Page](#pos-page)
   - [Dashboard Page](#dashboard-page)
   - [History Page](#history-page)
   - [Reports Page](#reports-page)
   - [Services Admin Page](#services-admin-page)
   - [Products Admin Page](#products-admin-page)
   - [Settings Page](#settings-page)
5. [Transaction Status Lifecycle](#transaction-status-lifecycle)
6. [Storage & Database](#storage--database)
7. [Prerequisites](#prerequisites)
8. [Getting Started](#getting-started)
9. [NPM Scripts](#npm-scripts)
10. [Build & Sign APK](#build--sign-apk)

---

## Architecture

```
djc-pos/
├── src/app/
│   ├── models/
│   │   └── models.ts               # Shared TypeScript interfaces
│   ├── services/
│   │   ├── database.service.ts     # All data access (SQLite native + localStorage fallback)
│   │   └── branding.service.ts     # App title, logo, watermark, color theme
│   ├── tabs/
│   │   └── tabs.component.ts       # Bottom tab navigation shell
│   └── pages/
│       ├── pos/
│       │   ├── pos.page.ts                         # POS cart & checkout
│       │   ├── payment-modal/                      # Payment method + customer capture
│       │   └── receipt-modal/                      # Thermal-style receipt view
│       ├── dashboard/
│       │   ├── dashboard.page.ts                   # Today's KPIs + action hub
│       │   └── loyalty-transactions-modal/         # Customer loyalty history
│       ├── transactions/
│       │   └── transactions.page.ts                # Read-only sales, cash & stock history
│       ├── reports/
│       │   └── reports.page.ts                     # Aggregated reports + Excel export
│       ├── services-admin/
│       │   └── services-admin.page.ts              # CRUD for laundry services
│       ├── products-admin/
│       │   └── products-admin.page.ts              # CRUD for products + stock adjustment
│       └── settings/
│           └── settings.page.ts                    # Branding, PIN, data backup/restore
├── server/                         # Express + better-sqlite3 (browser dev only)
│   ├── database.ts                 # SQLite setup & seed data
│   ├── index.ts                    # Express app entry
│   └── routes/                     # REST routes (services, transactions, dashboard)
└── android/                        # Capacitor Android native project
```

---

## Data Models

All interfaces are defined in [`src/app/models/models.ts`](src/app/models/models.ts).

| Interface | Purpose |
|---|---|
| `LaundryService` | A billable service (name, price, category, unit, loyalty_tracking flag) |
| `Product` | A retail product with cost, price, and stock count |
| `CartItem` | One line item being built in the POS cart (references a service or product) |
| `TransactionItem` | A persisted cart line tied to a completed/pending transaction |
| `Transaction` | A full transaction record including totals, payment, customer info, and status |
| `StockEntry` | A stock movement record (delta, reason, stock-after snapshot) |
| `DatabaseBackup` | Full export payload for backup/restore |
| `DashboardStats` | Today's KPIs: count, revenue, avg ticket, register balance, top services, recent list |
| `ReportStats` | Aggregated report metrics: trend, payment breakdown, top services, repeat customers |
| `LoyaltyEntry` | A customer's loyalty summary (name, phone, service count, last visit) |
| `RepeatCustomer` | A customer who has made ≥ 2 transactions in the report period |

---

## Services

### `DatabaseService`
The single data-access layer for the entire app.

- **Storage target**: Uses `@capacitor-community/sqlite` on native Android/iOS. Falls back to `localStorage` in the browser (dev mode).
- **Schema migrations**: Runs at app startup — adds columns (`phone_number`, `notify_count`, `customer_name`, `status`, `item_type`) and tables (`stock_history`, `loyalty_redemptions`) incrementally, so existing data is never lost.
- **Key capabilities**:
  - Services CRUD, Products CRUD, Stock adjustments
  - Transaction lifecycle: create → accept payment → mark picked up
  - Edit pending transaction items (`updateTransactionItems`)
  - Dashboard stats aggregation (`getDashboardToday`)
  - Report aggregation with period + payment filter (`buildReport`)
  - Customer autocomplete & loyalty tracking (`getLoyaltyLeaderboard`, `getLoyaltyTransactionsByPhone`)
  - Register cash entries, SMS notification count tracking
  - Settings key/value store
  - Full database backup and restore

### `BrandingService`
Persists and broadcasts customisation options across all pages via RxJS `BehaviorSubject` streams:
- `appTitle$` — header title text
- `logoSrc$` — header and receipt logo (base64 data URL or asset path)
- `watermarkSrc$` / `watermarkOpacity$` — background watermark on POS page
- `colorTheme$` — `'system' | 'light' | 'dark'`

---

## Pages & Components

### Tab Navigation Shell

**File**: [`src/app/tabs/tabs.component.ts`](src/app/tabs/tabs.component.ts)

A persistent bottom `IonTabBar` with five tabs. The **Settings** tab uses a click handler to open the settings page with a PIN guard rather than standard tab routing.

| Tab | Route | Icon |
|-----|-------|------|
| POS | `/pos` | `cash-outline` |
| Dashboard | `/dashboard` | `bar-chart-outline` |
| History | `/transactions` | `receipt-outline` |
| Reports | `/reports` | `analytics-outline` |
| Settings | `/settings` (PIN-guarded) | `settings-outline` |

---

### POS Page

**File**: [`src/app/pages/pos/pos.page.ts`](src/app/pages/pos/pos.page.ts)

**Purpose**: The primary transaction entry screen. Staff select services and products to build a cart, then charge the customer.

#### Functional Definition

| Capability | Description |
|---|---|
| Service catalogue | Scrollable grid of `LaundryService` items grouped by category, each with a category icon |
| Product catalogue | Separate section for retail `Product` items |
| Cart management | Add, increment, decrement, and remove line items; clear entire cart |
| Quantity adjustment | `+` / `−` buttons on every cart line; item removed automatically at zero |
| Mobile cart drawer | On small screens the cart slides in as a drawer triggered by a cart icon badge in the header |
| Edit mode | Invoked via router state (`history.state.editTx`) from the Dashboard when editing a pending order. Pre-loads existing items. Shows an edit banner with **Save Changes** and **Charge** CTAs |
| Charge / Save | Opens `PaymentModalComponent`. On confirm: creates a new transaction (`createTransaction`) or updates existing items then accepts payment (`updateTransactionItems` + `acceptPayment`) |
| Receipt | On successful charge, opens `ReceiptModalComponent` |
| Pending order | Selecting "Pending" in the payment modal creates the transaction with `status: 'pending'` — no payment collected yet |
| Category filter chips | Filter service list by category |
| Pull-to-refresh | Reloads services and products from the database |
| Branding | Header logo and title sourced from `BrandingService`; optional watermark behind the content |

#### Ionic Components Used

`IonHeader`, `IonToolbar`, `IonTitle`, `IonContent`, `IonGrid`, `IonRow`, `IonCol`, `IonCard`, `IonCardContent`, `IonButton`, `IonButtons`, `IonIcon`, `IonChip`, `IonLabel`, `IonSpinner`, `IonRefresher`, `IonRefresherContent`, `IonBadge`

#### Child Components / Modals

| Component | File | Purpose |
|---|---|---|
| `PaymentModalComponent` | `payment-modal/payment-modal.component.ts` | Collects payment method (Cash / Card / GCash), amount tendered, customer name with autocomplete, phone number, and notes. Calculates change. Supports "Pending" mode to defer payment. |
| `ReceiptModalComponent` | `receipt-modal/receipt-modal.component.ts` | Displays a thermal-style receipt with logo, item list, totals, payment method, and change due. Shared by POS and History pages. |

---

### Dashboard Page

**File**: [`src/app/pages/dashboard/dashboard.page.ts`](src/app/pages/dashboard/dashboard.page.ts)

**Purpose**: The operational hub. Shows today's business health at a glance and surfaces all transactions that need staff action.

#### Functional Definition

| Capability | Description |
|---|---|
| Cash-in-register card | Shows real-time register balance (cash sales + manually added cash). "Add Cash" button prompts for amount and note |
| Action Required — Unpaid | Lists all `pending` transactions. Per-row actions: **Edit** (navigate to POS edit mode), **Accept Payment** (open `PaymentModalComponent`), **Notify** (send SMS — badge on button shows send count), **Delete** (PIN-protected) |
| Action Required — Awaiting Pickup | Lists all `paid` transactions (every paid order must be picked up). Per-row actions: **Notify** (SMS with badge, shown only when phone number present), **Mark Picked Up** (confirm dialog → sets `status: 'picked_up'`) |
| Today's KPIs | Transaction count, total revenue, average ticket value |
| Payment breakdown chips | Shows today's totals split by cash / card / GCash |
| Top 5 services | Ranked by revenue, displayed as chips |
| Recent transactions | Last 5 `pending` or `paid` transactions (excluding `picked_up`) |
| Loyalty leaderboard | Top customers ranked by loyalty-eligible service count. Tapping a row opens `LoyaltyTransactionsModalComponent` |
| Long-press tooltips | All icon-only action buttons show a toast label on 600 ms press-and-hold, preventing accidental taps |
| Pull-to-refresh | Reloads all sections |

#### Ionic Components Used

`IonHeader`, `IonToolbar`, `IonTitle`, `IonContent`, `IonCard`, `IonCardContent`, `IonCardHeader`, `IonCardTitle`, `IonIcon`, `IonSpinner`, `IonChip`, `IonLabel`, `IonRefresher`, `IonRefresherContent`, `IonButton`, `AlertController`, `ToastController`, `ModalController`

#### Child Components / Modals

| Component | File | Purpose |
|---|---|---|
| `PaymentModalComponent` | `../pos/payment-modal/payment-modal.component.ts` | Re-used from POS to accept payment on a pending order direct from the dashboard |
| `ReceiptModalComponent` | `../pos/receipt-modal/receipt-modal.component.ts` | Re-used to previewing any completed transaction receipt |
| `LoyaltyTransactionsModalComponent` | `loyalty-transactions-modal/loyalty-transactions-modal.component.ts` | Shows a customer's full loyalty-eligible transaction history, total spend, and service breakdown |

---

### History Page

**File**: [`src/app/pages/transactions/transactions.page.ts`](src/app/pages/transactions/transactions.page.ts)

**Purpose**: Read-only archive of all recorded activity. No editing or payment actions — those are on the Dashboard.

#### Functional Definition

| Capability | Description |
|---|---|
| Sales tab | Paginated list of all transactions with infinite scroll. Shows transaction ID, date, customer name, item summary, total, status chip, and payment method chip |
| Status chips | `pending` → amber hourglass chip; `paid` → payment-method colour chip; `picked_up` → green "Picked Up" chip |
| View receipt | Eye icon opens `ReceiptModalComponent` for any transaction |
| Delete | Trash icon opens a PIN prompt. On success, permanently deletes the transaction and its items |
| Cash tab | Chronological log of all manually added register cash entries |
| Stock tab | Chronological log of all stock adjustment entries (product, delta, reason, stock-after) |
| Search / filter | Pull-to-refresh reloads data; infinite scroll loads the next page |
| Segment navigation | `IonSegment` switches between Sales, Cash, and Stock tabs |

#### Ionic Components Used

`IonHeader`, `IonToolbar`, `IonTitle`, `IonContent`, `IonCard`, `IonCardContent`, `IonIcon`, `IonSpinner`, `IonButton`, `IonChip`, `IonLabel`, `IonRefresher`, `IonRefresherContent`, `IonInfiniteScroll`, `IonInfiniteScrollContent`, `IonSegment`, `IonSegmentButton`

#### Child Components / Modals

| Component | File | Purpose |
|---|---|---|
| `ReceiptModalComponent` | `../pos/receipt-modal/receipt-modal.component.ts` | Full receipt view for any historical transaction |

---

### Reports Page

**File**: [`src/app/pages/reports/reports.page.ts`](src/app/pages/reports/reports.page.ts)

**Purpose**: Aggregated sales analytics across selectable time periods.

#### Functional Definition

| Capability | Description |
|---|---|
| Period selector | Segment tabs: **Today**, **Week**, **Month**, **Custom** (date-range picker) |
| Payment filter chips | Filter all metrics by payment method (All / Cash / Card / GCash) |
| KPI summary card | Current-period totals vs. prior period: transaction count, revenue, average ticket, with trend indicators |
| Payment split card | Revenue and count breakdown by payment method for the selected period |
| Top services card | Top 5 services by revenue, with count and revenue columns |
| Daily trend card | Revenue per day in the selected period (Week/Month/Custom) |
| Repeat customers card | Customers with ≥ 2 transactions and their total spend / visit count |
| Excel export | Downloads a multi-sheet `.xlsx` file via `write-excel-file`: Summary, Top Services, Daily, Repeat Customers |
| Pull-to-refresh | Reloads report data |

#### Ionic Components Used

`IonHeader`, `IonToolbar`, `IonTitle`, `IonContent`, `IonCard`, `IonCardContent`, `IonCardHeader`, `IonCardTitle`, `IonSegment`, `IonSegmentButton`, `IonLabel`, `IonIcon`, `IonSpinner`, `IonRefresher`, `IonRefresherContent`, `IonChip`, `IonButtons`, `IonButton`

---

### Services Admin Page

**File**: [`src/app/pages/services-admin/services-admin.page.ts`](src/app/pages/services-admin/services-admin.page.ts)

**Purpose**: Manage the catalogue of laundry services available on the POS screen.

#### Functional Definition

| Capability | Description |
|---|---|
| Service list | Displays all services with name, category, unit, and price |
| Add service | Inline form card appears at the top of the list |
| Edit service | Tapping the edit icon pre-fills the inline form for updating |
| Delete service | PIN-protected confirmation then permanent removal |
| Fields | Name, Price, Category (`wash / dry / press / dry-clean / special / standard`), Unit (`per kg / per load / per item …`), Loyalty Tracking toggle |
| Loyalty tracking toggle | Controls whether transactions for this service count toward the customer loyalty leaderboard |
| Active toggle | Inactive services are hidden on the POS screen |
| Sort order | Services retain a display order used on the POS grid |
| Pull-to-refresh | Reloads the service list |

#### Ionic Components Used

`IonHeader`, `IonToolbar`, `IonTitle`, `IonContent`, `IonCard`, `IonCardContent`, `IonIcon`, `IonSpinner`, `IonButton`, `IonButtons`, `IonItem`, `IonLabel`, `IonInput`, `IonSelect`, `IonSelectOption`, `IonToggle`, `IonRefresher`, `IonRefresherContent`

---

### Products Admin Page

**File**: [`src/app/pages/products-admin/products-admin.page.ts`](src/app/pages/products-admin/products-admin.page.ts)

**Purpose**: Manage retail products and track their stock levels.

#### Functional Definition

| Capability | Description |
|---|---|
| Product list | Card per product showing name, type, cost, price, current stock, and active status |
| Low-stock badge | Red badge when stock ≤ 5 |
| Add product | Inline form with opening-stock field |
| Edit product | Pre-filled inline form (opening stock field hidden on edit) |
| Delete product | PIN-protected confirmation |
| Stock adjustment | `+` / `−` buttons on each product card open a prompt for delta amount and reason (`Restock / Damaged / Correction / Returned / Other`) |
| Stock history | Collapsible log of all past adjustments for a product |
| Fields | Name, Type (`Dry Goods / Cleaning Supplies / Detergent / Accessories / Other`), Cost, Price, Active toggle |
| Pull-to-refresh | Reloads the product list |

#### Ionic Components Used

`IonHeader`, `IonToolbar`, `IonTitle`, `IonContent`, `IonCard`, `IonCardContent`, `IonIcon`, `IonSpinner`, `IonButton`, `IonButtons`, `IonItem`, `IonLabel`, `IonInput`, `IonSelect`, `IonSelectOption`, `IonToggle`, `IonRefresher`, `IonRefresherContent`, `IonBadge`

---

### Settings Page

**File**: [`src/app/pages/settings/settings.page.ts`](src/app/pages/settings/settings.page.ts)

**Purpose**: Configures app-wide branding, security PIN, and data portability.

#### Functional Definition

| Capability | Description |
|---|---|
| Color theme | Segment: **System** / **Light** / **Dark** — applied globally via CSS class on `document.body` |
| Header title | Editable text that replaces the "DJC Point of Sale" label in all page headers |
| Header logo | Upload a custom logo image (stored as base64). Appears in all page headers and on receipts |
| Watermark | Upload a background watermark image for the POS page. Opacity slider (0–100 %) |
| Admin PIN | Set or change the 4-digit PIN used for protected actions (delete, settings access) |
| Backup | Exports the full database (services, products, transactions, register entries, settings) as a JSON file |
| Restore | Imports a JSON backup file — overwrites all local data |
| Reset | Factory reset option (PIN-protected) that wipes all data and reloads defaults |

#### Ionic Components Used

`IonHeader`, `IonToolbar`, `IonTitle`, `IonContent`, `IonList`, `IonItem`, `IonLabel`, `IonInput`, `IonTextarea`, `IonButton`, `IonIcon`, `IonNote`, `IonRange`, `IonSegment`, `IonSegmentButton`

---

## Transaction Status Lifecycle

Every transaction passes through a defined state machine. Transitions are enforced in `DatabaseService` and the Dashboard.

```
  [POS — Charge / Pay Now]    [POS — Pay on Pickup]
              │                        │
              ▼                        ▼
           'paid' ◄─────────────── 'pending'
              │        accept           │
              │        payment          │ edit items
              │        (Dashboard)      │ (POS edit mode via Dashboard)
              │
              ▼
         'picked_up'
         (terminal — no further transitions)
```

**Paid + Picked Up simultaneously** — When accepting payment on the Dashboard for a pending order, a "Mark as Picked Up now" toggle is available. Enabling it transitions the order directly from `pending` → `paid` → `picked_up` in one action, skipping the Awaiting Pickup queue.

| Status | Meaning | Visible on Dashboard | Visible in History |
|--------|---------|---------------------|-------------------|
| `pending` | Order logged, payment not yet collected | ✅ Unpaid section | ✅ Amber hourglass chip |
| `paid` | Payment accepted; awaiting customer pickup | ✅ Awaiting Pickup section (all paid orders) | ✅ Payment-method chip |
| `picked_up` | Customer has collected their order — closed | ❌ Hidden | ✅ Green "Picked Up" chip |

**Rules enforced by the app:**
- A `pending` order can have items edited (via POS edit mode, launched from Dashboard) and payment accepted at any time.
- `markPickedUp()` is blocked unless the transaction is currently `paid` — you cannot skip payment.
- Payment and pickup can happen simultaneously via the "Mark as Picked Up now" toggle in the Dashboard payment modal.
- Pickup can only be actioned from the **Dashboard** — the POS page creates orders only (`pending` or `paid`; never `picked_up`).
- Revenue KPIs and reports count both `paid` **and** `picked_up` transactions so revenue is never lost when an order is closed out.
- The Dashboard "Recent Transactions" and "Awaiting Pickup" sections only show open orders (`pending` and `paid`).

---

## Storage & Database

| Environment | Storage Engine |
|---|---|
| Android / iOS (native) | `@capacitor-community/sqlite` — on-device SQLite file |
| Browser (dev) | `localStorage` JSON store with the same interface |

### SQLite Schema (key tables)

| Table | Key Columns |
|---|---|
| `transactions` | `id`, `created_at`, `subtotal`, `tax`, `total`, `payment_method`, `amount_tendered`, `change_due`, `customer_name`, `phone_number`, `notes`, `notify_count`, `status` |
| `transaction_items` | `id`, `transaction_id`, `service_id`, `service_name`, `unit`, `price`, `quantity`, `subtotal`, `item_type` |
| `services` | `id`, `name`, `price`, `category`, `unit`, `active`, `sort_order`, `loyalty_tracking` |
| `products` | `id`, `name`, `type`, `cost`, `price`, `stock`, `active`, `sort_order` |
| `stock_history` | `id`, `product_id`, `delta`, `reason`, `note`, `stock_after`, `created_at` |
| `register_entries` | `id`, `amount`, `note`, `created_at` |
| `loyalty_redemptions` | `id`, `phone_number`, `redeemed_at`, `note` |
| `settings` | `key`, `value` |

Schema migrations run at startup and are idempotent — columns and tables are added only if they do not already exist.

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| npm | ≥ 9 |
| Java JDK | 17 (for Android build) |
| Android Studio | Latest (for SDK & emulator) |

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Run in browser (development)
```bash
npm start        # Starts Express API on :3000 + Ionic dev server on :8100
```

### 3. Build for Android

#### a. Build web assets + sync to Android
```bash
npm run cap:build:android
```

#### b. Build debug APK (one command)
```bash
npm run cap:apk:debug
```

#### c. Build release APK
```bash
npm run cap:apk:release
```

#### d. Install debug APK directly to connected device
```bash
npm run install:android
```

#### e. Sign release APK
```bash
npm run sign:android
```

#### f. Open in Android Studio (for manual build / emulator)
```bash
npm run cap:open:android
```
In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

---

## API Base URL

The `DatabaseService` uses `http://10.0.2.2:3000/api` — the standard Android emulator address for the host machine's `localhost`.

**For physical devices**: Replace `10.0.2.2` with your machine's LAN IP (e.g. `192.168.1.x`), or use `adb reverse tcp:3000 tcp:3000` over USB.

To configure: edit [`src/app/services/database.service.ts`](src/app/services/database.service.ts).

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Run API + Ionic dev server together |
| `npm run start:api` | Run Express backend only |
| `npm run start:ui` | Run Ionic dev server only |
| `npm run build` | Build Angular/Ionic app to `www/` |
| `npm run cap:add:android` | Add Android platform (first time only) |
| `npm run cap:build:android` | Build + sync to Android |
| `npm run cap:apk:debug` | Build debug APK via Gradle |
| `npm run cap:apk:release` | Build release APK via Gradle |
| `npm run install:android` | Build & install debug APK via ADB |
| `npm run cap:open:android` | Open Android Studio |
| `npm run sign:android` | Sign release APK |
| `npm run e2e` | Run Playwright end-to-end tests |
| `npm run e2e:headed` | Run Playwright tests with browser UI |
| `npm test` | Run unit tests (Karma) |
