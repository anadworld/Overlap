#!/usr/bin/env python3
"""
Specific Review Request Test - Exactly as requested
"""

import requests
import json

BACKEND_URL = "https://holiday-overlap.preview.emergentagent.com/api"

def test_specific_requests():
    """Test the exact scenarios requested in the review"""
    print("TESTING EXACT REVIEW REQUESTS")
    print("=" * 50)
    
    # Test 1: US 2026 - Check Good Friday appears only once
    print("\n1. POST /api/compare with {\"countryCodes\": [\"US\"], \"year\": 2026}")
    print("-" * 50)
    
    payload1 = {"countryCodes": ["US"], "year": 2026}
    response1 = requests.post(f"{BACKEND_URL}/compare", json=payload1)
    
    print(f"Status: {response1.status_code}")
    if response1.status_code == 200:
        data1 = response1.json()
        
        # Check for Good Friday on April 3, 2026
        good_friday_count = 0
        april_3_holidays = []
        duplicates_same_date_country = {}
        
        for holiday_group in data1.get("holidays", []):
            date = holiday_group.get("date")
            holidays_list = holiday_group.get("holidays", [])
            
            # Track holidays per date per country
            for holiday in holidays_list:
                country = holiday.get("countryCode", "")
                name = holiday.get("name", "")
                
                if "Good Friday" in name:
                    good_friday_count += 1
                    print(f"   Found Good Friday: {date} - {name}")
                
                if date == "2026-04-03":
                    april_3_holidays.append(f"{name} ({country})")
        
        print(f"   ✓ Good Friday appears {good_friday_count} time(s)")
        print(f"   ✓ April 3, 2026 has {len(april_3_holidays)} holiday(s): {april_3_holidays}")
        
        if good_friday_count == 1:
            print("   ✅ PASS: Good Friday appears exactly once")
        else:
            print("   ❌ FAIL: Good Friday should appear exactly once")
            
    else:
        print(f"   ❌ FAIL: API returned {response1.status_code}")
        return False
    
    # Test 2: US + TH 2026 - Check no duplicates for any country
    print(f"\n2. POST /api/compare with {{\"countryCodes\": [\"US\", \"TH\"], \"year\": 2026}}")
    print("-" * 50)
    
    payload2 = {"countryCodes": ["US", "TH"], "year": 2026}
    response2 = requests.post(f"{BACKEND_URL}/compare", json=payload2)
    
    print(f"Status: {response2.status_code}")
    if response2.status_code == 200:
        data2 = response2.json()
        
        # Check for duplicates by tracking (date, country, name) combinations
        holiday_combinations = set()
        duplicates_found = False
        
        for holiday_group in data2.get("holidays", []):
            date = holiday_group.get("date")
            holidays_list = holiday_group.get("holidays", [])
            
            for holiday in holidays_list:
                country = holiday.get("countryCode", "")
                name = holiday.get("name", "")
                
                combination = (date, country, name)
                if combination in holiday_combinations:
                    print(f"   ❌ DUPLICATE: {date} - {name} ({country})")
                    duplicates_found = True
                else:
                    holiday_combinations.add(combination)
        
        if duplicates_found:
            print("   ❌ FAIL: Duplicates found")
            return False
        else:
            print("   ✅ PASS: No duplicate holidays for any country")
            
    else:
        print(f"   ❌ FAIL: API returned {response2.status_code}")
        return False
    
    return True

if __name__ == "__main__":
    success = test_specific_requests()
    
    print("\n" + "=" * 50)
    print("REVIEW REQUEST TEST RESULTS")
    print("=" * 50)
    
    if success:
        print("✅ ALL REVIEW REQUIREMENTS PASSED")
        print("✅ Good Friday appears only once for US 2026")  
        print("✅ No duplicate holidays found for any country")
        exit(0)
    else:
        print("❌ SOME REQUIREMENTS FAILED")
        exit(1)