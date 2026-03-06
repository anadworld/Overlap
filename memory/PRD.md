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
- **Add to Calendar for Saved Weekends** (March 6, 2026): Calendar button on saved cards generates .ics on web, uses expo-calendar on native
- **School Holidays tab** (March 6, 2026): OpenHolidaysAPI for 32 European countries with region filtering, monthly grouping
- Backend with caching, app versioning, MongoDB indexing
- EAS build configuration for Android & iOS
- Settings documentation (About, FAQ, Terms, Privacy, Licenses)
- Custom app icon, splash screen, vibrant multi-colored tab bar icons
- **Android Safe Area Fix**: CountryPickerModal uses useSafeAreaInsets for proper bottom padding

## Pending Issues
- P1: Android safe area bug fix needs formal verification on native build (code fix confirmed working in web)
- P1: iOS build blocked on Apple Developer credentials (API key TNMPKX4PFC needs to be configured in Emergent iOS build settings via support)

## Backlog
- P0: Trigger new Android production build to deliver all recent features
- P1: Complete iOS build process after credentials update
- P2: User verification of all features on native builds (icon, splash, tabs, school holidays, calendar)
