# Overlap – Holiday Calendar · PRD

## Original Problem Statement
Build a mobile iOS/Android app that shows and compares public holidays between countries, highlighting overlaps and "long weekend" opportunities.

## Core Requirements
- Select 1–5 countries + a year → list all public holidays
- Identify overlapping holidays (all selected countries share the same holiday)
- Detect long weekends (holidays adjacent to weekends)
- Suggest bridge days (one extra day off = 4-day weekend)
- App name: "Overlap – Holiday Calendar"

## Tech Stack
- Frontend: React Native + Expo + Expo Router (TypeScript)
- Backend: Python + FastAPI
- External API: Nager.Date (no key required)
- Database: MongoDB (caching + app config)

## Architecture
```
/app
├── backend/
│   ├── .env
│   ├── requirements.txt
│   ├── server.py
│   └── tests/
└── frontend/
    ├── .env
    ├── app.json           ← newArchEnabled: true
    ├── babel.config.js    ← babel-preset-expo + reanimated plugin
    ├── eas.json
    ├── credentials.json   ← Android keystore config
    ├── overlap-release.keystore
    ├── package.json
    ├── src/
    │   ├── types.ts
    │   ├── utils.ts
    │   ├── hooks/
    │   │   ├── useHolidayData.ts
    │   │   ├── useBookmarks.ts
    │   │   └── useUpdateCheck.ts    ← NEW
    │   ├── store/
    │   │   └── pendingRestore.ts
    │   └── components/
    │       ├── UpdatePrompt.tsx      ← NEW
    │       └── holiday/
    │           ├── StatsBar.tsx
    │           ├── CountryLegend.tsx
    │           ├── HolidayCard.tsx
    │           ├── LongWeekendCard.tsx
    │           ├── SavedCard.tsx
    │           ├── CountryPickerModal.tsx
    │           └── YearPickerModal.tsx
    └── app/
        ├── _layout.tsx    ← Integrates UpdatePrompt
        └── (tabs)/
            ├── _layout.tsx
            ├── index.tsx
            ├── saved.tsx
            └── settings.tsx
```

## Key API Endpoints
- `GET /api/countries` → list of available countries
- `POST /api/compare` → `{ countryCodes, year }` → holidays, overlaps, long weekends
- `GET /api/app-version` → latest version info for update checks
- `PUT /api/app-version` → update latest version (admin)

## What's Been Implemented
- Complex long weekend / bridge day / overlap detection
- Per-country day breakdown on long weekend cards
- Home screen with sticky filter cards (Holidays / Overlaps / Long Weekends)
- Settings screen with About, Help & FAQ modals, legal info, version number
- Saved/Bookmark tab using AsyncStorage
- Share functionality with platform-specific iOS fix
- **Android production build (.aab) completed successfully**
- **App update notification system** — checks backend for newer versions on launch, shows modal with "Update Now" / "Maybe Later"

## Changelog
| Date | Change |
|------|--------|
| Feb 2026 | Set `newArchEnabled: true` in app.json |
| Feb 2026 | Tab bar: replaced hardcoded Platform padding with `useSafeAreaInsets` |
| Feb 2026 | Refactored index.tsx into 8 modular files |
| Feb 2026 | Added Saved/Bookmark tab with AsyncStorage |
| Feb 2026 | Created babel.config.js with babel-preset-expo + reanimated plugin |
| Feb 2026 | Fixed Android build: added `babel-preset-expo` to devDependencies |
| Feb 2026 | Fixed expo doctor: removed `minSdkVersion` from app.json, removed package-lock.json |
| Feb 2026 | **Android production build SUCCEEDED** — .aab ready |
| Feb 2026 | **App update notification system** — backend endpoint + frontend modal |

## Prioritised Backlog
### P0 — Done
- [x] Fix Android build (newArchEnabled, babel-preset-expo, minSdkVersion)
- [x] Android production build (.aab) complete
- [x] App update notification system

### P1 — Pending
- [ ] iOS production build — requires Apple Developer credentials setup on Expo

### P2 — Pending User Verification
- [ ] Share fix (iOS WhatsApp) — needs testing on physical device

### Backlog / Future
- [ ] MongoDB cache indexes for backend performance
