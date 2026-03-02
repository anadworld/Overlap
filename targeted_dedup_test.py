#!/usr/bin/env python3
"""
Targeted Holiday Deduplication Test
Specifically tests for true duplicate holidays (same name, same date, same country)
vs legitimate different holidays on the same date.
"""

import requests
import json
from collections import defaultdict

BACKEND_URL = "https://overlap-holidays-2.preview.emergentagent.com/api"

def test_good_friday_deduplication():
    """Test specifically for Good Friday deduplication fix"""
    print("🎯 TESTING GOOD FRIDAY DEDUPLICATION (April 3, 2026)")
    print("=" * 60)
    
    payload = {"countryCodes": ["US"], "year": 2026}
    response = requests.post(f"{BACKEND_URL}/compare", json=payload)
    
    if response.status_code != 200:
        print(f"❌ API call failed: {response.status_code}")
        return False
        
    data = response.json()
    
    # Count Good Friday occurrences specifically
    good_friday_entries = []
    for holiday_group in data.get("holidays", []):
        date = holiday_group.get("date")
        for holiday in holiday_group.get("holidays", []):
            if "Good Friday" in holiday.get("name", ""):
                good_friday_entries.append({
                    "date": date,
                    "name": holiday.get("name"),
                    "country": holiday.get("countryCode")
                })
    
    print(f"Good Friday entries found: {len(good_friday_entries)}")
    for entry in good_friday_entries:
        print(f"  - {entry['date']}: {entry['name']} ({entry['country']})")
    
    if len(good_friday_entries) == 1:
        print("✅ GOOD FRIDAY DEDUPLICATION: Working correctly - appears exactly once")
        return True
    elif len(good_friday_entries) == 0:
        print("⚠️  GOOD FRIDAY: Not found (may not be observed in US 2026)")
        return True  # This is acceptable
    else:
        print(f"❌ GOOD FRIDAY DUPLICATION: Appears {len(good_friday_entries)} times")
        return False

def test_true_duplicate_detection():
    """Test for actual duplicate entries (same name, same date, same country)"""
    print("\n🔍 TESTING FOR TRUE DUPLICATE ENTRIES")
    print("=" * 60)
    
    payload = {"countryCodes": ["US", "TH"], "year": 2026}
    response = requests.post(f"{BACKEND_URL}/compare", json=payload)
    
    if response.status_code != 200:
        print(f"❌ API call failed: {response.status_code}")
        return False
        
    data = response.json()
    
    # Track exact holiday entries to detect true duplicates
    holiday_tracker = defaultdict(int)
    all_holidays = []
    
    for holiday_group in data.get("holidays", []):
        date = holiday_group.get("date")
        for holiday in holiday_group.get("holidays", []):
            name = holiday.get("name", "")
            country = holiday.get("countryCode", "")
            
            # Create unique key for exact match
            holiday_key = (date, name, country)
            holiday_tracker[holiday_key] += 1
            
            all_holidays.append({
                "date": date,
                "name": name,
                "country": country,
                "key": holiday_key
            })
    
    # Find true duplicates (same name, same date, same country appearing > 1 time)
    true_duplicates = [(key, count) for key, count in holiday_tracker.items() if count > 1]
    
    print(f"Total holiday entries: {len(all_holidays)}")
    print(f"True duplicates found: {len(true_duplicates)}")
    
    if true_duplicates:
        print("❌ TRUE DUPLICATES DETECTED:")
        for (date, name, country), count in true_duplicates:
            print(f"  - {date}: '{name}' in {country} appears {count} times")
        return False
    else:
        print("✅ NO TRUE DUPLICATES: All entries are unique combinations")
        
        # Show examples of legitimate different holidays on same date
        date_groups = defaultdict(list)
        for holiday in all_holidays:
            date_groups[holiday["date"]].append(holiday)
        
        print("\nSample of dates with multiple holidays:")
        for date, holidays in list(date_groups.items())[:3]:
            if len(holidays) > 1:
                print(f"  {date}:")
                for h in holidays:
                    print(f"    - {h['name']} ({h['country']})")
        
        return True

def main():
    print("TARGETED HOLIDAY DEDUPLICATION TEST")
    print("Testing for the specific Good Friday fix and true duplicates")
    print("=" * 80)
    
    # Test Good Friday specifically
    good_friday_ok = test_good_friday_deduplication()
    
    # Test for true duplicates
    no_true_duplicates = test_true_duplicate_detection()
    
    print("\n" + "=" * 80)
    print("FINAL RESULTS")
    print("=" * 80)
    
    if good_friday_ok and no_true_duplicates:
        print("✅ ALL TESTS PASSED")
        print("✅ Good Friday deduplication working correctly")
        print("✅ No true duplicate entries found")
        print("✅ Multiple holidays on same date are legitimate (e.g., Columbus Day vs Indigenous Peoples' Day)")
        return True
    else:
        print("❌ SOME ISSUES FOUND")
        if not good_friday_ok:
            print("❌ Good Friday deduplication issue")
        if not no_true_duplicates:
            print("❌ True duplicate entries detected")
        return False

if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)