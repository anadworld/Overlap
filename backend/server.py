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

class CompareResponse(BaseModel):
    year: int
    countries: List[Country]
    holidays: List[HolidayWithCountries]
    totalOverlaps: int

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
    """Compare holidays between multiple countries"""
    if len(request.countryCodes) < 2:
        raise HTTPException(status_code=400, detail="At least 2 countries required for comparison")
    
    if len(request.countryCodes) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 countries allowed for comparison")
    
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
        for holiday in holidays:
            date = holiday["date"]
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
    
    return CompareResponse(
        year=request.year,
        countries=countries_info,
        holidays=result_holidays,
        totalOverlaps=total_overlaps
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
