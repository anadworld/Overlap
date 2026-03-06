# Overlap - Holiday Calendar PRD

## Original Problem Statement
Build a mobile iOS/Android native app named "Overlap - Holiday Calendar" that shows and compares public holidays between countries. Features include: country selection (1-5), long weekend detection, bridge days, bookmarks, sharing, push notifications, and calendar integration.

## Architecture
- **Frontend**: React Native / Expo with TypeScript
- **Backend**: FastAPI (Python) with MongoDB caching
- **External API**: Nager.Date API for holiday data
- **Deployment**: Expo Application Services (EAS) for mobile builds, Emergent native deployment for backend

## What's Been Implemented
- Full 3-tab app (Home, Saved, Settings) with animated home screen
- Holiday comparison with overlap detection, long weekends, bridge days
- Bookmarks, share, push notifications, calendar integration
- Backend with caching, app versioning, MongoDB indexing
- EAS build configuration for Android & iOS
- Settings documentation (About, FAQ, Terms, Privacy, Licenses)
- **School Holidays tab** (March 6, 2026): Integrated OpenHolidaysAPI for 36 European countries with subdivision/region filtering, grayed-out unsupported countries, monthly grouping

## Deployment Fixes (March 2, 2026)
1. **Backend .env**: Removed quotes from MONGO_URL and DB_NAME for production Atlas compatibility
2. **app.json**: Removed user-specific `owner` ("anadworld") and `extra.eas.projectId` that conflict with Emergent's @emergent007 EAS account
3. **app.json**: Changed slug to "overlap-holidays-2" to match deployment system's expected slug (derived from EXPO_TUNNEL_SUBDOMAIN)
4. **MongoDB Query Optimization**: Added `_id: 0` projections to all MongoDB queries (countries_cache, holidays_cache, saved_comparisons) to prevent ObjectId serialization issues in production
5. **EAS Slug Conflict Note**: The deployment system strips projectId from app.json and runs `eas init`, which fails if the slug already exists. This is a deployment pipeline issue - the system should link to existing projects on re-deployments rather than trying to create new ones.

## Pending Issues
- P0: Android safe area bug fix needs verification
- P1: iOS build blocked on Apple Developer credentials (API key TNMPKX4PFC needs to be configured in Emergent iOS build settings via support)
- P0: EAS slug conflict on re-deployment (deployment system issue)

## Backlog
- Trigger new Android production build after safe area fix verification
- Complete iOS build process
- Verify Share functionality on iOS
