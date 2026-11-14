import httpx
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)

# Simple in-memory cache to avoid repeated external queries
_cache: Dict[str, str] = {}

async def reverse_geocode_coords(latitude: float, longitude: float) -> Optional[str]:
    cache_key = f"{round(latitude, 4)}_{round(longitude, 4)}"
    if cache_key in _cache:
        return _cache[cache_key]

    url = "https://nominatim.openstreetmap.org/reverse"
    params = {
        "lat": latitude,
        "lon": longitude,
        "format": "jsonv2",
        "zoom": 18,
        "addressdetails": 1
    }
    headers = {
        "User-Agent": "CivicLens-GovPlatform/1.0 (civiclens.app; contact@civiclens.local)"
    }

    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                display_name = data.get("display_name")
                if display_name:
                    _cache[cache_key] = display_name
                    return display_name
    except Exception as e:
        logger.warning(f"Nominatim reverse geocoding request failed: {e}")

    # Fallback coordinate string if service is offline or rate limited
    fallback_addr = f"Location: {latitude:.5f}, {longitude:.5f}"
    return fallback_addr
