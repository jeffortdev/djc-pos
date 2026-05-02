# LaundroPos — Ionic + Capacitor (Android)

A full-featured Laundromat Point-of-Sale app built with **Ionic Framework + Angular + Capacitor**, targeting Android APK generation.

## Architecture

```
laundromat-pos-ionic/
├── src/app/
│   ├── models/          # Shared TypeScript interfaces
│   ├── services/        # ApiService (HTTP to Express backend)
│   ├── tabs/            # Bottom tab navigation shell
│   └── pages/
│       ├── pos/         # POS page + payment/receipt modals
│       ├── dashboard/   # Today's stats KPIs
│       ├── transactions/# Transaction history with infinite scroll
│       └── services-admin/ # CRUD for laundry services
├── server/              # Express + better-sqlite3 REST API
│   ├── database.ts      # SQLite setup & seed data
│   ├── index.ts         # Express app entry
│   └── routes/          # services / transactions / dashboard routes
└── android/             # Capacitor Android native project
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

#### a. Build the web assets
```bash
npm run build
```

#### b. Sync to Android
```bash
npx cap sync android
```

#### c. Open in Android Studio and generate APK
```bash
npx cap open android
```
In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**

---

## API Base URL

The `ApiService` uses `http://10.0.2.2:3000/api` — this is the standard Android emulator address for the host machine's `localhost`.

**For physical devices**: Replace `10.0.2.2` with your machine's LAN IP (e.g. `192.168.1.x`), or use `adb reverse tcp:3000 tcp:3000` for USB.

To configure: edit [`src/app/services/api.service.ts`](src/app/services/api.service.ts).

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Run API + Ionic dev server together |
| `npm run start:api` | Run Express backend only |
| `npm run start:ui` | Run Ionic dev server only |
| `npm run build` | Build Angular/Ionic app to `www/` |
| `npm run cap:add:android` | Add Android platform (first time) |
| `npm run cap:build:android` | Build + sync to Android |
| `npm run cap:open:android` | Open Android Studio |
