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
- No database

## Architecture
```
/app
├── backend/
│   ├── .env
│   ├── requirements.txt
│   └── server.py          ← holiday compare logic, /api/countries, /api/compare
└── frontend/
    ├── .env
    ├── app.json           ← newArchEnabled: true (required for reanimated)
    ├── package.json
    └── app/
        ├── _layout.tsx
        └── (tabs)/
            ├── _layout.tsx   ← tab bar with useSafeAreaInsets
            ├── index.tsx     ← home screen (~700 lines, needs refactor)
            └── settings.tsx  ← settings + About + FAQ modals
```

## Key API Endpoints
- `GET /api/countries` → list of available countries
- `POST /api/compare` → `{ countryCodes, year }` → holidays, overlaps, long weekends

## What's Been Implemented
- Complex long weekend / bridge day / overlap detection in `backend/server.py`
- Per-country day breakdown on long weekend cards
- Home screen with sticky filter cards (Holidays / Overlaps / Long Weekends)
- Settings screen with About, Help & FAQ modals, legal info, version number
- `newArchEnabled: true` in `app.json` (fixes Gradle build failure with react-native-reanimated)
- Tab bar safe area via `useSafeAreaInsets` (fixes Android layout bug)
- Share functionality cleaned up: plain-text message, no emoji, includes `title` field

## Changelog
| Date | Change |
|------|--------|
| Feb 2026 | Set `newArchEnabled: true` in app.json — fixes Android deployment build |
| Feb 2026 | Tab bar: replaced hardcoded Platform padding with `useSafeAreaInsets` |
| Feb 2026 | Share: plain-text message, added `title`, removed flag emoji from text |

## Prioritised Backlog
### P0 — Done
- [x] Fix Android build (newArchEnabled conflict)

### P1
- [x] Share fix (emoji removed, title added) — needs user verification on device

### P2
- [x] Android tab bar safe area fix (useSafeAreaInsets)

### P3 — Pending User Verification
- [ ] iPhone stat cards size — fix already applied, awaiting user confirmation

### Backlog / Future
- [ ] Refactor `index.tsx` (700+ lines) into smaller components (CountrySelector, StatsBar, ResultsList, HolidayCard)
- [ ] Add custom tab bar to eliminate need for wrapper component pattern
