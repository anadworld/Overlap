#!/usr/bin/env python3
"""
Holiday Comparison API Backend Testing Suite
Tests all backend endpoints for the Holiday Comparison API
"""

import httpx
import asyncio
import json
from datetime import datetime
from typing import Dict, List, Any


class HolidayAPITester:
    def __init__(self):
        # Use the production-configured backend URL from frontend/.env
        self.base_url = "https://vacation-planner-48.preview.emergentagent.com/api"
        self.test_results = {}
        
    async def test_health_endpoint(self) -> Dict[str, Any]:
        """Test GET /api/health endpoint"""
        print("\n=== Testing Health Check Endpoint ===")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.base_url}/health")
                
                print(f"Status Code: {response.status_code}")
                print(f"Response: {response.text}")
                
                if response.status_code == 200:
                    data = response.json()
                    if "status" in data and data["status"] == "healthy":
                        print("✅ Health check passed")
                        return {"status": "PASS", "details": "Health endpoint working correctly"}
                    else:
                        print("❌ Health check failed - Invalid response format")
                        return {"status": "FAIL", "details": f"Invalid response format: {data}"}
                else:
                    print(f"❌ Health check failed - HTTP {response.status_code}")
                    return {"status": "FAIL", "details": f"HTTP {response.status_code}: {response.text}"}
                    
        except Exception as e:
            print(f"❌ Health check failed - Exception: {str(e)}")
            return {"status": "FAIL", "details": f"Exception: {str(e)}"}
    
    async def test_countries_endpoint(self) -> Dict[str, Any]:
        """Test GET /api/countries endpoint"""
        print("\n=== Testing Countries Endpoint ===")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.base_url}/countries")
                
                print(f"Status Code: {response.status_code}")
                
                if response.status_code == 200:
                    countries = response.json()
                    print(f"Countries count: {len(countries)}")
                    
                    if len(countries) > 0:
                        # Check structure of first few countries
                        sample_countries = countries[:3]
                        print("Sample countries:")
                        for country in sample_countries:
                            print(f"  - {country.get('countryCode', 'N/A')}: {country.get('name', 'N/A')}")
                        
                        # Verify required fields
                        required_fields = ['countryCode', 'name']
                        for country in sample_countries:
                            for field in required_fields:
                                if field not in country:
                                    print(f"❌ Missing required field '{field}' in country data")
                                    return {"status": "FAIL", "details": f"Missing field '{field}' in response"}
                        
                        # Check for US and GB specifically (needed for later tests)
                        country_codes = [c.get('countryCode', '') for c in countries]
                        if 'US' not in country_codes:
                            print("⚠️  Warning: US not found in countries list")
                        if 'GB' not in country_codes:
                            print("⚠️  Warning: GB not found in countries list")
                        
                        print("✅ Countries endpoint working correctly")
                        return {
                            "status": "PASS", 
                            "details": f"Retrieved {len(countries)} countries successfully",
                            "countries_count": len(countries),
                            "has_us": 'US' in country_codes,
                            "has_gb": 'GB' in country_codes
                        }
                    else:
                        print("❌ Countries endpoint returned empty list")
                        return {"status": "FAIL", "details": "Empty countries list returned"}
                else:
                    print(f"❌ Countries endpoint failed - HTTP {response.status_code}")
                    return {"status": "FAIL", "details": f"HTTP {response.status_code}: {response.text}"}
                    
        except Exception as e:
            print(f"❌ Countries endpoint failed - Exception: {str(e)}")
            return {"status": "FAIL", "details": f"Exception: {str(e)}"}
    
    async def test_holidays_endpoint(self, country_code: str = "US", year: int = 2025) -> Dict[str, Any]:
        """Test GET /api/holidays/{country_code}/{year} endpoint"""
        print(f"\n=== Testing Holidays Endpoint for {country_code}/{year} ===")
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{self.base_url}/holidays/{country_code}/{year}")
                
                print(f"Status Code: {response.status_code}")
                
                if response.status_code == 200:
                    holidays = response.json()
                    print(f"Holidays count: {len(holidays)}")
                    
                    if len(holidays) > 0:
                        # Check structure of first few holidays
                        sample_holidays = holidays[:3]
                        print("Sample holidays:")
                        for holiday in sample_holidays:
                            print(f"  - {holiday.get('date', 'N/A')}: {holiday.get('name', 'N/A')}")
                        
                        # Verify required fields
                        required_fields = ['date', 'name', 'localName', 'countryCode']
                        for holiday in sample_holidays:
                            for field in required_fields:
                                if field not in holiday:
                                    print(f"❌ Missing required field '{field}' in holiday data")
                                    return {"status": "FAIL", "details": f"Missing field '{field}' in response"}
                        
                        # Verify dates are in correct year
                        for holiday in sample_holidays:
                            date_str = holiday.get('date', '')
                            if date_str and not date_str.startswith(str(year)):
                                print(f"❌ Holiday date {date_str} doesn't match requested year {year}")
                                return {"status": "FAIL", "details": f"Date {date_str} doesn't match year {year}"}
                        
                        print(f"✅ Holidays endpoint working correctly for {country_code}/{year}")
                        return {
                            "status": "PASS", 
                            "details": f"Retrieved {len(holidays)} holidays for {country_code}/{year}",
                            "holidays_count": len(holidays)
                        }
                    else:
                        print(f"⚠️  No holidays found for {country_code}/{year}")
                        return {"status": "PASS", "details": f"No holidays found for {country_code}/{year}", "holidays_count": 0}
                        
                elif response.status_code == 404:
                    print(f"⚠️  No holidays data available for {country_code}/{year}")
                    return {"status": "PASS", "details": f"No data available for {country_code}/{year} (404 expected)"}
                else:
                    print(f"❌ Holidays endpoint failed - HTTP {response.status_code}")
                    return {"status": "FAIL", "details": f"HTTP {response.status_code}: {response.text}"}
                    
        except Exception as e:
            print(f"❌ Holidays endpoint failed - Exception: {str(e)}")
            return {"status": "FAIL", "details": f"Exception: {str(e)}"}
    
    async def test_compare_endpoint(self) -> Dict[str, Any]:
        """Test POST /api/compare endpoint"""
        print("\n=== Testing Compare Holidays Endpoint ===")
        
        compare_request = {
            "countryCodes": ["US", "GB"],
            "year": 2025
        }
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/compare",
                    json=compare_request,
                    headers={"Content-Type": "application/json"}
                )
                
                print(f"Status Code: {response.status_code}")
                print(f"Request: {json.dumps(compare_request, indent=2)}")
                
                if response.status_code == 200:
                    data = response.json()
                    print("Response structure check:")
                    
                    # Verify response structure
                    required_fields = ['year', 'countries', 'holidays', 'totalOverlaps']
                    for field in required_fields:
                        if field not in data:
                            print(f"❌ Missing required field '{field}' in compare response")
                            return {"status": "FAIL", "details": f"Missing field '{field}' in response"}
                    
                    print(f"  Year: {data.get('year')}")
                    print(f"  Countries: {len(data.get('countries', []))}")
                    print(f"  Holidays: {len(data.get('holidays', []))}")
                    print(f"  Total Overlaps: {data.get('totalOverlaps')}")
                    
                    # Verify year matches request
                    if data.get('year') != compare_request['year']:
                        print(f"❌ Response year {data.get('year')} doesn't match request year {compare_request['year']}")
                        return {"status": "FAIL", "details": "Year mismatch in response"}
                    
                    # Verify countries structure
                    countries = data.get('countries', [])
                    if len(countries) != len(compare_request['countryCodes']):
                        print(f"❌ Expected {len(compare_request['countryCodes'])} countries, got {len(countries)}")
                        return {"status": "FAIL", "details": "Country count mismatch"}
                    
                    for country in countries:
                        if 'countryCode' not in country or 'name' not in country:
                            print("❌ Invalid country structure in response")
                            return {"status": "FAIL", "details": "Invalid country structure"}
                    
                    # Verify holidays structure and overlap logic
                    holidays = data.get('holidays', [])
                    total_overlaps = data.get('totalOverlaps', 0)
                    
                    if len(holidays) > 0:
                        # Check sample holiday structure
                        sample_holiday = holidays[0]
                        required_holiday_fields = ['date', 'holidays', 'isOverlap', 'countries']
                        for field in required_holiday_fields:
                            if field not in sample_holiday:
                                print(f"❌ Missing field '{field}' in holiday entry")
                                return {"status": "FAIL", "details": f"Missing field '{field}' in holiday entry"}
                        
                        # Count overlaps and verify totalOverlaps
                        actual_overlaps = sum(1 for h in holidays if h.get('isOverlap', False))
                        if actual_overlaps != total_overlaps:
                            print(f"❌ Total overlaps mismatch: expected {actual_overlaps}, got {total_overlaps}")
                            return {"status": "FAIL", "details": f"Overlap count mismatch: {actual_overlaps} vs {total_overlaps}"}
                        
                        # Show some overlap examples
                        overlaps = [h for h in holidays if h.get('isOverlap', False)]
                        if overlaps:
                            print(f"\nFound {len(overlaps)} overlapping holidays:")
                            for overlap in overlaps[:3]:  # Show first 3
                                print(f"  - {overlap.get('date')}: {[h['name'] for h in overlap.get('holidays', [])]}")
                        else:
                            print("No overlapping holidays found")
                    
                    print("✅ Compare endpoint working correctly")
                    return {
                        "status": "PASS", 
                        "details": f"Compare successful for {compare_request['countryCodes']} in {compare_request['year']}",
                        "total_holidays": len(holidays),
                        "total_overlaps": total_overlaps,
                        "countries_found": len(countries)
                    }
                    
                else:
                    print(f"❌ Compare endpoint failed - HTTP {response.status_code}")
                    print(f"Response: {response.text}")
                    return {"status": "FAIL", "details": f"HTTP {response.status_code}: {response.text}"}
                    
        except Exception as e:
            print(f"❌ Compare endpoint failed - Exception: {str(e)}")
            return {"status": "FAIL", "details": f"Exception: {str(e)}"}
    
    async def test_compare_edge_cases(self) -> Dict[str, Any]:
        """Test edge cases for compare endpoint"""
        print("\n=== Testing Compare Endpoint Edge Cases ===")
        
        edge_cases = [
            {
                "name": "Single country (should fail)",
                "request": {"countryCodes": ["US"], "year": 2025},
                "expected_status": 400
            },
            {
                "name": "Too many countries (should fail)", 
                "request": {"countryCodes": ["US", "GB", "CA", "AU", "DE", "FR"], "year": 2025},
                "expected_status": 400
            },
            {
                "name": "Invalid country code",
                "request": {"countryCodes": ["XX", "YY"], "year": 2025},
                "expected_status": 200  # Should handle gracefully
            }
        ]
        
        results = []
        
        for case in edge_cases:
            print(f"\nTesting: {case['name']}")
            try:
                async with httpx.AsyncClient(timeout=30.0) as client:
                    response = await client.post(
                        f"{self.base_url}/compare",
                        json=case['request'],
                        headers={"Content-Type": "application/json"}
                    )
                    
                    print(f"  Status: {response.status_code} (expected: {case['expected_status']})")
                    
                    if response.status_code == case['expected_status']:
                        print(f"  ✅ {case['name']} handled correctly")
                        results.append({"case": case['name'], "status": "PASS"})
                    else:
                        print(f"  ❌ {case['name']} - unexpected status code")
                        results.append({"case": case['name'], "status": "FAIL", "details": f"Expected {case['expected_status']}, got {response.status_code}"})
                        
            except Exception as e:
                print(f"  ❌ {case['name']} - Exception: {str(e)}")
                results.append({"case": case['name'], "status": "FAIL", "details": f"Exception: {str(e)}"})
        
        passed = sum(1 for r in results if r['status'] == 'PASS')
        total = len(results)
        
        if passed == total:
            return {"status": "PASS", "details": f"All {total} edge cases handled correctly", "results": results}
        else:
            return {"status": "FAIL", "details": f"{passed}/{total} edge cases passed", "results": results}
    
    async def run_all_tests(self):
        """Run all backend API tests"""
        print("🚀 Starting Holiday Comparison API Backend Tests")
        print(f"Backend URL: {self.base_url}")
        print("=" * 60)
        
        # Test each endpoint
        self.test_results['health'] = await self.test_health_endpoint()
        self.test_results['countries'] = await self.test_countries_endpoint()
        self.test_results['holidays_us'] = await self.test_holidays_endpoint("US", 2025)
        self.test_results['holidays_gb'] = await self.test_holidays_endpoint("GB", 2025)
        self.test_results['compare'] = await self.test_compare_endpoint()
        self.test_results['compare_edge_cases'] = await self.test_compare_edge_cases()
        
        # Summary
        print("\n" + "=" * 60)
        print("🎯 TEST RESULTS SUMMARY")
        print("=" * 60)
        
        passed_tests = []
        failed_tests = []
        
        for test_name, result in self.test_results.items():
            status = result.get('status', 'UNKNOWN')
            if status == 'PASS':
                passed_tests.append(test_name)
                print(f"✅ {test_name}: PASS")
            else:
                failed_tests.append(test_name)
                print(f"❌ {test_name}: FAIL - {result.get('details', 'Unknown error')}")
        
        print(f"\n📊 Results: {len(passed_tests)}/{len(self.test_results)} tests passed")
        
        if failed_tests:
            print(f"\n🔍 Failed Tests Details:")
            for test_name in failed_tests:
                result = self.test_results[test_name]
                print(f"  - {test_name}: {result.get('details', 'No details')}")
        
        return {
            'total_tests': len(self.test_results),
            'passed': len(passed_tests),
            'failed': len(failed_tests),
            'success_rate': len(passed_tests) / len(self.test_results) * 100,
            'failed_tests': failed_tests,
            'detailed_results': self.test_results
        }


async def main():
    """Main test execution function"""
    tester = HolidayAPITester()
    results = await tester.run_all_tests()
    
    print(f"\n🎉 Testing Complete!")
    print(f"Success Rate: {results['success_rate']:.1f}%")
    
    if results['failed'] == 0:
        print("🎊 All tests passed!")
        return 0
    else:
        print(f"⚠️  {results['failed']} test(s) failed. Check details above.")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)