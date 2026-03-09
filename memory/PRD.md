# Overlap - Holiday Calendar PRD

## Original Problem Statement
Build a mobile iOS/Android native app named "Overlap - Holiday Calendar" that shows and compares public holidays between countries. Features include: country selection (1-5), long weekend detection, bridge days, bookmarks, sharing, push notifications, and calendar integration. Also includes school holidays for European countries.

## Architecture
- **Frontend**: React Native / Expo with TypeScript, 4-tab navigation (Holiday, School, Saved, Settings)
- **Backend**: FastAPI (Python) with MongoDB caching
- **External APIs**: Nager.Date API (public holidays), OpenHolidaysAPI (school holidays)
- **Deployment**: Expo Application Services (EAS) for mobile builds, Emergent native deployment for backend

## What's Been Implemented
- Full 4-tab app (Holiday, School, Saved, Settings) with animated home screen
- Holiday comparison with overlap detection, long weekends, bridge days
- Bookmarks, share, push notifications, calendar integration (individual holidays)
- Add to Calendar for Saved Weekends: Calendar button on saved cards
- School Holidays tab: OpenHolidaysAPI for 32 European countries with region filtering
- Backend with caching, stale cache fallback, app versioning, MongoDB indexing
- EAS build configuration for Android & iOS
- Custom app icon (vibrant globe + paper airplane), splash screen, vibrant multi-colored tab bar icons
- Android Safe Area Fix

## Recent Changes (March 9, 2026)
- Removed "Rate the App" from Settings
- Help & FAQ, Terms of Use, Privacy Policy now open https://anadworld.com/overlap
- Cleaned up ~300 lines of unused modal content
- School Holidays API resilience: graceful error handling, stale cache fallback, subdivision filter fallback
- Fixed 4 TypeScript errors (0 errors remaining)
- Pre-build audit: all endpoints verified, assets validated

## Pending Issues
- P1: Android safe area bug needs native build verification
- P1: iOS build blocked on Apple Developer credentials

## Backlog
- P0: Trigger new Android production build
- P1: Complete iOS build (locally via EAS CLI or after platform fix)
- P2: User verification on native builds
