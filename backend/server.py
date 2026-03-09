from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import httpx
from collections import defaultdict

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Nager.Date API base URL
NAGER_API_BASE = "https://date.nager.at/api/v3"

# OpenHolidays API base URL (for school holidays)
OPENHOLIDAYS_API_BASE = "https://openholidaysapi.org"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Pydantic Models
class Country(BaseModel):
    countryCode: str
    name: str

class Holiday(BaseModel):
    date: str
    localName: str
    name: str
    countryCode: str
    fixed: bool
    global_: bool = Field(alias="global", default=True)
    types: List[str] = []
    
    class Config:
        populate_by_name = True

class CompareRequest(BaseModel):
    countryCodes: List[str]
    year: int

class HolidayWithCountries(BaseModel):
    date: str
    holidays: List[Dict[str, Any]]
    isOverlap: bool
    countries: List[str]

class LongWeekendOpportunity(BaseModel):
    startDate: str
    endDate: str
    totalDays: int
    holidayDays: int
    weekendDays: int
    type: str  # "long_weekend", "consecutive", "bridge"
    description: str
    holidays: List[Dict[str, Any]]
    countries: List[str]
    isOverlap: bool = False  # True only when ALL selected countries have holidays on ALL dates

class CompareResponse(BaseModel):
    year: int
    countries: List[Country]
    holidays: List[HolidayWithCountries]
    totalOverlaps: int
    longWeekends: List[LongWeekendOpportunity] = []

