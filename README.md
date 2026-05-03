# DJC Point of Sale

A general-purpose **Point-of-Sale** app built with **Ionic Framework + Angular + Capacitor**, targeting Android APK generation. Supports services, products, transactions, reports, and admin management out of the box.

## Architecture

```
djc-pos/
├── src/app/
│   ├── models/             # Shared TypeScript interfaces
│   ├── services/           # DatabaseService (HTTP to Express backend)
│   ├── tabs/               # Bottom tab navigation shell
│   └── pages/
│       ├── pos/            # POS page + payment/receipt modals
│       ├── dashboard/      # Today's stats KPIs
│       ├── transactions/   # Transaction history with infinite scroll
│       ├── reports/        # Sales reports & export
│       ├── services-admin/ # CRUD for services
│       ├── products-admin/ # CRUD for products & stock
│       └── settings/       # App settings
├── server/                 # Express + better-sqlite3 REST API
│   ├── database.ts         # SQLite setup & seed data
│   ├── index.ts            # Express app entry
│   └── routes/             # services / transactions / dashboard routes
└── android/                # Capacitor Android native project
```

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
