# Overlap - Holiday Calendar PRD

## Original Problem Statement
Build a mobile iOS/Android native app named "Overlap - Holiday Calendar" that shows and compares public holidays between countries. Features include: country selection (1-5), long weekend detection, bridge days, bookmarks, sharing, push notifications, and calendar integration. Also includes school holidays for European countries.

## Architecture
- **Frontend**: React Native / Expo with TypeScript, 4-tab navigation (Holiday, School, Saved, Settings)
- **Backend**: FastAPI (Python) with MongoDB caching
- **External APIs**: Nager.Date API (public holidays), OpenHolidaysAPI (school holidays)
- **Deployment**: Expo Application Services (EAS) for mobile builds

## What's Been Implemented
- Full 4-tab app (Holiday, School, Saved, Settings)
- Holiday comparison with overlap detection, long weekends, bridge days
- Bookmarks, share, push notifications, calendar integration
- Add to Calendar for Saved Weekends
- School Holidays tab: 30+ European countries with region filtering
- **Favorite Countries**: Heart toggle in country picker, favorites section at top, persisted via AsyncStorage
- Backend with caching, stale cache fallback, app versioning
- Custom app icon (globe + paper airplane), splash screen, vibrant tab bar
- Settings: All links (About, FAQ, Terms, Privacy, Open Source, Contact) open external URLs via expo-web-browser
- Version 2.0.0

## Pending
- P0: Trigger new Android build
- P1: iOS build (local EAS CLI)
- P2: Native device verification
