"""
Backend API tests for Overlap – Holiday Calendar app
Tests: /api/countries, /api/compare, /api/health, and supporting endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

if not BASE_URL:
    # Fallback: try reading from .env file
    import pathlib
    env_path = pathlib.Path('/app/frontend/.env')
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            if line.startswith('EXPO_PUBLIC_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip()
                break

print(f"Testing against BASE_URL: {BASE_URL}")


@pytest.fixture(scope="session")
def client():
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session


# ─── Health Check ───────────────────────────────────────────────────────────

class TestHealth:
    """Health check endpoint"""

    def test_health_ok(self, client):
        response = client.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        assert "timestamp" in data


# ─── Countries ───────────────────────────────────────────────────────────────

class TestCountries:
    """GET /api/countries"""

    def test_returns_200(self, client):
        response = client.get(f"{BASE_URL}/api/countries")
        assert response.status_code == 200

    def test_returns_list(self, client):
        response = client.get(f"{BASE_URL}/api/countries")
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_country_has_required_fields(self, client):
        response = client.get(f"{BASE_URL}/api/countries")
        data = response.json()
        first = data[0]
        assert "countryCode" in first
        assert "name" in first
        assert isinstance(first["countryCode"], str)
        assert isinstance(first["name"], str)
        assert len(first["countryCode"]) == 2  # ISO 2-letter code

    def test_contains_known_countries(self, client):
        response = client.get(f"{BASE_URL}/api/countries")
        data = response.json()
        codes = [c["countryCode"] for c in data]
        assert "US" in codes or "GB" in codes  # At least one major country


# ─── Compare ─────────────────────────────────────────────────────────────────

class TestCompare:
    """POST /api/compare"""

    def test_single_country_valid(self, client):
        response = client.post(f"{BASE_URL}/api/compare", json={
            "countryCodes": ["US"],
            "year": 2025
        })
        assert response.status_code == 200

    def test_response_structure(self, client):
        response = client.post(f"{BASE_URL}/api/compare", json={
            "countryCodes": ["US"],
            "year": 2025
        })
        data = response.json()
        assert "year" in data
        assert "countries" in data
        assert "holidays" in data
        assert "totalOverlaps" in data
        assert "longWeekends" in data

    def test_response_year_matches_request(self, client):
        response = client.post(f"{BASE_URL}/api/compare", json={
            "countryCodes": ["US"],
            "year": 2025
        })
        data = response.json()
        assert data["year"] == 2025

    def test_holidays_list_non_empty(self, client):
        response = client.post(f"{BASE_URL}/api/compare", json={
            "countryCodes": ["US"],
            "year": 2025
        })
        data = response.json()
        assert len(data["holidays"]) > 0

    def test_holiday_item_structure(self, client):
        response = client.post(f"{BASE_URL}/api/compare", json={
            "countryCodes": ["US"],
            "year": 2025
        })
        data = response.json()
        holiday = data["holidays"][0]
        assert "date" in holiday
        assert "holidays" in holiday
        assert "isOverlap" in holiday
        assert "countries" in holiday
        assert isinstance(holiday["isOverlap"], bool)
        assert isinstance(holiday["countries"], list)

    def test_two_countries_overlap_detection(self, client):
        """US and GB both have holidays; overlaps should be calculated"""
        response = client.post(f"{BASE_URL}/api/compare", json={
            "countryCodes": ["US", "GB"],
            "year": 2025
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data["totalOverlaps"], int)
        assert data["totalOverlaps"] >= 0

    def test_two_countries_returns_both(self, client):
        response = client.post(f"{BASE_URL}/api/compare", json={
            "countryCodes": ["US", "GB"],
            "year": 2025
        })
        data = response.json()
        codes = [c["countryCode"] for c in data["countries"]]
        assert "US" in codes
        assert "GB" in codes

    def test_long_weekends_returned(self, client):
        response = client.post(f"{BASE_URL}/api/compare", json={
            "countryCodes": ["US"],
            "year": 2025
        })
        data = response.json()
        assert isinstance(data["longWeekends"], list)

    def test_long_weekend_structure(self, client):
        response = client.post(f"{BASE_URL}/api/compare", json={
            "countryCodes": ["US"],
            "year": 2025
        })
        data = response.json()
        lws = data["longWeekends"]
        if lws:
            lw = lws[0]
            assert "startDate" in lw
            assert "endDate" in lw
            assert "totalDays" in lw
            assert "holidayDays" in lw
            assert "weekendDays" in lw
            assert "type" in lw
            assert "description" in lw
            assert "holidays" in lw
            assert "countries" in lw
            assert "isOverlap" in lw

    def test_five_countries_accepted(self, client):
        response = client.post(f"{BASE_URL}/api/compare", json={
            "countryCodes": ["US", "GB", "DE", "FR", "CA"],
            "year": 2025
        })
        assert response.status_code == 200
        data = response.json()
        assert len(data["countries"]) == 5

    def test_too_many_countries_rejected(self, client):
        response = client.post(f"{BASE_URL}/api/compare", json={
            "countryCodes": ["US", "GB", "DE", "FR", "CA", "AU"],
            "year": 2025
        })
        assert response.status_code == 400

    def test_empty_country_list_rejected(self, client):
        response = client.post(f"{BASE_URL}/api/compare", json={
            "countryCodes": [],
            "year": 2025
        })
        assert response.status_code == 400

    def test_overlap_flag_set_correctly(self, client):
        """Overlapping holiday should have isOverlap=True"""
        response = client.post(f"{BASE_URL}/api/compare", json={
            "countryCodes": ["US", "GB"],
            "year": 2025
        })
        data = response.json()
        overlapping = [h for h in data["holidays"] if h["isOverlap"]]
        # If totalOverlaps > 0, there should be matching holidays with isOverlap=True
        if data["totalOverlaps"] > 0:
            assert len(overlapping) > 0
            assert len(overlapping) == data["totalOverlaps"]


# ─── Holidays Endpoint ───────────────────────────────────────────────────────

class TestHolidaysEndpoint:
    """GET /api/holidays/{country_code}/{year}"""

    def test_us_holidays_2025(self, client):
        response = client.get(f"{BASE_URL}/api/holidays/US/2025")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0

    def test_holiday_fields(self, client):
        response = client.get(f"{BASE_URL}/api/holidays/US/2025")
        data = response.json()
        h = data[0]
        assert "date" in h
        assert "name" in h
        assert "localName" in h
        assert "countryCode" in h

    def test_invalid_country_404(self, client):
        response = client.get(f"{BASE_URL}/api/holidays/XX/2025")
        assert response.status_code == 404
