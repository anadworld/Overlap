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
                # Friday + Weekend + Monday = 4-day weekend
                monday_holidays = add_date_to_holidays(holidays_by_date[monday_str], monday_str)
                all_holidays = holidays_info + monday_holidays
                all_countries = list(set(countries_on_date + [h["countryCode"] for h in monday_holidays]))
                
                # Check if it's a true overlap (all selected countries have holidays on both days)
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
        
        # Check for Thursday holiday - ONLY a long weekend if Friday is ALSO a holiday
        elif day_of_week == 3:  # Thursday
            friday = date + timedelta(days=1)
            friday_str = friday.strftime("%Y-%m-%d")
            
            if friday_str in holidays_by_date:
                # Thursday + Friday holidays + weekend = 4-day (no bridge needed!)
                friday_holidays = add_date_to_holidays(holidays_by_date[friday_str], friday_str)
                all_holidays = holidays_info + friday_holidays
                all_countries = list(set(countries_on_date + [h["countryCode"] for h in friday_holidays]))
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
            # If Thursday is a holiday but Friday is NOT, it's NOT a long weekend
            # (user would need to take Friday off - that's NOT an automatic long weekend)
        
        # Check for Tuesday holiday - ONLY a long weekend if Monday is ALSO a holiday
        elif day_of_week == 1:  # Tuesday
            monday = date - timedelta(days=1)
            monday_str = monday.strftime("%Y-%m-%d")
            
            if monday_str in holidays_by_date:
                # Already processed as part of Monday check or will be
                continue
            # If Tuesday is a holiday but Monday is NOT, it's NOT a long weekend
    
    # Check for consecutive holidays (3+ days in a row)
    for i, date_str in enumerate(sorted_dates):
        if date_str in processed_dates:
            continue
            
        date = datetime.strptime(date_str, "%Y-%m-%d").date()
        consecutive_dates = [date_str]
        consecutive_holidays = list(holidays_by_date[date_str])
        
        # Look ahead for consecutive days
        current_date = date
        while True:
            next_date = current_date + timedelta(days=1)
            next_str = next_date.strftime("%Y-%m-%d")
            if next_str in holidays_by_date and next_str not in processed_dates:
                consecutive_dates.append(next_str)
                consecutive_holidays.extend(holidays_by_date[next_str])
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
    opportunities.sort(key=lambda x: (-x.totalDays, x.startDate))
    
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
    cached = await db.countries_cache.find_one({"type": "countries_list"})
    
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
    cached = await db.holidays_cache.find_one({"cache_key": cache_key})
    
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
    comparisons = await db.saved_comparisons.find().sort("createdAt", -1).to_list(100)
    return [SavedComparison(**c) for c in comparisons]

@api_router.delete("/saved-comparisons/{comparison_id}")
async def delete_saved_comparison(comparison_id: str):
    """Delete a saved comparison"""
    result = await db.saved_comparisons.delete_one({"id": comparison_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comparison not found")
    return {"message": "Comparison deleted"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
