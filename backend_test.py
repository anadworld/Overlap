#!/usr/bin/env python3
"""
Comprehensive Backend API Tests for Sync Holidays App
Tests all endpoints with focus on holiday deduplication for /api/compare
"""

import httpx
import asyncio
import json
from datetime import datetime
import sys
import os
from collections import defaultdict

# Get backend URL from frontend/.env
BACKEND_URL = "https://overlap-holidays-3.preview.emergentagent.com/api"

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = []
        
    def success(self, test_name):
        print(f"✅ {test_name}")
        self.passed += 1
        
    def fail(self, test_name, error):
        print(f"❌ {test_name}: {error}")
        self.failed += 1
        self.errors.append(f"{test_name}: {error}")
        
    def summary(self):
        total = self.passed + self.failed
        print(f"\n{'='*50}")
        print(f"TEST SUMMARY: {self.passed}/{total} passed")
        if self.errors:
            print(f"\nFAILED TESTS:")
            for error in self.errors:
                print(f"  - {error}")
        print(f"{'='*50}")
        return self.failed == 0

async def test_health_endpoint():
    """Test health check endpoint"""
    results = TestResults()
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{BACKEND_URL}/health")
            
            if response.status_code == 200:
                data = response.json()
                if "status" in data and "timestamp" in data:
                    results.success("Health endpoint returns proper structure")
                else:
                    results.fail("Health endpoint", "Missing status or timestamp fields")
            else:
                results.fail("Health endpoint", f"Status code {response.status_code}")
                
    except Exception as e:
        results.fail("Health endpoint", str(e))
    
    return results

async def test_countries_endpoint():
    """Test GET /api/countries endpoint"""
    results = TestResults()
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{BACKEND_URL}/countries")
            
            if response.status_code == 200:
                countries = response.json()
                if isinstance(countries, list) and len(countries) > 0:
                    # Check structure of first country
                    if "countryCode" in countries[0] and "name" in countries[0]:
                        results.success(f"Countries endpoint returns {len(countries)} countries with proper structure")
                        
                        # Check if US and DE exist for our tests
                        us_found = any(c.get("countryCode") == "US" for c in countries)
                        de_found = any(c.get("countryCode") == "DE" for c in countries)
                        
                        if us_found:
                            results.success("US country code found in countries list")
                        else:
                            results.fail("Countries validation", "US country not found")
                            
                        if de_found:
                            results.success("DE country code found in countries list")
                        else:
                            results.fail("Countries validation", "DE country not found")
                    else:
                        results.fail("Countries endpoint", "Invalid country structure - missing countryCode or name")
                else:
                    results.fail("Countries endpoint", "Empty or invalid response")
            else:
                results.fail("Countries endpoint", f"Status code {response.status_code}")
                
    except Exception as e:
        results.fail("Countries endpoint", str(e))
    
    return results

async def test_holidays_endpoint():
    """Test GET /api/holidays/{country_code}/{year} endpoint"""
    results = TestResults()
    
    test_cases = [
        ("US", 2025),
        ("DE", 2025),
    ]
    
    for country, year in test_cases:
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{BACKEND_URL}/holidays/{country}/{year}")
                
                if response.status_code == 200:
                    holidays = response.json()
                    if isinstance(holidays, list) and len(holidays) > 0:
                        # Check structure of first holiday
                        holiday = holidays[0]
                        required_fields = ["date", "name", "localName", "countryCode"]
                        
                        if all(field in holiday for field in required_fields):
                            results.success(f"Holidays for {country}/{year} - {len(holidays)} holidays with proper structure")
                        else:
                            missing = [f for f in required_fields if f not in holiday]
                            results.fail(f"Holidays {country}/{year}", f"Missing fields: {missing}")
                    else:
                        results.fail(f"Holidays {country}/{year}", "Empty or invalid response")
                elif response.status_code == 404:
                    results.fail(f"Holidays {country}/{year}", "No holidays found")
                else:
                    results.fail(f"Holidays {country}/{year}", f"Status code {response.status_code}")
                    
        except Exception as e:
            results.fail(f"Holidays {country}/{year}", str(e))
    
    # Test invalid year
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(f"{BACKEND_URL}/holidays/US/1900")
            if response.status_code == 400:
                results.success("Invalid year validation works (1900)")
            else:
                results.fail("Invalid year validation", f"Expected 400, got {response.status_code}")
    except Exception as e:
        results.fail("Invalid year validation", str(e))
    
    return results

