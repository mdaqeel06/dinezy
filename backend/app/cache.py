import os
import json
import logging
from typing import Any, Optional
from pathlib import Path
from dotenv import load_dotenv
import redis

# Load environment variables
env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

# Setup logger for Redis caching
logger = logging.getLogger("dinezy.redis")
if not logger.handlers:
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] [REDIS] %(message)s"))
    logger.addHandler(console_handler)
    logger.setLevel(logging.INFO)

REDIS_URL = os.getenv("REDIS_URL", "")
DEFAULT_MENU_TTL_SECONDS = 300  # 5 minutes (for testing and performance)

CACHE_KEY_ALL_RESTAURANTS = "dinezy:restaurants:all"
CACHE_PREFIX_RESTAURANT = "dinezy:restaurant:"
CACHE_PATTERN_RESTAURANTS = "dinezy:restaurant*"

_redis_client: Optional[redis.Redis] = None


def get_redis_client() -> Optional[redis.Redis]:
    """Returns singleton Redis client instance or None if not configured/available"""
    global _redis_client
    if _redis_client is not None:
        return _redis_client

    if not REDIS_URL:
        logger.warning("⚠️ REDIS_URL not configured in environment. Caching disabled.")
        return None

    try:
        # socket_connect_timeout=3 ensures DB operations don't hang if Redis is slow/unreachable
        client = redis.Redis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=3.0,
            socket_timeout=3.0,
        )
        client.ping()
        _redis_client = client
        logger.info("⚡ Successfully connected to Redis cloud instance!")
        return _redis_client
    except Exception as e:
        logger.error(f"❌ Failed to connect to Redis: {e}. Falling back to database directly.")
        return None


def get_cache(key: str) -> Optional[Any]:
    """Retrieve and deserialize JSON data from Redis"""
    client = get_redis_client()
    if not client:
        return None
    try:
        raw_val = client.get(key)
        if raw_val is not None:
            ttl = client.ttl(key)
            logger.info(f"🎯 [CACHE HIT] Key '{key}' served from Redis (TTL remaining: {ttl}s)")
            return json.loads(raw_val)
        logger.info(f"💨 [CACHE MISS] Key '{key}' not found in Redis")
        return None
    except Exception as e:
        logger.warning(f"⚠️ Redis get error for key '{key}': {e}")
        return None


def set_cache(key: str, value: Any, ttl_seconds: int = DEFAULT_MENU_TTL_SECONDS) -> bool:
    """Serialize and store data in Redis with a TTL (Time-To-Live in seconds)"""
    client = get_redis_client()
    if not client:
        return False
    try:
        serialized = json.dumps(value)
        client.setex(key, ttl_seconds, serialized)
        logger.info(f"💾 [CACHE SAVED] Key '{key}' stored in Redis with TTL={ttl_seconds}s (5 mins)")
        return True
    except Exception as e:
        logger.warning(f"⚠️ Redis set error for key '{key}': {e}")
        return False


def delete_cache(key: str) -> bool:
    """Delete a specific cache key"""
    client = get_redis_client()
    if not client:
        return False
    try:
        client.delete(key)
        logger.info(f"🗑️ [CACHE DELETED] Key '{key}' evicted from Redis")
        return True
    except Exception as e:
        logger.warning(f"⚠️ Redis delete error for key '{key}': {e}")
        return False


def invalidate_restaurants_and_menu_cache() -> int:
    """
    Invalidates all cached restaurants and menu catalogs.
    Called whenever a menu item is added, updated, toggled, or deleted,
    or whenever restaurant metadata is modified.
    """
    client = get_redis_client()
    if not client:
        return 0
    try:
        # Find all keys matching restaurant/menu patterns
        keys = client.keys(f"{CACHE_PATTERN_RESTAURANTS}*")
        if keys:
            count = client.delete(*keys)
            logger.info(f"🧹 [CACHE INVALIDATED] Erased {count} cached key(s): {keys}")
            return count
        else:
            logger.info("ℹ️ [CACHE INVALIDATED] No cached keys found matching pattern to erase.")
            return 0
    except Exception as e:
        logger.warning(f"⚠️ Redis invalidation error: {e}")
        return 0
