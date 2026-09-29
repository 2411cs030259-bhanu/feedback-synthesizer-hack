import os
import asyncio
import httpx
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path("backend/.env"))

groq_key = os.environ.get("GROQ_API_KEY", "").strip().strip("\"'")
hindsight_key = os.environ.get("HINDSIGHT_API_KEY", "").strip().strip("\"'")
hindsight_url = os.environ.get("HINDSIGHT_URL", "").strip().strip("\"'")

print(f"Groq key prefix: {groq_key[:8]}... (len {len(groq_key)})")
print(f"Hindsight URL: {hindsight_url}")
print(f"Hindsight key prefix: {hindsight_key[:8]}... (len {len(hindsight_key)})")

async def test_apis():
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Test Groq
        try:
            res = await client.get("https://api.groq.com/openai/v1/models", headers={"Authorization": f"Bearer {groq_key}"})
            print(f"Groq status: {res.status_code}")
            if res.status_code == 200:
                print("Groq API: CONNECTED AND VALID!")
        except Exception as e:
            print(f"Groq exception: {e}")

        # Test Hindsight
        try:
            res = await client.get(f"{hindsight_url}/v1/default/banks", headers={"Authorization": f"Bearer {hindsight_key}"})
            print(f"Hindsight banks response ({res.status_code}): {res.text}")
        except Exception as e:
            print(f"Hindsight error: {e}")

asyncio.run(test_apis())
