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
- Notifications: expo-notifications (local scheduling)

## Architecture
```
/app
├── backend/
│   ├── server.py
│   └── tests/
└── frontend/
    ├── app.json
    ├── babel.config.js
    ├── eas.json
    ├── src/
    │   ├── hooks/
    │   │   ├── useHolidayData.ts
    │   │   ├── useBookmarks.ts
    │   │   ├── useUpdateCheck.ts
    │   │   └── useNotifications.ts    ← NEW
    │   ├── components/
    │   │   ├── UpdatePrompt.tsx
    │   │   └── holiday/
    │   │       ├── StatsBar.tsx, CountryLegend.tsx
    │   │       ├── HolidayCard.tsx, LongWeekendCard.tsx
    │   │       ├── SavedCard.tsx
    │   │       ├── CountryPickerModal.tsx
    │   │       └── YearPickerModal.tsx
    │   ├── store/pendingRestore.ts
    │   ├── types.ts
    │   └── utils.ts
    └── app/
        ├── _layout.tsx
        └── (tabs)/
            ├── _layout.tsx
            ├── index.tsx    ← schedules notifications on bookmark
            ├── saved.tsx    ← cancels notifications on delete
            └── settings.tsx ← notification preferences UI
```

## Key API Endpoints
- `GET /api/countries` → list of available countries
- `POST /api/compare` → holidays, overlaps, long weekends
- `GET /api/app-version` → latest version info
- `PUT /api/app-version` → update latest version (admin)

## What's Been Implemented
- Holiday comparison with overlap/long weekend/bridge day detection
- Home screen with filter cards, country/year pickers
- Settings with About, FAQ, legal modals, version
- Saved/Bookmark tab using AsyncStorage
- Share functionality with iOS fix
- App update notification system
- **Holiday reminder notifications** — local push notifications for saved long weekends with configurable timing (1 day / 3 days / 1 week before)
- Android production build (.aab) completed

## Changelog
| Date | Change |
|------|--------|
| Feb 2026 | Initial app with holiday comparison, settings, bookmarks |
| Feb 2026 | Android build fixes (babel-preset-expo, minSdkVersion, package-lock) |
| Feb 2026 | **Android production build SUCCEEDED** |
| Feb 2026 | App update notification system (version check + modal) |
| Feb 2026 | **Holiday reminder notifications** — expo-notifications with Settings UI |

## Prioritised Backlog
### Done
- [x] Android production build
- [x] App update notification system
- [x] Holiday reminder notifications with Settings preferences

### P1 — Pending
- [ ] iOS production build — requires Apple Developer credentials on Expo

### P2 — Pending User Verification
- [ ] Share fix (iOS WhatsApp) — needs physical device testing

### Backlog
- [ ] MongoDB cache indexes for backend performance
