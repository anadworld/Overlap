"""
Test School Holidays Feature - OpenHolidays API Integration
Tests: /api/school-holiday-countries, /api/subdivisions/{country}, /api/school-holidays/{country}/{year}
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', '')).rstrip('/')

class TestSchoolHolidayCountries:
    """Test /api/school-holiday-countries endpoint"""
    
    def test_school_holiday_countries_returns_list(self):
        """Should return a list of countries supported by OpenHolidays API"""
        response = requests.get(f"{BASE_URL}/api/school-holiday-countries", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 36, f"Expected at least 36 countries, got {len(data)}"
    
    def test_school_holiday_countries_structure(self):
        """Each country should have countryCode and name fields"""
        response = requests.get(f"{BASE_URL}/api/school-holiday-countries", timeout=30)
        data = response.json()
        
        # Check structure of first few countries
        for country in data[:5]:
            assert "countryCode" in country
            assert "name" in country
            assert isinstance(country["countryCode"], str)
            assert isinstance(country["name"], str)
            assert len(country["countryCode"]) == 2  # ISO country codes are 2 letters
    
    def test_school_holiday_countries_contains_germany(self):
        """Germany (DE) should be in the list"""
        response = requests.get(f"{BASE_URL}/api/school-holiday-countries", timeout=30)
        data = response.json()
        
        country_codes = [c["countryCode"] for c in data]
        assert "DE" in country_codes, "Germany should be in supported countries"
    
    def test_school_holiday_countries_contains_france(self):
        """France (FR) should be in the list"""
        response = requests.get(f"{BASE_URL}/api/school-holiday-countries", timeout=30)
        data = response.json()
        
        country_codes = [c["countryCode"] for c in data]
        assert "FR" in country_codes, "France should be in supported countries"


class TestSubdivisions:
    """Test /api/subdivisions/{country_code} endpoint"""
    
    def test_subdivisions_germany_returns_16(self):
        """Germany should have 16 subdivisions (Bundesländer)"""
        response = requests.get(f"{BASE_URL}/api/subdivisions/DE", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 16, f"Expected 16 German subdivisions, got {len(data)}"
    
    def test_subdivisions_germany_structure(self):
        """Each subdivision should have code, name, and shortName"""
        response = requests.get(f"{BASE_URL}/api/subdivisions/DE", timeout=30)
        data = response.json()
        
        for sub in data:
            assert "code" in sub
            assert "name" in sub
            assert "shortName" in sub
    
    def test_subdivisions_germany_contains_bavaria(self):
        """Bavaria (DE-BY) should be in German subdivisions"""
        response = requests.get(f"{BASE_URL}/api/subdivisions/DE", timeout=30)
        data = response.json()
        
        codes = [s["code"] for s in data]
        assert "DE-BY" in codes, "Bavaria should be in German subdivisions"
    
    def test_subdivisions_country_without_subdivisions(self):
        """Countries without subdivisions should return empty list"""
        # Monaco (MC) is a small country likely without subdivisions
        response = requests.get(f"{BASE_URL}/api/subdivisions/MC", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
    
    def test_subdivisions_case_insensitive(self):
        """Endpoint should be case insensitive"""
        response_upper = requests.get(f"{BASE_URL}/api/subdivisions/DE", timeout=30)
        response_lower = requests.get(f"{BASE_URL}/api/subdivisions/de", timeout=30)
        
        assert response_upper.status_code == 200
        assert response_lower.status_code == 200
        
        # Both should return same data
        assert len(response_upper.json()) == len(response_lower.json())


class TestSchoolHolidays:
    """Test /api/school-holidays/{country_code}/{year} endpoint"""
    
    def test_school_holidays_germany_2026(self):
        """Germany 2026 should return school holidays"""
        response = requests.get(f"{BASE_URL}/api/school-holidays/DE/2026", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 100, f"Expected 100+ German school holidays, got {len(data)}"
    
    def test_school_holidays_germany_structure(self):
        """Each school holiday should have required fields"""
        response = requests.get(f"{BASE_URL}/api/school-holidays/DE/2026", timeout=30)
        data = response.json()
        
        for holiday in data[:5]:
            assert "id" in holiday
            assert "startDate" in holiday
            assert "endDate" in holiday
            assert "name" in holiday
            assert "nationwide" in holiday
            assert "subdivisions" in holiday
            
            # Validate date format (YYYY-MM-DD)
            assert len(holiday["startDate"]) == 10
            assert holiday["startDate"][4] == "-"
    
    def test_school_holidays_france_2026(self):
        """France 2026 should return school holidays"""
        response = requests.get(f"{BASE_URL}/api/school-holidays/FR/2026", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 30, f"Expected 30+ French school holidays, got {len(data)}"
    
    def test_school_holidays_with_subdivision_filter(self):
        """Filtering by subdivision (DE-BY) should return fewer holidays"""
        response_all = requests.get(f"{BASE_URL}/api/school-holidays/DE/2026", timeout=30)
        response_bavaria = requests.get(f"{BASE_URL}/api/school-holidays/DE/2026?subdivision=DE-BY", timeout=30)
        
        assert response_all.status_code == 200
        assert response_bavaria.status_code == 200
        
        all_data = response_all.json()
        bavaria_data = response_bavaria.json()
        
        # Bavaria-only should have fewer holidays than all of Germany
        assert len(bavaria_data) < len(all_data), "Bavaria should have fewer holidays than all of Germany"
        assert len(bavaria_data) > 0, "Bavaria should have at least some holidays"
    
    def test_school_holidays_sorted_by_date(self):
        """Holidays should be sorted by startDate"""
        response = requests.get(f"{BASE_URL}/api/school-holidays/DE/2026", timeout=30)
        data = response.json()
        
        dates = [h["startDate"] for h in data]
        assert dates == sorted(dates), "Holidays should be sorted by startDate"


class TestExistingEndpoints:
    """Regression tests - ensure existing endpoints still work"""
    
    def test_health_endpoint(self):
        """Health check should return healthy"""
        response = requests.get(f"{BASE_URL}/api/health", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_countries_endpoint(self):
        """Countries endpoint should return Nager.Date countries"""
        response = requests.get(f"{BASE_URL}/api/countries", timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 100, "Should have 100+ countries from Nager.Date"
    
    def test_compare_endpoint(self):
        """Compare endpoint should work for public holidays"""
        payload = {"countryCodes": ["DE", "FR"], "year": 2026}
        response = requests.post(f"{BASE_URL}/api/compare", json=payload, timeout=30)
        assert response.status_code == 200
        
        data = response.json()
        assert "holidays" in data
        assert "totalOverlaps" in data
        assert len(data["holidays"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
