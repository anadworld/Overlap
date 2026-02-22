# Overlap – Holiday Calendar

## Product Overview
A mobile iOS/Android app that shows and compares public holidays between countries, highlighting overlaps and "long weekend" opportunities.

## Core Features
- Select 1-5 countries and a year to view public holidays
- Identify overlapping holidays between selected countries
- Detect and display "long weekends" (holidays adjacent to weekends)
- Share long weekend opportunities with friends

## Tech Stack
- **Frontend**: React Native (Expo), TypeScript, Expo Router
- **Backend**: Python, FastAPI
- **API**: Nager.Date API (public holidays data)
- **Database**: MongoDB (for caching)

## What's Implemented ✅

### Backend (`/app/backend/server.py`)
- GET `/api/countries` - List all available countries
- GET `/api/holidays/{country}/{year}` - Get holidays for a country
- POST `/api/compare` - Compare holidays with deduplication, overlap detection, and long weekend detection
- Caching layer with MongoDB

### Frontend - New UI (`/app/frontend/app/(tabs)/index.tsx`)
- **Selection Bar**: Country flags + Year with "Edit" button
- **Tabs with counts**: "Holidays (17)" and "Long Weekends (10)"
- **Stats pills**: holidays, overlaps, long weekends badges
- **Country legend**: Color-coded pills with flags
- **Unified cards** combining holidays + long weekends:
  - "Overlap" + "Bridge Day" badges
  - Calendar day-by-day view (THU 1, FRI 2, SAT 3...)
  - "HOLIDAYS INCLUDED" section with country flags and dates
  - Yellow bridge day suggestions ("Take Friday off for 4-day weekend!")
- **Share functionality**: Individual and bulk share for long weekends

### Frontend - Settings (`/app/frontend/app/(tabs)/settings.tsx`)
- About, Rate App, Share App (fixed for iOS/Android stores)
- Help & FAQ, Contact Support (overlap@anadworld.com)
- Terms of Use, Privacy Policy, Open Source Licenses
- Version info and branding

## Bugs Fixed
- **P0 (2024-12)**: Duplicate holidays bug - Backend deduplication logic
- **Settings**: Fixed Rate App links for Apple App Store (ID: 6740092498) and Google Play Store
- **Settings**: Fixed Share App to use native Share API with correct store URLs
- **Settings**: Updated old "Holiday Compare" reference to "Overlap – Holiday Calendar"

## Configuration
- **App Store ID**: 6740092498
- **Play Store Package**: com.anadworld.overlap
- **Contact Email**: overlap@anadworld.com

## Pending Issues
- **P1**: Android safe area/status bar issue (renders under status bar)
- **P4**: Web preview country selector (deprioritized)

## Branding
- App Name: "Overlap – Holiday Calendar"
- Contact Email: overlap@anadworld.com