async def test_compare_endpoint():
    """Test POST /api/compare endpoint with focus on single country support"""
    results = TestResults()
    
    # Test 1: Single country comparison (NEW REQUIREMENT)
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "countryCodes": ["US"],
                "year": 2025
            }
            response = await client.post(f"{BACKEND_URL}/compare", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                # Check response structure
                required_fields = ["year", "countries", "holidays", "totalOverlaps", "longWeekends"]
                
                if all(field in data for field in required_fields):
                    if data["year"] == 2025 and len(data["countries"]) == 1:
                        if data["countries"][0]["countryCode"] == "US":
                            results.success("Single country compare (US) - proper response structure")
                            
                            # Check holidays exist
                            if len(data["holidays"]) > 0:
                                results.success(f"Single country compare - {len(data['holidays'])} holidays returned")
                            else:
                                results.fail("Single country compare", "No holidays returned")
                            
                            # For single country, overlaps should be 0 
                            if data["totalOverlaps"] == 0:
                                results.success("Single country compare - correct overlap count (0)")
                            else:
                                results.fail("Single country compare", f"Expected 0 overlaps, got {data['totalOverlaps']}")
                                
                            # Check long weekends exist
                            if "longWeekends" in data and isinstance(data["longWeekends"], list):
                                results.success(f"Single country compare - {len(data['longWeekends'])} long weekend opportunities found")
                            else:
                                results.fail("Single country compare", "Long weekends field missing or invalid")
                                
                        else:
                            results.fail("Single country compare", f"Wrong country returned: {data['countries'][0]['countryCode']}")
                    else:
                        results.fail("Single country compare", f"Wrong year or country count: year={data['year']}, countries={len(data['countries'])}")
                else:
                    missing = [f for f in required_fields if f not in data]
                    results.fail("Single country compare", f"Missing fields: {missing}")
            else:
                results.fail("Single country compare", f"Status code {response.status_code}")
                
    except Exception as e:
        results.fail("Single country compare", str(e))
    
    # Test 2: Two country comparison (EXISTING FUNCTIONALITY)
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "countryCodes": ["US", "DE"],
                "year": 2025
            }
            response = await client.post(f"{BACKEND_URL}/compare", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if data["year"] == 2025 and len(data["countries"]) == 2:
                    country_codes = [c["countryCode"] for c in data["countries"]]
                    if "US" in country_codes and "DE" in country_codes:
                        results.success("Two country compare (US, DE) - proper response structure")
                        
                        # Check for overlaps (should exist for US/DE)
                        if data["totalOverlaps"] >= 0:
                            results.success(f"Two country compare - {data['totalOverlaps']} overlaps detected")
                        else:
                            results.fail("Two country compare", "Invalid overlap count")
                            
                        # Check holidays structure
                        overlap_found = False
                        for holiday in data["holidays"]:
                            if holiday["isOverlap"] and len(holiday["countries"]) > 1:
                                overlap_found = True
                                break
                        
                        if overlap_found or data["totalOverlaps"] == 0:
                            results.success("Two country compare - overlap detection working correctly")
                        else:
                            results.fail("Two country compare", "Overlap detection logic issue")
                            
                    else:
                        results.fail("Two country compare", f"Wrong countries returned: {country_codes}")
                else:
                    results.fail("Two country compare", f"Wrong year or country count")
            else:
                results.fail("Two country compare", f"Status code {response.status_code}")
                
    except Exception as e:
        results.fail("Two country compare", str(e))
    
    # Test 3: Empty array (SHOULD RETURN 400)
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "countryCodes": [],
                "year": 2025
            }
            response = await client.post(f"{BACKEND_URL}/compare", json=payload)
            
            if response.status_code == 400:
                results.success("Empty country array validation - returns 400 as expected")
            else:
                results.fail("Empty country array validation", f"Expected 400, got {response.status_code}")
                
    except Exception as e:
        results.fail("Empty country array validation", str(e))
    
    # Test 4: Too many countries (SHOULD RETURN 400)
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "countryCodes": ["US", "DE", "GB", "FR", "IT", "ES"],  # 6 countries, max is 5
                "year": 2025
            }
            response = await client.post(f"{BACKEND_URL}/compare", json=payload)
            
            if response.status_code == 400:
                results.success("Too many countries validation - returns 400 as expected")
            else:
                results.fail("Too many countries validation", f"Expected 400, got {response.status_code}")
                
    except Exception as e:
        results.fail("Too many countries validation", str(e))
    
    # Test 5: Invalid country code (SHOULD HANDLE GRACEFULLY)
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "countryCodes": ["XX"],  # Invalid country
                "year": 2025
            }
            response = await client.post(f"{BACKEND_URL}/compare", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                if len(data["countries"]) == 0 and len(data["holidays"]) == 0:
                    results.success("Invalid country handling - graceful response with empty data")
                else:
                    results.fail("Invalid country handling", "Should return empty data for invalid countries")
            else:
                results.fail("Invalid country handling", f"Status code {response.status_code}")
                
    except Exception as e:
        results.fail("Invalid country handling", str(e))
    
    return results

async def test_holiday_deduplication():
    """Test holiday deduplication specifically for /api/compare endpoint"""
    results = TestResults()
    
    print("\n🔍 TESTING HOLIDAY DEDUPLICATION - CRITICAL FIX VERIFICATION")
    print("-" * 60)
    
    # Test 1: US 2026 - Check for Good Friday duplicates (April 3, 2026)
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {"countryCodes": ["US"], "year": 2026}
            response = await client.post(f"{BACKEND_URL}/compare", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                print(f"✓ US 2026 response received - {len(data.get('holidays', []))} holiday groups")
                
                # Extract all holidays and analyze for duplicates
                all_holidays = []
                good_friday_count = 0
                april_3_holidays = []
                holidays_by_date_country = defaultdict(list)
                
                for holiday_group in data.get("holidays", []):
                    date = holiday_group.get("date")
                    holidays_list = holiday_group.get("holidays", [])
                    
                    for holiday in holidays_list:
                        country_code = holiday.get("countryCode", "")
                        name = holiday.get("name", "")
                        
                        all_holidays.append({
                            "date": date,
                            "name": name,
                            "countryCode": country_code
                        })
                        
                        # Track holidays by date+country for duplicate detection
                        key = (date, country_code)
                        holidays_by_date_country[key].append(name)
                        
                        # Specific Good Friday check
                        if "Good Friday" in name:
                            good_friday_count += 1
                            print(f"  🎯 Found Good Friday: {date} - {name} ({country_code})")
                        
                        # April 3, 2026 specific check
                        if date == "2026-04-03":
                            april_3_holidays.append(holiday)
                
                print(f"  📊 Total holidays for US 2026: {len(all_holidays)}")
                print(f"  📊 Good Friday occurrences: {good_friday_count}")
                print(f"  📊 April 3, 2026 holidays: {len(april_3_holidays)}")
                
                # Check for duplicates on same date for same country
                duplicates_found = False
                for (date, country), names in holidays_by_date_country.items():
                    if len(names) > 1:
                        print(f"  ❌ DUPLICATE DETECTED: {date} for {country} has {len(names)} holidays: {names}")
                        duplicates_found = True
                        results.fail("US 2026 Deduplication", f"Duplicate holidays on {date} for {country}: {names}")
                
                if not duplicates_found:
                    results.success("US 2026 Deduplication - No duplicates found")
                    print(f"  ✅ NO DUPLICATES: Each date+country combination has unique holidays")
                
                # Specific Good Friday verification
                if good_friday_count == 1:
                    results.success("Good Friday Deduplication - Appears exactly once")
                    print(f"  ✅ GOOD FRIDAY: Appears exactly once (expected)")
                elif good_friday_count == 0:
                    results.fail("Good Friday Detection", "Good Friday not found in US 2026")
                    print(f"  ⚠️  GOOD FRIDAY: Not found (may be expected if not a US holiday)")
                else:
                    results.fail("Good Friday Deduplication", f"Good Friday appears {good_friday_count} times")
                    print(f"  ❌ GOOD FRIDAY: Appears {good_friday_count} times (should be 1 or 0)")
                
            else:
                results.fail("US 2026 Request", f"Status code {response.status_code}")
                print(f"  ❌ Failed: Status {response.status_code}")
                
    except Exception as e:
        results.fail("US 2026 Deduplication Test", str(e))
        print(f"  ❌ Error: {str(e)}")
    
    # Test 2: Multiple countries (US, TH) 2026 - Check for any duplicates
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {"countryCodes": ["US", "TH"], "year": 2026}
            response = await client.post(f"{BACKEND_URL}/compare", json=payload)
            
            if response.status_code == 200:
                data = response.json()
                print(f"\n✓ US+TH 2026 response received - {len(data.get('holidays', []))} holiday groups")
                
                # Extract and analyze for duplicates
                holidays_by_date_country = defaultdict(list)
                total_holidays = 0
                
                for holiday_group in data.get("holidays", []):
                    date = holiday_group.get("date")
                    holidays_list = holiday_group.get("holidays", [])
                    
                    for holiday in holidays_list:
                        country_code = holiday.get("countryCode", "")
                        name = holiday.get("name", "")
                        total_holidays += 1
                        
                        # Track for duplicate detection
                        key = (date, country_code)
                        holidays_by_date_country[key].append(name)
                
                print(f"  📊 Total holidays for US+TH 2026: {total_holidays}")
                
                # Check for duplicates
                duplicates_found = False
                for (date, country), names in holidays_by_date_country.items():
                    if len(names) > 1:
                        print(f"  ❌ DUPLICATE: {date} for {country} has {len(names)} holidays: {names}")
                        duplicates_found = True
                        results.fail("Multi-country Deduplication", f"Duplicate holidays on {date} for {country}: {names}")
                
                if not duplicates_found:
                    results.success("Multi-country Deduplication - No duplicates found")
                    print(f"  ✅ NO DUPLICATES: All holidays properly deduplicated")
                
            else:
                results.fail("US+TH 2026 Request", f"Status code {response.status_code}")
                print(f"  ❌ Failed: Status {response.status_code}")
                
    except Exception as e:
        results.fail("Multi-country Deduplication Test", str(e))
        print(f"  ❌ Error: {str(e)}")
    
    return results
async def main():
    """Run all tests"""
    print(f"🚀 Starting Sync Holidays Backend API Tests")
    print(f"Backend URL: {BACKEND_URL}")
    print(f"{'='*60}")
    
    all_results = TestResults()
    
    # Test each endpoint
    print("\n📋 Testing Health Endpoint...")
    health_results = await test_health_endpoint()
    all_results.passed += health_results.passed
    all_results.failed += health_results.failed
    all_results.errors.extend(health_results.errors)
    
    print("\n🌍 Testing Countries Endpoint...")
    countries_results = await test_countries_endpoint()
    all_results.passed += countries_results.passed
    all_results.failed += countries_results.failed
    all_results.errors.extend(countries_results.errors)
    
    print("\n📅 Testing Holidays Endpoint...")
    holidays_results = await test_holidays_endpoint()
    all_results.passed += holidays_results.passed
    all_results.failed += holidays_results.failed
    all_results.errors.extend(holidays_results.errors)
    
    print("\n🔍 Testing Compare Endpoint (FOCUS: Single Country Support)...")
    compare_results = await test_compare_endpoint()
    all_results.passed += compare_results.passed
    all_results.failed += compare_results.failed
    all_results.errors.extend(compare_results.errors)
    
    print("\n🔍 Testing Holiday Deduplication (CRITICAL FIX VERIFICATION)...")
    dedup_results = await test_holiday_deduplication()
    all_results.passed += dedup_results.passed
    all_results.failed += dedup_results.failed
    all_results.errors.extend(dedup_results.errors)
    
    # Final summary
    success = all_results.summary()
    
    if success:
        print("\n🎉 ALL TESTS PASSED! Backend API is working correctly.")
    else:
        print(f"\n⚠️  {all_results.failed} TESTS FAILED! See details above.")
    
    return success

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)