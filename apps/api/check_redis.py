import asyncio
import redis.asyncio as async_redis
import os

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

async def check_redis():
    print(f"Connecting to Redis at {REDIS_URL}...")
    try:
        client = await async_redis.from_url(REDIS_URL)
        await client.ping()
        print("✅ Redis is UP and running!")
        await client.close()
    except Exception as e:
        print(f"❌ Redis is DOWN. Error: {e}")

if __name__ == "__main__":
    asyncio.run(check_redis())
