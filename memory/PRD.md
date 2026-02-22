# Overlap – Holiday Calendar

## Product Overview
A mobile iOS/Android app that shows and compares public holidays between countries, highlighting overlaps and "long weekend" opportunities.

## Core Features
- Select 1-5 countries and a year to view public holidays
- Identify overlapping holidays between selected countries
- Detect and display "long weekends" (holidays adjacent to weekends)

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

### Frontend (`/app/frontend/app/`)
- Two-tab navigation: Home (Overlap) and Settings
- Country selector (1-5 countries)
- Year selector
- Holiday results with toggle for "All" vs "Long Weekends"
- Complete Settings page with About, Terms, Privacy, Contact info
- Custom app icon

## Bugs Fixed
- **P0 (2024-12)**: Duplicate holidays bug - Backend deduplication logic added to filter duplicate entries from Nager API

## Pending Issues
- **P1**: Android safe area/status bar issue (renders under status bar)
- **P2**: App name shows "frontend" on Android device
- **P4**: Web preview country selector (deprioritized)

## Branding
- App Name: "Overlap – Holiday Calendar"
- Contact Email: overlap@anadworld.com
