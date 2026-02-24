"""
Backend API tests for App Version Update Notification System
Tests: GET /api/app-version, PUT /api/app-version
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


# ─── App Version Tests ───────────────────────────────────────────────────────

class TestAppVersionGet:
    """GET /api/app-version - Get latest app version info"""

    def test_returns_200(self, client):
        """Endpoint should return 200 status"""
        response = client.get(f"{BASE_URL}/api/app-version")
        assert response.status_code == 200

    def test_returns_required_fields(self, client):
        """Response should contain all required version info fields"""
        response = client.get(f"{BASE_URL}/api/app-version")
        data = response.json()
        # Check all required fields exist
        assert "latestVersion" in data
        assert "iosStoreUrl" in data
        assert "androidStoreUrl" in data

    def test_version_format(self, client):
        """latestVersion should be a valid semver-like string"""
        response = client.get(f"{BASE_URL}/api/app-version")
        data = response.json()
        version = data["latestVersion"]
        # Should be string like "1.0.0" or "2.0.0"
        assert isinstance(version, str)
        parts = version.split(".")
        assert len(parts) >= 2  # At least major.minor
        for part in parts:
            assert part.isdigit()

    def test_store_urls_valid(self, client):
        """Store URLs should be valid https URLs"""
        response = client.get(f"{BASE_URL}/api/app-version")
        data = response.json()
        assert data["iosStoreUrl"].startswith("https://apps.apple.com/")
        assert data["androidStoreUrl"].startswith("https://play.google.com/")


class TestAppVersionPut:
    """PUT /api/app-version - Update app version info"""

    def test_update_latest_version(self, client):
        """Should update latestVersion and return updated data"""
        # First, set a test version
        response = client.put(f"{BASE_URL}/api/app-version", json={
            "latestVersion": "2.0.0"
        })
        assert response.status_code == 200
        data = response.json()
        assert data["latestVersion"] == "2.0.0"
        assert "message" in data

    def test_update_persists_to_get(self, client):
        """After PUT, GET should return the updated version"""
        # Set version to 2.1.0
        put_response = client.put(f"{BASE_URL}/api/app-version", json={
            "latestVersion": "2.1.0"
        })
        assert put_response.status_code == 200
        
        # Verify GET returns the updated version
        get_response = client.get(f"{BASE_URL}/api/app-version")
        assert get_response.status_code == 200
        data = get_response.json()
        assert data["latestVersion"] == "2.1.0"

    def test_update_with_optional_fields(self, client):
        """Should update optional fields: minVersion, releaseNotes, forceUpdate"""
        response = client.put(f"{BASE_URL}/api/app-version", json={
            "latestVersion": "2.2.0",
            "minVersion": "1.5.0",
            "releaseNotes": "Bug fixes and performance improvements",
            "forceUpdate": True
        })
        assert response.status_code == 200
        data = response.json()
        assert data["latestVersion"] == "2.2.0"
        assert data["minVersion"] == "1.5.0"
        assert data["releaseNotes"] == "Bug fixes and performance improvements"
        assert data["forceUpdate"] == True

    def test_update_optional_persists(self, client):
        """Optional fields should persist to GET"""
        # Update with all fields
        client.put(f"{BASE_URL}/api/app-version", json={
            "latestVersion": "2.3.0",
            "minVersion": "1.8.0",
            "releaseNotes": "New features",
            "forceUpdate": False
        })
        
        # Verify GET returns all fields
        get_response = client.get(f"{BASE_URL}/api/app-version")
        data = get_response.json()
        assert data["latestVersion"] == "2.3.0"
        assert data["minVersion"] == "1.8.0"
        assert data["releaseNotes"] == "New features"
        assert data["forceUpdate"] == False

    def test_store_urls_always_present(self, client):
        """Store URLs should always be returned with correct values"""
        response = client.put(f"{BASE_URL}/api/app-version", json={
            "latestVersion": "2.4.0"
        })
        data = response.json()
        assert "iosStoreUrl" in data
        assert "androidStoreUrl" in data
        assert data["iosStoreUrl"] == "https://apps.apple.com/app/id6740092498"
        assert data["androidStoreUrl"] == "https://play.google.com/store/apps/details?id=com.anadworld.overlap"


class TestAppVersionCleanup:
    """Cleanup: Reset version back to 1.0.0"""

    def test_reset_to_default(self, client):
        """Reset version to 1.0.0 for other tests"""
        response = client.put(f"{BASE_URL}/api/app-version", json={
            "latestVersion": "1.0.0",
            "minVersion": "1.0.0",
            "releaseNotes": "",
            "forceUpdate": False
        })
        assert response.status_code == 200
        
        # Verify it was reset
        get_response = client.get(f"{BASE_URL}/api/app-version")
        data = get_response.json()
        assert data["latestVersion"] == "1.0.0"


# ─── Regression Tests ─────────────────────────────────────────────────────────

class TestRegressionCountries:
    """Regression: GET /api/countries should still work"""

    def test_countries_still_works(self, client):
        response = client.get(f"{BASE_URL}/api/countries")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        # Verify structure
        first = data[0]
        assert "countryCode" in first
        assert "name" in first


class TestRegressionCompare:
    """Regression: POST /api/compare should still work"""

    def test_compare_still_works(self, client):
        response = client.post(f"{BASE_URL}/api/compare", json={
            "countryCodes": ["US", "GB"],
            "year": 2025
        })
        assert response.status_code == 200
        data = response.json()
        assert "year" in data
        assert data["year"] == 2025
        assert "countries" in data
        assert "holidays" in data
        assert "totalOverlaps" in data
        assert "longWeekends" in data
