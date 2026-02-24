import asyncio
import httpx

BACKEND_URL = "https://holiday-overlap.preview.emergentagent.com/api"

async def test_specific_scenarios():
    print("🧪 Testing Specific Review Request Scenarios")
    print("=" * 50)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        # 1. Single country support
        print("\n1. Testing single country (US) for 2025:")
        response = await client.post(f"{BACKEND_URL}/compare", json={"countryCodes": ["US"], "year": 2025})
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success! {len(data['holidays'])} holidays, {len(data['longWeekends'])} long weekends")
        
        # 2. Two countries still works  
        print("\n2. Testing two countries (US, DE) for 2025:")
        response = await client.post(f"{BACKEND_URL}/compare", json={"countryCodes": ["US", "DE"], "year": 2025})
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ Success! {data['totalOverlaps']} overlaps detected")
        
        # 3. Empty array returns 400
        print("\n3. Testing empty array:")
        response = await client.post(f"{BACKEND_URL}/compare", json={"countryCodes": [], "year": 2025})
        print(f"   Status: {response.status_code}")
        if response.status_code == 400:
            print("   ✅ Correctly returns 400 error")
        
        # 4. Test countries endpoint
        print("\n4. Testing GET /api/countries:")
        response = await client.get(f"{BACKEND_URL}/countries")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            countries = response.json()
            print(f"   ✅ Success! {len(countries)} countries available")
        
        # 5. Test holidays endpoint  
        print("\n5. Testing GET /api/holidays/US/2025:")
        response = await client.get(f"{BACKEND_URL}/holidays/US/2025")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            holidays = response.json()
            print(f"   ✅ Success! {len(holidays)} holidays for US 2025")

if __name__ == "__main__":
    asyncio.run(test_specific_scenarios())
