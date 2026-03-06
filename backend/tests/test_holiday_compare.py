"""
Backend API tests for Holiday Compare feature
Tests: /api/compare endpoint with longWeekends and country flags
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://overlap-holidays-3.preview.emergentagent.com')

class TestHealthEndpoint:
    """Health check tests"""
    
    def test_health_check(self):
        """Verify API is accessible"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        print("✅ Health check passed")


class TestCountriesEndpoint:
    """Countries endpoint tests"""
    
    def test_get_countries(self):
        """Verify countries list is returned"""
        response = requests.get(f"{BASE_URL}/api/countries")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Check structure
        assert 'countryCode' in data[0]
        assert 'name' in data[0]
        print(f"✅ Countries endpoint returned {len(data)} countries")


class TestCompareEndpoint:
    """Compare endpoint tests - longWeekends with country flags"""
    
    def test_compare_us_de_returns_long_weekends(self):
        """POST /api/compare with US, DE returns longWeekends"""
        response = requests.post(
            f"{BASE_URL}/api/compare",
            json={"countryCodes": ["US", "DE"], "year": 2026}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Verify structure
        assert 'year' in data
        assert data['year'] == 2026
        assert 'countries' in data
        assert 'holidays' in data
        assert 'longWeekends' in data
        
        # Verify long weekends exist
        long_weekends = data.get('longWeekends', [])
        assert len(long_weekends) > 0, "Expected at least one long weekend"
        print(f"✅ Found {len(long_weekends)} long weekends")
        
    def test_long_weekends_have_holidays_with_country_code(self):
        """Verify longWeekends.holidays contain countryCode field"""
        response = requests.post(
            f"{BASE_URL}/api/compare",
            json={"countryCodes": ["US", "DE"], "year": 2026}
        )
        assert response.status_code == 200
        data = response.json()
        
        long_weekends = data.get('longWeekends', [])
        assert len(long_weekends) > 0
        
        # Check that holidays have countryCode
        for lw in long_weekends:
            assert 'holidays' in lw, f"Long weekend {lw.get('startDate')} missing holidays"
            holidays = lw.get('holidays', [])
            for h in holidays:
                assert 'countryCode' in h, f"Holiday {h.get('name')} missing countryCode"
                assert 'date' in h, f"Holiday {h.get('name')} missing date"
                assert h['countryCode'] in ['US', 'DE'], f"Unexpected countryCode: {h['countryCode']}"
        
        print("✅ All long weekend holidays have countryCode field")
        
    def test_january_long_weekend_has_correct_flags(self):
        """Verify Jan 1-4 long weekend has US and DE flags for New Year"""
        response = requests.post(
            f"{BASE_URL}/api/compare",
            json={"countryCodes": ["US", "DE"], "year": 2026}
        )
        assert response.status_code == 200
        data = response.json()
        
        long_weekends = data.get('longWeekends', [])
        
        # Find Jan 1-4 long weekend
        jan_1_4 = None
        for lw in long_weekends:
            if lw.get('startDate') == '2026-01-01' and lw.get('endDate') == '2026-01-04':
                jan_1_4 = lw
                break
        
        assert jan_1_4 is not None, "Jan 1-4 long weekend not found"
        
        # Verify holidays
        holidays = jan_1_4.get('holidays', [])
        country_codes = [h['countryCode'] for h in holidays]
        
        assert 'US' in country_codes, "US holiday not found for Jan 1"
        assert 'DE' in country_codes, "DE holiday not found for Jan 1"
        
        print("✅ Jan 1-4 long weekend has both US and DE holidays")
        
    def test_long_weekend_structure(self):
        """Verify long weekend has all required fields"""
        response = requests.post(
            f"{BASE_URL}/api/compare",
            json={"countryCodes": ["US", "DE"], "year": 2026}
        )
        assert response.status_code == 200
        data = response.json()
        
        long_weekends = data.get('longWeekends', [])
        assert len(long_weekends) > 0
        
        lw = long_weekends[0]
        
        # Check required fields
        required_fields = ['startDate', 'endDate', 'totalDays', 'holidayDays', 
                         'weekendDays', 'type', 'description', 'holidays', 'countries']
        for field in required_fields:
            assert field in lw, f"Missing required field: {field}"
        
        print("✅ Long weekend has all required fields")


class TestOverlapsCount:
    """Test overlaps calculation"""
    
    def test_overlaps_count(self):
        """Verify totalOverlaps is calculated correctly"""
        response = requests.post(
            f"{BASE_URL}/api/compare",
            json={"countryCodes": ["US", "DE"], "year": 2026}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert 'totalOverlaps' in data
        total_overlaps = data['totalOverlaps']
        
        # Count manually
        holidays = data.get('holidays', [])
        overlapping = [h for h in holidays if h.get('isOverlap')]
        
        assert total_overlaps == len(overlapping)
        print(f"✅ Total overlaps: {total_overlaps}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