class SavedComparison(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    countryCodes: List[str]
    year: int
    createdAt: datetime = Field(default_factory=datetime.utcnow)

class AppVersionInfo(BaseModel):
    latestVersion: str
    minVersion: str
    releaseNotes: str = ""
    forceUpdate: bool = False
    iosStoreUrl: str = "https://apps.apple.com/app/id6740092498"
    androidStoreUrl: str = "https://play.google.com/store/apps/details?id=com.anadworld.overlap"

class UpdateAppVersionRequest(BaseModel):
    latestVersion: str
    minVersion: Optional[str] = None
    releaseNotes: Optional[str] = None
    forceUpdate: Optional[bool] = None

# Helper function to fetch data from Nager API
async def fetch_from_nager(endpoint: str) -> Any:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(f"{NAGER_API_BASE}{endpoint}")
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 404:
            return None
        else:
            raise HTTPException(status_code=response.status_code, detail="Error fetching data from holiday API")

# Helper function to fetch data from OpenHolidays API
async def fetch_from_openholidays(endpoint: str, params: dict = None) -> Any:
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{OPENHOLIDAYS_API_BASE}{endpoint}", params=params)
            if response.status_code == 200:
                return response.json()
            elif response.status_code == 204:
                return []
            elif response.status_code == 404:
                return None
            else:
                logger.warning(f"OpenHolidays API returned {response.status_code} for {endpoint}")
                return None
    except Exception as e:
        logger.warning(f"OpenHolidays API connection failed for {endpoint}: {e}")
        return None

# Helper function to detect long weekend opportunities
def detect_long_weekends(holidays_by_date: dict, countries_map: dict, selected_countries: List[str]) -> List[LongWeekendOpportunity]:
    from datetime import timedelta
    
    opportunities = []
    sorted_dates = sorted(holidays_by_date.keys())
    processed_dates = set()
    
    # Helper to add date to holiday info
    def add_date_to_holidays(holidays: list, date_str: str) -> list:
        return [{**h, "date": date_str} for h in holidays]
    
    for date_str in sorted_dates:
        if date_str in processed_dates:
            continue
            
        date = datetime.strptime(date_str, "%Y-%m-%d").date()
        day_of_week = date.weekday()  # 0=Monday, 6=Sunday
        
        holidays_info = add_date_to_holidays(holidays_by_date[date_str], date_str)
        countries_on_date = list(set(h["countryCode"] for h in holidays_info))
        
        # Check for Friday holiday (creates 3-day weekend: Fri + Sat + Sun)
        if day_of_week == 4:  # Friday
            end_date = date + timedelta(days=2)  # Sunday
            
            # Check if Monday is also a holiday (4-day weekend!)
            monday = date + timedelta(days=3)
            monday_str = monday.strftime("%Y-%m-%d")
            
            if monday_str in holidays_by_date:
                monday_holidays = add_date_to_holidays(holidays_by_date[monday_str], monday_str)
                friday_countries = set(h["countryCode"] for h in holidays_info)
                monday_countries = set(h["countryCode"] for h in monday_holidays)
                
                # Check if at least ONE country has holidays on BOTH Friday AND Monday
                countries_with_both = friday_countries & monday_countries
                
                if countries_with_both:
                    # At least one country has both days = true 4-day weekend
                    all_holidays = holidays_info + monday_holidays
                    all_countries = list(friday_countries | monday_countries)
                    is_overlap = check_true_overlap([date_str, monday_str], holidays_by_date, selected_countries)
                    
                    opportunities.append(LongWeekendOpportunity(
                        startDate=date_str,
                        endDate=monday_str,
                        totalDays=4,
                        holidayDays=2,
                        weekendDays=2,
                        type="consecutive",
                        description=f"4-day weekend! Friday & Monday holidays",
                        holidays=all_holidays,
                        countries=all_countries,
                        isOverlap=is_overlap
                    ))
                    processed_dates.add(date_str)
                    processed_dates.add(monday_str)
                else:
                    # Different countries have Friday vs Monday - treat as separate 3-day weekends
                    # Friday 3-day weekend
                    is_overlap = check_true_overlap([date_str], holidays_by_date, selected_countries)
                    opportunities.append(LongWeekendOpportunity(
                        startDate=date_str,
                        endDate=end_date.strftime("%Y-%m-%d"),
                        totalDays=3,
                        holidayDays=1,
                        weekendDays=2,
                        type="long_weekend",
                        description=f"3-day weekend! Friday holiday",
                        holidays=holidays_info,
                        countries=list(friday_countries),
                        isOverlap=is_overlap
                    ))
                    processed_dates.add(date_str)
                    # Monday will be processed separately when we hit it
            else:
                # Just Friday holiday = 3-day weekend
                is_overlap = check_true_overlap([date_str], holidays_by_date, selected_countries)
                
                opportunities.append(LongWeekendOpportunity(
                    startDate=date_str,
                    endDate=end_date.strftime("%Y-%m-%d"),
                    totalDays=3,
                    holidayDays=1,
                    weekendDays=2,
                    type="long_weekend",
                    description=f"3-day weekend! Friday holiday",
                    holidays=holidays_info,
                    countries=countries_on_date,
                    isOverlap=is_overlap
                ))
                processed_dates.add(date_str)
        
        # Check for Monday holiday (creates 3-day weekend: Sat + Sun + Mon)
        elif day_of_week == 0:  # Monday
            if date_str not in processed_dates:
                start_date = date - timedelta(days=2)  # Saturday
                is_overlap = check_true_overlap([date_str], holidays_by_date, selected_countries)
                
                opportunities.append(LongWeekendOpportunity(
                    startDate=start_date.strftime("%Y-%m-%d"),
                    endDate=date_str,
                    totalDays=3,
                    holidayDays=1,
                    weekendDays=2,
                    type="long_weekend",
                    description=f"3-day weekend! Monday holiday",
                    holidays=holidays_info,
                    countries=countries_on_date,
                    isOverlap=is_overlap
                ))
                processed_dates.add(date_str)
        
        # Check for Thursday holiday - check if Friday is ALSO a holiday for the SAME country
        elif day_of_week == 3:  # Thursday
            friday = date + timedelta(days=1)
            friday_str = friday.strftime("%Y-%m-%d")
            
            if friday_str in holidays_by_date:
                friday_holidays = add_date_to_holidays(holidays_by_date[friday_str], friday_str)
                thursday_countries = set(h["countryCode"] for h in holidays_info)
                friday_countries = set(h["countryCode"] for h in friday_holidays)
                
                # Check if at least ONE country has holidays on BOTH Thursday AND Friday
                countries_with_both = thursday_countries & friday_countries
                
                if countries_with_both:
                    # At least one country has both days = true 4-day weekend
                    all_holidays = holidays_info + friday_holidays
                    all_countries = list(thursday_countries | friday_countries)
                    end_date = date + timedelta(days=3)  # Sunday
                    
                    is_overlap = check_true_overlap([date_str, friday_str], holidays_by_date, selected_countries)
                    
                    opportunities.append(LongWeekendOpportunity(
                        startDate=date_str,
                        endDate=end_date.strftime("%Y-%m-%d"),
                        totalDays=4,
                        holidayDays=2,
                        weekendDays=2,
                        type="consecutive",
                        description=f"4-day weekend! Thursday & Friday holidays",
                        holidays=all_holidays,
                        countries=all_countries,
                        isOverlap=is_overlap
                    ))
                    processed_dates.add(date_str)
                    processed_dates.add(friday_str)
                else:
                    # Different countries have Thursday vs Friday - Thursday is bridge day
                    end_date = date + timedelta(days=3)  # Sunday
                    is_overlap = check_true_overlap([date_str], holidays_by_date, selected_countries)
                    
                    opportunities.append(LongWeekendOpportunity(
                        startDate=date_str,
                        endDate=end_date.strftime("%Y-%m-%d"),
                        totalDays=4,
                        holidayDays=1,
                        weekendDays=2,
                        type="bridge",
                        description=f"Take Friday off for a 4-day weekend!",
                        holidays=holidays_info,
                        countries=list(thursday_countries),
                        isOverlap=is_overlap
                    ))
                    processed_dates.add(date_str)
                    # Friday will be processed separately
            else:
                # Thursday holiday only - suggest taking Friday off (Bridge Day)
                end_date = date + timedelta(days=3)  # Sunday
                is_overlap = check_true_overlap([date_str], holidays_by_date, selected_countries)
                
                opportunities.append(LongWeekendOpportunity(
                    startDate=date_str,
                    endDate=end_date.strftime("%Y-%m-%d"),
                    totalDays=4,
                    holidayDays=1,
                    weekendDays=2,
                    type="bridge",
                    description=f"Take Friday off for a 4-day weekend!",
                    holidays=holidays_info,
                    countries=countries_on_date,
                    isOverlap=is_overlap
                ))
                processed_dates.add(date_str)
        
        # Check for Tuesday holiday - suggest taking Monday off (Bridge Day)
        elif day_of_week == 1:  # Tuesday
            monday = date - timedelta(days=1)
            monday_str = monday.strftime("%Y-%m-%d")
            
            if monday_str in holidays_by_date:
                # Already processed as part of Monday check or will be
                continue
            else:
                # Tuesday holiday only - suggest taking Monday off (Bridge Day)
                start_date = date - timedelta(days=3)  # Saturday
                is_overlap = check_true_overlap([date_str], holidays_by_date, selected_countries)
                
                opportunities.append(LongWeekendOpportunity(
                    startDate=start_date.strftime("%Y-%m-%d"),
                    endDate=date_str,
                    totalDays=4,
                    holidayDays=1,
                    weekendDays=2,
                    type="bridge",
                    description=f"Take Monday off for a 4-day weekend!",
                    holidays=holidays_info,
                    countries=countries_on_date,
                    isOverlap=is_overlap
                ))
                processed_dates.add(date_str)
    
    # Check for consecutive holidays (3+ days in a row)
    for i, date_str in enumerate(sorted_dates):
        if date_str in processed_dates:
            continue
            
        date = datetime.strptime(date_str, "%Y-%m-%d").date()
        consecutive_dates = [date_str]
        consecutive_holidays = add_date_to_holidays(holidays_by_date[date_str], date_str)
        
        # Look ahead for consecutive days
        current_date = date
        while True:
            next_date = current_date + timedelta(days=1)
            next_str = next_date.strftime("%Y-%m-%d")
            if next_str in holidays_by_date and next_str not in processed_dates:
                consecutive_dates.append(next_str)
                consecutive_holidays.extend(add_date_to_holidays(holidays_by_date[next_str], next_str))
                current_date = next_date
            else:
                break
        
        if len(consecutive_dates) >= 2:
            all_countries = list(set(h["countryCode"] for h in consecutive_holidays))
            first_date = datetime.strptime(consecutive_dates[0], "%Y-%m-%d").date()
            last_date = datetime.strptime(consecutive_dates[-1], "%Y-%m-%d").date()
            
            # Check for adjacent weekends
            first_day = first_date.weekday()
            last_day = last_date.weekday()
            
            # Extend to include weekend before if starts on Monday
            if first_day == 0:
                first_date = first_date - timedelta(days=2)
            
            # Extend to include weekend after if ends on Friday
            if last_day == 4:
                last_date = last_date + timedelta(days=2)
            
            total_days = (last_date - first_date).days + 1
            weekend_days = sum(1 for d in range(total_days) if (first_date + timedelta(days=d)).weekday() >= 5)
            
            is_overlap = check_true_overlap(consecutive_dates, holidays_by_date, selected_countries)
            
            opportunities.append(LongWeekendOpportunity(
                startDate=first_date.strftime("%Y-%m-%d"),
                endDate=last_date.strftime("%Y-%m-%d"),
                totalDays=total_days,
                holidayDays=len(consecutive_dates),
                weekendDays=weekend_days,
                type="consecutive",
                description=f"{len(consecutive_dates)} consecutive holiday days!",
                holidays=consecutive_holidays,
                countries=all_countries,
                isOverlap=is_overlap
            ))
            for d in consecutive_dates:
                processed_dates.add(d)
    
    # Sort by total days descending, then by start date
    opportunities.sort(key=lambda x: x.startDate)
    
    # Remove duplicates based on overlapping date ranges
    unique_opportunities = []
    covered_dates = set()
    
    for opp in opportunities:
        start = datetime.strptime(opp.startDate, "%Y-%m-%d").date()
        end = datetime.strptime(opp.endDate, "%Y-%m-%d").date()
        opp_dates = set()
        current = start
        while current <= end:
            opp_dates.add(current.strftime("%Y-%m-%d"))
            current += timedelta(days=1)
        
        # Check if this opportunity is already covered by a longer one
        if not opp_dates.issubset(covered_dates):
            unique_opportunities.append(opp)
            covered_dates.update(opp_dates)
    
    return unique_opportunities


# Helper function to check if it's a TRUE overlap (all selected countries have holidays on ALL dates)
def check_true_overlap(holiday_dates: List[str], holidays_by_date: dict, selected_countries: List[str]) -> bool:
    if len(selected_countries) < 2:
        return False
    
    # For each date, check which countries have holidays
    for date_str in holiday_dates:
        if date_str not in holidays_by_date:
            return False
        
        countries_on_this_date = set(h["countryCode"] for h in holidays_by_date[date_str])
        
        # All selected countries must have a holiday on this date
        if not all(c in countries_on_this_date for c in selected_countries):
            return False
    
    return True

# API Endpoints
@api_router.get("/")
async def root():
    return {"message": "Holiday Comparison API", "version": "1.0.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}

@api_router.get("/countries", response_model=List[Country])
async def get_countries():
    """Get list of available countries from Nager.Date API"""
    # Check cache first
    cached = await db.countries_cache.find_one({"type": "countries_list"}, {"_id": 0, "data": 1, "updatedAt": 1})
    
    if cached and cached.get("updatedAt"):
        # Use cache if less than 24 hours old
        cache_age = (datetime.utcnow() - cached["updatedAt"]).total_seconds()
        if cache_age < 86400:  # 24 hours
            return cached["data"]
    
    # Fetch from API
    countries = await fetch_from_nager("/AvailableCountries")
    
    if countries:
        # Update cache
        await db.countries_cache.update_one(
            {"type": "countries_list"},
            {"$set": {"data": countries, "updatedAt": datetime.utcnow()}},
            upsert=True
        )
    
    return countries or []

@api_router.get("/holidays/{country_code}/{year}", response_model=List[Holiday])
async def get_holidays(country_code: str, year: int):
    """Get public holidays for a specific country and year"""
    # Validate year
    current_year = datetime.now().year
    if year < current_year - 10 or year > current_year + 5:
        raise HTTPException(status_code=400, detail="Year out of valid range")
    
    # Check cache
    cache_key = f"{country_code}_{year}"
    cached = await db.holidays_cache.find_one({"cache_key": cache_key}, {"_id": 0, "data": 1})
    
    if cached:
        return cached["data"]
    
    # Fetch from API
    holidays = await fetch_from_nager(f"/PublicHolidays/{year}/{country_code}")
    
    if holidays is None:
        raise HTTPException(status_code=404, detail=f"No holidays found for {country_code} in {year}")
    
    # Cache the result
    await db.holidays_cache.update_one(
        {"cache_key": cache_key},
        {"$set": {"data": holidays, "updatedAt": datetime.utcnow()}},
        upsert=True
    )
    
    return holidays

@api_router.post("/compare", response_model=CompareResponse)
async def compare_holidays(request: CompareRequest):
    """Compare holidays between one or more countries"""
    if len(request.countryCodes) < 1:
        raise HTTPException(status_code=400, detail="At least 1 country required")
    
    if len(request.countryCodes) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 countries allowed")
    
    # Fetch holidays for all countries
    all_holidays = {}
    countries_info = []
    
    # Get countries list for names
    countries_list = await get_countries()
    countries_map = {c["countryCode"]: c["name"] for c in countries_list}
    
    for country_code in request.countryCodes:
        try:
            holidays = await get_holidays(country_code.upper(), request.year)
            all_holidays[country_code.upper()] = holidays
            countries_info.append(Country(
                countryCode=country_code.upper(),
                name=countries_map.get(country_code.upper(), country_code)
            ))
        except HTTPException:
            # Skip countries with no data
            logger.warning(f"No holiday data for {country_code} in {request.year}")
    
    # Group holidays by date
    holidays_by_date = defaultdict(list)
    
    for country_code, holidays in all_holidays.items():
        # Track seen holidays per country to avoid duplicates
        seen_holidays = set()
        for holiday in holidays:
            date = holiday["date"]
            # Create a unique key for deduplication (country + date + name)
            holiday_key = (country_code, date, holiday["name"])
            if holiday_key not in seen_holidays:
                seen_holidays.add(holiday_key)
                holidays_by_date[date].append({
                    "countryCode": country_code,
                    "name": holiday["name"],
                    "localName": holiday["localName"],
                    "types": holiday.get("types", [])
                })
    
    # Build response with overlap detection
    result_holidays = []
    total_overlaps = 0
    
    for date in sorted(holidays_by_date.keys()):
        holidays_on_date = holidays_by_date[date]
        countries_on_date = list(set(h["countryCode"] for h in holidays_on_date))
        is_overlap = len(countries_on_date) > 1
        
        if is_overlap:
            total_overlaps += 1
        
        result_holidays.append(HolidayWithCountries(
            date=date,
            holidays=holidays_on_date,
            isOverlap=is_overlap,
            countries=countries_on_date
        ))
    
    # Detect long weekend opportunities
    long_weekends = detect_long_weekends(holidays_by_date, countries_map, request.countryCodes)
    
    return CompareResponse(
        year=request.year,
        countries=countries_info,
        holidays=result_holidays,
        totalOverlaps=total_overlaps,
        longWeekends=long_weekends
    )

@api_router.post("/saved-comparisons", response_model=SavedComparison)
async def save_comparison(request: CompareRequest):
    """Save a comparison for later"""
    saved = SavedComparison(
        countryCodes=request.countryCodes,
        year=request.year
    )
    
    await db.saved_comparisons.insert_one(saved.dict())
    return saved

@api_router.get("/saved-comparisons", response_model=List[SavedComparison])
async def get_saved_comparisons():
    """Get all saved comparisons"""
    comparisons = await db.saved_comparisons.find({}, {"_id": 0}).sort("createdAt", -1).to_list(100)
    return [SavedComparison(**c) for c in comparisons]

@api_router.delete("/saved-comparisons/{comparison_id}")
async def delete_saved_comparison(comparison_id: str):
    """Delete a saved comparison"""
    result = await db.saved_comparisons.delete_one({"id": comparison_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comparison not found")
    return {"message": "Comparison deleted"}

@api_router.get("/app-version")
async def get_app_version():
    """Get the latest app version info for update checks"""
    doc = await db.app_config.find_one({"key": "version_info"}, {"_id": 0})
    if not doc:
        return {
            "latestVersion": "1.0.0",
            "minVersion": "1.0.0",
            "releaseNotes": "",
            "forceUpdate": False,
            "iosStoreUrl": "https://apps.apple.com/app/id6740092498",
            "androidStoreUrl": "https://play.google.com/store/apps/details?id=com.anadworld.overlap",
        }
    return {k: v for k, v in doc.items() if k != "key"}

@api_router.put("/app-version")
async def update_app_version(req: UpdateAppVersionRequest):
    """Update the latest app version (admin endpoint)"""
    update_data = {"latestVersion": req.latestVersion}
    if req.minVersion is not None:
        update_data["minVersion"] = req.minVersion
    if req.releaseNotes is not None:
        update_data["releaseNotes"] = req.releaseNotes
    if req.forceUpdate is not None:
        update_data["forceUpdate"] = req.forceUpdate
    update_data["iosStoreUrl"] = "https://apps.apple.com/app/id6740092498"
    update_data["androidStoreUrl"] = "https://play.google.com/store/apps/details?id=com.anadworld.overlap"

    await db.app_config.update_one(
        {"key": "version_info"},
        {"$set": {**update_data, "key": "version_info"}},
        upsert=True,
    )
    return {"message": "Version info updated", **update_data}

# ── School Holidays (OpenHolidays API) ──

@api_router.get("/school-holiday-countries")
async def get_school_holiday_countries():
    """Get list of countries with actual school holiday data from OpenHolidays API"""
    cached = await db.countries_cache.find_one({"type": "school_holiday_countries_verified"}, {"_id": 0, "data": 1, "updatedAt": 1})
    if cached and cached.get("updatedAt"):
        cache_age = (datetime.utcnow() - cached["updatedAt"]).total_seconds()
        if cache_age < 86400 * 30:  # 30 days cache
            return cached["data"]

    raw = await fetch_from_openholidays("/Countries")
    if not raw:
        # Fall back to stale cache if API is unreachable
        if cached and cached.get("data"):
            return cached["data"]
        return []

    current_year = datetime.utcnow().year
    countries = []

    async with httpx.AsyncClient(timeout=30.0) as client:
        for c in raw:
            code = c["isoCode"]
            try:
                resp = await client.get(f"{OPENHOLIDAYS_API_BASE}/SchoolHolidays", params={
                    "countryIsoCode": code,
                    "languageIsoCode": "EN",
                    "validFrom": f"{current_year}-01-01",
                    "validTo": f"{current_year}-12-31",
                })
                if resp.status_code == 200 and len(resp.json()) > 0:
                    names = c.get("name", [])
                    en_name = next((n["text"] for n in names if n.get("language") == "EN"), names[0]["text"] if names else code)
                    countries.append({"countryCode": code, "name": en_name})
            except Exception:
                pass

    countries.sort(key=lambda x: x["name"])
    await db.countries_cache.update_one(
        {"type": "school_holiday_countries_verified"},
        {"$set": {"data": countries, "updatedAt": datetime.utcnow()}},
        upsert=True,
    )
    return countries

@api_router.get("/subdivisions/{country_code}")
async def get_subdivisions(country_code: str):
    """Get subdivisions (states/regions) for a country from OpenHolidays API"""
    cache_key = f"subdivisions_{country_code.upper()}"
    cached = await db.countries_cache.find_one({"type": cache_key}, {"_id": 0, "data": 1, "updatedAt": 1})
    if cached and cached.get("updatedAt"):
        cache_age = (datetime.utcnow() - cached["updatedAt"]).total_seconds()
        if cache_age < 86400 * 30:  # 30 days cache
            return cached["data"]

    raw = await fetch_from_openholidays("/Subdivisions", params={"countryIsoCode": country_code.upper()})
    if not raw:
        # Fall back to stale cache if API is unreachable
        if cached and cached.get("data"):
            return cached["data"]
        return []

    subdivisions = []
    for s in raw:
        names = s.get("name", [])
        en_name = next((n["text"] for n in names if n.get("language") == "EN"), names[0]["text"] if names else s.get("code", ""))
        subdivisions.append({"code": s["code"], "name": en_name, "shortName": s.get("shortName", s["code"])})

    subdivisions.sort(key=lambda x: x["name"])
    await db.countries_cache.update_one(
        {"type": cache_key},
        {"$set": {"data": subdivisions, "updatedAt": datetime.utcnow()}},
        upsert=True,
    )
    return subdivisions

@api_router.get("/school-holidays/{country_code}/{year}")
async def get_school_holidays(country_code: str, year: int, subdivision: Optional[str] = None):
    """Get school holidays for a country and year from OpenHolidays API"""
    cache_key = f"school_{country_code.upper()}_{year}_{subdivision or 'all'}"
    cached = await db.holidays_cache.find_one({"cache_key": cache_key}, {"_id": 0, "data": 1})
    if cached:
        return cached["data"]

    params = {
        "countryIsoCode": country_code.upper(),
        "languageIsoCode": "EN",
        "validFrom": f"{year}-01-01",
        "validTo": f"{year}-12-31",
    }
    if subdivision:
        params["subdivisionCode"] = subdivision

    raw = await fetch_from_openholidays("/SchoolHolidays", params=params)

    # If API failed and we have a subdivision filter, try filtering from cached "all" data
    if raw is None and subdivision:
        all_cache_key = f"school_{country_code.upper()}_{year}_all"
        all_cached = await db.holidays_cache.find_one({"cache_key": all_cache_key}, {"_id": 0, "data": 1})
        if all_cached and all_cached.get("data"):
            # subdivision is e.g. "NL-NH", data may have "NH", "NH-AA", etc.
            # Match on exact code OR prefix after removing country code
            sub_short = subdivision.split("-", 1)[-1] if "-" in subdivision else subdivision
            filtered = []
            for h in all_cached["data"]:
                if h.get("nationwide"):
                    filtered.append(h)
                elif any(
                    s.get("code") == subdivision or
                    s.get("code") == sub_short or
                    s.get("code", "").startswith(sub_short + "-") or
                    s.get("shortName") == sub_short
                    for s in h.get("subdivisions", [])
                ):
                    filtered.append(h)
            return filtered
        return []

    if raw is None:
        return []

    # Merge holidays with the same name and overlapping/close dates (within 14 days)
    from datetime import date as date_type
    merge_groups: list[dict] = []
    for h in raw:
        names = h.get("name", [])
        en_name = next((n["text"] for n in names if n.get("language") == "EN"), names[0]["text"] if names else "School Holiday")
        subs = h.get("subdivisions", []) or h.get("groups", [])
        start = date_type.fromisoformat(h["startDate"])
        end = date_type.fromisoformat(h["endDate"])
        sub_list = [{"code": s.get("code", ""), "shortName": s.get("shortName", "")} for s in subs]

        merged = False
        for g in merge_groups:
            if g["name"] == en_name and abs((start - date_type.fromisoformat(g["startDate"])).days) <= 14:
                if h["startDate"] < g["startDate"]:
                    g["startDate"] = h["startDate"]
                if h["endDate"] > g["endDate"]:
                    g["endDate"] = h["endDate"]
                existing_codes = {s["code"] for s in g["subdivisions"]}
                for s in sub_list:
                    if s["code"] not in existing_codes:
                        g["subdivisions"].append(s)
                g["nationwide"] = g["nationwide"] or h.get("nationwide", False)
                merged = True
                break
        if not merged:
            merge_groups.append({
                "id": h.get("id", ""),
                "startDate": h["startDate"],
                "endDate": h["endDate"],
                "name": en_name,
                "nationwide": h.get("nationwide", False),
                "subdivisions": sub_list,
            })

    holidays = merge_groups

    holidays = [h for h in merge_groups if h["startDate"] >= f"{year}-01-01"]
    holidays.sort(key=lambda x: x["startDate"])

    await db.holidays_cache.update_one(
        {"cache_key": cache_key},
        {"$set": {"data": holidays, "updatedAt": datetime.utcnow()}},
        upsert=True,
    )
    return holidays

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def create_indexes():
    await db.holidays_cache.create_index("cache_key", unique=True)
    await db.countries_cache.create_index("type", unique=True)
    await db.saved_comparisons.create_index("id", unique=True)
    await db.saved_comparisons.create_index("createdAt")
    await db.app_config.create_index("key", unique=True)
    logger.info("MongoDB indexes created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
